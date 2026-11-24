"""add reviews table

Revision ID: 6d7d1e532c16
Revises: f7a3c9d21e84
Create Date: 2026-11-24

Learner reviews (REVIEWS v1): one row per user, moderated before display —
approved reviews are listed by GET /public/reviews, everything else stays
in the admin moderation queue.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d7d1e532c16'
down_revision: Union[str, Sequence[str], None] = 'f7a3c9d21e84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('reviews',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=True),
        sa.Column('approved', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)
    op.create_index(op.f('ix_reviews_approved'), 'reviews', ['approved'], unique=False)
    op.create_index(op.f('ix_reviews_created_at'), 'reviews', ['created_at'], unique=False)
    op.create_index('ix_reviews_approved_created_at', 'reviews', ['approved', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_reviews_approved_created_at', table_name='reviews')
    op.drop_index(op.f('ix_reviews_created_at'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_approved'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_table('reviews')
