"""增加 MinIO 清理任务表

Revision ID: d7f26b91a403
Revises: c3d91a4f2e76
Create Date: 2026-08-05 00:00:00

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "d7f26b91a403"
down_revision: str | Sequence[str] | None = "c3d91a4f2e76"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "knowledge_storage_cleanup_jobs",
        sa.Column(
            "object_name",
            sa.String(length=1000),
            nullable=False,
            comment="待删除的 MinIO 对象路径",
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            comment="清理尝试次数",
        ),
        sa.Column(
            "last_error",
            sa.String(length=500),
            nullable=True,
            comment="最近一次脱敏错误",
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_knowledge_storage_cleanup_jobs_attempts",
        "knowledge_storage_cleanup_jobs",
        ["attempts"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_knowledge_storage_cleanup_jobs_attempts",
        table_name="knowledge_storage_cleanup_jobs",
    )
    op.drop_table("knowledge_storage_cleanup_jobs")
