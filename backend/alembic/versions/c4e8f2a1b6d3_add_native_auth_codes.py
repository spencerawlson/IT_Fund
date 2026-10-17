"""add native_auth_codes

One-time codes that hand a finished OAuth login from the system browser to the native app.

Revision ID: c4e8f2a1b6d3
Revises: 9363864b178c
Create Date: 2026-10-17 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e8f2a1b6d3'
down_revision: Union[str, Sequence[str], None] = '9363864b178c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('native_auth_codes',
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=32), nullable=False),
    sa.Column('code_challenge', sa.String(length=128), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('code_hash')
    )
    op.create_index(op.f('ix_native_auth_codes_user_id'), 'native_auth_codes', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_native_auth_codes_user_id'), table_name='native_auth_codes')
    op.drop_table('native_auth_codes')
