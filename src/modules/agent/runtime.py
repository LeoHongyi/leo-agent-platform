from time import perf_counter
from urllib.parse import urlsplit, urlunsplit

import httpx

from src.modules.agent.schema import (
    AgentConfigSchema,
    AgentInvokeResponse,
    AgentMessage,
)
from src.modules.provider.schema import ProviderType


class AgentRuntimeError(Exception):
    """运行时调用失败；错误信息不得包含凭据或上游响应正文。"""


class AgentRuntime:
    """调用真实模型 Provider 的 Agent 运行时。"""

    def __init__(self, client: httpx.AsyncClient | None = None):
        self.client = client

    async def invoke(
        self,
        *,
        provider_type: ProviderType,
        endpoint: str,
        api_key: str | None,
        model_id: str,
        config: AgentConfigSchema,
        system_prompt: str,
        user_input: str,
        history: list[AgentMessage],
        tools: list[dict],
    ) -> AgentInvokeResponse:
        if provider_type is ProviderType.ANTHROPIC:
            return await self._invoke_anthropic(
                endpoint=endpoint,
                api_key=api_key,
                model_id=model_id,
                config=config,
                system_prompt=system_prompt,
                user_input=user_input,
                history=history,
                tools=tools,
            )
        return await self._invoke_openai_compatible(
            provider_type=provider_type,
            endpoint=endpoint,
            api_key=api_key,
            model_id=model_id,
            config=config,
            system_prompt=system_prompt,
            user_input=user_input,
            history=history,
            tools=tools,
        )

    async def _invoke_openai_compatible(
        self,
        *,
        provider_type: ProviderType,
        endpoint: str,
        api_key: str | None,
        model_id: str,
        config: AgentConfigSchema,
        system_prompt: str,
        user_input: str,
        history: list[AgentMessage],
        tools: list[dict],
    ) -> AgentInvokeResponse:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "leo-agent-platform/agent-runtime",
        }
        if provider_type is ProviderType.AZURE:
            if api_key:
                headers["api-key"] = api_key
        elif api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(
            {"role": item.role, "content": item.content}
            for item in history
        )
        messages.append({"role": "user", "content": user_input})

        payload: dict = {
            "model": model_id,
            "messages": messages,
            "temperature": config.model.temperature,
            "max_tokens": config.model.max_tokens,
            "top_p": config.model.top_p,
        }
        if tools:
            payload["tools"] = [
                {"type": "function", "function": definition}
                for definition in tools
            ]

        response, latency_ms = await self._post(
            url=self._completion_url(endpoint=endpoint, suffix="chat/completions"),
            headers=headers,
            payload=payload,
            timeout=config.advanced.timeout,
        )
        try:
            body = response.json()
            message = body["choices"][0]["message"]
            content = message.get("content")
            tool_calls = message.get("tool_calls") or []
            usage = body.get("usage")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise AgentRuntimeError("模型返回了无法识别的响应结构") from exc

        return AgentInvokeResponse(
            content=content if isinstance(content, str) else None,
            tool_calls=tool_calls if isinstance(tool_calls, list) else [],
            usage=usage if isinstance(usage, dict) else None,
            model_id=model_id,
            latency_ms=latency_ms,
        )

    async def _invoke_anthropic(
        self,
        *,
        endpoint: str,
        api_key: str | None,
        model_id: str,
        config: AgentConfigSchema,
        system_prompt: str,
        user_input: str,
        history: list[AgentMessage],
        tools: list[dict],
    ) -> AgentInvokeResponse:
        if not api_key:
            raise AgentRuntimeError("Anthropic Provider 未配置 API Key")

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "leo-agent-platform/agent-runtime",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
        messages = [
            {"role": item.role, "content": item.content}
            for item in history
        ]
        messages.append({"role": "user", "content": user_input})
        payload: dict = {
            "model": model_id,
            "messages": messages,
            "max_tokens": config.model.max_tokens,
            "temperature": config.model.temperature,
            "top_p": config.model.top_p,
        }
        if system_prompt:
            payload["system"] = system_prompt
        if tools:
            payload["tools"] = [
                {
                    "name": definition["name"],
                    "description": definition.get("description", ""),
                    "input_schema": definition.get(
                        "parameters",
                        {"type": "object", "properties": {}},
                    ),
                }
                for definition in tools
            ]

        response, latency_ms = await self._post(
            url=self._completion_url(endpoint=endpoint, suffix="messages"),
            headers=headers,
            payload=payload,
            timeout=config.advanced.timeout,
        )
        try:
            body = response.json()
            blocks = body["content"]
            text_parts = [
                block.get("text", "")
                for block in blocks
                if isinstance(block, dict) and block.get("type") == "text"
            ]
            tool_calls = [
                block
                for block in blocks
                if isinstance(block, dict) and block.get("type") == "tool_use"
            ]
            usage = body.get("usage")
        except (KeyError, TypeError, ValueError) as exc:
            raise AgentRuntimeError("模型返回了无法识别的响应结构") from exc

        content = "\n".join(part for part in text_parts if part) or None
        return AgentInvokeResponse(
            content=content,
            tool_calls=tool_calls,
            usage=usage if isinstance(usage, dict) else None,
            model_id=model_id,
            latency_ms=latency_ms,
        )

    async def _post(
        self,
        *,
        url: str,
        headers: dict[str, str],
        payload: dict,
        timeout: float,
    ) -> tuple[httpx.Response, int]:
        started_at = perf_counter()
        try:
            if self.client is not None:
                response = await self.client.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                    follow_redirects=False,
                )
            else:
                async with httpx.AsyncClient(
                    timeout=timeout,
                    follow_redirects=False,
                    trust_env=False,
                ) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                    )
        except httpx.TimeoutException as exc:
            raise AgentRuntimeError("模型调用超时") from exc
        except httpx.RequestError as exc:
            raise AgentRuntimeError("无法连接模型 Provider") from exc

        latency_ms = max(
            1,
            round((perf_counter() - started_at) * 1000),
        )
        if not response.is_success:
            if response.status_code in {401, 403}:
                message = "模型 Provider 鉴权失败"
            else:
                message = f"模型 Provider 返回 HTTP {response.status_code}"
            raise AgentRuntimeError(message)
        return response, latency_ms

    @staticmethod
    def _completion_url(*, endpoint: str, suffix: str) -> str:
        parsed = urlsplit(endpoint.rstrip("/"))
        path = parsed.path.rstrip("/")
        if path.endswith(f"/{suffix}"):
            completion_path = path
        elif path.endswith("/v1"):
            completion_path = f"{path}/{suffix}"
        else:
            completion_path = f"{path}/v1/{suffix}"
        return urlunsplit(
            (
                parsed.scheme,
                parsed.netloc,
                completion_path,
                parsed.query,
                "",
            )
        )
