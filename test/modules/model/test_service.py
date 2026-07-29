from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.deps import PageParams
from src.modules.model.schema import ModelUpdate
from src.modules.model.service import ModelService


def build_service() -> ModelService:
    service = ModelService(AsyncMock())
    service.repo = AsyncMock()
    service.provider_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_model_list_keeps_pagination_when_filtering_provider() -> None:
    service = build_service()
    service.repo.search_page.return_value = ([], 12)
    params = PageParams(page=2, page_size=5, keyword="gpt")

    result = await service.list_models(params=params, provider_id=7)

    assert result.page == 2
    assert result.page_size == 5
    assert result.total == 12
    service.repo.search_page.assert_awaited_once_with(
        offset=5,
        limit=5,
        keyword="gpt",
        provider_id=7,
    )


@pytest.mark.asyncio
async def test_delete_model_deletes_loaded_entity() -> None:
    service = build_service()
    model = SimpleNamespace(id=9)
    service.repo.get_by_id.return_value = model

    await service.delete_model(model_id=9)

    service.repo.delete.assert_awaited_once_with(model)


@pytest.mark.asyncio
async def test_update_model_can_clear_description() -> None:
    service = build_service()
    model = SimpleNamespace(
        id=9,
        name="GPT",
        model_id="gpt",
        provider_id=7,
        provider=SimpleNamespace(name="OpenAI"),
        capabilities=None,
        context_length=4096,
        status="available",
        input_price=0,
        output_price=0,
        currency="USD",
        is_default=False,
        description="old",
    )
    service.repo.get_by_id.return_value = model
    service.repo.update.side_effect = lambda value: value

    result = await service.update_model(
        model_id=9,
        data=ModelUpdate(description=None),
    )

    assert result.description is None
