from unittest.mock import AsyncMock

import pytest

from src.modules.permission.repository import PermissionRepository
from src.modules.role.repository import RoleRepository
from src.modules.user.repository import UserRepository


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("repository_class", "search_fields"),
    [
        (UserRepository, ["username", "email"]),
        (RoleRepository, ["code", "name"]),
        (PermissionRepository, ["code", "name"]),
    ],
)
async def test_search_page_passes_repository_search_fields(
    repository_class,
    search_fields: list[str],
) -> None:
    repository = repository_class(AsyncMock())
    repository.get_page = AsyncMock(return_value=([], 0))

    result = await repository.search_page(
        offset=20,
        limit=10,
        keyword="admin",
    )

    assert result == ([], 0)
    repository.get_page.assert_awaited_once_with(
        offset=20,
        limit=10,
        keyword="admin",
        search_fields=search_fields,
    )
