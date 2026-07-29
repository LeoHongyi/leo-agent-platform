import httpx
import pytest

from src.modules.tool.executor import ToolExecutionTester
from src.modules.tool.schema import ToolType


@pytest.mark.asyncio
async def test_http_api_tool_executes_real_post_request() -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={"forecast": "sunny"},
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        tester = ToolExecutionTester(client=client)
        result = await tester.test(
            tool_type=ToolType.HTTP_API,
            config={
                "url": "https://example.com/weather",
                "method": "POST",
                "headers": {"X-Tool-Test": "yes"},
            },
            input_data={"city": "Shanghai"},
        )

    assert result.success is True
    assert result.status_code == 200
    assert result.output == {
        "status_code": 200,
        "body": {"forecast": "sunny"},
    }
    assert requests[0].method == "POST"
    assert requests[0].headers["X-Tool-Test"] == "yes"
    assert requests[0].content == b'{"city":"Shanghai"}'


@pytest.mark.asyncio
async def test_http_api_tool_reports_connection_failure() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unreachable", request=request)

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        tester = ToolExecutionTester(client=client)
        result = await tester.test(
            tool_type=ToolType.HTTP_API,
            config={"url": "https://example.com/unreachable"},
            input_data={},
        )

    assert result.success is False
    assert result.error == "无法连接到工具"
    assert result.latency_ms >= 1


@pytest.mark.asyncio
async def test_http_api_tool_rejects_invalid_config() -> None:
    tester = ToolExecutionTester()

    result = await tester.test(
        tool_type=ToolType.HTTP_API,
        config={"url": "file:///etc/passwd"},
        input_data={},
    )

    assert result.success is False
    assert result.error == "HTTP API 工具 url 必须使用 http 或 https"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("tool_type", "expected_error"),
    [
        (ToolType.BUILTIN, "内置工具执行器尚未配置"),
        (ToolType.CUSTOM_FUNCTION, "自定义函数执行器尚未配置"),
    ],
)
async def test_unconfigured_executor_never_returns_fake_success(
    tool_type: ToolType,
    expected_error: str,
) -> None:
    tester = ToolExecutionTester()

    result = await tester.test(
        tool_type=tool_type,
        config=None,
        input_data={},
    )

    assert result.success is False
    assert result.error == expected_error
