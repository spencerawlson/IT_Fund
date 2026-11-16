"""add manual grants table (admin in-person enrollment)

Revision ID: 32e3cf2c4fa0
Revises: 9c2d4e7f1a5b
Create Date: 2026-11-16

Admin panel: one admin-granted paid-access grant per user. The grant is
recorded distinctly from Stripe state (the subscriptions table is written
only by the Stripe webhook) and is active while revoked_at is NULL;
revoking stamps revoked_at instead of deleting the row.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32e3cf2c4fa0'
down_revision: Union[str, Sequence[str], None] = '9c2d4e7f1a5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('manual_grants',
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('note', sa.String(length=500), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_note', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('manual_grants')
