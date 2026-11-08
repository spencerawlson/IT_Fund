"""add admin sessions + ai tutor calls tables

Revision ID: f7a3c9d21e84
Revises: c4e8f2a1b6d3
Create Date: 2026-11-08 07:30:00

Admin panel (Kay Ayiti model): password-gated admin sessions, and an
append-only log of every AI tutor call with tokens + computed cost.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7a3c9d21e84'
down_revision: Union[str, Sequence[str], None] = 'c4e8f2a1b6d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('admin_sessions',
        sa.Column('id_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id_hash')
    )
    op.create_table('ai_tutor_calls',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('mode', sa.String(length=32), nullable=False),
        sa.Column('model', sa.String(length=64), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        sa.Column('cached', sa.Boolean(), nullable=False),
        sa.Column('error', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_tutor_calls_user_id'), 'ai_tutor_calls', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_tutor_calls_created_at'), 'ai_tutor_calls', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_tutor_calls_created_at'), table_name='ai_tutor_calls')
    op.drop_index(op.f('ix_ai_tutor_calls_user_id'), table_name='ai_tutor_calls')
    op.drop_table('ai_tutor_calls')
    op.drop_table('admin_sessions')
