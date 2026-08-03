from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import BizException
from src.modules.agent.runtime import AgentRuntimeError
from src.modules.agent.schema import (
    AgentConfigSchema,
    AgentInvokeRequest,
    AgentInvokeResponse,
    AgentStatus,
    AgentUpdate,
    PublishRequest,
    RollbackRequest,
)
from src.modules.agent.service import AgentService, ResolvedAgentResources


def build_agent(**overrides) -> SimpleNamespace:
    values = {
        "id": 1,
        "name": "客服 Agent",
        "description": "客服",
        "type": "conversation",
        "status": "draft",
        "model_id": 1,
        "prompt_id": 2,
        "config": AgentConfigSchema.model_validate(
            {
                "model": {"modelId": "gpt-4"},
                "prompt": {"promptTemplateId": 2},
            }
        ).model_dump(mode="json", by_alias=True),
        "success_rate": 0,
        "call_count_7d": 0,
        "version": None,
        "current_version_id": None,
        "created_by": "admin",
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def build_resources(
    *,
    config: AgentConfigSchema | None = None,
) -> ResolvedAgentResources:
    return ResolvedAgentResources(
        config=config or AgentConfigSchema(),
        prompt_id=None,
        model=SimpleNamespace(
            id=1,
            model_id="gpt-4",
            provider_id=3,
            status="available",
        ),
        provider=SimpleNamespace(
            id=3,
            type="openai",
            status="connected",
            endpoint="https://api.example.com/v1",
            api_key=None,
        ),
        prompt=None,
        knowledge_bases=[],
        tools=[],
    )


def build_service() -> AgentService:
    service = AgentService(AsyncMock(), runtime=AsyncMock())
    service.repo = AsyncMock()
    service.version_repo = AsyncMock()
    service.invocation_repo = AsyncMock()
    service.model_repo = AsyncMock()
    service.provider_repo = AsyncMock()
    service.prompt_repo = AsyncMock()
    service.knowledge_base_repo = AsyncMock()
    service.segment_repo = AsyncMock()
    service.tool_repo = AsyncMock()
    return service


def test_version_sequence_starts_at_v1_and_uses_complete_history() -> None:
    assert AgentService._next_version([]) == "v1.0"
    assert AgentService._next_version(["v0.1", "invalid"]) == "v1.0"
    assert AgentService._next_version(["v1.0", "v1.2", "v1.1"]) == "v1.3"
    assert AgentService._next_version(["v2.0", "v1.9"]) == "v2.1"


@pytest.mark.asyncio
async def test_draft_cannot_start_or_stop() -> None:
    service = build_service()
    service.repo.get_by_id_for_update.return_value = build_agent(status="draft")

    with pytest.raises(BizException) as start_error:
        await service.start_agent(agent_id=1)
    with pytest.raises(BizException) as stop_error:
        await service.stop_agent(agent_id=1)

    assert start_error.value.code == 45005
    assert stop_error.value.code == 45005
    service.repo.update.assert_not_awaited()


@pytest.mark.asyncio
async def test_error_agent_can_restart_and_active_agent_can_stop() -> None:
    service = build_service()
    error_agent = build_agent(status="error")
    active_agent = build_agent(status="active")
    service.repo.get_by_id_for_update.side_effect = [
        error_agent,
        active_agent,
    ]
    service._resolve_agent_resources = AsyncMock(
        return_value=build_resources()
    )
    service.repo.update.side_effect = lambda value: value

    restarted = await service.start_agent(agent_id=1)
    stopped = await service.stop_agent(agent_id=1)

    assert restarted.status is AgentStatus.ACTIVE
    assert stopped.status is AgentStatus.INACTIVE


@pytest.mark.asyncio
async def test_active_agent_cannot_update_delete_publish_or_rollback() -> None:
    service = build_service()
    service.repo.get_by_id_for_update.return_value = build_agent(
        status="active"
    )

    operations = [
        service.update_agent(
            agent_id=1,
            data=AgentUpdate(description="new"),
        ),
        service.delete_agent(agent_id=1),
        service.publish(agent_id=1, data=PublishRequest()),
        service.rollback(
            agent_id=1,
            data=RollbackRequest(version_id=1),
        ),
    ]
    for operation in operations:
        with pytest.raises(BizException) as exc_info:
            await operation
        assert exc_info.value.code == 45005


@pytest.mark.asyncio
async def test_update_can_explicitly_clear_nullable_fields_and_relations() -> None:
    service = build_service()
    agent = build_agent(status="inactive")
    service.repo.get_by_id_for_update.return_value = agent
    service.repo.update.side_effect = lambda value: value
    empty_config = AgentConfigSchema()
    service._resolve_resources = AsyncMock(
        return_value=build_resources(config=empty_config)
    )

    result = await service.update_agent(
        agent_id=1,
        data=AgentUpdate(
            description=None,
            model_id=None,
            config=None,
        ),
    )

    assert result.description is None
    assert result.model_id is None
    assert result.status is AgentStatus.DRAFT
    service.repo.replace_knowledge_bases.assert_awaited_once_with(
        agent_id=1,
        knowledge_base_ids=[],
    )
    service.repo.replace_tools.assert_awaited_once_with(
        agent_id=1,
        tool_ids=[],
    )


@pytest.mark.asyncio
async def test_first_publish_creates_full_v1_snapshot_and_actor() -> None:
    service = build_service()
    agent = build_agent(status="draft")
    config = AgentConfigSchema.model_validate(agent.config)
    resources = build_resources(config=config)
    resources.prompt_id = agent.prompt_id
    service.repo.get_by_id_for_update.return_value = agent
    service._resolve_agent_resources = AsyncMock(return_value=resources)
    service.version_repo.get_versions_by_agent.return_value = []
    service.repo.update.side_effect = lambda value: value

    async def create_version(version):
        version.id = 11
        return version

    service.version_repo.create.side_effect = create_version

    result = await service.publish(
        agent_id=1,
        data=PublishRequest(changelog="first"),
        current_user="admin",
    )

    snapshot = service.version_repo.create.await_args.args[0]
    assert snapshot.version == "v1.0"
    assert snapshot.name == agent.name
    assert snapshot.model_id == agent.model_id
    assert snapshot.prompt_id == agent.prompt_id
    assert snapshot.published_by == "admin"
    assert result.version == "v1.0"
    assert result.current_version_id == 11
    assert result.status is AgentStatus.INACTIVE
    service.version_repo.get_versions_by_agent.assert_awaited_once_with(
        1,
        for_update=True,
    )


@pytest.mark.asyncio
async def test_rollback_restores_full_snapshot_and_forces_inactive() -> None:
    service = build_service()
    agent = build_agent(
        status="draft",
        name="New",
        version="v1.2",
        current_version_id=13,
    )
    target = SimpleNamespace(
        id=11,
        agent_id=1,
        version="v1.0",
        name="Old",
        description="Old description",
        type="analysis",
        model_id=1,
        prompt_id=None,
        config=AgentConfigSchema(
            model={"modelId": "gpt-4"}
        ).model_dump(mode="json", by_alias=True),
        is_current=False,
    )
    resources = build_resources(
        config=AgentConfigSchema.model_validate(target.config)
    )
    service.repo.get_by_id_for_update.return_value = agent
    service.repo.get_by_name.return_value = None
    service.version_repo.get_by_id.return_value = target
    service._resolve_resources = AsyncMock(return_value=resources)
    service.repo.update.side_effect = lambda value: value

    result = await service.rollback(
        agent_id=1,
        data=RollbackRequest(version_id=11),
    )

    assert result.name == "Old"
    assert result.type.value == "analysis"
    assert result.version == "v1.0"
    assert result.current_version_id == 11
    assert result.status is AgentStatus.INACTIVE
    assert target.is_current is True


@pytest.mark.asyncio
async def test_rollback_rejects_snapshot_name_owned_by_another_agent() -> None:
    service = build_service()
    service.repo.get_by_id_for_update.return_value = build_agent(
        status="draft"
    )
    service.version_repo.get_by_id.return_value = SimpleNamespace(
        id=11,
        agent_id=1,
        name="旧名称",
    )
    service.repo.get_by_name.return_value = SimpleNamespace(id=2)
    service._resolve_resources = AsyncMock()

    with pytest.raises(BizException) as exc_info:
        await service.rollback(
            agent_id=1,
            data=RollbackRequest(version_id=11),
        )

    assert exc_info.value.code == 45009
    service._resolve_resources.assert_not_awaited()


@pytest.mark.asyncio
async def test_missing_aggregate_id_and_model_identifier_mismatch_fail() -> None:
    service = build_service()
    service.knowledge_base_repo.get_by_ids.return_value = []
    service.tool_repo.get_by_ids.return_value = []

    with pytest.raises(BizException) as missing_tool:
        await service._resolve_resources(
            model_id=None,
            config=AgentConfigSchema(
                tools={"enabled": True, "toolIds": [5]}
            ),
            require_ready=False,
        )
    assert missing_tool.value.code == 45007

    service.model_repo.get_by_id.return_value = SimpleNamespace(
        id=1,
        model_id="gpt-4",
        provider_id=3,
        status="available",
    )
    with pytest.raises(BizException) as mismatch:
        await service._resolve_resources(
            model_id=1,
            config=AgentConfigSchema(model={"modelId": "other"}),
            require_ready=False,
        )
    assert mismatch.value.code == 45006


@pytest.mark.asyncio
async def test_invoke_uses_runtime_and_runtime_failure_marks_error() -> None:
    service = build_service()
    agent = build_agent(status="active")
    resources = build_resources(
        config=AgentConfigSchema(model={"modelId": "gpt-4"})
    )
    service.repo.get_by_id.return_value = agent
    service._resolve_agent_resources = AsyncMock(return_value=resources)
    service._build_system_prompt = AsyncMock(return_value="system")
    service._record_invocation = AsyncMock()
    service.repo.update.side_effect = lambda value: value
    service.runtime.invoke.return_value = AgentInvokeResponse(
        content="ok",
        model_id="gpt-4",
        latency_ms=12,
    )

    result = await service.invoke(
        agent_id=1,
        data=AgentInvokeRequest(input="hello"),
    )
    assert result.content == "ok"
    service._record_invocation.assert_awaited_once_with(
        agent=agent,
        success=True,
        latency_ms=12,
    )

    service._record_invocation.reset_mock()
    service.runtime.invoke.side_effect = AgentRuntimeError("连接失败")
    with pytest.raises(BizException) as failure:
        await service.invoke(
            agent_id=1,
            data=AgentInvokeRequest(input="again"),
        )

    assert failure.value.code == 45010
    assert agent.status == "error"
    service._record_invocation.assert_awaited_once_with(
        agent=agent,
        success=False,
        latency_ms=0,
        error="连接失败",
    )


@pytest.mark.asyncio
async def test_system_prompt_requires_variables_and_applies_defaults() -> None:
    service = build_service()
    resources = build_resources()
    resources.prompt = SimpleNamespace(
        content="你好，{name}。地区：{{region}}",
        variables=[
            {
                "name": "name",
                "required": True,
                "default_value": None,
            },
            {
                "name": "region",
                "required": False,
                "default_value": "上海",
            },
        ],
    )

    with pytest.raises(BizException) as exc_info:
        await service._build_system_prompt(
            resources=resources,
            user_input="hello",
            variables={},
        )
    assert exc_info.value.code == 45006

    prompt = await service._build_system_prompt(
        resources=resources,
        user_input="hello",
        variables={"name": "Leo"},
    )
    assert prompt == "你好，Leo。地区：上海"


@pytest.mark.asyncio
async def test_versions_of_missing_agent_return_business_error() -> None:
    service = build_service()
    service.repo.get_by_id.return_value = None

    with pytest.raises(BizException) as exc_info:
        await service.get_versions(agent_id=999)

    assert exc_info.value.code == 45001
