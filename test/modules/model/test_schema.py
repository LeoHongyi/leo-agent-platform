import pytest
from pydantic import ValidationError

from src.modules.model.schema import ModelCreate, ModelUpdate


def test_model_create_normalizes_valid_input() -> None:
    data = ModelCreate(
        name="  GPT-4o  ",
        model_id="  gpt-4o  ",
        provider_id=1,
        capabilities=["chat", "vision"],
        currency="usd",
    )

    assert data.name == "GPT-4o"
    assert data.model_id == "gpt-4o"
    assert data.currency == "USD"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "model_id": "gpt", "provider_id": 1},
        {"name": "GPT", "model_id": "", "provider_id": 1},
        {"name": "GPT", "model_id": "gpt", "provider_id": 0},
        {
            "name": "GPT",
            "model_id": "gpt",
            "provider_id": 1,
            "context_length": 0,
        },
        {
            "name": "GPT",
            "model_id": "gpt",
            "provider_id": 1,
            "input_price": -1,
        },
        {
            "name": "GPT",
            "model_id": "gpt",
            "provider_id": 1,
            "capabilities": ["chat,vision"],
        },
    ],
)
def test_model_create_rejects_invalid_input(payload: dict) -> None:
    with pytest.raises(ValidationError):
        ModelCreate(**payload)


def test_model_update_rejects_unknown_status_and_negative_values() -> None:
    with pytest.raises(ValidationError):
        ModelUpdate(status="invalid-status")
    with pytest.raises(ValidationError):
        ModelUpdate(context_length=-1)
    with pytest.raises(ValidationError):
        ModelUpdate(output_price=-0.1)
