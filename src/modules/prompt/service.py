import re
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.modules.prompt.model import Prompt, PromptVersion
from src.modules.prompt.repository import PromptRepository, PromptVersionRepository
from src.modules.prompt.schema import (
    PromptCreate,
    PromptRead,
    PromptUpdate,
    PromptVariableSchema,
    PromptVersionRead,
    PublishRequest,
    RollbackRequest,
)


class PromptService:
    VERSION_PATTERN = re.compile(r"^v(\d+)\.(\d+)$")

    def __init__(self, db: AsyncSession):
        self.repo = PromptRepository(db)
        self.version_repo = PromptVersionRepository(db)

    def _to_read(self, prompt: Prompt) -> PromptRead:
        return PromptRead(
            id=prompt.id,
            name=prompt.name,
            description=prompt.description,
            category=prompt.category,
            tags=prompt.tags or [],
            content=prompt.content,
            variables=prompt.variables or [],
            version=prompt.version,
            status=prompt.status,
            created_by=prompt.created_by,
            current_version_id=prompt.current_version_id,
        )

    @staticmethod
    def _to_version_read(
        version: PromptVersion,
        current_version_id: int | None,
    ) -> PromptVersionRead:
        return PromptVersionRead(
            id=version.id,
            prompt_id=version.prompt_id,
            version=version.version,
            content=version.content,
            variables=[
                PromptVariableSchema.model_validate(variable)
                for variable in (version.variables or [])
            ],
            changelog=version.changelog,
            is_current=version.id == current_version_id,
            published_by=version.published_by,
            published_at=version.published_at,
        )

    async def create_prompt(
        self,
        *,
        data: PromptCreate,
        current_user: str | None = None,
    ) -> PromptRead:
        prompt = Prompt(
            name=data.name,
            description=data.description,
            category=data.category,
            tags=data.tags,
            content=data.content,
            variables=[v.model_dump() for v in data.variables],
            version=None,
            status="draft",
            created_by=current_user,
            current_version_id=None,
        )
        prompt = await self.repo.create(prompt)
        return self._to_read(prompt)

    async def get_prompt(self, *, prompt_id: int) -> PromptRead:
        prompt = await self.repo.get_by_id(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")
        return self._to_read(prompt)

    async def list_prompts(self, *, params: PageParams) -> PageResult[PromptRead]:
        """分页查询 Prompt 列表"""
        items, total = await self.repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_read(p) for p in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_prompt(
        self,
        *,
        prompt_id: int,
        data: PromptUpdate,
    ) -> PromptRead:
        prompt = await self.repo.get_by_id_for_update(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")

        release_content_changed = False
        if data.name is not None:
            prompt.name = data.name
        if "description" in data.model_fields_set:
            prompt.description = data.description
        if data.category is not None:
            prompt.category = data.category
        if data.tags is not None:
            prompt.tags = data.tags
        if data.content is not None and data.content != prompt.content:
            prompt.content = data.content
            release_content_changed = True
        if data.variables is not None:
            variables = [v.model_dump() for v in data.variables]
            if variables != (prompt.variables or []):
                prompt.variables = variables
                release_content_changed = True

        if release_content_changed:
            prompt.status = "draft"

        prompt = await self.repo.update(prompt)
        return self._to_read(prompt)

    async def delete_prompt(self, *, prompt_id: int) -> None:
        prompt = await self.repo.get_by_id_for_update(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")
        await self.repo.delete(prompt)

    async def publish(
        self,
        *,
        prompt_id: int,
        data: PublishRequest,
        current_user: str | None = None,
    ) -> PromptRead:
        """发布新版本"""
        prompt = await self.repo.get_by_id_for_update(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")

        # 必须使用锁定读。鉴权查询可能已经建立 REPEATABLE READ 快照；
        # 普通 SELECT 即使等待了 Prompt 行锁，也可能看不到刚提交的新版本。
        versions = await self.version_repo.get_versions_by_prompt(
            prompt_id,
            for_update=True,
        )
        new_version = self._next_version(
            [version.version for version in versions]
        )

        await self.version_repo.clear_current(prompt_id)

        version = PromptVersion(
            prompt_id=prompt_id,
            version=new_version,
            content=prompt.content,
            variables=prompt.variables or [],
            changelog=data.changelog,
            is_current=True,
            published_by=current_user,
            published_at=datetime.now(),
        )
        version = await self.version_repo.create(version)

        prompt.version = new_version
        prompt.status = "published"
        prompt.current_version_id = version.id
        await self.repo.update(prompt)

        return self._to_read(prompt)

    async def get_versions(
        self,
        *,
        prompt_id: int,
    ) -> list[PromptVersionRead]:
        """获取版本列表"""
        prompt = await self.repo.get_by_id(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")

        versions = await self.version_repo.get_versions_by_prompt(prompt_id)
        return [
            self._to_version_read(version, prompt.current_version_id)
            for version in versions
        ]

    async def rollback(
        self,
        *,
        prompt_id: int,
        data: RollbackRequest,
    ) -> PromptRead:
        """回滚到指定版本"""
        prompt = await self.repo.get_by_id_for_update(prompt_id)
        if not prompt:
            raise BizException(code=42001, message="Prompt 不存在")

        target_version = await self.version_repo.get_by_id(data.version_id)
        if not target_version or target_version.prompt_id != prompt_id:
            raise BizException(code=42002, message="版本不存在")

        prompt.content = target_version.content
        prompt.variables = target_version.variables or []
        prompt.version = target_version.version
        prompt.status = "published"
        prompt.current_version_id = target_version.id

        await self.version_repo.clear_current(prompt_id)
        target_version.is_current = True
        await self.version_repo.update(target_version)

        await self.repo.update(prompt)
        return self._to_read(prompt)

    @classmethod
    def _next_version(cls, historical_versions: list[str]) -> str:
        """基于完整发布历史生成单调版本号，回滚不会影响下一版本。"""
        parsed_versions: list[tuple[int, int]] = []
        for version in historical_versions:
            match = cls.VERSION_PATTERN.fullmatch(version)
            if not match:
                continue
            major, minor = int(match.group(1)), int(match.group(2))
            if major >= 1:
                parsed_versions.append((major, minor))

        if not parsed_versions:
            return "v1.0"

        major, minor = max(parsed_versions)
        return f"v{major}.{minor + 1}"
