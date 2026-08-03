from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import Base, BaseModel


agent_knowledge_bases = Table(
    "agent_knowledge_bases",
    Base.metadata,
    Column(
        "agent_id",
        BigInteger,
        ForeignKey("agents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "knowledge_base_id",
        BigInteger,
        ForeignKey("knowledge_bases.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


agent_tools = Table(
    "agent_tools",
    Base.metadata,
    Column(
        "agent_id",
        BigInteger,
        ForeignKey("agents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tool_id",
        BigInteger,
        ForeignKey("tools.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class Agent(BaseModel):
    """Agent 表"""

    __tablename__ = "agents"

    name: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        comment="Agent 名称",
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="描述"
    )
    type: Mapped[str] = mapped_column(
        String(50), comment="类型: conversation/tool/analysis/creative/workflow"
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="draft",
        comment="状态: draft/inactive/active/error",
    )

    # 关联模型（外键）
    model_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("models.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="关联模型 ID",
    )
    prompt_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("prompts.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="关联 Prompt ID",
    )

    config: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="Agent 完整配置"
    )

    # 运行统计
    success_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), default=0, comment="近 7 日成功率 %"
    )
    call_count_7d: Mapped[int] = mapped_column(
        Integer, default=0, comment="近 7 日调用次数"
    )

    version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=None,
        comment="当前已发布版本号",
    )
    current_version_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "agent_versions.id",
            name="fk_agents_current_version_id_agent_versions",
            ondelete="SET NULL",
            use_alter=True,
        ),
        nullable=True,
        default=None,
        index=True,
        comment="当前发布版本 ID",
    )

    created_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="创建者"
    )

    versions: Mapped[list["AgentVersion"]] = relationship(
        "AgentVersion",
        back_populates="agent",
        foreign_keys="AgentVersion.agent_id",
        order_by="AgentVersion.id.desc()",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class AgentVersion(BaseModel):
    """Agent 版本表"""

    __tablename__ = "agent_versions"
    __table_args__ = (
        UniqueConstraint(
            "agent_id",
            "version",
            name="uq_agent_versions_agent_version",
        ),
    )

    agent_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        comment="所属 Agent ID",
    )
    version: Mapped[str] = mapped_column(String(50), comment="版本号")
    name: Mapped[str] = mapped_column(String(200), comment="名称快照")
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="描述快照",
    )
    type: Mapped[str] = mapped_column(String(50), comment="类型快照")
    model_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        comment="模型 ID 快照",
    )
    prompt_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Prompt ID 快照",
    )
    config: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        comment="完整运行配置快照",
    )
    changelog: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="变更说明"
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否为当前版本"
    )
    published_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="发布者"
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="发布时间"
    )

    agent: Mapped["Agent"] = relationship(
        "Agent",
        back_populates="versions",
        foreign_keys=[agent_id],
    )


class AgentInvocationLog(BaseModel):
    """Agent 调用记录，用于维护近 7 日运行统计。"""

    __tablename__ = "agent_invocation_logs"

    agent_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        comment="Agent ID",
    )
    success: Mapped[bool] = mapped_column(Boolean, comment="是否调用成功")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, comment="调用延迟")
    error: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="脱敏错误摘要",
    )
