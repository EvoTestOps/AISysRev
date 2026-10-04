"""add prompts to jobtask

Revision ID: 3f6a2c9d1e47
Revises: 0b1dbf1c1c2f
Create Date: 2026-10-04 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "3f6a2c9d1e47"
down_revision: Union[str, None] = "0b1dbf1c1c2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "jobtask",
        sa.Column("prompts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("jobtask", "prompts")
