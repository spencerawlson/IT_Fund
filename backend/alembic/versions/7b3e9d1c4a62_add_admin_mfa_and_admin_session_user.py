"""add admin MFA enrollments and bind admin sessions to an account

Revision ID: 7b3e9d1c4a62
Revises: a4c251994677
Create Date: 2026-11-23

Admin platform, step 2 (admin security): per-admin sign-in replaces the
shared password.
* admin_mfa — one TOTP enrollment per admin account (secret stored
  encrypted; last accepted time step for replay protection).
* admin_sessions.user_id — the account an admin session belongs to. Existing
  rows (from the shared-password gate) keep NULL and are no longer accepted,
  so everyone signs in again with the new flow.

Additive only: no existing data is modified.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b3e9d1c4a62'
down_revision: Union[str, Sequence[str], None] = 'a4c251994677'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('admin_mfa',
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('secret_enc', sa.String(length=512), nullable=True),
        sa.Column('pending_secret_enc', sa.String(length=512), nullable=True),
        sa.Column('enabled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_step', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )
    with op.batch_alter_table('admin_sessions') as batch:
        batch.add_column(sa.Column('user_id', sa.String(length=32), nullable=True))
        batch.create_index(batch.f('ix_admin_sessions_user_id'), ['user_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('admin_sessions') as batch:
        batch.drop_index(batch.f('ix_admin_sessions_user_id'))
        batch.drop_column('user_id')
    op.drop_table('admin_mfa')
