"""扩展知识库分段与检索配置

Revision ID: b8c4e1a72d90
Revises: 6e5073fe3459
Create Date: 2026-08-04 00:00:00

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "b8c4e1a72d90"
down_revision: str | Sequence[str] | None = "6e5073fe3459"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column(
            "processed_at",
            sa.DateTime(),
            nullable=True,
            comment="处理完成时间",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "chunk_method",
            sa.String(length=20),
            server_default="fixed",
            nullable=False,
            comment="分段方式: fixed/sentence/paragraph",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "chunk_size",
            sa.Integer(),
            server_default=sa.text("500"),
            nullable=False,
            comment="分段大小（tokens）",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "chunk_overlap",
            sa.Integer(),
            server_default=sa.text("50"),
            nullable=False,
            comment="重叠大小（tokens）",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "retrieval_strategy",
            sa.String(length=20),
            server_default="hybrid",
            nullable=False,
            comment="检索策略: keyword/semantic/hybrid",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "top_k",
            sa.Integer(),
            server_default=sa.text("5"),
            nullable=False,
            comment="返回结果数",
        ),
    )
    op.add_column(
        "knowledge_bases",
        sa.Column(
            "similarity_threshold",
            sa.Float(),
            server_default=sa.text("0.7"),
            nullable=False,
            comment="相似度阈值",
        ),
    )

    op.alter_column("knowledge_bases", "chunk_method", server_default=None)
    op.alter_column("knowledge_bases", "chunk_size", server_default=None)
    op.alter_column("knowledge_bases", "chunk_overlap", server_default=None)
    op.alter_column("knowledge_bases", "retrieval_strategy", server_default=None)
    op.alter_column("knowledge_bases", "top_k", server_default=None)
    op.alter_column(
        "knowledge_bases",
        "similarity_threshold",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("knowledge_bases", "similarity_threshold")
    op.drop_column("knowledge_bases", "top_k")
    op.drop_column("knowledge_bases", "retrieval_strategy")
    op.drop_column("knowledge_bases", "chunk_overlap")
    op.drop_column("knowledge_bases", "chunk_size")
    op.drop_column("knowledge_bases", "chunk_method")
    op.drop_column("documents", "processed_at")
