from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.config import get_settings
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.modules.provider.connection import ProviderConnectionTester
from src.modules.provider.model import ModelProvider
from src.modules.provider.repository import ProviderRepository
from src.modules.provider.schema import (
    ProviderConnectionTestResult,
    ProviderCreate,
    ProviderRead,
    ProviderStatus,
    ProviderType,
    ProviderUpdate,
)
from src.utils.provider_crypto import (
    ProviderApiKeyCipher,
    ProviderCryptoError,
)


class ProviderService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        cipher: ProviderApiKeyCipher | None = None,
        connection_tester: ProviderConnectionTester | None = None,
    ):
        settings = get_settings()
        self.repo = ProviderRepository(db)
        self._cipher = cipher
        self._encryption_key = settings.PROVIDER_ENCRYPTION_KEY
        self._connection_tester = connection_tester or ProviderConnectionTester(
            timeout_seconds=settings.PROVIDER_CONNECT_TIMEOUT_SECONDS
        )

    async def create_provider(self, *, data: ProviderCreate) -> ModelProvider:
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise BizException(code=40001, message=f"供应商 '{data.name}' 已存在")

        encrypted_api_key = None
        if data.api_key is not None:
            plaintext_api_key = data.api_key.get_secret_value()
            self._validate_api_key(api_key=plaintext_api_key)
            encrypted_api_key = self._encrypt_api_key(
                api_key=plaintext_api_key
            )

        provider = ModelProvider(
            name=data.name,
            type=data.type.value,
            endpoint=self._normalize_endpoint(data.endpoint),
            api_key=encrypted_api_key,
            description=data.description,
            status=ProviderStatus.DISCONNECTED.value,
        )
        return await self.repo.create(provider)

    async def get_provider(self, *, provider_id: int) -> ModelProvider:
        provider = await self.repo.get_by_id(provider_id)
        if not provider:
            raise BizException(code=40002, message="供应商不存在")
        return provider

    async def get_provider_read(
        self,
        *,
        provider_id: int,
    ) -> ProviderRead:
        """获取包含模型数量的供应商详情。"""
        provider = await self.get_provider(provider_id=provider_id)
        counts = await self.repo.get_model_counts([provider.id])
        return self._to_read(
            provider=provider,
            model_count=counts.get(provider.id, 0),
        )

    async def list_providers(
        self,
        *,
        params: PageParams,
    ) -> PageResult[ProviderRead]:
        items, total = await self.repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        counts = await self.repo.get_model_counts(
            [provider.id for provider in items]
        )
        return PageResult(
            items=[
                self._to_read(
                    provider=provider,
                    model_count=counts.get(provider.id, 0),
                )
                for provider in items
            ],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_provider(
        self,
        *,
        provider_id: int,
        data: ProviderUpdate,
    ) -> ModelProvider:
        provider = await self.get_provider(provider_id=provider_id)
        fields_set = data.model_fields_set

        if "name" in fields_set:
            if data.name is None:
                raise BizException(code=40003, message="供应商名称不能为空")
            existing = await self.repo.get_by_name(data.name)
            if existing and existing.id != provider.id:
                raise BizException(
                    code=40001,
                    message=f"供应商 '{data.name}' 已存在",
                )
            provider.name = data.name

        connection_changed = False
        if "type" in fields_set:
            if data.type is None:
                raise BizException(code=40003, message="供应商类型不能为空")
            provider.type = data.type.value
            connection_changed = True

        if "endpoint" in fields_set:
            if data.endpoint is None:
                raise BizException(code=40003, message="API 端点不能为空")
            provider.endpoint = self._normalize_endpoint(data.endpoint)
            connection_changed = True

        if "api_key" in fields_set:
            if data.api_key is None:
                provider.api_key = None
            else:
                plaintext_api_key = data.api_key.get_secret_value()
                self._validate_api_key(api_key=plaintext_api_key)
                provider.api_key = self._encrypt_api_key(
                    api_key=plaintext_api_key
                )
            connection_changed = True

        if "description" in fields_set:
            provider.description = data.description

        if connection_changed:
            provider.status = ProviderStatus.DISCONNECTED.value

        return await self.repo.update(provider)

    async def delete_provider(self, *, provider_id: int) -> None:
        provider = await self.get_provider(provider_id=provider_id)
        await self.repo.delete(provider)

    async def test_connection(
        self,
        *,
        provider_id: int,
    ) -> ProviderConnectionTestResult:
        provider = await self.get_provider(provider_id=provider_id)

        try:
            provider_type = ProviderType(provider.type)
        except ValueError as exc:
            raise BizException(
                code=40004,
                message=f"不支持的供应商类型: {provider.type}",
            ) from exc

        api_key = None
        if provider.api_key:
            api_key = self._decrypt_api_key(ciphertext=provider.api_key)

        result = await self._connection_tester.test(
            provider_type=provider_type,
            endpoint=provider.endpoint,
            api_key=api_key,
        )
        provider.status = (
            ProviderStatus.CONNECTED.value
            if result.success
            else ProviderStatus.ERROR.value
        )
        await self.repo.update(provider)
        return result

    def _get_cipher(self) -> ProviderApiKeyCipher:
        if self._cipher is not None:
            return self._cipher

        try:
            self._cipher = ProviderApiKeyCipher(self._encryption_key)
        except ProviderCryptoError as exc:
            raise BizException(
                code=50001,
                message="Provider API Key 加密配置无效",
            ) from exc
        return self._cipher

    @staticmethod
    def _to_read(
        *,
        provider: ModelProvider,
        model_count: int,
    ) -> ProviderRead:
        return ProviderRead.model_validate(provider).model_copy(
            update={"model_count": model_count}
        )

    def _encrypt_api_key(self, *, api_key: str) -> str:
        try:
            return self._get_cipher().encrypt(api_key)
        except ProviderCryptoError as exc:
            raise BizException(
                code=50002,
                message="Provider API Key 加密失败",
            ) from exc

    def _decrypt_api_key(self, *, ciphertext: str) -> str:
        try:
            return self._get_cipher().decrypt(ciphertext)
        except ProviderCryptoError as exc:
            raise BizException(
                code=50003,
                message="Provider API Key 解密失败，请重新保存 API Key",
            ) from exc

    @staticmethod
    def _validate_api_key(*, api_key: str) -> None:
        if not api_key.strip():
            raise BizException(code=40005, message="API Key 不能为空")
        if len(api_key) > 10_000:
            raise BizException(code=40005, message="API Key 不能超过 10000 个字符")

    @staticmethod
    def _normalize_endpoint(endpoint: object) -> str:
        return str(endpoint).rstrip("/")
