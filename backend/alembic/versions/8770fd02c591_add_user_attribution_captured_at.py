"""add attribution_captured_at to users (Ventoryn 30-day window)

Revision ID: 8770fd02c591
Revises: 7df44748bfce
Create Date: 2026-11-12

Capture time for the first-touch campaign tag (users.attribution_tag),
so the 30-day attribution window (decision D3) can be enforced
server-side from the account record. Nullable: legacy rows from PR #37
have a tag but no capture time, and most users have no tag at all.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8770fd02c591'
down_revision: Union[str, Sequence[str], None] = '7df44748bfce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('attribution_captured_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'attribution_captured_at')
