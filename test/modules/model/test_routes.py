from src.main import app


def test_model_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/models": {"get", "post"},
        "/api/v1/models/{model_id}": {"get", "put", "delete"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"]


def test_model_list_exposes_pagination_search_and_provider_filter() -> None:
    operation = app.openapi()["paths"]["/api/v1/models"]["get"]
    parameters = {
        parameter["name"]: parameter for parameter in operation["parameters"]
    }

    assert {"page", "page_size", "keyword", "provider_id"} <= parameters.keys()
    provider_variants = parameters["provider_id"]["schema"]["anyOf"]
    integer_schema = next(
        schema for schema in provider_variants if schema["type"] == "integer"
    )
    assert integer_schema["minimum"] == 1
