"""Prompting type enum for Job

Revision ID: f967bdc7fa50
Revises: 484fca367572
Create Date: 2025-09-19 10:16:38.506899

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f967bdc7fa50"
down_revision: Union[str, None] = "484fca367572"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


prompting_type_enum = sa.Enum(
    "ONE_SHOT", "ZERO_SHOT", "FEW_SHOT", name="prompting_type"
)


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    prompting_type_enum.create(bind, checkfirst=True)

    op.add_column(
        "job",
        sa.Column("prompting_type", prompting_type_enum, nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    op.drop_column("job", "prompting_type")
    prompting_type_enum.drop(bind, checkfirst=True)
