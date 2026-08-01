from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PositiveInt,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel


AgentName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]


class AgentType(StrEnum):
    CONVERSATION = "conversation"
    TOOL = "tool"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    WORKFLOW = "workflow"


class AgentStatus(StrEnum):
    DRAFT = "draft"
    INACTIVE = "inactive"
    ACTIVE = "active"
    ERROR = "error"


class RetrievalStrategy(StrEnum):
    KEYWORD = "keyword"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"


class AgentConfigBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class AgentRequestBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AgentModelConfig(AgentConfigBase):
    model_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="供应商侧模型标识；必须与顶层 model_id 指向的模型一致",
    )
    temperature: float = Field(
        default=0.7,
        ge=0,
        le=2,
        description="采样温度",
    )
    max_tokens: int = Field(
        default=2_048,
        ge=1,
        le=1_000_000,
        description="单次响应最大 Token 数",
    )
    top_p: float = Field(
        default=1,
        gt=0,
        le=1,
        description="核采样概率",
    )


class AgentPromptConfig(AgentConfigBase):
    system_prompt: str = Field(
        default="",
        max_length=100_000,
        description="附加系统提示词",
    )
    prompt_template_id: PositiveInt | None = Field(
        default=None,
        description="关联的已发布 Prompt ID",
    )


class AgentRagConfig(AgentConfigBase):
    enabled: bool = Field(default=False, description="是否启用知识库检索")
    knowledge_base_ids: list[PositiveInt] = Field(
        default_factory=list,
        max_length=50,
        description="关联知识库 ID",
    )
    retrieval_strategy: RetrievalStrategy = Field(
        default=RetrievalStrategy.HYBRID,
        description="检索策略",
    )
    top_k: int = Field(default=5, ge=1, le=100, description="召回分段数量")
    similarity_threshold: float = Field(
        default=0.7,
        ge=0,
        le=1,
        description="相似度阈值",
    )

    @field_validator("knowledge_base_ids")
    @classmethod
    def unique_knowledge_base_ids(
        cls,
        values: list[int],
    ) -> list[int]:
        if len(values) != len(set(values)):
            raise ValueError("knowledgeBaseIds 不能重复")
        return values

    @model_validator(mode="after")
    def require_knowledge_bases_when_enabled(self) -> "AgentRagConfig":
        if self.enabled and not self.knowledge_base_ids:
            raise ValueError("启用 RAG 时必须选择至少一个知识库")
        return self


class AgentToolsConfig(AgentConfigBase):
    enabled: bool = Field(default=False, description="是否启用工具调用")
    tool_ids: list[PositiveInt] = Field(
        default_factory=list,
        max_length=100,
        description="关联工具 ID",
    )

    @field_validator("tool_ids")
    @classmethod
    def unique_tool_ids(cls, values: list[int]) -> list[int]:
        if len(values) != len(set(values)):
            raise ValueError("toolIds 不能重复")
        return values

    @model_validator(mode="after")
    def require_tools_when_enabled(self) -> "AgentToolsConfig":
        if self.enabled and not self.tool_ids:
            raise ValueError("启用工具时必须选择至少一个工具")
        return self


class AgentAdvancedConfig(AgentConfigBase):
    welcome_message: str = Field(
        default="",
        max_length=2_000,
        description="欢迎语",
    )
    suggested_questions: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    ] = Field(
        default_factory=list,
        max_length=20,
        description="推荐问题",
    )
    max_turns: int = Field(default=20, ge=1, le=1_000, description="最大对话轮数")
    timeout: float = Field(default=30, gt=0, le=300, description="调用超时秒数")


class AgentConfigSchema(AgentConfigBase):
    """Agent 配置"""

    model: AgentModelConfig = Field(default_factory=AgentModelConfig)
    prompt: AgentPromptConfig = Field(default_factory=AgentPromptConfig)
    rag: AgentRagConfig = Field(default_factory=AgentRagConfig)
    tools: AgentToolsConfig = Field(default_factory=AgentToolsConfig)
    advanced: AgentAdvancedConfig = Field(default_factory=AgentAdvancedConfig)


class AgentCreate(AgentRequestBase):
    name: AgentName = Field(description="Agent 名称")
    description: str | None = Field(
        default=None,
        max_length=5_000,
        description="Agent 描述",
    )
    type: AgentType = Field(description="Agent 类型")
    model_id: PositiveInt | None = Field(
        default=None,
        description="关联模型数据库 ID；草稿阶段可为空",
    )
    config: AgentConfigSchema = Field(default_factory=AgentConfigSchema)


class AgentUpdate(AgentRequestBase):
    name: AgentName | None = Field(default=None, description="Agent 名称")
    description: str | None = Field(
        default=None,
        max_length=5_000,
        description="Agent 描述；传 null 可清除",
    )
    type: AgentType | None = Field(default=None, description="Agent 类型")
    model_id: PositiveInt | None = Field(
        default=None,
        description="关联模型 ID；传 null 可清除",
    )
    config: AgentConfigSchema | None = Field(
        default=None,
        description="完整运行配置；传 null 可清空",
    )


class AgentRead(BaseModel):
    id: int
    name: str
    description: str | None
    type: AgentType
    status: AgentStatus
    model_id: int | None
    prompt_id: int | None
    config: AgentConfigSchema | None
    success_rate: float = Field(ge=0, le=100)
    call_count_7d: int
    version: str | None
    current_version_id: int | None
    created_by: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentVersionRead(BaseModel):
    id: int
    agent_id: int
    version: str
    name: str
    description: str | None
    type: AgentType
    model_id: int | None
    prompt_id: int | None
    config: AgentConfigSchema
    changelog: str | None
    is_current: bool
    published_by: str | None
    published_at: datetime | None

    model_config = {"from_attributes": True}


class PublishRequest(AgentRequestBase):
    changelog: str = Field(default="", max_length=500, description="版本说明")


class RollbackRequest(AgentRequestBase):
    version_id: PositiveInt = Field(description="目标版本 ID")


class AgentMessage(AgentRequestBase):
    role: Literal["user", "assistant"] = Field(description="消息角色")
    content: str = Field(min_length=1, max_length=100_000, description="消息内容")


class AgentInvokeRequest(AgentRequestBase):
    input: str = Field(
        min_length=1,
        max_length=100_000,
        description="本轮用户输入",
    )
    history: list[AgentMessage] = Field(
        default_factory=list,
        max_length=200,
        description="历史对话",
    )
    variables: dict[str, str | int | float | bool] = Field(
        default_factory=dict,
        description="Prompt 模板变量",
    )


class AgentInvokeResponse(BaseModel):
    content: str | None
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    usage: dict[str, Any] | None = None
    model_id: str
    latency_ms: int = Field(ge=0)
