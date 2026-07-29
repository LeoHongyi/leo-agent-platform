from enum import StrEnum
from typing import Annotated

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    Field,
    SecretStr,
    StringConstraints,
    field_validator,
)


ProviderName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]


class ProviderType(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    ALIYUN = "aliyun"
    AZURE = "azure"
    LOCAL = "local"
    CUSTOM = "custom"


class ProviderStatus(StrEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class ProviderCreate(BaseModel):
    """创建供应商请求"""

    name: ProviderName = Field(description="供应商名称")
    type: ProviderType = Field(description="供应商类型")
    endpoint: AnyHttpUrl = Field(description="API 端点，仅支持 HTTP/HTTPS")
    api_key: SecretStr | None = Field(
        default=None,
        description="API Key，写入后加密保存且不会通过响应返回",
        json_schema_extra={"writeOnly": True},
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="供应商描述",
    )

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, endpoint: AnyHttpUrl) -> AnyHttpUrl:
        if len(str(endpoint)) > 500:
            raise ValueError("endpoint 不能超过 500 个字符")
        if endpoint.username or endpoint.password:
            raise ValueError("endpoint 不能包含用户名或密码")
        return endpoint


class ProviderUpdate(BaseModel):
    """更新供应商请求 — 所有字段可选"""

    name: ProviderName | None = Field(default=None, description="供应商名称")
    type: ProviderType | None = Field(default=None, description="供应商类型")
    endpoint: AnyHttpUrl | None = Field(
        default=None,
        description="API 端点，仅支持 HTTP/HTTPS",
    )
    api_key: SecretStr | None = Field(
        default=None,
        description="新 API Key；传 null 可清除已有密钥",
        json_schema_extra={"writeOnly": True},
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="供应商描述；传 null 可清除",
    )

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, endpoint: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if endpoint is None:
            return None
        if len(str(endpoint)) > 500:
            raise ValueError("endpoint 不能超过 500 个字符")
        if endpoint.username or endpoint.password:
            raise ValueError("endpoint 不能包含用户名或密码")
        return endpoint


class ProviderRead(BaseModel):
    """供应商响应"""

    id: int
    name: str
    type: ProviderType
    status: ProviderStatus
    endpoint: AnyHttpUrl
    description: str | None
    model_count: int = 0

    model_config = {"from_attributes": True}


class ProviderConnectionTestResult(BaseModel):
    """供应商连接测试结果。"""

    success: bool
    message: str
    latency_ms: int = Field(ge=0)
    status_code: int | None = None
