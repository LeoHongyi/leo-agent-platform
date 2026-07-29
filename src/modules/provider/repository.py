from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.model.model import LLMModel
from src.modules.provider.model import ModelProvider


class ProviderRepository(BaseRepository[ModelProvider]):
    """搜索字段：按名称或类型搜索"""
    SEARCH_FIELDS = ["name", "type"]

    def __init__(self, db: AsyncSession):
        super().__init__(ModelProvider, db)

    async def get_by_name(self, name: str) -> ModelProvider | None:
        """按名称查找供应商（用于创建时去重）"""
        stmt = select(ModelProvider).where(ModelProvider.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_model_counts(
        self,
        provider_ids: list[int],
    ) -> dict[int, int]:
        """批量查询供应商关联的模型数量。"""
        if not provider_ids:
            return {}
        stmt = (
            select(LLMModel.provider_id, func.count(LLMModel.id))
            .where(LLMModel.provider_id.in_(provider_ids))
            .group_by(LLMModel.provider_id)
        )
        result = await self.db.execute(stmt)
        return {provider_id: count for provider_id, count in result.all()}

    async def search_page(
        self, offset: int, limit: int, keyword: str | None
    ) -> tuple[list[ModelProvider], int]:
        """分页 + 搜索（调用 BaseRepository.get_page）"""
        return await self.get_page(
            offset=offset,
            limit=limit,
            keyword=keyword,
            search_fields=self.SEARCH_FIELDS,
        )
