from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

ModelName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
ModelIdentifier = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
Capability = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
CurrencyCode = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_upper=True,
        min_length=3,
        max_length=10,
        pattern=r"^[A-Z][A-Z0-9_-]*$",
    ),
]


class ModelStatus(StrEnum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"


class ModelCreate(BaseModel):
    """创建模型请求。"""

    name: ModelName = Field(description="模型显示名称")
    model_id: ModelIdentifier = Field(description="供应商侧的模型标识")
    provider_id: int = Field(gt=0, description="所属供应商 ID")
    capabilities: list[Capability] = Field(
        default_factory=list,
        max_length=20,
        description="模型能力标签",
    )
    context_length: int = Field(default=4096, gt=0, description="上下文窗口大小")
    input_price: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=10,
        decimal_places=6,
        description="每 1K tokens 输入价格",
    )
    output_price: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=10,
        decimal_places=6,
        description="每 1K tokens 输出价格",
    )
    currency: CurrencyCode = Field(default="USD", description="货币代码")
    is_default: bool = Field(default=False, description="是否为平台默认模型")
    description: str | None = Field(
        default=None,
        max_length=2_000,
        description="模型描述",
    )

    @field_validator("capabilities")
    @classmethod
    def validate_capabilities(cls, capabilities: list[str]) -> list[str]:
        if any("," in capability for capability in capabilities):
            raise ValueError("能力标签不能包含逗号")
        if len(",".join(capabilities)) > 500:
            raise ValueError("能力标签总长度不能超过 500 个字符")
        return capabilities

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        return currency.upper() if isinstance(currency, str) else currency


class ModelUpdate(BaseModel):
    """更新模型请求。"""

    name: ModelName | None = Field(default=None, description="模型显示名称")
    capabilities: list[Capability] | None = Field(
        default=None,
        max_length=20,
        description="模型能力标签",
    )
    context_length: int | None = Field(
        default=None,
        gt=0,
        description="上下文窗口大小",
    )
    status: ModelStatus | None = Field(default=None, description="模型状态")
    input_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=6,
        description="每 1K tokens 输入价格",
    )
    output_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=6,
        description="每 1K tokens 输出价格",
    )
    currency: CurrencyCode | None = Field(default=None, description="货币代码")
    is_default: bool | None = Field(default=None, description="是否为平台默认模型")
    description: str | None = Field(
        default=None,
        max_length=2_000,
        description="模型描述；传 null 可清除",
    )

    @field_validator("capabilities")
    @classmethod
    def validate_capabilities(
        cls,
        capabilities: list[str] | None,
    ) -> list[str] | None:
        if capabilities is None:
            return None
        if any("," in capability for capability in capabilities):
            raise ValueError("能力标签不能包含逗号")
        if len(",".join(capabilities)) > 500:
            raise ValueError("能力标签总长度不能超过 500 个字符")
        return capabilities

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        return currency.upper() if isinstance(currency, str) else currency


class ModelRead(BaseModel):
    """模型响应。"""

    id: int
    name: str
    model_id: str
    provider_id: int
    provider_name: str
    capabilities: list[str] = Field(default_factory=list)
    context_length: int
    status: ModelStatus
    input_price: float
    output_price: float
    currency: str
    is_default: bool
    description: str | None

    model_config = {"from_attributes": True}
