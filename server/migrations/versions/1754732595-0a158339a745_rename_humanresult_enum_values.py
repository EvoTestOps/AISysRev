"""rename humanresult enum values

Revision ID: 0a158339a745
Revises: 3b24d93a1f87
Create Date: 2025-08-09 09:43:15.975857

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a158339a745'
down_revision = "3b24d93a1f87"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Rename old type
    op.execute("ALTER TYPE humanresult RENAME TO humanresult_old;")
    # Create new type with desired labels
    op.execute("CREATE TYPE humanresult AS ENUM ('INCLUDE','EXCLUDE','UNSURE');")
    # Alter column, remapping old values
    op.execute("""
        ALTER TABLE jobtask
        ALTER COLUMN human_result
        TYPE humanresult
        USING (
          CASE human_result::text
            WHEN 'INCLUSION' THEN 'INCLUDE'::humanresult
            WHEN 'EXCLUSION' THEN 'EXCLUDE'::humanresult
            ELSE human_result::text::humanresult
          END
        );
    """)
    # Drop old type
    op.execute("DROP TYPE humanresult_old;")

def downgrade() -> None:
    op.execute("ALTER TYPE humanresult RENAME TO humanresult_new;")
    op.execute("CREATE TYPE humanresult AS ENUM ('INCLUSION','EXCLUSION','UNSURE');")
    op.execute("""
        ALTER TABLE jobtask
        ALTER COLUMN human_result
        TYPE humanresult
        USING (
          CASE human_result::text
            WHEN 'INCLUDE' THEN 'INCLUSION'::humanresult
            WHEN 'EXCLUDE' THEN 'EXCLUSION'::humanresult
            ELSE human_result::text::humanresult
          END
        );
    """)
    op.execute("DROP TYPE humanresult_new;")