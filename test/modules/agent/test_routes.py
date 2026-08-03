from src.main import app


def test_agent_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/agents": {"get", "post"},
        "/api/v1/agents/{agent_id}": {"get", "put", "delete"},
        "/api/v1/agents/{agent_id}/start": {"post"},
        "/api/v1/agents/{agent_id}/stop": {"post"},
        "/api/v1/agents/{agent_id}/publish": {"post"},
        "/api/v1/agents/{agent_id}/versions": {"get"},
        "/api/v1/agents/{agent_id}/rollback": {"post"},
        "/api/v1/agents/{agent_id}/invoke": {"post"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"]


def test_agent_list_exposes_pagination_search_parameters() -> None:
    operation = app.openapi()["paths"]["/api/v1/agents"]["get"]
    parameter_names = {parameter["name"] for parameter in operation["parameters"]}

    assert {"page", "page_size", "keyword"} <= parameter_names


def test_agent_publish_body_is_optional_and_config_is_typed() -> None:
    schema = app.openapi()
    publish = schema["paths"]["/api/v1/agents/{agent_id}/publish"]["post"]
    config = schema["components"]["schemas"]["AgentConfigSchema"]

    assert publish["requestBody"].get("required") is not True
    assert config["properties"]["model"]["$ref"].endswith(
        "/AgentModelConfig"
    )
    assert config["properties"]["rag"]["$ref"].endswith("/AgentRagConfig")
