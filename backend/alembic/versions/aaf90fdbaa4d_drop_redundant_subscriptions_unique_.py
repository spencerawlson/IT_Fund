"""drop redundant unique constraint on subscriptions.stripe_customer_id

Revision ID: aaf90fdbaa4d
Revises: 4d120c0bc45b
Create Date: 2026-11-11

Migration 9363864b178c created BOTH a UniqueConstraint and a unique
index on subscriptions.stripe_customer_id, while the ORM model
(backend/db_models.py: Subscription) renders only the unique index —
so Alembic autogenerate flagged the constraint as drift. Drop the
redundant constraint; the unique index
ix_subscriptions_stripe_customer_id keeps uniqueness enforced.

Postgres-only: SQLite cannot ALTER DROP a constraint (and the
constraint never exists on SQLite — it is only created when the
original migration runs against Postgres, which is the production
dialect). The startup-migration tests run `upgrade head` against
SQLite, so this migration is a no-op there.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aaf90fdbaa4d'
down_revision: Union[str, Sequence[str], None] = '4d120c0bc45b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    if op.get_bind().dialect.name == "postgresql":
        op.drop_constraint('subscriptions_stripe_customer_id_key', 'subscriptions', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name == "postgresql":
        op.create_unique_constraint('subscriptions_stripe_customer_id_key', 'subscriptions', ['stripe_customer_id'])
