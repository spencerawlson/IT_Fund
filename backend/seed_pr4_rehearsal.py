#!/usr/bin/env python3
"""Seed the PR 4 fixture-based dry-run rehearsal database (scratch only).

Builds the schema at the pre-migration head (5e1a7c3d9b20) and seeds the
fixture rows from backend/pr4_fixtures.py — the same rows the migration
tests assert against. The dry-run script then reads this database.

Scratch ONLY: refuses any database URL whose database name does not look
like a scratch/rehearsal/test database. Never run against production.

Usage:
    python seed_pr4_rehearsal.py --db postgresql+psycopg://postgres:postgres@localhost:5432/itfund_pr4_rehearsal
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sqlalchemy as sa  # noqa: E402

import pr4_fixtures  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent
OLD_HEAD = "5e1a7c3d9b20"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, help="scratch database URL")
    args = parser.parse_args(argv)

    dbname = urlparse(args.db).path.lstrip("/")
    if not re.search(r"(scratch|rehearsal|pr4|test)", dbname):
        print(f"REFUSING: database name {dbname!r} does not look like a scratch "
              "database — this script seeds fixtures and must never run "
              "against production.", file=sys.stderr)
        return 2

    env = {**os.environ, "DATABASE_URL": args.db}
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", OLD_HEAD],
        cwd=str(BACKEND_DIR), env=env, capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(result.stdout + result.stderr, file=sys.stderr)
        return result.returncode

    id_map = pr4_fixtures.load_id_map()
    fixtures = pr4_fixtures.build_fixtures(id_map)
    engine = sa.create_engine(args.db, future=True)
    try:
        users = sa.Table("users", sa.MetaData(), autoload_with=engine)
        progress = sa.Table("progress", sa.MetaData(), autoload_with=engine)
        now = datetime.now(timezone.utc)
        with engine.begin() as conn:
            conn.execute(sa.text("DELETE FROM progress"))
            conn.execute(sa.text("DELETE FROM users"))
            for user_id, state, _expected, _bump in fixtures:
                conn.execute(users.insert().values(
                    id=user_id, display_name=user_id,
                    email=f"{user_id}@example.invalid", created_at=now,
                ))
                conn.execute(progress.insert().values(
                    user_id=user_id, state=state, version=0, updated_at=now,
                ))
    finally:
        engine.dispose()
    print(f"seeded {len(fixtures)} fixture rows into {dbname} at head {OLD_HEAD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
