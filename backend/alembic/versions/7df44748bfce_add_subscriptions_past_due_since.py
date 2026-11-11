"""add past_due_since to subscriptions

Revision ID: 7df44748bfce
Revises: 9bcf46f55ff1
Create Date: 2026-11-11

Refund / past_due policy (Spencer's decision, 2026-11-11): a past_due
subscription keeps access for a 7-day grace before it is revoked. The grace
is anchored at the moment the subscription went past_due — NOT at
current_period_end, which Stripe advances to the end of the new (unpaid)
period when a renewal fails, so anchoring there would grant a full extra
month. `past_due_since` records that moment (set by the webhook in
billing._sync_from_subscription); it is cleared when the status leaves
past_due, and never reset by later updated events while past_due, or the
grace would never expire.

Backfill: rows already past_due at migration time get past_due_since =
updated_at (the last webhook sync — the best available proxy for when the
status flipped). Rows in any other status get NULL.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7df44748bfce'
down_revision: Union[str, Sequence[str], None] = '9bcf46f55ff1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'subscriptions',
        sa.Column('past_due_since', sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE subscriptions SET past_due_since = updated_at WHERE status = 'past_due'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('subscriptions', 'past_due_since')
