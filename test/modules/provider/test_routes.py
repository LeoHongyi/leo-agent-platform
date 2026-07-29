from src.main import app


def test_provider_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/providers": {"get", "post"},
        "/api/v1/providers/{provider_id}": {"get", "put", "delete"},
        "/api/v1/providers/{provider_id}/test": {"post"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"]


def test_provider_list_exposes_pagination_search_parameters() -> None:
    operation = app.openapi()["paths"]["/api/v1/providers"]["get"]
    parameter_names = {parameter["name"] for parameter in operation["parameters"]}

    assert {"page", "page_size", "keyword"} <= parameter_names


def test_provider_api_key_is_write_only_in_openapi() -> None:
    schemas = app.openapi()["components"]["schemas"]

    assert schemas["ProviderCreate"]["properties"]["api_key"]["writeOnly"] is True
    assert "api_key" not in schemas["ProviderRead"]["properties"]
