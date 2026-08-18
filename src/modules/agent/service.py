from dataclasses import dataclass
from datetime import datetime, timedelta
import re

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.config import get_settings
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.modules.KnowledgeBase.model import KnowledgeBase
from src.modules.KnowledgeBase.repository import (
    KnowledgeBaseRepository,
    SegmentRepository,
)
from src.modules.agent.model import Agent, AgentInvocationLog, AgentVersion
from src.modules.agent.repository import (
    AgentInvocationRepository,
    AgentRepository,
    AgentVersionRepository,
)
from src.modules.agent.runtime import AgentRuntime, AgentRuntimeError
from src.modules.agent.schema import (
    AgentConfigSchema,
    AgentCreate,
    AgentInvokeRequest,
    AgentInvokeResponse,
    AgentRead,
    RetrievalStrategy,
    AgentStatus,
    AgentUpdate,
    AgentVersionRead,
    PublishRequest,
    RollbackRequest,
)
from src.modules.model.model import LLMModel
from src.modules.model.repository import ModelRepository
from src.modules.prompt.model import Prompt
from src.modules.prompt.repository import PromptRepository
from src.modules.provider.model import ModelProvider
from src.modules.provider.repository import ProviderRepository
from src.modules.provider.schema import ProviderStatus, ProviderType
from src.modules.tool.model import Tool
from src.modules.tool.repository import ToolRepository
from src.utils.provider_crypto import ProviderApiKeyCipher, ProviderCryptoError


@dataclass
class ResolvedAgentResources:
    config: AgentConfigSchema
    prompt_id: int | None
    model: LLMModel | None
    provider: ModelProvider | None
    prompt: Prompt | None
    knowledge_bases: list[KnowledgeBase]
    tools: list[Tool]


class AgentService:
    VERSION_PATTERN = re.compile(r"v(\d+)\.(\d+)")

    def __init__(
        self,
        db: AsyncSession,
        *,
        runtime: AgentRuntime | None = None,
        cipher: ProviderApiKeyCipher | None = None,
    ):
        self.repo = AgentRepository(db)
        self.version_repo = AgentVersionRepository(db)
        self.invocation_repo = AgentInvocationRepository(db)
        self.model_repo = ModelRepository(db)
        self.provider_repo = ProviderRepository(db)
        self.prompt_repo = PromptRepository(db)
        self.knowledge_base_repo = KnowledgeBaseRepository(db)
        self.segment_repo = SegmentRepository(db)
        self.tool_repo = ToolRepository(db)
        self.runtime = runtime or AgentRuntime()
        self._cipher = cipher
        self._encryption_key = get_settings().PROVIDER_ENCRYPTION_KEY

    @staticmethod
    def _to_read(agent: Agent) -> AgentRead:
        return AgentRead.model_validate(agent)

    @staticmethod
    def _to_version_read(version: AgentVersion) -> AgentVersionRead:
        return AgentVersionRead.model_validate(version)

    async def create_agent(
        self,
        *,
        data: AgentCreate,
        current_user: str | None = None,
    ) -> AgentRead:
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise BizException(code=45009, message=f"Agent '{data.name}' 已存在")

        resources = await self._resolve_resources(
            model_id=data.model_id,
            config=data.config,
            require_ready=False,
        )
        agent = Agent(
            name=data.name,
            description=data.description,
            type=data.type.value,
            model_id=data.model_id,
            prompt_id=resources.prompt_id,
            config=self._dump_config(resources.config),
            status=AgentStatus.DRAFT.value,
            version=None,
            current_version_id=None,
            created_by=current_user,
        )
        agent = await self.repo.create(agent)
        await self._replace_relations(
            agent_id=agent.id,
            config=resources.config,
        )
        return self._to_read(agent)

    async def get_agent(self, *, agent_id: int) -> AgentRead:
        agent = await self._get_agent(agent_id=agent_id)
        return self._to_read(agent)

    async def list_agents(
        self,
        *,
        params: PageParams,
    ) -> PageResult[AgentRead]:
        items, total = await self.repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_read(agent) for agent in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_agent(
        self,
        *,
        agent_id: int,
        data: AgentUpdate,
    ) -> AgentRead:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={
                AgentStatus.DRAFT,
                AgentStatus.INACTIVE,
                AgentStatus.ERROR,
            },
            action="更新",
        )
        fields_set = data.model_fields_set

        if "name" in fields_set:
            if data.name is None:
                raise BizException(code=45006, message="Agent 名称不能为空")
            existing = await self.repo.get_by_name(data.name)
            if existing and existing.id != agent.id:
                raise BizException(
                    code=45009,
                    message=f"Agent '{data.name}' 已存在",
                )
            agent.name = data.name
        if "description" in fields_set:
            agent.description = data.description
        if "type" in fields_set:
            if data.type is None:
                raise BizException(code=45006, message="Agent 类型不能为空")
            agent.type = data.type.value

        model_id = (
            data.model_id if "model_id" in fields_set else agent.model_id
        )
        if "config" in fields_set:
            config = data.config or AgentConfigSchema()
        else:
            config = AgentConfigSchema.model_validate(agent.config or {})
            if "model_id" in fields_set:
                config = config.model_copy(deep=True)
                config.model.model_id = None

        resources = await self._resolve_resources(
            model_id=model_id,
            config=config,
            require_ready=False,
        )
        agent.model_id = model_id
        agent.prompt_id = resources.prompt_id
        agent.config = self._dump_config(resources.config)
        if fields_set:
            agent.status = AgentStatus.DRAFT.value

        agent = await self.repo.update(agent)
        await self._replace_relations(
            agent_id=agent.id,
            config=resources.config,
        )
        return self._to_read(agent)

    async def delete_agent(self, *, agent_id: int) -> None:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        if agent.status == AgentStatus.ACTIVE.value:
            raise BizException(code=45005, message="运行中的 Agent 不能删除")
        await self.repo.delete(agent)

    async def start_agent(self, *, agent_id: int) -> AgentRead:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={AgentStatus.INACTIVE, AgentStatus.ERROR},
            action="启动",
        )
        await self._resolve_agent_resources(agent=agent, require_ready=True)
        agent.status = AgentStatus.ACTIVE.value
        agent = await self.repo.update(agent)
        return self._to_read(agent)

    async def stop_agent(self, *, agent_id: int) -> AgentRead:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={AgentStatus.ACTIVE, AgentStatus.ERROR},
            action="停止",
        )
        agent.status = AgentStatus.INACTIVE.value
        agent = await self.repo.update(agent)
        return self._to_read(agent)

    async def publish(
        self,
        *,
        agent_id: int,
        data: PublishRequest,
        current_user: str | None = None,
    ) -> AgentRead:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={AgentStatus.DRAFT, AgentStatus.INACTIVE},
            action="发布",
        )
        resources = await self._resolve_agent_resources(
            agent=agent,
            require_ready=True,
        )

        versions = await self.version_repo.get_versions_by_agent(
            agent_id,
            for_update=True,
        )
        new_version = self._next_version(
            [version.version for version in versions]
        )
        await self.version_repo.clear_current(agent_id)

        version = AgentVersion(
            agent_id=agent_id,
            version=new_version,
            name=agent.name,
            description=agent.description,
            type=agent.type,
            model_id=agent.model_id,
            prompt_id=resources.prompt_id,
            config=self._dump_config(resources.config),
            changelog=data.changelog,
            is_current=True,
            published_by=current_user,
            published_at=datetime.now(),
        )
        version = await self.version_repo.create(version)

        agent.version = new_version
        agent.current_version_id = version.id
        agent.status = AgentStatus.INACTIVE.value
        await self.repo.update(agent)
        return self._to_read(agent)

    async def get_versions(
        self,
        *,
        agent_id: int,
    ) -> list[AgentVersionRead]:
        await self._get_agent(agent_id=agent_id)
        versions = await self.version_repo.get_versions_by_agent(agent_id)
        return [self._to_version_read(version) for version in versions]

    async def rollback(
        self,
        *,
        agent_id: int,
        data: RollbackRequest,
    ) -> AgentRead:
        agent = await self._get_agent_for_update(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={AgentStatus.DRAFT, AgentStatus.INACTIVE},
            action="回滚",
        )
        target = await self.version_repo.get_by_id(data.version_id)
        if not target or target.agent_id != agent_id:
            raise BizException(code=45004, message="版本不存在")
        existing = await self.repo.get_by_name(target.name)
        if existing and existing.id != agent_id:
            raise BizException(
                code=45009,
                message=(
                    f"无法回滚：Agent 名称 '{target.name}' "
                    "已被其他 Agent 使用"
                ),
            )

        config = AgentConfigSchema.model_validate(target.config)
        resources = await self._resolve_resources(
            model_id=target.model_id,
            config=config,
            require_ready=True,
        )
        agent.name = target.name
        agent.description = target.description
        agent.type = target.type
        agent.model_id = target.model_id
        agent.prompt_id = target.prompt_id
        agent.config = self._dump_config(resources.config)
        agent.version = target.version
        agent.current_version_id = target.id
        agent.status = AgentStatus.INACTIVE.value

        await self.version_repo.clear_current(agent_id)
        target.is_current = True
        await self.version_repo.update(target)
        await self.repo.update(agent)
        await self._replace_relations(
            agent_id=agent.id,
            config=resources.config,
        )
        return self._to_read(agent)

    async def invoke(
        self,
        *,
        agent_id: int,
        data: AgentInvokeRequest,
    ) -> AgentInvokeResponse:
        agent = await self._get_agent(agent_id=agent_id)
        self._ensure_status(
            agent,
            allowed={AgentStatus.ACTIVE},
            action="调用",
        )
        resources = await self._resolve_agent_resources(
            agent=agent,
            require_ready=True,
        )
        if resources.model is None or resources.provider is None:
            raise BizException(code=45006, message="Agent 未配置可用模型")
        if len(data.history) > resources.config.advanced.max_turns * 2:
            raise BizException(code=45006, message="对话历史超过 Agent 最大轮数")

        system_prompt = await self._build_system_prompt(
            resources=resources,
            user_input=data.input,
            variables=data.variables,
        )
        tool_definitions = [
            tool.function_definition
            for tool in resources.tools
            if tool.function_definition
        ]
        api_key = self._decrypt_api_key(resources.provider.api_key)

        try:
            result = await self.runtime.invoke(
                provider_type=ProviderType(resources.provider.type),
                endpoint=resources.provider.endpoint,
                api_key=api_key,
                model_id=resources.model.model_id,
                config=resources.config,
                system_prompt=system_prompt,
                user_input=data.input,
                history=data.history,
                tools=tool_definitions,
            )
        except (AgentRuntimeError, ValueError) as exc:
            await self._record_invocation(
                agent=agent,
                success=False,
                latency_ms=0,
                error=str(exc),
            )
            agent.status = AgentStatus.ERROR.value
            await self.repo.update(agent)
            raise BizException(code=45010, message=str(exc)) from exc

        await self._record_invocation(
            agent=agent,
            success=True,
            latency_ms=result.latency_ms,
        )
        return result

    async def _resolve_agent_resources(
        self,
        *,
        agent: Agent,
        require_ready: bool,
    ) -> ResolvedAgentResources:
        return await self._resolve_resources(
            model_id=agent.model_id,
            config=AgentConfigSchema.model_validate(agent.config or {}),
            require_ready=require_ready,
        )

    async def _resolve_resources(
        self,
        *,
        model_id: int | None,
        config: AgentConfigSchema,
        require_ready: bool,
    ) -> ResolvedAgentResources:
        config = config.model_copy(deep=True)
        model = None
        provider = None
        if model_id is not None:
            model = await self.model_repo.get_by_id(model_id)
            if not model:
                raise BizException(code=45007, message=f"模型 {model_id} 不存在")
            supplied_model_id = config.model.model_id
            if supplied_model_id and supplied_model_id != model.model_id:
                raise BizException(
                    code=45006,
                    message=(
                        "config.model.modelId 与顶层 model_id 指向的模型不一致"
                    ),
                )
            config.model.model_id = model.model_id
            provider = await self.provider_repo.get_by_id(model.provider_id)
            if not provider:
                raise BizException(code=45007, message="模型供应商不存在")
            if require_ready and model.status != "available":
                raise BizException(code=45008, message="关联模型当前不可用")
            if (
                require_ready
                and provider.status != ProviderStatus.CONNECTED.value
            ):
                raise BizException(code=45008, message="模型供应商尚未连接")
        else:
            if config.model.model_id:
                raise BizException(
                    code=45006,
                    message="配置 modelId 时必须同时提供顶层 model_id",
                )
            if require_ready:
                raise BizException(code=45006, message="发布或启动前必须配置模型")

        prompt_id = config.prompt.prompt_template_id
        prompt = None
        if prompt_id is not None:
            prompt = await self.prompt_repo.get_by_id(prompt_id)
            if not prompt:
                raise BizException(
                    code=45007,
                    message=f"Prompt {prompt_id} 不存在",
                )
            if require_ready and prompt.status != "published":
                raise BizException(code=45008, message="关联 Prompt 尚未发布")

        knowledge_bases = await self.knowledge_base_repo.get_by_ids(
            config.rag.knowledge_base_ids
        )
        self._ensure_all_ids_exist(
            expected=config.rag.knowledge_base_ids,
            actual=[item.id for item in knowledge_bases],
            resource_name="知识库",
        )
        if require_ready and config.rag.enabled:
            unavailable = [
                item.id for item in knowledge_bases if item.status != "ready"
            ]
            if unavailable:
                raise BizException(
                    code=45008,
                    message=f"知识库尚未就绪: {unavailable}",
                )

        tools = await self.tool_repo.get_by_ids(config.tools.tool_ids)
        self._ensure_all_ids_exist(
            expected=config.tools.tool_ids,
            actual=[item.id for item in tools],
            resource_name="工具",
        )
        if require_ready and config.tools.enabled:
            unavailable = [
                item.id
                for item in tools
                if item.status != "enabled" or not item.function_definition
            ]
            if unavailable:
                raise BizException(
                    code=45008,
                    message=f"工具未启用或缺少函数定义: {unavailable}",
                )

        return ResolvedAgentResources(
            config=config,
            prompt_id=prompt_id,
            model=model,
            provider=provider,
            prompt=prompt,
            knowledge_bases=knowledge_bases,
            tools=tools,
        )

    async def _build_system_prompt(
        self,
        *,
        resources: ResolvedAgentResources,
        user_input: str,
        variables: dict[str, str | int | float | bool],
    ) -> str:
        prompt_parts: list[str] = []
        if resources.prompt:
            template = resources.prompt.content
            resolved_variables = dict(variables)
            for raw_definition in resources.prompt.variables or []:
                definition = (
                    raw_definition.model_dump()
                    if hasattr(raw_definition, "model_dump")
                    else raw_definition
                )
                name = definition.get("name")
                if not name or name in resolved_variables:
                    continue
                default_value = definition.get("default_value")
                if default_value is not None:
                    resolved_variables[name] = default_value
                elif definition.get("required", True):
                    raise BizException(
                        code=45006,
                        message=f"缺少 Prompt 必填变量: {name}",
                    )
            for key, value in resolved_variables.items():
                template = template.replace(f"{{{{{key}}}}}", str(value))
                template = template.replace(f"{{{key}}}", str(value))
            prompt_parts.append(template)
        if resources.config.prompt.system_prompt:
            prompt_parts.append(resources.config.prompt.system_prompt)

        if resources.config.rag.enabled:
            if (
                resources.config.rag.retrieval_strategy
                == RetrievalStrategy.SEMANTIC
            ):
                raise BizException(
                    code=45008,
                    message="语义检索需要先配置知识库向量索引",
                )
            segments = await self.segment_repo.retrieve_for_agent(
                knowledge_base_ids=resources.config.rag.knowledge_base_ids,
                query=user_input,
                limit=resources.config.rag.top_k,
                similarity_threshold=(
                    resources.config.rag.similarity_threshold
                ),
            )
            if segments:
                context = "\n\n".join(
                    f"[知识片段 {index}] {segment.content}"
                    for index, segment in enumerate(segments, start=1)
                )
                prompt_parts.append(
                    "请优先依据以下知识库片段回答；无法确认时明确说明：\n"
                    f"{context}"
                )
        return "\n\n".join(part for part in prompt_parts if part)

    async def _record_invocation(
        self,
        *,
        agent: Agent,
        success: bool,
        latency_ms: int,
        error: str | None = None,
    ) -> None:
        await self.invocation_repo.create(
            AgentInvocationLog(
                agent_id=agent.id,
                success=success,
                latency_ms=latency_ms,
                error=error[:500] if error else None,
            )
        )
        count, success_rate = await self.invocation_repo.get_stats_since(
            agent_id=agent.id,
            since=datetime.now() - timedelta(days=7),
        )
        agent.call_count_7d = count
        agent.success_rate = success_rate
        await self.repo.update(agent)

    async def _replace_relations(
        self,
        *,
        agent_id: int,
        config: AgentConfigSchema,
    ) -> None:
        await self.repo.replace_knowledge_bases(
            agent_id=agent_id,
            knowledge_base_ids=config.rag.knowledge_base_ids,
        )
        await self.repo.replace_tools(
            agent_id=agent_id,
            tool_ids=config.tools.tool_ids,
        )

    async def _get_agent(self, *, agent_id: int) -> Agent:
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise BizException(code=45001, message="Agent 不存在")
        return agent

    async def _get_agent_for_update(self, *, agent_id: int) -> Agent:
        agent = await self.repo.get_by_id_for_update(agent_id)
        if not agent:
            raise BizException(code=45001, message="Agent 不存在")
        return agent

    @staticmethod
    def _ensure_status(
        agent: Agent,
        *,
        allowed: set[AgentStatus],
        action: str,
    ) -> None:
        if agent.status not in {status.value for status in allowed}:
            allowed_text = "、".join(status.value for status in allowed)
            raise BizException(
                code=45005,
                message=(
                    f"Agent 当前状态为 {agent.status}，不能{action}；"
                    f"允许状态: {allowed_text}"
                ),
            )

    @staticmethod
    def _ensure_all_ids_exist(
        *,
        expected: list[int],
        actual: list[int],
        resource_name: str,
    ) -> None:
        missing = sorted(set(expected) - set(actual))
        if missing:
            raise BizException(
                code=45007,
                message=f"{resource_name}不存在: {missing}",
            )

    @staticmethod
    def _dump_config(config: AgentConfigSchema) -> dict:
        return config.model_dump(mode="json", by_alias=True)

    def _decrypt_api_key(self, ciphertext: str | None) -> str | None:
        if not ciphertext:
            return None
        try:
            cipher = self._cipher or ProviderApiKeyCipher(self._encryption_key)
            return cipher.decrypt(ciphertext)
        except ProviderCryptoError as exc:
            raise BizException(
                code=50003,
                message="Provider API Key 解密失败，请重新保存 API Key",
            ) from exc

    @classmethod
    def _next_version(cls, historical_versions: list[str]) -> str:
        parsed_versions: list[tuple[int, int]] = []
        for version in historical_versions:
            match = cls.VERSION_PATTERN.fullmatch(version)
            if not match:
                continue
            major, minor = int(match.group(1)), int(match.group(2))
            if major >= 1:
                parsed_versions.append((major, minor))
        if not parsed_versions:
            return "v1.0"
        major, minor = max(parsed_versions)
        return f"v{major}.{minor + 1}"
