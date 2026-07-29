from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import BizException
from src.modules.prompt.schema import (
    PromptUpdate,
    PublishRequest,
    RollbackRequest,
)
from src.modules.prompt.service import PromptService


def build_prompt(**overrides) -> SimpleNamespace:
    values = {
        "id": 1,
        "name": "Greeting",
        "description": None,
        "category": "general",
        "tags": [],
        "content": "Hello, {name}",
        "variables": [
            {
                "name": "name",
                "type": "string",
                "description": "",
                "default_value": None,
                "required": True,
            }
        ],
        "version": None,
        "status": "draft",
        "created_by": "admin",
        "current_version_id": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def build_service() -> PromptService:
    service = PromptService(AsyncMock())
    service.repo = AsyncMock()
    service.version_repo = AsyncMock()
    return service


def test_version_sequence_starts_at_v1_and_ignores_rollback_pointer() -> None:
    assert PromptService._next_version([]) == "v1.0"
    assert PromptService._next_version(["v0.2", "v0.3"]) == "v1.0"
    assert PromptService._next_version(["v1.0", "v1.1", "v1.2"]) == "v1.3"
    assert PromptService._next_version(["v2.0", "v1.9"]) == "v2.1"


@pytest.mark.asyncio
async def test_first_publish_creates_v1_snapshot_and_records_actor() -> None:
    service = build_service()
    prompt = build_prompt()
    service.repo.get_by_id_for_update.return_value = prompt
    service.version_repo.get_versions_by_prompt.return_value = []

    async def create_version(version):
        version.id = 11
        return version

    service.version_repo.create.side_effect = create_version

    result = await service.publish(
        prompt_id=prompt.id,
        data=PublishRequest(changelog="first"),
        current_user="admin",
    )

    snapshot = service.version_repo.create.await_args.args[0]
    assert snapshot.version == "v1.0"
    assert snapshot.content == prompt.content
    assert snapshot.variables == prompt.variables
    assert snapshot.published_by == "admin"
    assert result.version == "v1.0"
    assert result.status == "published"
    assert result.current_version_id == 11
    service.version_repo.get_versions_by_prompt.assert_awaited_once_with(
        prompt.id,
        for_update=True,
    )


@pytest.mark.asyncio
async def test_editing_published_content_returns_to_draft() -> None:
    service = build_service()
    prompt = build_prompt(
        version="v1.0",
        status="published",
        current_version_id=11,
    )
    service.repo.get_by_id_for_update.return_value = prompt
    service.repo.update.side_effect = lambda value: value

    result = await service.update_prompt(
        prompt_id=prompt.id,
        data=PromptUpdate(content="Updated"),
    )

    assert result.content == "Updated"
    assert result.status == "draft"
    assert result.version == "v1.0"
    assert result.current_version_id == 11


@pytest.mark.asyncio
async def test_rollback_restores_content_variables_and_current_pointer() -> None:
    service = build_service()
    prompt = build_prompt(
        content="New",
        version="v1.2",
        status="draft",
        current_version_id=13,
    )
    target = SimpleNamespace(
        id=11,
        prompt_id=prompt.id,
        version="v1.0",
        content="Old",
        variables=[],
        is_current=False,
    )
    service.repo.get_by_id_for_update.return_value = prompt
    service.version_repo.get_by_id.return_value = target

    result = await service.rollback(
        prompt_id=prompt.id,
        data=RollbackRequest(version_id=target.id),
    )

    assert result.content == "Old"
    assert result.variables == []
    assert result.version == "v1.0"
    assert result.status == "published"
    assert result.current_version_id == target.id
    assert target.is_current is True


@pytest.mark.asyncio
async def test_delete_prompt_deletes_loaded_entity() -> None:
    service = build_service()
    prompt = build_prompt()
    service.repo.get_by_id_for_update.return_value = prompt

    await service.delete_prompt(prompt_id=prompt.id)

    service.repo.delete.assert_awaited_once_with(prompt)


@pytest.mark.asyncio
async def test_versions_of_missing_prompt_return_business_error() -> None:
    service = build_service()
    service.repo.get_by_id.return_value = None

    with pytest.raises(BizException) as exc_info:
        await service.get_versions(prompt_id=999)

    assert exc_info.value.code == 42001
