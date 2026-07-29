import pytest
from pydantic import ValidationError

from src.modules.tool.schema import (
    ToolCreate,
    ToolStatus,
    ToolType,
)


def test_tool_create_accepts_supported_type_and_strips_name() -> None:
    data = ToolCreate.model_validate(
        {
            "name": "  weather  ",
            "type": "http_api",
        }
    )

    assert data.name == "weather"
    assert data.type is ToolType.HTTP_API


def test_tool_create_rejects_unsupported_type() -> None:
    with pytest.raises(ValidationError):
        ToolCreate.model_validate(
            {
                "name": "invalid",
                "type": "anything",
            }
        )


def test_tool_status_contract_contains_state_machine_values() -> None:
    assert {status.value for status in ToolStatus} == {
        "enabled",
        "disabled",
        "error",
    }
