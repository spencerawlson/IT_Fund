"""add mission_attempts (Cyber Missions vertical slice)

Revision ID: f671c49993b0
Revises: 8770fd02c591
Create Date: 2026-11-13

One row per Cyber Mission attempt (see backend/db_models.py MissionAttempt):
the wrapped lab session, the versioned mission findings, the objectives
passed at last evaluation, the append-only choices log, and the XP awarded
on completion. user_id is intentionally NOT a foreign key (matching
lab_sessions' owner_id pattern).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f671c49993b0'
down_revision: Union[str, Sequence[str], None] = '8770fd02c591'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'mission_attempts',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('mission_id', sa.String(length=64), nullable=False),
        sa.Column('definition_version', sa.Integer(), nullable=False),
        sa.Column('lab_session_id', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('objectives_passed', sa.JSON(), nullable=False),
        sa.Column('choices', sa.JSON(), nullable=False),
        sa.Column('findings', sa.JSON(), nullable=False),
        sa.Column('xp_awarded', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_mission_attempts_user_id'), 'mission_attempts', ['user_id'], unique=False)
    op.create_index(op.f('ix_mission_attempts_mission_id'), 'mission_attempts', ['mission_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_mission_attempts_mission_id'), table_name='mission_attempts')
    op.drop_index(op.f('ix_mission_attempts_user_id'), table_name='mission_attempts')
    op.drop_table('mission_attempts')
