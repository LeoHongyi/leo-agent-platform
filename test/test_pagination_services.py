from unittest.mock import AsyncMock

import pytest

from src.core.deps import PageParams
from src.modules.permission.service import PermissionService
from src.modules.role.service import RoleService
from src.modules.user.service import UserService


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("service_class", "method_name"),
    [
        (UserService, "list_users"),
        (RoleService, "list_roles"),
        (PermissionService, "list_permissions"),
    ],
)
async def test_list_service_returns_page_result(
    service_class,
    method_name: str,
) -> None:
    service = service_class(AsyncMock())
    service.repo.search_page = AsyncMock(return_value=([], 42))
    params = PageParams(page=3, page_size=10, keyword="admin")

    result = await getattr(service, method_name)(params)

    assert result.items == []
    assert result.total == 42
    assert result.page == 3
    assert result.page_size == 10
    service.repo.search_page.assert_awaited_once_with(
        offset=20,
        limit=10,
        keyword="admin",
    )
