from src.main import app


def test_tool_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/tools": {"get", "post"},
        "/api/v1/tools/{tool_id}": {"get", "put", "delete"},
        "/api/v1/tools/{tool_id}/enable": {"post"},
        "/api/v1/tools/{tool_id}/disable": {"post"},
        "/api/v1/tools/{tool_id}/test": {"post"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"]


def test_tool_list_exposes_pagination_search_parameters() -> None:
    operation = app.openapi()["paths"]["/api/v1/tools"]["get"]
    parameter_names = {
        parameter["name"]
        for parameter in operation["parameters"]
    }

    assert {"page", "page_size", "keyword"} <= parameter_names


def test_tool_openapi_exposes_only_supported_types_and_statuses() -> None:
    schemas = app.openapi()["components"]["schemas"]

    assert set(schemas["ToolType"]["enum"]) == {
        "builtin",
        "http_api",
        "custom_function",
    }
    assert set(schemas["ToolStatus"]["enum"]) == {
        "enabled",
        "disabled",
        "error",
    }
