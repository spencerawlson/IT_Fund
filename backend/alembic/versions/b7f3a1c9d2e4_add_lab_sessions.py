"""add lab_sessions (durable, shared interactive-lab sessions)

Revision ID: b7f3a1c9d2e4
Revises: 9cbd9d1457c5
Create Date: 2026-10-05 00:00:00.000000

Lab sessions used to live only in one worker's memory, so a restart or a second worker/instance
made them "not found". This table persists them in the shared database. `owner_id` is an account id
or a `guest:<token>` id and is intentionally NOT a foreign key (most lab users are anonymous guests
with no `users` row).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f3a1c9d2e4'
down_revision: Union[str, Sequence[str], None] = '9cbd9d1457c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'lab_sessions',
        sa.Column('id', sa.String(length=48), nullable=False),
        sa.Column('lab_id', sa.String(length=64), nullable=False),
        sa.Column('owner_id', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('environment_id', sa.String(length=128), nullable=False),
        sa.Column('provider', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('progress', sa.JSON(), nullable=False),
        sa.Column('validation_results', sa.JSON(), nullable=False),
        sa.Column('findings', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_lab_sessions_lab_id'), 'lab_sessions', ['lab_id'], unique=False)
    op.create_index(op.f('ix_lab_sessions_owner_id'), 'lab_sessions', ['owner_id'], unique=False)
    op.create_index(op.f('ix_lab_sessions_expires_at'), 'lab_sessions', ['expires_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_lab_sessions_expires_at'), table_name='lab_sessions')
    op.drop_index(op.f('ix_lab_sessions_owner_id'), table_name='lab_sessions')
    op.drop_index(op.f('ix_lab_sessions_lab_id'), table_name='lab_sessions')
    op.drop_table('lab_sessions')
