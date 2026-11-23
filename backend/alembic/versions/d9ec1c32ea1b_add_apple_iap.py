"""add Apple IAP columns to subscriptions + processed_apple_notifications

Revision ID: d9ec1c32ea1b
Revises: 7b3e9d1c4a62
Create Date: 2026-11-23

In-app purchases (App Store Guideline 3.1.1, StoreKit 2 direct). The
`subscriptions` row gains a `provider` ("stripe" | "apple") and the
latest verified Apple transaction, so Stripe and Apple are two sources of
truth for the same row instead of a parallel subscription table:

- provider: "stripe" for every existing row (server default), "apple"
  once an Apple transaction is verified for the user.
- apple_original_transaction_id: stable across renewals; how server
  notifications find the account to update. Indexed.
- apple_transaction_id / apple_product_id: the latest verified transaction.
- stripe_customer_id becomes nullable: an Apple-only subscriber has no
  Stripe customer. (Postgres and SQLite both allow multiple NULLs in a
  unique index, so the uniqueness guarantee for real customer ids is
  unchanged.) The alter uses batch mode so the migration also runs on
  SQLite, where a plain ALTER COLUMN ... DROP NOT NULL is unsupported.

Also creates `processed_apple_notifications` — one row per App Store
Server Notification UUID applied, the Apple-side equivalent of
`processed_webhook_events`, so a retried delivery is acknowledged
without re-applying.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd9ec1c32ea1b'
down_revision: Union[str, None] = '7b3e9d1c4a62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'subscriptions',
        sa.Column('provider', sa.String(length=16), nullable=False, server_default='stripe'),
    )
    op.add_column(
        'subscriptions',
        sa.Column('apple_original_transaction_id', sa.String(length=64), nullable=True),
    )
    op.add_column(
        'subscriptions',
        sa.Column('apple_transaction_id', sa.String(length=64), nullable=True),
    )
    op.add_column(
        'subscriptions',
        sa.Column('apple_product_id', sa.String(length=128), nullable=True),
    )
    op.create_index(
        'ix_subscriptions_apple_original_transaction_id',
        'subscriptions',
        ['apple_original_transaction_id'],
    )
    # Batch mode: SQLite cannot ALTER COLUMN nullability in place; the
    # batch rewrite works on both SQLite and Postgres.
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.alter_column(
            'stripe_customer_id',
            existing_type=sa.String(length=64),
            nullable=True,
        )
    op.create_table(
        'processed_apple_notifications',
        sa.Column('notification_uuid', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('original_transaction_id', sa.String(length=64), nullable=True),
        sa.Column('notification_type', sa.String(length=64), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('notification_uuid'),
    )
    op.create_index(
        'ix_processed_apple_notifications_user_id',
        'processed_apple_notifications',
        ['user_id'],
    )
    op.create_index(
        'ix_processed_apple_notifications_original_transaction_id',
        'processed_apple_notifications',
        ['original_transaction_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_processed_apple_notifications_original_transaction_id',
        table_name='processed_apple_notifications',
    )
    op.drop_index(
        'ix_processed_apple_notifications_user_id',
        table_name='processed_apple_notifications',
    )
    op.drop_table('processed_apple_notifications')
    with op.batch_alter_table('subscriptions') as batch_op:
        batch_op.alter_column(
            'stripe_customer_id',
            existing_type=sa.String(length=64),
            nullable=False,
        )
    op.drop_index(
        'ix_subscriptions_apple_original_transaction_id',
        table_name='subscriptions',
    )
    op.drop_column('subscriptions', 'apple_product_id')
    op.drop_column('subscriptions', 'apple_transaction_id')
    op.drop_column('subscriptions', 'apple_original_transaction_id')
    op.drop_column('subscriptions', 'provider')
