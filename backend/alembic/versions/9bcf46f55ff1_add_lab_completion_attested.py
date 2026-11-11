"""add attested flag to lab_completions

Revision ID: 9bcf46f55ff1
Revises: aaf90fdbaa4d
Create Date: 2026-11-11

L-01 (partial mitigation): Docker labs complete via explicit client
attestation ("I did this") because their exec returns no findings, while
mock-lab completions are server-evidenced. Record the provenance so
GET /labs/history can tell the two apart: `attested` is True when a
completion rested on client-posted findings rather than server-side
evidence. Defaults False (existing rows are pre-flag completions, and
mock labs never set it).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bcf46f55ff1'
down_revision: Union[str, Sequence[str], None] = 'aaf90fdbaa4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'lab_completions',
        sa.Column('attested', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # The server default only backfills existing rows; the ORM model carries
    # no server default, so drop it again (Postgres only — SQLite cannot
    # ALTER a column default, and the check suite runs against Postgres).
    if op.get_bind().dialect.name == "postgresql":
        op.alter_column('lab_completions', 'attested', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('lab_completions', 'attested')
