from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from src.infra.database import get_db
from src.core.base_schema import ResponseSchema
from src.core.exceptions import BizException
from src.modules.auth.schema import LoginRequest, TokenResponse
from src.modules.auth.service import AuthService
from src.infra.redis_cache import get_redis_client

router = APIRouter(prefix="/auth", tags=["Auth"])

def get_auth_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_client),
) -> AuthService:
    return AuthService(db, redis)

@router.post("/login", response_model=ResponseSchema[TokenResponse])
async def login(
    data: LoginRequest,
    svc: AuthService = Depends(get_auth_service),
):
    token = await svc.login(data)
    return ResponseSchema(data=token)