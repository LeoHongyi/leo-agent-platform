from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from cryptography.fernet import Fernet

from src.core.exceptions import BizException
from src.modules.provider.schema import (
    ProviderConnectionTestResult,
    ProviderCreate,
    ProviderType,
    ProviderUpdate,
)
from src.modules.provider.service import ProviderService
from src.utils.provider_crypto import ProviderApiKeyCipher


def build_service() -> tuple[
    ProviderService,
    ProviderApiKeyCipher,
    AsyncMock,
]:
    cipher = ProviderApiKeyCipher(Fernet.generate_key().decode())
    tester = AsyncMock()
    service = ProviderService(
        AsyncMock(),
        cipher=cipher,
        connection_tester=tester,
    )
    service.repo = AsyncMock()
    return service, cipher, tester


@pytest.mark.asyncio
async def test_create_provider_encrypts_api_key_before_repository_write() -> None:
    service, cipher, _ = build_service()
    service.repo.get_by_name.return_value = None
    service.repo.create.side_effect = lambda provider: provider

    provider = await service.create_provider(
        data=ProviderCreate(
            name="OpenAI",
            type="openai",
            endpoint="https://api.openai.com/v1",
            api_key="sk-provider-secret",
        )
    )

    assert provider.api_key != "sk-provider-secret"
    assert "sk-provider-secret" not in provider.api_key
    assert cipher.decrypt(provider.api_key) == "sk-provider-secret"


@pytest.mark.asyncio
async def test_create_provider_rejects_empty_api_key_without_echoing_it() -> None:
    service, _, _ = build_service()
    service.repo.get_by_name.return_value = None

    with pytest.raises(BizException) as exc_info:
        await service.create_provider(
            data=ProviderCreate(
                name="OpenAI",
                type="openai",
                endpoint="https://api.openai.com/v1",
                api_key="   ",
            )
        )

    assert exc_info.value.code == 40005
    assert exc_info.value.message == "API Key 不能为空"
    service.repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_provider_deletes_loaded_entity() -> None:
    service, _, _ = build_service()
    provider = SimpleNamespace(id=7)
    service.get_provider = AsyncMock(return_value=provider)

    await service.delete_provider(provider_id=7)

    service.get_provider.assert_awaited_once_with(provider_id=7)
    service.repo.delete.assert_awaited_once_with(provider)


@pytest.mark.asyncio
async def test_provider_read_includes_related_model_count() -> None:
    service, _, _ = build_service()
    provider = SimpleNamespace(
        id=7,
        name="OpenAI",
        type="openai",
        status="connected",
        endpoint="https://api.openai.com/v1",
        description=None,
    )
    service.get_provider = AsyncMock(return_value=provider)
    service.repo.get_model_counts.return_value = {7: 3}

    result = await service.get_provider_read(provider_id=7)

    assert result.model_count == 3
    service.repo.get_model_counts.assert_awaited_once_with([7])


@pytest.mark.asyncio
async def test_update_provider_can_clear_api_key_and_description() -> None:
    service, cipher, _ = build_service()
    provider = SimpleNamespace(
        id=7,
        name="OpenAI",
        type="openai",
        endpoint="https://api.openai.com/v1",
        api_key=cipher.encrypt("old-secret"),
        description="old",
        status="connected",
    )
    service.get_provider = AsyncMock(return_value=provider)
    service.repo.update.side_effect = lambda value: value

    result = await service.update_provider(
        provider_id=7,
        data=ProviderUpdate(api_key=None, description=None),
    )

    assert result.api_key is None
    assert result.description is None
    assert result.status == "disconnected"


@pytest.mark.asyncio
async def test_connection_decrypts_key_and_persists_result_status() -> None:
    service, cipher, tester = build_service()
    provider = SimpleNamespace(
        id=7,
        type="openai",
        endpoint="https://api.openai.com/v1",
        api_key=cipher.encrypt("provider-secret"),
        status="disconnected",
    )
    service.get_provider = AsyncMock(return_value=provider)
    service.repo.update.side_effect = lambda value: value
    tester.test.return_value = ProviderConnectionTestResult(
        success=True,
        message="连接成功",
        latency_ms=12,
        status_code=200,
    )

    result = await service.test_connection(provider_id=7)

    assert result.success is True
    assert provider.status == "connected"
    tester.test.assert_awaited_once_with(
        provider_type=ProviderType.OPENAI,
        endpoint="https://api.openai.com/v1",
        api_key="provider-secret",
    )
    service.repo.update.assert_awaited_once_with(provider)
