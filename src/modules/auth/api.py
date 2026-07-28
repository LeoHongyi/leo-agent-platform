from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import ResponseSchema
from src.core.deps import get_current_user_id
from src.infra.database import get_db
from src.infra.redis_cache import get_redis_client
from src.modules.auth.authorization_service import AuthorizationService
from src.modules.auth.schema import (
    AccessCodesResponse,
    LoginRequest,
    TokenResponse,
)
from src.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_client),
) -> AuthService:
    return AuthService(db, redis)


def get_authorization_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_client),
) -> AuthorizationService:
    return AuthorizationService(db, redis)


@router.post(
    "/login",
    response_model=ResponseSchema[TokenResponse],
    summary="登录",
)
async def login(
    data: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    token = await service.login(data)
    return ResponseSchema(data=token)


@router.get(
    "/access",
    response_model=ResponseSchema[AccessCodesResponse],
    summary="获取当前用户权限和角色",
)
async def get_access_codes(
    user_id: int = Depends(get_current_user_id),
    service: AuthorizationService = Depends(get_authorization_service),
):
    permissions, roles = await service.get_access_codes(user_id=user_id)
    return ResponseSchema(
        data=AccessCodesResponse(
            permissions=sorted(permissions),
            roles=sorted(roles),
        )
    )


@router.post(
    "/logout",
    response_model=ResponseSchema[None],
    summary="登出",
)
async def logout(
    user_id: int = Depends(get_current_user_id),
    service: AuthService = Depends(get_auth_service),
):
    await service.logout(user_id=user_id)
    return ResponseSchema(data=None)
