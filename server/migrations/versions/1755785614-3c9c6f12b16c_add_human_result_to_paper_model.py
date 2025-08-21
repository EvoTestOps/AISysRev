"""Add human_result to paper model

Revision ID: 3c9c6f12b16c
Revises: 061bc4063d18
Create Date: 2025-08-21 14:13:34.656355

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c9c6f12b16c'
down_revision: Union[str, None] = '061bc4063d18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


human_result_enum = sa.Enum('INCLUDE', 'EXCLUDE', 'UNSURE', name='human_result')


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    # Explicitly create enum type first (Alembic async + PG sometimes skips implicit CREATE TYPE)
    human_result_enum.create(bind, checkfirst=True)
    op.add_column('paper', sa.Column('human_result', human_result_enum, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    op.drop_column('paper', 'human_result')
    # Drop enum type (only if no other columns still use it)
    human_result_enum.drop(bind, checkfirst=True)
