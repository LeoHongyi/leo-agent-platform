"""创建 Agent 聚合、版本和调用记录表

Revision ID: 6e5073fe3459
Revises: ad7bfa59fd52
Create Date: 2026-07-31 10:34:45.888577

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6e5073fe3459"
down_revision: str | Sequence[str] | None = "ad7bfa59fd52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("name", sa.String(length=200), nullable=False, comment="Agent 名称"),
        sa.Column("description", sa.Text(), nullable=True, comment="描述"),
        sa.Column(
            "type",
            sa.String(length=50),
            nullable=False,
            comment="类型: conversation/tool/analysis/creative/workflow",
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            comment="状态: draft/inactive/active/error",
        ),
        sa.Column("model_id", sa.BigInteger(), nullable=True, comment="关联模型 ID"),
        sa.Column("prompt_id", sa.BigInteger(), nullable=True, comment="关联 Prompt ID"),
        sa.Column("config", sa.JSON(), nullable=True, comment="Agent 完整配置"),
        sa.Column(
            "success_rate",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            comment="近 7 日成功率 %",
        ),
        sa.Column(
            "call_count_7d",
            sa.Integer(),
            nullable=False,
            comment="近 7 日调用次数",
        ),
        sa.Column(
            "version",
            sa.String(length=50),
            nullable=True,
            comment="当前已发布版本号",
        ),
        sa.Column(
            "current_version_id",
            sa.BigInteger(),
            nullable=True,
            comment="当前发布版本 ID",
        ),
        sa.Column(
            "created_by",
            sa.String(length=100),
            nullable=True,
            comment="创建者",
        ),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="创建时间",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="更新时间",
        ),
        sa.ForeignKeyConstraint(
            ["model_id"],
            ["models.id"],
            name="fk_agents_model_id_models",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["prompt_id"],
            ["prompts.id"],
            name="fk_agents_prompt_id_prompts",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_agents_name"),
    )
    op.create_index("ix_agents_model_id", "agents", ["model_id"])
    op.create_index("ix_agents_prompt_id", "agents", ["prompt_id"])
    op.create_index("ix_agents_current_version_id", "agents", ["current_version_id"])

    op.create_table(
        "agent_versions",
        sa.Column("agent_id", sa.BigInteger(), nullable=False, comment="所属 Agent ID"),
        sa.Column("version", sa.String(length=50), nullable=False, comment="版本号"),
        sa.Column("name", sa.String(length=200), nullable=False, comment="名称快照"),
        sa.Column("description", sa.Text(), nullable=True, comment="描述快照"),
        sa.Column("type", sa.String(length=50), nullable=False, comment="类型快照"),
        sa.Column("model_id", sa.BigInteger(), nullable=True, comment="模型 ID 快照"),
        sa.Column("prompt_id", sa.BigInteger(), nullable=True, comment="Prompt ID 快照"),
        sa.Column("config", sa.JSON(), nullable=False, comment="完整运行配置快照"),
        sa.Column(
            "changelog",
            sa.String(length=500),
            nullable=True,
            comment="变更说明",
        ),
        sa.Column(
            "is_current",
            sa.Boolean(),
            nullable=False,
            comment="是否为当前版本",
        ),
        sa.Column(
            "published_by",
            sa.String(length=100),
            nullable=True,
            comment="发布者",
        ),
        sa.Column(
            "published_at",
            sa.DateTime(),
            nullable=True,
            comment="发布时间",
        ),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="创建时间",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="更新时间",
        ),
        sa.ForeignKeyConstraint(
            ["agent_id"],
            ["agents.id"],
            name="fk_agent_versions_agent_id_agents",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "agent_id",
            "version",
            name="uq_agent_versions_agent_version",
        ),
    )
    op.create_index("ix_agent_versions_agent_id", "agent_versions", ["agent_id"])
    op.create_foreign_key(
        "fk_agents_current_version_id_agent_versions",
        "agents",
        "agent_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "agent_knowledge_bases",
        sa.Column("agent_id", sa.BigInteger(), nullable=False),
        sa.Column("knowledge_base_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["agent_id"],
            ["agents.id"],
            name="fk_agent_knowledge_bases_agent_id_agents",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["knowledge_base_id"],
            ["knowledge_bases.id"],
            name="fk_agent_knowledge_bases_kb_id_knowledge_bases",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("agent_id", "knowledge_base_id"),
    )

    op.create_table(
        "agent_tools",
        sa.Column("agent_id", sa.BigInteger(), nullable=False),
        sa.Column("tool_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["agent_id"],
            ["agents.id"],
            name="fk_agent_tools_agent_id_agents",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tool_id"],
            ["tools.id"],
            name="fk_agent_tools_tool_id_tools",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("agent_id", "tool_id"),
    )

    op.create_table(
        "agent_invocation_logs",
        sa.Column("agent_id", sa.BigInteger(), nullable=False, comment="Agent ID"),
        sa.Column("success", sa.Boolean(), nullable=False, comment="是否调用成功"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, comment="调用延迟"),
        sa.Column(
            "error",
            sa.String(length=500),
            nullable=True,
            comment="脱敏错误摘要",
        ),
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="创建时间",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
            comment="更新时间",
        ),
        sa.ForeignKeyConstraint(
            ["agent_id"],
            ["agents.id"],
            name="fk_agent_invocation_logs_agent_id_agents",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_agent_invocation_logs_agent_id",
        "agent_invocation_logs",
        ["agent_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_invocation_logs_agent_id",
        table_name="agent_invocation_logs",
    )
    op.drop_table("agent_invocation_logs")
    op.drop_table("agent_tools")
    op.drop_table("agent_knowledge_bases")
    op.drop_constraint(
        "fk_agents_current_version_id_agent_versions",
        "agents",
        type_="foreignkey",
    )
    op.drop_index("ix_agent_versions_agent_id", table_name="agent_versions")
    op.drop_table("agent_versions")
    op.drop_index("ix_agents_current_version_id", table_name="agents")
    op.drop_index("ix_agents_prompt_id", table_name="agents")
    op.drop_index("ix_agents_model_id", table_name="agents")
    op.drop_table("agents")
