"""add prompt tables and max_parallel_calls to job

Revision ID: 5c1e8b7a2d90
Revises: 3f6a2c9d1e47
Create Date: 2026-10-29 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "5c1e8b7a2d90"
down_revision: Union[str, None] = "3f6a2c9d1e47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "prompt",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_uuid", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("slug", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("prompting_type", sa.String(length=32), nullable=False),
        sa.Column("screening_target", sa.String(length=32), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_uuid"], ["user.uuid"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_prompt_owner_uuid", "prompt", ["owner_uuid"])

    op.create_table(
        "prompt_version",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prompt_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("user_prompt", sa.Text(), nullable=False),
        sa.Column("change_note", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["prompt_id"], ["prompt.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
        sa.UniqueConstraint("prompt_id", "version"),
    )

    op.add_column(
        "job",
        sa.Column(
            "max_parallel_calls", sa.Integer(), nullable=False, server_default="20"
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("job", "max_parallel_calls")
    op.drop_table("prompt_version")
    op.drop_index("ix_prompt_owner_uuid", table_name="prompt")
    op.drop_table("prompt")
