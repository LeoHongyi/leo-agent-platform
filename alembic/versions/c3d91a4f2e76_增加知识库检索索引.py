"""增加知识库文档和分段检索索引

Revision ID: c3d91a4f2e76
Revises: b8c4e1a72d90
Create Date: 2026-08-05 00:00:00

"""
from typing import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "c3d91a4f2e76"
down_revision: str | Sequence[str] | None = "b8c4e1a72d90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "knowledge_bases",
        "retrieval_strategy",
        existing_type=sa.String(length=20),
        comment="检索策略: keyword/semantic/hybrid",
        existing_nullable=False,
    )
    op.create_index(
        "ix_documents_knowledge_base_status",
        "documents",
        ["knowledge_base_id", "status"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_segments_document_position",
        "segments",
        ["document_id", "position"],
    )
    op.create_index(
        "ix_segments_knowledge_base_document_position",
        "segments",
        ["knowledge_base_id", "document_id", "position"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_segments_knowledge_base_document_position",
        table_name="segments",
    )
    op.drop_constraint(
        "uq_segments_document_position",
        "segments",
        type_="unique",
    )
    op.drop_index(
        "ix_documents_knowledge_base_status",
        table_name="documents",
    )
    op.alter_column(
        "knowledge_bases",
        "retrieval_strategy",
        existing_type=sa.String(length=20),
        comment="检索策略: vector/fulltext/hybrid",
        existing_nullable=False,
    )
