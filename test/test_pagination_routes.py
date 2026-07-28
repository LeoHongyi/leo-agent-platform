import pytest

from src.main import app


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/users",
        "/api/v1/roles",
        "/api/v1/permissions/",
    ],
)
def test_list_route_exposes_pagination_search_parameters(path: str) -> None:
    operation = app.openapi()["paths"][path]["get"]
    parameter_names = {parameter["name"] for parameter in operation["parameters"]}

    assert {"page", "page_size", "keyword"} <= parameter_names


def test_role_routes_do_not_repeat_router_prefix() -> None:
    paths = app.openapi()["paths"]

    assert "/api/v1/roles" in paths
    assert "/api/v1/roles/{role_id}" in paths
    assert not any(path.startswith("/api/v1/roles/roles") for path in paths)
