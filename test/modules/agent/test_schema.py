import pytest
from pydantic import ValidationError

from src.modules.agent.schema import (
    AgentConfigSchema,
    AgentCreate,
    AgentInvokeRequest,
    AgentUpdate,
    PublishRequest,
    RollbackRequest,
)


def test_reference_create_payload_is_parsed_and_dumped_with_camel_case() -> None:
    payload = {
        "name": "智能客服Agent",
        "description": "处理客户咨询和问题解答",
        "type": "conversation",
        "model_id": 1,
        "config": {
            "model": {
                "modelId": "gpt-4",
                "temperature": 0.7,
                "maxTokens": 2_048,
                "topP": 1.0,
            },
            "prompt": {
                "systemPrompt": "你是一个专业的客服人员",
                "promptTemplateId": "1",
            },
            "rag": {
                "enabled": True,
                "knowledgeBaseIds": [1, 2],
                "retrievalStrategy": "hybrid",
                "topK": 5,
                "similarityThreshold": 0.7,
            },
            "tools": {"enabled": True, "toolIds": [1, 5]},
            "advanced": {
                "welcomeMessage": "你好！有什么可以帮助你的吗？",
                "suggestedQuestions": ["产品价格", "功能介绍"],
                "maxTurns": 20,
                "timeout": 30,
            },
        },
    }

    data = AgentCreate.model_validate(payload)
    dumped = data.config.model_dump(mode="json", by_alias=True)

    assert data.name == "智能客服Agent"
    assert data.config.prompt.prompt_template_id == 1
    assert dumped["model"]["maxTokens"] == 2_048
    assert dumped["rag"]["knowledgeBaseIds"] == [1, 2]


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "type": "conversation"},
        {"name": "A", "type": "unknown"},
        {
            "name": "A",
            "type": "conversation",
            "config": {"model": {"temperature": 3}},
        },
        {
            "name": "A",
            "type": "conversation",
            "config": {"model": {"topP": 0}},
        },
        {
            "name": "A",
            "type": "conversation",
            "config": {
                "rag": {
                    "enabled": True,
                    "knowledgeBaseIds": [],
                }
            },
        },
        {
            "name": "A",
            "type": "conversation",
            "config": {
                "tools": {"enabled": True, "toolIds": [1, 1]}
            },
        },
        {
            "name": "A",
            "type": "conversation",
            "unexpected": True,
        },
    ],
)
def test_invalid_agent_payload_is_rejected(payload: dict) -> None:
    with pytest.raises(ValidationError):
        AgentCreate.model_validate(payload)


def test_update_distinguishes_omitted_fields_from_explicit_null() -> None:
    data = AgentUpdate(description=None, model_id=None, config=None)

    assert data.model_fields_set == {"description", "model_id", "config"}


def test_agent_request_limits_are_validated() -> None:
    with pytest.raises(ValidationError):
        PublishRequest(changelog="x" * 501)
    with pytest.raises(ValidationError):
        RollbackRequest(version_id=0)
    with pytest.raises(ValidationError):
        AgentInvokeRequest(input="")
    with pytest.raises(ValidationError):
        AgentConfigSchema.model_validate({"advanced": {"timeout": 301}})
