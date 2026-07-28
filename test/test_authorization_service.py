from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.modules.auth.authorization_service import AuthorizationService


@pytest.mark.asyncio
async def test_get_access_codes_cache_hit_skips_database() -> None:
    service = AuthorizationService(AsyncMock(), AsyncMock())
    service.cache = AsyncMock()
    service.user_repo = AsyncMock()
    service.cache.get_permissions.return_value = {"user:list"}
    service.cache.get_roles.return_value = {"admin"}

    result = await service.get_access_codes(user_id=1)

    assert result == ({"user:list"}, {"admin"})
    service.user_repo.get_for_auth.assert_not_awaited()
    service.user_repo.get_access_codes.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_access_codes_cache_miss_queries_and_writes_both_sets() -> None:
    service = AuthorizationService(AsyncMock(), AsyncMock())
    service.cache = AsyncMock()
    service.user_repo = AsyncMock()
    service.cache.get_permissions.return_value = None
    service.cache.get_roles.return_value = None
    service.user_repo.get_for_auth.return_value = SimpleNamespace(
        is_active=True,
        is_superuser=False,
    )
    service.user_repo.get_access_codes.return_value = (
        {"user:list"},
        {"admin"},
    )

    result = await service.get_access_codes(user_id=1)

    assert result == ({"user:list"}, {"admin"})
    service.user_repo.get_for_auth.assert_awaited_once_with(1)
    service.user_repo.get_access_codes.assert_awaited_once_with(1)
    service.cache.set_user_cache.assert_awaited_once_with(
        user_id=1,
        permissions={"user:list"},
        roles={"admin"},
    )


@pytest.mark.asyncio
async def test_permission_check_uses_sismember_cache_hit() -> None:
    service = AuthorizationService(AsyncMock(), AsyncMock())
    service.cache = AsyncMock()
    service.user_repo = AsyncMock()
    service.cache.has_permission.return_value = True

    allowed = await service.has_permission(
        user_id=1,
        permission_code="user:list",
    )

    assert allowed is True
    service.cache.has_permission.assert_awaited_once_with(1, "user:list")
    service.user_repo.get_for_auth.assert_not_awaited()
