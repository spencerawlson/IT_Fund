"""translate Progress card ids from legacy (positional) ids to UUIDs

Revision ID: 6e8f065cfbab
Revises: 5e1a7c3d9b20
Create Date: 2026-11-22

PR 4 — Migration and Cutover (plan v2.2 §6). Translates every Progress row
from legacy card ids (e.g. "py-basics-0") to the UUIDs assigned in PR 2,
applying the §4.2 collision rules (higher box wins, tie -> later due,
right/wrong/revSeen maxed; unknown legacy keys preserved, never dropped)
and stamping cardIdVersion: 2. Rows with no legacy keys are skipped, so a
re-run changes zero rows (idempotent).

Validation gate: content.json on disk must be version 2 and the frozen map
(scripts/legacy-card-ids.json) must match it exactly, or the migration
fails loudly WITHOUT touching a row — a restart without a pull must never
migrate against stale content. The shared implementation lives in
backend/progress_migration.py (the dry-run script uses the same code path,
so the dry run performs the exact translation this migration performs).

The optimistic-lock `version` is bumped by 1 on every changed row, so an
in-flight client PUT with the pre-migration version gets a 409 and
re-fetches the migrated state instead of overwriting it.

Runs automatically at backend startup (backend/main.py lifespan) after the
pull, inside Alembic's single transaction: a kill or error mid-run rolls
back everything — no partial translation, alembic_version unchanged.

Production target (Gate 0, resolved 2026-11-22): the FedServ backend at
https://api.road2cissp.com. The Vercel backend service exists in vercel.json
but returns 500 FUNCTION_INVOCATION_FAILED on /api/health and cannot serve
production traffic.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '6e8f065cfbab'
down_revision: Union[str, Sequence[str], None] = '5e1a7c3d9b20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Translate Progress rows from legacy ids to UUIDs."""
    from progress_migration import run_migration

    run_migration(op.get_bind())


def downgrade() -> None:
    """No-op, by design: the translation is one-way.

    Downgrading the schema version must not un-translate rows — the PR 3
    normalisation layer accepts both shapes, so rows that are already UUIDs
    stay valid, and the rollback path for a bad migration is forward-recovery
    (fix the translator, re-run), then content rollback, then DB restore as
    a last resort (rollback-forward-recovery.md §PR 4).
    """
