from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.modules.tool.executor import ToolExecutionTester
from src.modules.tool.model import Tool
from src.modules.tool.repository import ToolRepository
from src.modules.tool.schema import (
    ToolCreate,
    ToolRead,
    ToolStatus,
    ToolTestRequest,
    ToolTestResponse,
    ToolType,
    ToolUpdate,
)


class ToolService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        execution_tester: ToolExecutionTester | None = None,
    ):
        self.repo = ToolRepository(db)
        self.execution_tester = execution_tester or ToolExecutionTester()

    @staticmethod
    def _to_read(tool: Tool) -> ToolRead:
        return ToolRead.model_validate(tool)

    async def create_tool(
        self,
        *,
        data: ToolCreate,
        current_user: str | None = None,
    ) -> ToolRead:
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise BizException(code=44001, message=f"工具 '{data.name}' 已存在")

        tool = Tool(
            name=data.name,
            description=data.description,
            type=data.type.value,
            config=data.config,
            function_definition=(
                data.function_definition.model_dump()
                if data.function_definition
                else None
            ),
            status=ToolStatus.DISABLED.value,
            created_by=current_user,
        )
        tool = await self.repo.create(tool)
        return self._to_read(tool)

    async def get_tool(self, *, tool_id: int) -> ToolRead:
        tool = await self._get_tool(tool_id=tool_id)
        return self._to_read(tool)

    async def list_tools(self, *, params: PageParams) -> PageResult[ToolRead]:
        items, total = await self.repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_read(tool) for tool in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_tool(
        self,
        *,
        tool_id: int,
        data: ToolUpdate,
    ) -> ToolRead:
        tool = await self._get_tool(tool_id=tool_id)
        if "name" in data.model_fields_set and data.name != tool.name:
            existing = await self.repo.get_by_name(data.name or "")
            if existing and existing.id != tool_id:
                raise BizException(
                    code=44001,
                    message=f"工具 '{data.name}' 已存在",
                )
            tool.name = data.name
        if "description" in data.model_fields_set:
            tool.description = data.description
        if "type" in data.model_fields_set and data.type is not None:
            tool.type = data.type.value
        if "config" in data.model_fields_set:
            tool.config = data.config
        if "function_definition" in data.model_fields_set:
            tool.function_definition = (
                data.function_definition.model_dump()
                if data.function_definition
                else None
            )

        tool = await self.repo.update(tool)
        return self._to_read(tool)

    async def delete_tool(self, *, tool_id: int) -> None:
        tool = await self._get_tool(tool_id=tool_id)
        await self.repo.delete(tool)

    async def enable_tool(self, *, tool_id: int) -> ToolRead:
        tool = await self._get_tool(tool_id=tool_id)
        tool.status = ToolStatus.ENABLED.value
        tool = await self.repo.update(tool)
        return self._to_read(tool)

    async def disable_tool(self, *, tool_id: int) -> ToolRead:
        tool = await self._get_tool(tool_id=tool_id)
        tool.status = ToolStatus.DISABLED.value
        tool = await self.repo.update(tool)
        return self._to_read(tool)

    async def test_tool(
        self,
        *,
        tool_id: int,
        data: ToolTestRequest,
    ) -> ToolTestResponse:
        tool = await self._get_tool(tool_id=tool_id)
        try:
            result = await self.execution_tester.test(
                tool_type=ToolType(tool.type),
                config=tool.config,
                input_data=data.input,
            )
        except Exception:
            result = ToolTestResponse(
                success=False,
                error="工具测试执行失败",
            )

        if (
            not result.success
            and tool.status == ToolStatus.ENABLED.value
        ):
            tool.status = ToolStatus.ERROR.value
            await self.repo.update(tool)
        return result

    async def _get_tool(self, *, tool_id: int) -> Tool:
        tool = await self.repo.get_by_id(tool_id)
        if not tool:
            raise BizException(code=44002, message="工具不存在")
        return tool
