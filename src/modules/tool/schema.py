from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ToolType(StrEnum):
    """工具类型"""

    BUILTIN = "builtin"
    HTTP_API = "http_api"
    CUSTOM_FUNCTION = "custom_function"


class ToolStatus(StrEnum):
    """工具状态"""

    ENABLED = "enabled"
    DISABLED = "disabled"
    ERROR = "error"


class FunctionDefinitionSchema(BaseModel):
    """OpenAI Function Calling 格式"""

    name: str = Field(min_length=1, max_length=200, description="函数名称")
    description: str = Field(min_length=1, max_length=1000, description="函数描述")
    parameters: dict[str, Any] = Field(description="JSON Schema 参数定义")

    @field_validator("name", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("不能为空")
        return value


class ToolCreate(BaseModel):
    """注册工具参数"""

    name: str = Field(min_length=1, max_length=200, description="工具名称")
    description: str | None = Field(None, max_length=5000, description="工具描述")
    type: ToolType = Field(description="工具类型")
    config: dict[str, Any] | None = Field(None, description="工具配置")
    function_definition: FunctionDefinitionSchema | None = Field(
        None,
        description="OpenAI Function Calling 定义",
    )

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("工具名称不能为空")
        return value


class ToolUpdate(BaseModel):
    """更新工具参数"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    type: ToolType | None = None
    config: dict[str, Any] | None = None
    function_definition: FunctionDefinitionSchema | None = None

    @field_validator("name")
    @classmethod
    def strip_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("工具名称不能为空")
        return value


class ToolRead(BaseModel):
    """工具响应"""

    id: int
    name: str
    description: str | None
    type: ToolType
    status: ToolStatus
    config: dict[str, Any] | None
    function_definition: dict[str, Any] | None
    call_count_7d: int
    success_rate: float
    avg_latency: int
    created_by: str | None

    model_config = ConfigDict(from_attributes=True)


class ToolTestRequest(BaseModel):
    """测试工具请求"""

    input: dict[str, Any] = Field(description="测试输入参数")


class ToolTestResponse(BaseModel):
    """测试工具响应"""

    success: bool
    output: dict[str, Any] | None = None
    error: str | None = None
    latency_ms: int = 0
    status_code: int | None = None
