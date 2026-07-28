from loguru import logger
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BizException
from src.modules.user.repository import UserRepository
from src.utils.permission_cache import PermissionCache

SUPERUSER_PERMISSION = "*"


class AuthorizationService:
    """用户权限和角色缓存服务。"""

    def __init__(self, db: AsyncSession, redis: Redis):
        self.user_repo = UserRepository(db)
        self.cache = PermissionCache(redis)

    async def get_access_codes(
        self,
        *,
        user_id: int,
    ) -> tuple[set[str], set[str]]:
        """缓存优先获取用户权限和角色 code。"""
        permissions = await self.cache.get_permissions(user_id)
        roles = await self.cache.get_roles(user_id)
        if permissions is not None and roles is not None:
            logger.debug("权限缓存命中 | user_id={}", user_id)
            return permissions, roles

        logger.debug("权限缓存未命中 | user_id={}", user_id)
        user = await self.user_repo.get_for_auth(user_id)
        if not user:
            raise BizException(code=401, message="用户不存在")
        if not user.is_active:
            raise BizException(code=401, message="账号已被禁用")

        permissions, roles = await self.user_repo.get_access_codes(user_id)
        if user.is_superuser:
            permissions.add(SUPERUSER_PERMISSION)
        await self.cache.set_user_cache(
            user_id=user_id,
            permissions=permissions,
            roles=roles,
        )
        return permissions, roles

    async def has_permission(
        self,
        *,
        user_id: int,
        permission_code: str,
    ) -> bool:
        """缓存优先判断用户是否拥有指定权限。"""
        cached = await self.cache.has_permission(user_id, permission_code)
        if cached is not None:
            logger.debug(
                "权限判断命中缓存 | user_id={} permission={}",
                user_id,
                permission_code,
            )
            return cached
        permissions, _ = await self.get_access_codes(user_id=user_id)
        return (
            SUPERUSER_PERMISSION in permissions
            or permission_code in permissions
        )

    async def has_role(
        self,
        *,
        user_id: int,
        role_code: str,
    ) -> bool:
        """缓存优先判断用户是否拥有指定角色。"""
        cached = await self.cache.has_role(user_id, role_code)
        if cached is not None:
            logger.debug(
                "角色判断命中缓存 | user_id={} role={}",
                user_id,
                role_code,
            )
            return cached
        _, roles = await self.get_access_codes(user_id=user_id)
        return role_code in roles
