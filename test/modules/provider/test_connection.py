import httpx
import pytest

from src.modules.provider.connection import ProviderConnectionTester
from src.modules.provider.schema import ProviderType


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("provider_type", "endpoint", "expected_url", "header_name"),
    [
        (
            ProviderType.OPENAI,
            "https://api.openai.com/v1",
            "https://api.openai.com/v1/models",
            "authorization",
        ),
        (
            ProviderType.ANTHROPIC,
            "https://api.anthropic.com",
            "https://api.anthropic.com/v1/models",
            "x-api-key",
        ),
        (
            ProviderType.AZURE,
            "https://example.openai.azure.com",
            "https://example.openai.azure.com/openai/v1/models",
            "api-key",
        ),
        (
            ProviderType.ALIYUN,
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
            (
                "https://dashscope.aliyuncs.com/api/v1/deployments/models"
                "?page_no=1&page_size=1&version=v1.0&model_source=base"
            ),
            "authorization",
        ),
    ],
)
async def test_provider_connection_uses_real_models_endpoint_and_auth_header(
    provider_type: ProviderType,
    endpoint: str,
    expected_url: str,
    header_name: str,
) -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"data": []})

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        tester = ProviderConnectionTester(client=client)
        result = await tester.test(
            provider_type=provider_type,
            endpoint=endpoint,
            api_key="provider-secret",
        )

    assert result.success is True
    assert result.status_code == 200
    assert str(requests[0].url) == expected_url
    assert requests[0].headers[header_name]
    assert "provider-secret" not in str(requests[0].url)


@pytest.mark.asyncio
async def test_provider_connection_reports_auth_failure_without_leaking_key() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={"error": f"invalid {request.headers['authorization']}"},
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        tester = ProviderConnectionTester(client=client)
        result = await tester.test(
            provider_type=ProviderType.OPENAI,
            endpoint="https://api.openai.com/v1",
            api_key="provider-secret",
        )

    assert result.success is False
    assert result.status_code == 401
    assert result.message == "API Key 无效或没有访问权限"
    assert "provider-secret" not in result.message


@pytest.mark.asyncio
async def test_provider_connection_requires_key_for_cloud_provider() -> None:
    tester = ProviderConnectionTester()

    result = await tester.test(
        provider_type=ProviderType.ANTHROPIC,
        endpoint="https://api.anthropic.com",
        api_key=None,
    )

    assert result.success is False
    assert result.message == "该供应商类型需要配置 API Key"
