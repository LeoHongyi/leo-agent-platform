from time import perf_counter
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx

from src.modules.provider.schema import (
    ProviderConnectionTestResult,
    ProviderType,
)


class ProviderConnectionTester:
    """Perform a real, read-only request against a provider API."""

    _API_KEY_REQUIRED_TYPES = {
        ProviderType.OPENAI,
        ProviderType.ANTHROPIC,
        ProviderType.ALIYUN,
        ProviderType.AZURE,
    }

    def __init__(
        self,
        *,
        timeout_seconds: float = 10.0,
        client: httpx.AsyncClient | None = None,
    ):
        self.timeout_seconds = timeout_seconds
        self.client = client

    async def test(
        self,
        *,
        provider_type: ProviderType,
        endpoint: str,
        api_key: str | None,
    ) -> ProviderConnectionTestResult:
        if provider_type in self._API_KEY_REQUIRED_TYPES and not api_key:
            return ProviderConnectionTestResult(
                success=False,
                message="该供应商类型需要配置 API Key",
                latency_ms=0,
            )

        url, headers = self._build_request(
            provider_type=provider_type,
            endpoint=endpoint,
            api_key=api_key,
        )
        started_at = perf_counter()

        try:
            response = await self._get(url=url, headers=headers)
            latency_ms = max(1, round((perf_counter() - started_at) * 1000))
        except httpx.TimeoutException:
            return ProviderConnectionTestResult(
                success=False,
                message="连接超时",
                latency_ms=max(1, round((perf_counter() - started_at) * 1000)),
            )
        except httpx.RequestError:
            return ProviderConnectionTestResult(
                success=False,
                message="无法连接到供应商",
                latency_ms=max(1, round((perf_counter() - started_at) * 1000)),
            )

        if response.is_success:
            return ProviderConnectionTestResult(
                success=True,
                message="连接成功",
                latency_ms=latency_ms,
                status_code=response.status_code,
            )

        if response.status_code in {401, 403}:
            message = "API Key 无效或没有访问权限"
        else:
            message = f"供应商返回 HTTP {response.status_code}"

        return ProviderConnectionTestResult(
            success=False,
            message=message,
            latency_ms=latency_ms,
            status_code=response.status_code,
        )

    async def _get(self, *, url: str, headers: dict[str, str]) -> httpx.Response:
        if self.client is not None:
            return await self.client.get(
                url,
                headers=headers,
                timeout=self.timeout_seconds,
                follow_redirects=False,
            )

        async with httpx.AsyncClient(
            timeout=self.timeout_seconds,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            return await client.get(url, headers=headers)

    def _build_request(
        self,
        *,
        provider_type: ProviderType,
        endpoint: str,
        api_key: str | None,
    ) -> tuple[str, dict[str, str]]:
        headers = {
            "Accept": "application/json",
            "User-Agent": "leo-agent-platform/provider-health-check",
        }

        if provider_type is ProviderType.OPENAI:
            url = self._models_url(endpoint=endpoint, default_prefix="/v1")
            headers["Authorization"] = f"Bearer {api_key}"
        elif provider_type is ProviderType.ANTHROPIC:
            url = self._models_url(endpoint=endpoint, default_prefix="/v1")
            headers["x-api-key"] = api_key or ""
            headers["anthropic-version"] = "2023-06-01"
        elif provider_type is ProviderType.AZURE:
            url = self._models_url(endpoint=endpoint, default_prefix="/openai/v1")
            headers["api-key"] = api_key or ""
        elif provider_type is ProviderType.ALIYUN:
            url = self._aliyun_models_url(endpoint=endpoint)
            headers["Authorization"] = f"Bearer {api_key}"
        elif provider_type is ProviderType.LOCAL:
            url = self._local_health_url(endpoint=endpoint)
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
        else:
            url = endpoint
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

        return url, headers

    @staticmethod
    def _models_url(*, endpoint: str, default_prefix: str) -> str:
        parsed = urlsplit(endpoint.rstrip("/"))
        path = parsed.path.rstrip("/")
        if path.endswith("/models"):
            models_path = path
        elif path.endswith("/v1"):
            models_path = f"{path}/models"
        else:
            models_path = f"{path}{default_prefix}/models"
        return urlunsplit((parsed.scheme, parsed.netloc, models_path, "", ""))

    @staticmethod
    def _aliyun_models_url(*, endpoint: str) -> str:
        parsed = urlsplit(endpoint)
        query = urlencode(
            {
                "page_no": 1,
                "page_size": 1,
                "version": "v1.0",
                "model_source": "base",
            }
        )
        return urlunsplit(
            (
                parsed.scheme,
                parsed.netloc,
                "/api/v1/deployments/models",
                query,
                "",
            )
        )

    @staticmethod
    def _local_health_url(*, endpoint: str) -> str:
        normalized = endpoint.rstrip("/")
        if normalized.endswith("/v1"):
            return f"{normalized}/models"
        return endpoint
