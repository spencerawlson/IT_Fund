"""merge heads: reviews + apple iap

Revision ID: 40c372bf6ca2
Revises: 6d7d1e532c16, d9ec1c32ea1b
Create Date: 2026-11-25

Merge the two heads created when the reviews migration (PR #201) branched
off f7a3c9d21e84 instead of the then-head d9ec1c32ea1b. No schema change —
both branches are already in the graph; this only gives `alembic upgrade
head` a single target again so production startup can proceed.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '40c372bf6ca2'
down_revision: Union[str, Sequence[str], None] = ('6d7d1e532c16', 'd9ec1c32ea1b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
