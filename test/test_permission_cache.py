from unittest.mock import AsyncMock

import pytest

from src.utils.permission_cache import CACHE_TTL, PermissionCache


class FakePipeline:
    def __init__(self, redis, transaction: bool):
        self.redis = redis
        self.transaction = transaction
        self.commands = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    def delete(self, *keys):
        self.commands.append(("delete", keys))
        return self

    def sadd(self, key, *members):
        self.commands.append(("sadd", (key, *members)))
        return self

    def expire(self, key, ttl):
        self.commands.append(("expire", (key, ttl)))
        return self

    def type(self, key):
        self.commands.append(("type", (key,)))
        return self

    def sismember(self, key, member):
        self.commands.append(("sismember", (key, member)))
        return self

    async def execute(self):
        results = []
        for command, args in self.commands:
            method = getattr(self.redis, command)
            results.append(await method(*args))
        return results


class FakeRedis:
    def __init__(self):
        self.sets = {}
        self.ttls = {}
        self.pipeline_transactions = []

    def pipeline(self, transaction: bool):
        self.pipeline_transactions.append(transaction)
        return FakePipeline(self, transaction)

    async def delete(self, *keys):
        for key in keys:
            self.sets.pop(key, None)
            self.ttls.pop(key, None)
        return len(keys)

    async def sadd(self, key, *members):
        self.sets.setdefault(key, set()).update(members)
        return len(members)

    async def expire(self, key, ttl):
        self.ttls[key] = ttl
        return True

    async def smembers(self, key):
        return self.sets.get(key, set()).copy()

    async def type(self, key):
        return "set" if key in self.sets else "none"

    async def sismember(self, key, member):
        return member in self.sets.get(key, set())


@pytest.mark.asyncio
async def test_set_user_cache_writes_two_redis_sets_with_same_ttl() -> None:
    redis = FakeRedis()
    cache = PermissionCache(redis)

    await cache.set_user_cache(
        user_id=1,
        permissions={"user:list", "user:read"},
        roles={"admin", "dev"},
    )

    assert redis.pipeline_transactions == [True]
    assert redis.sets["user:perms:1"] == {"user:list", "user:read"}
    assert redis.sets["user:roles:1"] == {"admin", "dev"}
    assert redis.ttls["user:perms:1"] == CACHE_TTL == 1800
    assert redis.ttls["user:roles:1"] == CACHE_TTL
    assert await cache.has_permission(1, "user:list") is True
    assert await cache.has_role(1, "admin") is True


@pytest.mark.asyncio
async def test_empty_access_sets_are_cached_without_database_penetration() -> None:
    redis = FakeRedis()
    cache = PermissionCache(redis)

    await cache.set_user_cache(user_id=2, permissions=set(), roles=set())

    assert await cache.get_permissions(2) == set()
    assert await cache.get_roles(2) == set()
    assert await cache.has_permission(2, "user:list") is False
    assert await cache.has_role(2, "admin") is False


@pytest.mark.asyncio
async def test_delete_user_cache_deletes_permission_and_role_keys() -> None:
    redis = AsyncMock()
    cache = PermissionCache(redis)

    await cache.delete_user_cache(3)

    redis.delete.assert_awaited_once_with(
        "user:perms:3",
        "user:roles:3",
    )
