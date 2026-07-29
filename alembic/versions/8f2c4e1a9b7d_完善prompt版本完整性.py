"""完善 Prompt 版本完整性

Revision ID: 8f2c4e1a9b7d
Revises: 6d595efa2a58
Create Date: 2026-07-29 15:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "8f2c4e1a9b7d"
down_revision: Union[str, Sequence[str], None] = "6d595efa2a58"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalize_duplicate_versions() -> None:
    """为历史重复版本保留数据，同时腾出唯一版本号约束。"""
    bind = op.get_bind()
    duplicates = bind.execute(
        sa.text(
            """
            SELECT prompt_id, version
            FROM prompt_versions
            GROUP BY prompt_id, version
            HAVING COUNT(*) > 1
            """
        )
    ).all()

    for prompt_id, version in duplicates:
        version_ids = list(
            bind.execute(
                sa.text(
                    """
                    SELECT id
                    FROM prompt_versions
                    WHERE prompt_id = :prompt_id AND version = :version
                    ORDER BY id
                    """
                ),
                {"prompt_id": prompt_id, "version": version},
            ).scalars()
        )
        current_version_id = bind.execute(
            sa.text(
                """
                SELECT current_version_id
                FROM prompts
                WHERE id = :prompt_id
                """
            ),
            {"prompt_id": prompt_id},
        ).scalar_one_or_none()
        keep_id = (
            current_version_id
            if current_version_id in version_ids
            else version_ids[0]
        )

        for version_id in version_ids:
            if version_id == keep_id:
                continue
            suffix = f"-legacy-{version_id}"
            normalized_version = f"{version[: 50 - len(suffix)]}{suffix}"
            bind.execute(
                sa.text(
                    """
                    UPDATE prompt_versions
                    SET version = :normalized_version
                    WHERE id = :version_id
                    """
                ),
                {
                    "normalized_version": normalized_version,
                    "version_id": version_id,
                },
            )


def upgrade() -> None:
    op.add_column(
        "prompt_versions",
        sa.Column(
            "variables",
            sa.JSON(),
            nullable=True,
            comment="该版本的变量定义快照",
        ),
    )
    op.add_column(
        "prompts",
        sa.Column(
            "current_version_id",
            sa.BigInteger(),
            nullable=True,
            comment="当前已发布版本 ID",
        ),
    )
    op.alter_column(
        "prompts",
        "version",
        existing_type=sa.String(length=50),
        nullable=True,
        existing_comment="当前版本号",
        comment="当前已发布版本号；草稿未发布时为空",
    )

    op.execute(
        """
        UPDATE prompt_versions AS pv
        JOIN prompts AS p ON p.id = pv.prompt_id
        SET pv.variables = p.variables
        WHERE pv.variables IS NULL
        """
    )
    op.execute(
        """
        UPDATE prompts AS p
        JOIN (
            SELECT prompt_id, MAX(id) AS version_id
            FROM prompt_versions
            WHERE is_current = 1
            GROUP BY prompt_id
        ) AS current_versions
            ON current_versions.prompt_id = p.id
        SET p.current_version_id = current_versions.version_id
        """
    )
    op.execute(
        """
        UPDATE prompts AS p
        JOIN (
            SELECT prompt_id, MAX(id) AS version_id
            FROM prompt_versions
            GROUP BY prompt_id
        ) AS latest_versions
            ON latest_versions.prompt_id = p.id
        SET p.current_version_id = latest_versions.version_id
        WHERE p.status = 'published' AND p.current_version_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE prompt_versions AS pv
        LEFT JOIN prompts AS p ON p.current_version_id = pv.id
        SET pv.is_current = CASE
            WHEN p.id IS NULL THEN 0
            ELSE 1
        END
        """
    )
    op.execute(
        """
        UPDATE prompts
        SET version = NULL
        WHERE status = 'draft' AND current_version_id IS NULL
        """
    )

    _normalize_duplicate_versions()

    op.create_unique_constraint(
        "uq_prompt_versions_prompt_version",
        "prompt_versions",
        ["prompt_id", "version"],
    )
    op.create_index(
        "ix_prompts_current_version_id",
        "prompts",
        ["current_version_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_prompts_current_version_id_prompt_versions",
        "prompts",
        "prompt_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_prompts_current_version_id_prompt_versions",
        "prompts",
        type_="foreignkey",
    )
    op.drop_index("ix_prompts_current_version_id", table_name="prompts")
    op.drop_constraint(
        "uq_prompt_versions_prompt_version",
        "prompt_versions",
        type_="unique",
    )
    op.execute(
        """
        UPDATE prompts
        SET version = 'v0.1'
        WHERE version IS NULL
        """
    )
    op.alter_column(
        "prompts",
        "version",
        existing_type=sa.String(length=50),
        nullable=False,
        existing_comment="当前已发布版本号；草稿未发布时为空",
        comment="当前版本号",
    )
    op.drop_column("prompts", "current_version_id")
    op.drop_column("prompt_versions", "variables")
