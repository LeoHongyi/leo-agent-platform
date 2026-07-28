from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.auth.service import AuthService
from src.modules.role.service import RoleService
from src.modules.user.api import assign_roles_to_user
from src.modules.user.schema import UserAssignRoles
from src.modules.user.service import UserService


@pytest.mark.asyncio
async def test_assign_user_roles_invalidates_user_cache() -> None:
    redis = AsyncMock()
    service = UserService(AsyncMock(), redis)
    user = SimpleNamespace(roles=[])
    roles = [SimpleNamespace(id=1)]
    service.get_user = AsyncMock(return_value=user)
    service.role_repo.get_by_ids = AsyncMock(return_value=roles)
    service.repo.update = AsyncMock(return_value=user)

    await service.assign_roles(1, [1])

    redis.delete.assert_awaited_once_with(
        "user:perms:1",
        "user:roles:1",
    )


@pytest.mark.asyncio
async def test_assign_role_permissions_invalidates_affected_users() -> None:
    redis = AsyncMock()
    db = AsyncMock()
    result = MagicMock()
    result.fetchall.return_value = [(1,), (2,)]
    db.execute.return_value = result
    service = RoleService(db, redis)
    role = SimpleNamespace(permissions=[])
    service.get_role = AsyncMock(return_value=role)
    service.permission_repo.get_by_ids = AsyncMock(
        return_value=[SimpleNamespace(id=1)]
    )
    service.repo.update = AsyncMock(return_value=role)

    await service.assign_permissions(1, [1])

    redis.delete.assert_awaited_once_with(
        "user:perms:1",
        "user:roles:1",
        "user:perms:2",
        "user:roles:2",
    )


@pytest.mark.asyncio
async def test_logout_invalidates_user_cache() -> None:
    redis = AsyncMock()
    service = AuthService(AsyncMock(), redis)

    await service.logout(user_id=1)

    redis.delete.assert_awaited_once_with(
        "user:perms:1",
        "user:roles:1",
    )


@pytest.mark.asyncio
async def test_assign_roles_api_passes_role_id_list_to_service() -> None:
    service = AsyncMock()
    service.assign_roles.return_value = SimpleNamespace(
        id=1,
        username="test",
        email="test@test.com",
        is_active=True,
    )

    response = await assign_roles_to_user(
        user_id=1,
        role_ids=UserAssignRoles(role_ids=[1, 2]),
        svc=service,
    )

    assert response.data.id == 1
    service.assign_roles.assert_awaited_once_with(1, [1, 2])
