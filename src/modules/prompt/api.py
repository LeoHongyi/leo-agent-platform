from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult, ResponseSchema
from src.core.deps import PageParams, get_current_user
from src.infra.database import get_db
from src.modules.prompt.schema import (
    PromptCreate,
    PromptRead,
    PromptUpdate,
    PromptVersionRead,
    PublishRequest,
    RollbackRequest,
)
from src.modules.prompt.service import PromptService
from src.modules.user.model import User

router = APIRouter(
    prefix="/prompts",
    tags=["Prompt管理"],
    dependencies=[Depends(get_current_user)],
)


def get_prompt_service(db: AsyncSession = Depends(get_db)) -> PromptService:
    return PromptService(db)


@router.post("", response_model=ResponseSchema[PromptRead], summary="创建Prompt")
async def create_prompt(
    data: PromptCreate,
    current_user: User = Depends(get_current_user),
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PromptRead]:
    result = await svc.create_prompt(
        data=data,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "",
    response_model=ResponseSchema[PageResult[PromptRead]],
    summary="Prompt列表",
)
async def list_prompts(
    params: PageParams = Depends(),
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PageResult[PromptRead]]:
    page_result = await svc.list_prompts(params=params)
    return ResponseSchema(data=page_result)


@router.get(
    "/{prompt_id}",
    response_model=ResponseSchema[PromptRead],
    summary="Prompt详情",
)
async def get_prompt(
    prompt_id: int,
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PromptRead]:
    result = await svc.get_prompt(prompt_id=prompt_id)
    return ResponseSchema(data=result)


@router.put(
    "/{prompt_id}",
    response_model=ResponseSchema[PromptRead],
    summary="更新Prompt",
)
async def update_prompt(
    prompt_id: int,
    data: PromptUpdate,
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PromptRead]:
    result = await svc.update_prompt(prompt_id=prompt_id, data=data)
    return ResponseSchema(data=result)


@router.delete(
    "/{prompt_id}",
    response_model=ResponseSchema[None],
    summary="删除Prompt",
)
async def delete_prompt(
    prompt_id: int,
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[None]:
    await svc.delete_prompt(prompt_id=prompt_id)
    return ResponseSchema(message="删除成功")


@router.post(
    "/{prompt_id}/publish",
    response_model=ResponseSchema[PromptRead],
    summary="发布新版本",
)
async def publish_prompt(
    prompt_id: int,
    data: PublishRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PromptRead]:
    result = await svc.publish(
        prompt_id=prompt_id,
        data=data or PublishRequest(),
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "/{prompt_id}/versions",
    response_model=ResponseSchema[list[PromptVersionRead]],
    summary="版本列表",
)
async def get_versions(
    prompt_id: int,
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[list[PromptVersionRead]]:
    results = await svc.get_versions(prompt_id=prompt_id)
    return ResponseSchema(data=results)


@router.post(
    "/{prompt_id}/rollback",
    response_model=ResponseSchema[PromptRead],
    summary="回滚版本",
)
async def rollback_prompt(
    prompt_id: int,
    data: RollbackRequest,
    svc: PromptService = Depends(get_prompt_service),
) -> ResponseSchema[PromptRead]:
    result = await svc.rollback(prompt_id=prompt_id, data=data)
    return ResponseSchema(data=result)
