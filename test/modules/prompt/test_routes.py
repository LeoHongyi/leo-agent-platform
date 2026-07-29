from src.main import app


def test_prompt_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/prompts": {"get", "post"},
        "/api/v1/prompts/{prompt_id}": {"get", "put", "delete"},
        "/api/v1/prompts/{prompt_id}/publish": {"post"},
        "/api/v1/prompts/{prompt_id}/versions": {"get"},
        "/api/v1/prompts/{prompt_id}/rollback": {"post"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"]


def test_prompt_list_exposes_pagination_search_parameters() -> None:
    operation = app.openapi()["paths"]["/api/v1/prompts"]["get"]
    parameter_names = {parameter["name"] for parameter in operation["parameters"]}

    assert {"page", "page_size", "keyword"} <= parameter_names


def test_prompt_publish_body_is_optional() -> None:
    operation = app.openapi()["paths"]["/api/v1/prompts/{prompt_id}/publish"][
        "post"
    ]

    assert operation["requestBody"].get("required") is not True
