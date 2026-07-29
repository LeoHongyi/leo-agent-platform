from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


PromptName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]
PromptCategory = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
PromptTag = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
VariableName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
VariableType = Literal["string", "number", "boolean", "text"]


class PromptVariableSchema(BaseModel):
    """Prompt 变量定义"""

    name: VariableName = Field(description="变量名")
    type: VariableType = Field(default="string", description="变量类型")
    description: str = Field(default="", max_length=500, description="变量说明")
    default_value: str | None = Field(
        default=None,
        max_length=2000,
        description="默认值",
    )
    required: bool = Field(default=True, description="是否必填")


class PromptCreate(BaseModel):
    name: PromptName = Field(description="Prompt 名称")
    description: str | None = Field(
        default=None,
        max_length=500,
        description="描述",
    )
    category: PromptCategory = Field(default="general", description="分类")
    tags: list[PromptTag] = Field(
        default_factory=list,
        max_length=50,
        description="标签列表",
    )
    content: str = Field(min_length=1, description="Prompt 正文内容")
    variables: list[PromptVariableSchema] = Field(
        default_factory=list,
        max_length=100,
        description="变量定义",
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Prompt 内容不能为空")
        return value


class PromptUpdate(BaseModel):
    name: PromptName | None = Field(default=None, description="Prompt 名称")
    description: str | None = Field(
        default=None,
        max_length=500,
        description="描述",
    )
    category: PromptCategory | None = Field(default=None, description="分类")
    tags: list[PromptTag] | None = Field(
        default=None,
        max_length=50,
        description="标签列表",
    )
    content: str | None = Field(default=None, min_length=1, description="正文内容")
    variables: list[PromptVariableSchema] | None = Field(
        default=None,
        max_length=100,
        description="变量定义",
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Prompt 内容不能为空")
        return value

    @model_validator(mode="after")
    def reject_null_for_non_nullable_fields(self) -> "PromptUpdate":
        for field_name in ("name", "category", "tags", "content", "variables"):
            if (
                field_name in self.model_fields_set
                and getattr(self, field_name) is None
            ):
                raise ValueError(f"{field_name} 不能为 null")
        return self


class PromptRead(BaseModel):
    id: int
    name: str
    description: str | None
    category: str
    tags: list[str]
    content: str
    variables: list[PromptVariableSchema]
    version: str | None
    status: str
    created_by: str | None
    current_version_id: int | None

    model_config = {"from_attributes": True}


class PromptVersionRead(BaseModel):
    id: int
    prompt_id: int
    version: str
    content: str
    variables: list[PromptVariableSchema]
    changelog: str | None
    is_current: bool
    published_by: str | None
    published_at: datetime | None

    model_config = {"from_attributes": True}


class PublishRequest(BaseModel):
    """发布请求"""

    changelog: str = Field(default="", max_length=500, description="变更说明")


class RollbackRequest(BaseModel):
    """回滚请求"""

    version_id: int = Field(ge=1, description="要回滚到的版本 ID")
