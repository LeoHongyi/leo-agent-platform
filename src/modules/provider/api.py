from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult, ResponseSchema
from src.core.deps import PageParams, get_current_user
from src.infra.database import get_db
from src.modules.provider.schema import (
    ProviderConnectionTestResult,
    ProviderCreate,
    ProviderRead,
    ProviderUpdate,
)
from src.modules.provider.service import ProviderService

router = APIRouter(
    prefix="/providers",
    tags=["模型供应商"],
    dependencies=[Depends(get_current_user)],
)


def get_provider_service(db: AsyncSession = Depends(get_db)) -> ProviderService:
    return ProviderService(db)


@router.post("", response_model=ResponseSchema[ProviderRead], summary="创建供应商")
async def create_provider(
    data: ProviderCreate,
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[ProviderRead]:
    provider = await service.create_provider(data=data)
    return ResponseSchema(data=ProviderRead.model_validate(provider))


@router.get(
    "",
    response_model=ResponseSchema[PageResult[ProviderRead]],
    summary="供应商列表",
)
async def list_providers(
    params: PageParams = Depends(),
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[PageResult[ProviderRead]]:
    page_result = await service.list_providers(params=params)
    return ResponseSchema(data=page_result)


@router.get(
    "/{provider_id}",
    response_model=ResponseSchema[ProviderRead],
    summary="供应商详情",
)
async def get_provider(
    provider_id: int,
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[ProviderRead]:
    provider = await service.get_provider_read(provider_id=provider_id)
    return ResponseSchema(data=provider)


@router.put(
    "/{provider_id}",
    response_model=ResponseSchema[ProviderRead],
    summary="更新供应商",
)
async def update_provider(
    provider_id: int,
    data: ProviderUpdate,
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[ProviderRead]:
    await service.update_provider(provider_id=provider_id, data=data)
    provider = await service.get_provider_read(provider_id=provider_id)
    return ResponseSchema(data=provider)


@router.delete(
    "/{provider_id}",
    response_model=ResponseSchema[None],
    summary="删除供应商",
)
async def delete_provider(
    provider_id: int,
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[None]:
    await service.delete_provider(provider_id=provider_id)
    return ResponseSchema(message="删除成功")


@router.post(
    "/{provider_id}/test",
    response_model=ResponseSchema[ProviderConnectionTestResult],
    summary="测试连接",
)
async def test_connection(
    provider_id: int,
    service: ProviderService = Depends(get_provider_service),
) -> ResponseSchema[ProviderConnectionTestResult]:
    result = await service.test_connection(provider_id=provider_id)
    return ResponseSchema(data=result)
