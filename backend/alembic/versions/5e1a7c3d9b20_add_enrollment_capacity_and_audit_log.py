"""add founding-membership capacity (enrollment settings + allocations) and the admin audit log

Revision ID: 5e1a7c3d9b20
Revises: 32e3cf2c4fa0
Create Date: 2026-11-18

Admin platform, step 1 (enrollment core):
* enrollment_settings — single row (id 1): paid capacity (10,000), the
  separate complimentary capacity (100), and the checkout reservation time.
  Seeded here so the capacity exists before the first allocation.
* membership_allocations — one place per member; at most one open
  (non-released) row per user, enforced by a partial unique index. Rows are
  never deleted: released rows are the history of who held a place.
* admin_audit_log — append-only record of every admin change.

Purely additive: no existing table or row is modified. Existing subscribers
get their places from enrollment.reconcile() at startup, not here.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e1a7c3d9b20'
down_revision: Union[str, Sequence[str], None] = '32e3cf2c4fa0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('enrollment_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('paid_capacity', sa.Integer(), nullable=False),
        sa.Column('comp_capacity', sa.Integer(), nullable=False),
        sa.Column('reservation_minutes', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.execute(
        "INSERT INTO enrollment_settings (id, paid_capacity, comp_capacity, reservation_minutes, updated_at) "
        "VALUES (1, 10000, 100, 60, CURRENT_TIMESTAMP)"
    )

    op.create_table('membership_allocations',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('reserved_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('over_capacity', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('release_reason', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_allocations_user_id'), 'membership_allocations', ['user_id'], unique=False)
    op.create_index(op.f('ix_membership_allocations_status'), 'membership_allocations', ['status'], unique=False)
    op.create_index(
        'uq_membership_allocation_open_per_user', 'membership_allocations', ['user_id'], unique=True,
        postgresql_where=sa.text("status <> 'released'"),
        sqlite_where=sa.text("status <> 'released'"),
    )

    op.create_table('admin_audit_log',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actor', sa.String(length=64), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('target_user_id', sa.String(length=32), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_audit_log_created_at'), 'admin_audit_log', ['created_at'], unique=False)
    op.create_index(op.f('ix_admin_audit_log_action'), 'admin_audit_log', ['action'], unique=False)
    op.create_index(op.f('ix_admin_audit_log_target_user_id'), 'admin_audit_log', ['target_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_audit_log_target_user_id'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_action'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_created_at'), table_name='admin_audit_log')
    op.drop_table('admin_audit_log')
    op.drop_index('uq_membership_allocation_open_per_user', table_name='membership_allocations')
    op.drop_index(op.f('ix_membership_allocations_status'), table_name='membership_allocations')
    op.drop_index(op.f('ix_membership_allocations_user_id'), table_name='membership_allocations')
    op.drop_table('membership_allocations')
    op.drop_table('enrollment_settings')
