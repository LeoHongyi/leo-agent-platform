import pytest
from pydantic import ValidationError

from src.modules.prompt.schema import (
    PromptCreate,
    PromptUpdate,
    PromptVariableSchema,
    PublishRequest,
    RollbackRequest,
)


def test_prompt_create_normalizes_fields_and_uses_independent_lists() -> None:
    first = PromptCreate(name="  Greeting  ", content="Hello")
    second = PromptCreate(name="Other", content="World")
    first.tags.append("support")

    assert first.name == "Greeting"
    assert second.tags == []
    assert second.variables == []


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "content": "Hello"},
        {"name": "Greeting", "content": "   "},
        {"name": "x" * 201, "content": "Hello"},
        {"name": "Greeting", "content": "Hello", "category": ""},
        {"name": "Greeting", "content": "Hello", "tags": [""]},
        {
            "name": "Greeting",
            "content": "Hello",
            "variables": [{"name": "topic", "type": "object"}],
        },
    ],
)
def test_prompt_create_rejects_invalid_input(payload: dict) -> None:
    with pytest.raises(ValidationError):
        PromptCreate(**payload)


def test_prompt_update_rejects_blank_content() -> None:
    with pytest.raises(ValidationError):
        PromptUpdate(content=" \n ")
    with pytest.raises(ValidationError):
        PromptUpdate(content=None)


def test_prompt_request_limits_are_validated() -> None:
    with pytest.raises(ValidationError):
        PublishRequest(changelog="x" * 501)
    with pytest.raises(ValidationError):
        RollbackRequest(version_id=0)
    with pytest.raises(ValidationError):
        PromptVariableSchema(name="topic", type="json")
