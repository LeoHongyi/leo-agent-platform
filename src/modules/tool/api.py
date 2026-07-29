from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult, ResponseSchema
from src.core.deps import PageParams, get_current_user
from src.infra.database import get_db
from src.modules.tool.schema import (
    ToolCreate,
    ToolRead,
    ToolTestRequest,
    ToolTestResponse,
    ToolUpdate,
)
from src.modules.tool.service import ToolService
from src.modules.user.model import User

router = APIRouter(
    prefix="/tools",
    tags=["工具管理"],
    dependencies=[Depends(get_current_user)],
)


def get_tool_service(db: AsyncSession = Depends(get_db)) -> ToolService:
    return ToolService(db)


@router.post("", response_model=ResponseSchema[ToolRead], summary="注册工具")
async def create_tool(
    data: ToolCreate,
    current_user: User = Depends(get_current_user),
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolRead]:
    result = await service.create_tool(
        data=data,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "",
    response_model=ResponseSchema[PageResult[ToolRead]],
    summary="工具列表",
)
async def list_tools(
    params: PageParams = Depends(),
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[PageResult[ToolRead]]:
    page_result = await service.list_tools(params=params)
    return ResponseSchema(data=page_result)


@router.get(
    "/{tool_id}",
    response_model=ResponseSchema[ToolRead],
    summary="工具详情",
)
async def get_tool(
    tool_id: int,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolRead]:
    result = await service.get_tool(tool_id=tool_id)
    return ResponseSchema(data=result)


@router.put(
    "/{tool_id}",
    response_model=ResponseSchema[ToolRead],
    summary="更新工具",
)
async def update_tool(
    tool_id: int,
    data: ToolUpdate,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolRead]:
    result = await service.update_tool(tool_id=tool_id, data=data)
    return ResponseSchema(data=result)


@router.delete(
    "/{tool_id}",
    response_model=ResponseSchema[None],
    summary="删除工具",
)
async def delete_tool(
    tool_id: int,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[None]:
    await service.delete_tool(tool_id=tool_id)
    return ResponseSchema(message="删除成功")


@router.post(
    "/{tool_id}/enable",
    response_model=ResponseSchema[ToolRead],
    summary="启用工具",
)
async def enable_tool(
    tool_id: int,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolRead]:
    result = await service.enable_tool(tool_id=tool_id)
    return ResponseSchema(data=result)


@router.post(
    "/{tool_id}/disable",
    response_model=ResponseSchema[ToolRead],
    summary="禁用工具",
)
async def disable_tool(
    tool_id: int,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolRead]:
    result = await service.disable_tool(tool_id=tool_id)
    return ResponseSchema(data=result)


@router.post(
    "/{tool_id}/test",
    response_model=ResponseSchema[ToolTestResponse],
    summary="测试工具",
)
async def test_tool(
    tool_id: int,
    data: ToolTestRequest,
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchema[ToolTestResponse]:
    result = await service.test_tool(tool_id=tool_id, data=data)
    return ResponseSchema(data=result)
