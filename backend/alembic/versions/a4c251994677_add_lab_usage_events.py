"""add lab_usage_events ledger and subscriptions.current_period_start

Revision ID: a4c251994677
Revises: 6e8f065cfbab
Create Date: 2026-11-23

Phase 0 of the included lab-hours design (shadow mode: measure, don't
charge). Creates the durable usage ledger `lab_usage_events` — one row per
Docker lab session for a signed-in subscriber, written at session start and
finalized at termination — and adds `subscriptions.current_period_start`,
the billing-period start anchor the meter needs to compute the current
window (the webhook already stored current_period_end). No backfill: usage
starts at launch; legacy subscription rows keep NULL current_period_start
and the meter falls back to a 31-day window ending at current_period_end.

No Stripe calls, no invoices, no charging in this phase — the table is
write-only measurement until Phase 1 (period-end invoicing), which is
gated on the shadow period proving the ledger plus a separate go.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a4c251994677'
down_revision: Union[str, None] = '6e8f065cfbab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lab_usage_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('lab_id', sa.String(length=64), nullable=False),
        sa.Column('provider', sa.String(length=16), nullable=False, server_default='docker'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('billed_seconds', sa.Integer(), nullable=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id'),
    )
    op.create_index('ix_lab_usage_events_user_id', 'lab_usage_events', ['user_id'])
    op.create_index('ix_lab_usage_events_lab_id', 'lab_usage_events', ['lab_id'])
    op.add_column(
        'subscriptions',
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('subscriptions', 'current_period_start')
    op.drop_index('ix_lab_usage_events_lab_id', table_name='lab_usage_events')
    op.drop_index('ix_lab_usage_events_user_id', table_name='lab_usage_events')
    op.drop_table('lab_usage_events')
