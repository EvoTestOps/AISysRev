"""

Revision ID: add_owner_uuid_to_setting
Revises: 9dbe5fde7764
Create Date: 2026-05-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_owner_uuid_to_setting"
down_revision: Union[str, None] = "9dbe5fde7764"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DELETE FROM setting")
    op.add_column(
        "setting",
        sa.Column("owner_uuid", postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_foreign_key(
        "fk_setting_owner_uuid",
        "setting",
        "user",
        ["owner_uuid"],
        ["uuid"],
        ondelete="CASCADE",
    )
    op.drop_constraint("setting_name_key", "setting", type_="unique")
    op.create_unique_constraint(
        "uq_setting_owner_name", "setting", ["owner_uuid", "name"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_setting_owner_name", "setting", type_="unique")
    op.drop_constraint("fk_setting_owner_uuid", "setting", type_="foreignkey")
    op.drop_column("setting", "owner_uuid")
    op.create_unique_constraint("setting_name_key", "setting", ["name"])
