"""add attribution_tag to users (Ventoryn campaign attribution)

Revision ID: d4f29a7c3b81
Revises: f7a3c9d21e84
Create Date: 2026-11-09 09:00:00

First-touch campaign attribution tag captured from an incoming
Ventoryn-signed link (utm_content=vtn_...), set once at Checkout
creation and never overwritten. Nullable: most users have none.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4f29a7c3b81'
down_revision: Union[str, Sequence[str], None] = 'f7a3c9d21e84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('attribution_tag', sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'attribution_tag')
