from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult, ResponseSchema
from src.core.deps import PageParams, get_current_user
from src.infra.database import get_db
from src.modules.agent.schema import (
    AgentCreate,
    AgentInvokeRequest,
    AgentInvokeResponse,
    AgentRead,
    AgentUpdate,
    AgentVersionRead,
    PublishRequest,
    RollbackRequest,
)
from src.modules.agent.service import AgentService
from src.modules.user.model import User

router = APIRouter(
    prefix="/agents",
    tags=["Agent管理"],
    dependencies=[Depends(get_current_user)],
)


def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    return AgentService(db)


@router.post("", response_model=ResponseSchema[AgentRead], summary="创建Agent")
async def create_agent(
    data: AgentCreate,
    current_user: User = Depends(get_current_user),
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.create_agent(
        data=data,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "",
    response_model=ResponseSchema[PageResult[AgentRead]],
    summary="Agent列表",
)
async def list_agents(
    params: PageParams = Depends(),
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[PageResult[AgentRead]]:
    page_result = await service.list_agents(params=params)
    return ResponseSchema(data=page_result)


@router.get(
    "/{agent_id}",
    response_model=ResponseSchema[AgentRead],
    summary="Agent详情",
)
async def get_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.get_agent(agent_id=agent_id)
    return ResponseSchema(data=result)


@router.put(
    "/{agent_id}",
    response_model=ResponseSchema[AgentRead],
    summary="更新Agent",
)
async def update_agent(
    agent_id: int,
    data: AgentUpdate,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.update_agent(agent_id=agent_id, data=data)
    return ResponseSchema(data=result)


@router.delete(
    "/{agent_id}",
    response_model=ResponseSchema[None],
    summary="删除Agent",
)
async def delete_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[None]:
    await service.delete_agent(agent_id=agent_id)
    return ResponseSchema(message="删除成功")


@router.post(
    "/{agent_id}/start",
    response_model=ResponseSchema[AgentRead],
    summary="启动Agent",
)
async def start_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.start_agent(agent_id=agent_id)
    return ResponseSchema(data=result)


@router.post(
    "/{agent_id}/stop",
    response_model=ResponseSchema[AgentRead],
    summary="停止Agent",
)
async def stop_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.stop_agent(agent_id=agent_id)
    return ResponseSchema(data=result)


@router.post(
    "/{agent_id}/publish",
    response_model=ResponseSchema[AgentRead],
    summary="发布Agent版本",
)
async def publish_agent(
    agent_id: int,
    data: PublishRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.publish(
        agent_id=agent_id,
        data=data or PublishRequest(),
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "/{agent_id}/versions",
    response_model=ResponseSchema[list[AgentVersionRead]],
    summary="Agent版本列表",
)
async def get_versions(
    agent_id: int,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[list[AgentVersionRead]]:
    results = await service.get_versions(agent_id=agent_id)
    return ResponseSchema(data=results)


@router.post(
    "/{agent_id}/rollback",
    response_model=ResponseSchema[AgentRead],
    summary="回滚Agent版本",
)
async def rollback_agent(
    agent_id: int,
    data: RollbackRequest,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentRead]:
    result = await service.rollback(agent_id=agent_id, data=data)
    return ResponseSchema(data=result)


@router.post(
    "/{agent_id}/invoke",
    response_model=ResponseSchema[AgentInvokeResponse],
    summary="调用运行中的Agent",
)
async def invoke_agent(
    agent_id: int,
    data: AgentInvokeRequest,
    service: AgentService = Depends(get_agent_service),
) -> ResponseSchema[AgentInvokeResponse]:
    result = await service.invoke(agent_id=agent_id, data=data)
    return ResponseSchema(data=result)
