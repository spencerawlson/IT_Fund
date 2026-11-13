"""add voice_calls + cypher_events (Cyber Missions Phase 2: Cypher voice + analytics)

Revision ID: 9c2d4e7f1a5b
Revises: f671c49993b0
Create Date: 2026-11-13

Two append-only tables (see backend/db_models.py VoiceCall / CypherEvent):
voice_calls logs every ElevenLabs character-voice generation (or fallback)
with chars + model so cost can be computed from the account's own plan;
cypher_events logs Cypher UI interactions (panel opened, mission invite
accepted, hint viewed, debrief viewed, voice played) as counts only — never
conversation content or free text. Mission lifecycle and completion time
come from mission_attempts; tutor cost from ai_tutor_calls.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c2d4e7f1a5b'
down_revision: Union[str, Sequence[str], None] = 'f671c49993b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'voice_calls',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('character', sa.String(length=32), nullable=False),
        sa.Column('model', sa.String(length=64), nullable=False),
        sa.Column('chars', sa.Integer(), nullable=False),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        sa.Column('cached', sa.Boolean(), nullable=False),
        sa.Column('error', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_voice_calls_user_id'), 'voice_calls', ['user_id'], unique=False)
    op.create_index(op.f('ix_voice_calls_created_at'), 'voice_calls', ['created_at'], unique=False)

    op.create_table(
        'cypher_events',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('event', sa.String(length=48), nullable=False),
        sa.Column('mission_id', sa.String(length=64), nullable=True),
        sa.Column('lesson_id', sa.String(length=64), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_cypher_events_user_id'), 'cypher_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_cypher_events_event'), 'cypher_events', ['event'], unique=False)
    op.create_index(op.f('ix_cypher_events_created_at'), 'cypher_events', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_cypher_events_created_at'), table_name='cypher_events')
    op.drop_index(op.f('ix_cypher_events_event'), table_name='cypher_events')
    op.drop_index(op.f('ix_cypher_events_user_id'), table_name='cypher_events')
    op.drop_table('cypher_events')
    op.drop_index(op.f('ix_voice_calls_created_at'), table_name='voice_calls')
    op.drop_index(op.f('ix_voice_calls_user_id'), table_name='voice_calls')
    op.drop_table('voice_calls')
