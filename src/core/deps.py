from fastapi import Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BizException
from src.infra.database import get_db
from src.infra.redis_cache import get_redis_client
from src.modules.auth.authorization_service import AuthorizationService
from src.modules.user.model import User
from src.modules.user.repository import UserRepository
from src.utils.jwt_utils import oauth2_scheme, verify_jwt


def _get_user_id_from_token(token: str) -> int:
    try:
        payload = verify_jwt(token)
        return int(payload.get("sub"))
    except Exception:
        raise BizException(code=401, message="未登录或 token 已过期")


async def get_current_user_id(
    token: str = Depends(oauth2_scheme),
) -> int:
    """从 JWT 中获取当前用户 ID，不访问数据库。"""
    return _get_user_id_from_token(token)


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """查询当前用户基本信息，但不预加载角色和权限。"""
    user = await UserRepository(db).get_for_auth(user_id)
    if not user:
        raise BizException(code=401, message="用户不存在")
    if not user.is_active:
        raise BizException(code=401, message="账号已被禁用")
    return user


class PageParams:
    """通用分页参数，通过 Depends 注入到接口中。"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码，从1开始"),
        page_size: int = Query(10, ge=1, le=100, description="每页条数"),
        keyword: str | None = Query(None, description="搜索关键词"),
    ):
        self.page = page
        self.page_size = page_size
        self.keyword = keyword

    @property
    def offset(self) -> int:
        """计算 SQL OFFSET。"""
        return (self.page - 1) * self.page_size


def require_permission(permission_code: str):
    """创建权限校验依赖。"""

    async def _check(
        user_id: int = Depends(get_current_user_id),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_client),
    ) -> int:
        service = AuthorizationService(db, redis)
        allowed = await service.has_permission(
            user_id=user_id,
            permission_code=permission_code,
        )
        if not allowed:
            raise BizException(
                code=403,
                message=f"无权限: {permission_code}",
            )
        return user_id

    return _check


def require_role(role_code: str):
    """创建角色校验依赖。"""

    async def _check(
        user_id: int = Depends(get_current_user_id),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_client),
    ) -> int:
        service = AuthorizationService(db, redis)
        allowed = await service.has_role(
            user_id=user_id,
            role_code=role_code,
        )
        if not allowed:
            raise BizException(code=403, message=f"无角色: {role_code}")
        return user_id

    return _check
