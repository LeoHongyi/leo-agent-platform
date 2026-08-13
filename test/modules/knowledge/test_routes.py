import httpx
import pytest

from src.main import app


def test_knowledge_routes_match_contract_and_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    expected_methods = {
        "/api/v1/knowledge-bases": {"get", "post"},
        "/api/v1/knowledge-bases/{kb_id}": {"get", "put", "delete"},
        "/api/v1/knowledge-bases/{kb_id}/config": {"put"},
        "/api/v1/knowledge-bases/{kb_id}/documents": {"get", "post"},
        "/api/v1/knowledge-bases/{kb_id}/documents/{doc_id}": {
            "get",
            "delete",
        },
        "/api/v1/knowledge-bases/{kb_id}/documents/{doc_id}/download": {
            "get"
        },
        "/api/v1/knowledge-bases/{kb_id}/documents/{doc_id}/retry": {
            "post"
        },
        "/api/v1/knowledge-bases/{kb_id}/segments": {"get"},
        "/api/v1/knowledge-bases/{kb_id}/documents/{doc_id}/segments": {
            "get"
        },
        "/api/v1/knowledge-bases/{kb_id}/segments/{seg_id}": {
            "put",
            "delete",
        },
        "/api/v1/knowledge-bases/{kb_id}/retrieval-test": {"post"},
    }

    for path, methods in expected_methods.items():
        assert path in paths
        assert methods <= paths[path].keys()
        for method in methods:
            assert paths[path][method]["security"] == [{"BearerAuth": []}]


def test_upload_route_requires_one_multipart_binary_file() -> None:
    schema = app.openapi()
    upload = schema["paths"][
        "/api/v1/knowledge-bases/{kb_id}/documents"
    ]["post"]
    request_body = upload["requestBody"]

    assert request_body["required"] is True
    multipart_schema = request_body["content"]["multipart/form-data"]["schema"]
    body_name = multipart_schema["$ref"].rsplit("/", 1)[-1]
    body = schema["components"]["schemas"][body_name]
    assert body["required"] == ["file"]
    assert body["properties"]["file"] == {
        "type": "string",
        "contentMediaType": "application/octet-stream",
        "title": "File",
    }


def test_list_and_filter_routes_expose_expected_query_parameters() -> None:
    paths = app.openapi()["paths"]
    kb_list = paths["/api/v1/knowledge-bases"]["get"]
    document_list = paths[
        "/api/v1/knowledge-bases/{kb_id}/documents"
    ]["get"]
    segment_list = paths["/api/v1/knowledge-bases/{kb_id}/segments"]["get"]

    assert {item["name"] for item in kb_list["parameters"]} >= {
        "page",
        "page_size",
        "keyword",
    }
    assert {item["name"] for item in document_list["parameters"]} >= {
        "page",
        "page_size",
        "keyword",
        "status",
    }
    assert {item["name"] for item in segment_list["parameters"]} >= {
        "page",
        "page_size",
        "keyword",
        "document_id",
    }


def test_openapi_exposes_strict_knowledge_enums() -> None:
    schemas = app.openapi()["components"]["schemas"]

    assert set(schemas["ChunkMethod"]["enum"]) == {
        "fixed",
        "sentence",
        "paragraph",
    }
    assert set(schemas["DocumentStatus"]["enum"]) == {
        "pending",
        "processing",
        "completed",
        "failed",
    }
    assert set(schemas["RetrievalStrategy"]["enum"]) == {
        "keyword",
        "semantic",
        "hybrid",
    }


@pytest.mark.asyncio
async def test_knowledge_route_without_token_returns_auth_business_error() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/knowledge-bases")

    assert response.json() == {
        "code": 401,
        "message": "未登录或 token 已过期",
        "data": None,
    }
