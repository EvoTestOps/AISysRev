"""merge pdf screening and github screening heads

Revision ID: ab6839da5eb1
Revises: 659467a3f575, 92167d045d4c
Create Date: 2026-08-14 15:28:56.372796

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'ab6839da5eb1'
down_revision: Union[str, None] = ('659467a3f575', '92167d045d4c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
