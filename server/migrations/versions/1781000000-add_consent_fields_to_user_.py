"""

Revision ID: add_consent_fields_to_user
Revises: add_owner_uuid_to_setting
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_consent_fields_to_user'
down_revision: Union[str, None] = 'add_owner_uuid_to_setting'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user', sa.Column('terms_version_accepted', sa.String(length=64), nullable=True))
    op.add_column('user', sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user', sa.Column('privacy_policy_version_accepted', sa.String(length=64), nullable=True))
    op.add_column('user', sa.Column('privacy_policy_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user', sa.Column('consent_anonymized_research_usage', sa.Boolean(), nullable=True))
    op.add_column('user', sa.Column('consent_anonymized_research_usage_updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user', 'consent_anonymized_research_usage_updated_at')
    op.drop_column('user', 'consent_anonymized_research_usage')
    op.drop_column('user', 'privacy_policy_accepted_at')
    op.drop_column('user', 'privacy_policy_version_accepted')
    op.drop_column('user', 'terms_accepted_at')
    op.drop_column('user', 'terms_version_accepted')
