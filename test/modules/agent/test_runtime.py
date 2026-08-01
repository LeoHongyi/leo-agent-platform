import json

import httpx
import pytest

from src.modules.agent.runtime import AgentRuntime, AgentRuntimeError
from src.modules.agent.schema import AgentConfigSchema, AgentMessage
from src.modules.provider.schema import ProviderType


@pytest.mark.asyncio
async def test_openai_compatible_runtime_sends_real_chat_request() -> None:
    captured: dict = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers.get("authorization")
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": "处理完成",
                            "tool_calls": [],
                        }
                    }
                ],
                "usage": {"total_tokens": 12},
            },
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        result = await AgentRuntime(client).invoke(
            provider_type=ProviderType.OPENAI,
            endpoint="https://api.example.com/v1",
            api_key="secret",
            model_id="gpt-4",
            config=AgentConfigSchema(),
            system_prompt="你是客服",
            user_input="你好",
            history=[AgentMessage(role="assistant", content="欢迎")],
            tools=[],
        )

    assert captured["url"] == "https://api.example.com/v1/chat/completions"
    assert captured["authorization"] == "Bearer secret"
    assert captured["payload"]["messages"][-1]["content"] == "你好"
    assert result.content == "处理完成"
    assert result.usage == {"total_tokens": 12}


@pytest.mark.asyncio
async def test_anthropic_runtime_parses_text_and_tool_use() -> None:
    captured: dict = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "secret"
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "content": [
                    {"type": "text", "text": "结果"},
                    {
                        "type": "tool_use",
                        "id": "tool-1",
                        "name": "lookup",
                        "input": {},
                    },
                ],
                "usage": {"input_tokens": 5, "output_tokens": 2},
            },
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        result = await AgentRuntime(client).invoke(
            provider_type=ProviderType.ANTHROPIC,
            endpoint="https://api.anthropic.com",
            api_key="secret",
            model_id="claude-test",
            config=AgentConfigSchema(),
            system_prompt="system",
            user_input="hello",
            history=[],
            tools=[
                {
                    "name": "lookup",
                    "description": "查询",
                    "parameters": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                    },
                }
            ],
        )

    assert result.content == "结果"
    assert result.tool_calls[0]["name"] == "lookup"
    assert captured["payload"]["tools"][0]["input_schema"] == {
        "type": "object",
        "properties": {"query": {"type": "string"}},
    }


@pytest.mark.asyncio
async def test_runtime_hides_upstream_error_body() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="sensitive upstream response")

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        with pytest.raises(AgentRuntimeError) as exc_info:
            await AgentRuntime(client).invoke(
                provider_type=ProviderType.OPENAI,
                endpoint="https://api.example.com",
                api_key="secret",
                model_id="gpt-4",
                config=AgentConfigSchema(),
                system_prompt="",
                user_input="hello",
                history=[],
                tools=[],
            )

    assert "HTTP 500" in str(exc_info.value)
    assert "sensitive" not in str(exc_info.value)
