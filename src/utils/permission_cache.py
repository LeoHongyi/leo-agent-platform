from loguru import logger
from redis.asyncio import Redis
from redis.exceptions import ResponseError

from src.utils.jwt_utils import ACCESS_TOKEN_EXPIRE_MINUTES

PERM_CACHE_PREFIX = "user:perms:"
ROLE_CACHE_PREFIX = "user:roles:"
CACHE_TTL = ACCESS_TOKEN_EXPIRE_MINUTES * 60

_EMPTY_SET_MEMBER = "__empty__"
_SUPERUSER_PERMISSION = "*"


class PermissionCache:
    """用户权限和角色 Redis Set 缓存。"""

    def __init__(self, redis: Redis):
        self.redis = redis

    @staticmethod
    def permission_key(user_id: int) -> str:
        return f"{PERM_CACHE_PREFIX}{user_id}"

    @staticmethod
    def role_key(user_id: int) -> str:
        return f"{ROLE_CACHE_PREFIX}{user_id}"

    async def get_permissions(self, user_id: int) -> set[str] | None:
        """获取权限集合，返回 ``None`` 表示缓存未命中。"""
        return await self._get_members(self.permission_key(user_id))

    async def get_roles(self, user_id: int) -> set[str] | None:
        """获取角色集合，返回 ``None`` 表示缓存未命中。"""
        return await self._get_members(self.role_key(user_id))

    async def has_permission(
        self,
        user_id: int,
        permission_code: str,
    ) -> bool | None:
        """使用 ``SISMEMBER`` 判断权限，返回 ``None`` 表示缓存未命中。"""
        key = self.permission_key(user_id)
        return await self._has_member(
            key=key,
            member=permission_code,
            wildcard=_SUPERUSER_PERMISSION,
        )

    async def has_role(self, user_id: int, role_code: str) -> bool | None:
        """使用 ``SISMEMBER`` 判断角色，返回 ``None`` 表示缓存未命中。"""
        return await self._has_member(
            key=self.role_key(user_id),
            member=role_code,
        )

    async def set_user_cache(
        self,
        user_id: int,
        permissions: set[str],
        roles: set[str],
    ) -> None:
        """在同一个 Redis 事务中重建权限和角色缓存。"""
        permission_key = self.permission_key(user_id)
        role_key = self.role_key(user_id)
        permission_members = sorted(permissions) or [_EMPTY_SET_MEMBER]
        role_members = sorted(roles) or [_EMPTY_SET_MEMBER]

        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.delete(permission_key, role_key)
            pipe.sadd(permission_key, *permission_members)
            pipe.expire(permission_key, CACHE_TTL)
            pipe.sadd(role_key, *role_members)
            pipe.expire(role_key, CACHE_TTL)
            await pipe.execute()
        logger.debug("权限缓存已写入 | user_id={}", user_id)

    async def delete_user_cache(self, user_id: int) -> None:
        """同时清除指定用户的权限和角色缓存。"""
        await self.redis.delete(
            self.permission_key(user_id),
            self.role_key(user_id),
        )
        logger.debug("权限缓存已清除 | user_id={}", user_id)

    async def delete_user_cache_batch(self, user_ids: list[int]) -> None:
        """批量清除多个用户的权限和角色缓存。"""
        if not user_ids:
            return
        keys = [
            key
            for user_id in user_ids
            for key in (self.permission_key(user_id), self.role_key(user_id))
        ]
        await self.redis.delete(*keys)
        logger.debug("权限缓存已批量清除 | user_ids={}", user_ids)

    async def _get_members(self, key: str) -> set[str] | None:
        try:
            members = set(await self.redis.smembers(key))
        except ResponseError:
            await self.redis.delete(key)
            return None
        if not members:
            return None
        members.discard(_EMPTY_SET_MEMBER)
        return members

    async def _has_member(
        self,
        *,
        key: str,
        member: str,
        wildcard: str | None = None,
    ) -> bool | None:
        try:
            async with self.redis.pipeline(transaction=False) as pipe:
                pipe.type(key)
                pipe.sismember(key, member)
                if wildcard is not None:
                    pipe.sismember(key, wildcard)
                results = await pipe.execute()
        except ResponseError:
            await self.redis.delete(key)
            return None

        if results[0] == "none":
            return None
        if results[0] != "set":
            await self.redis.delete(key)
            return None
        return bool(results[1]) or (wildcard is not None and bool(results[2]))
