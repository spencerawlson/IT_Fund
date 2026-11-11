"""add processed_webhook_events (webhook idempotency + ordering)

Revision ID: 4d120c0bc45b
Revises: d4f29a7c3b81
Create Date: 2026-11-11

One row per Stripe webhook event id that was actually applied (see
backend/billing.py). A redelivered event id is acknowledged without
re-applying, and event_created per subscription lets the handler ignore
events older than the last-applied one, so a delayed
customer.subscription.updated(active) cannot resurrect a subscription
that a newer customer.subscription.deleted already cancelled.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d120c0bc45b'
down_revision: Union[str, Sequence[str], None] = 'd4f29a7c3b81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('processed_webhook_events',
        sa.Column('stripe_event_id', sa.String(length=255), nullable=False),
        sa.Column('stripe_subscription_id', sa.String(length=64), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('event_created', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('stripe_event_id')
    )
    op.create_index(op.f('ix_processed_webhook_events_stripe_subscription_id'), 'processed_webhook_events', ['stripe_subscription_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_processed_webhook_events_stripe_subscription_id'), table_name='processed_webhook_events')
    op.drop_table('processed_webhook_events')
