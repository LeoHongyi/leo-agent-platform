from time import perf_counter
from typing import Any
from urllib.parse import urlsplit

import httpx

from src.modules.tool.schema import ToolTestResponse, ToolType


class ToolExecutionTester:
    """执行真实、受控的工具连通性测试"""

    _ALLOWED_HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}

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
        tool_type: ToolType,
        config: dict[str, Any] | None,
        input_data: dict[str, Any],
    ) -> ToolTestResponse:
        if tool_type is ToolType.HTTP_API:
            return await self._test_http_api(
                config=config,
                input_data=input_data,
            )
        if tool_type is ToolType.BUILTIN:
            return ToolTestResponse(
                success=False,
                error="内置工具执行器尚未配置",
            )
        return ToolTestResponse(
            success=False,
            error="自定义函数执行器尚未配置",
        )

    async def _test_http_api(
        self,
        *,
        config: dict[str, Any] | None,
        input_data: dict[str, Any],
    ) -> ToolTestResponse:
        validation_error = self._validate_http_config(config)
        if validation_error:
            return ToolTestResponse(success=False, error=validation_error)

        request_config = config or {}
        url = str(request_config["url"]).strip()
        method = str(request_config.get("method", "POST")).upper()
        headers = request_config.get("headers") or {}
        timeout_seconds = float(
            request_config.get("timeout_seconds", self.timeout_seconds)
        )
        started_at = perf_counter()

        try:
            response = await self._request(
                method=method,
                url=url,
                headers=headers,
                input_data=input_data,
                timeout_seconds=timeout_seconds,
            )
            latency_ms = max(1, round((perf_counter() - started_at) * 1000))
        except httpx.TimeoutException:
            return ToolTestResponse(
                success=False,
                error="工具连接超时",
                latency_ms=max(1, round((perf_counter() - started_at) * 1000)),
            )
        except httpx.RequestError:
            return ToolTestResponse(
                success=False,
                error="无法连接到工具",
                latency_ms=max(1, round((perf_counter() - started_at) * 1000)),
            )

        output = {
            "status_code": response.status_code,
            "body": self._response_body(response),
        }
        if response.is_success:
            return ToolTestResponse(
                success=True,
                output=output,
                latency_ms=latency_ms,
                status_code=response.status_code,
            )
        return ToolTestResponse(
            success=False,
            output=output,
            error=f"工具返回 HTTP {response.status_code}",
            latency_ms=latency_ms,
            status_code=response.status_code,
        )

    async def _request(
        self,
        *,
        method: str,
        url: str,
        headers: dict[str, str],
        input_data: dict[str, Any],
        timeout_seconds: float,
    ) -> httpx.Response:
        request_kwargs: dict[str, Any] = {
            "headers": headers,
            "timeout": timeout_seconds,
            "follow_redirects": False,
        }
        if method in {"GET", "DELETE"}:
            request_kwargs["params"] = input_data
        else:
            request_kwargs["json"] = input_data

        if self.client is not None:
            return await self.client.request(method, url, **request_kwargs)

        async with httpx.AsyncClient(
            timeout=timeout_seconds,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            return await client.request(method, url, **request_kwargs)

    def _validate_http_config(
        self,
        config: dict[str, Any] | None,
    ) -> str | None:
        if not config:
            return "HTTP API 工具缺少 config"
        url = config.get("url")
        if not isinstance(url, str) or not url.strip():
            return "HTTP API 工具缺少有效的 url"
        parsed_url = urlsplit(url.strip())
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            return "HTTP API 工具 url 必须使用 http 或 https"

        method = str(config.get("method", "POST")).upper()
        if method not in self._ALLOWED_HTTP_METHODS:
            return f"不支持的 HTTP 方法: {method}"
        headers = config.get("headers") or {}
        if not isinstance(headers, dict) or not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in headers.items()
        ):
            return "HTTP API 工具 headers 必须是字符串键值对"
        try:
            timeout_seconds = float(
                config.get("timeout_seconds", self.timeout_seconds)
            )
        except (TypeError, ValueError):
            return "HTTP API 工具 timeout_seconds 必须是数字"
        if not 0 < timeout_seconds <= 60:
            return "HTTP API 工具 timeout_seconds 必须在 0 到 60 秒之间"
        return None

    @staticmethod
    def _response_body(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return response.text[:2000]
