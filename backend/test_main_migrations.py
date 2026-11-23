"""Startup migrations: idempotent, and safe under concurrent uvicorn workers.

Regression test for 2026-10-07: uvicorn --workers 2 runs the lifespan in every
worker, and with a pending migration both workers raced `alembic upgrade head`.
The loser crashed startup ("Child process failed to start, stopping the parent
process"), taking the whole backend down behind a healthy Cloudflare tunnel
(HTTP 502). _run_migrations now serializes Postgres workers with a
session-level advisory lock.
"""
from pathlib import Path
from unittest.mock import MagicMock, patch

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

import main

# The newest migration, read from the scripts so adding a migration doesn't break these tests.
HEAD = ScriptDirectory.from_config(Config(str(Path(__file__).resolve().parent / "alembic.ini"))).get_current_head()


def _alembic_version(url):
    eng = create_engine(url)
    try:
        with eng.connect() as conn:
            return conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    finally:
        eng.dispose()


def test_run_migrations_is_idempotent(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path}/mig.db"
    monkeypatch.setenv("DATABASE_URL", url)
    main._run_migrations()
    main._run_migrations()  # second run: no-op, no error
    assert _alembic_version(url) == HEAD


def test_run_migrations_takes_advisory_lock_on_postgres(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost/db")
    calls = []
    fake_conn = MagicMock()
    fake_conn.execute.side_effect = lambda stmt: calls.append(str(stmt))
    fake_conn.__enter__.return_value = fake_conn
    fake_conn.__exit__.return_value = False
    fake_engine = MagicMock()
    fake_engine.connect.return_value = fake_conn

    upgraded = []
    with patch("sqlalchemy.create_engine", return_value=fake_engine) as mock_create, \
         patch("alembic.command.upgrade", side_effect=lambda cfg, rev: upgraded.append(rev)):
        main._run_migrations()

    mock_create.assert_called_once_with("postgresql://u:p@localhost/db")
    lock_idx = next(i for i, c in enumerate(calls) if "pg_advisory_lock" in c)
    unlock_idx = next(i for i, c in enumerate(calls) if "pg_advisory_unlock" in c)
    assert lock_idx < unlock_idx, "upgrade must run while holding the lock"
    assert upgraded == ["head"]
    fake_engine.dispose.assert_called_once()


def test_run_migrations_skips_lock_off_postgres(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path}/nolock.db"
    monkeypatch.setenv("DATABASE_URL", url)
    with patch("sqlalchemy.create_engine") as mock_create:
        main._run_migrations()
    mock_create.assert_not_called()
    assert _alembic_version(url) == HEAD


def test_pr4_migration_is_chained_from_pr3_head():
    """PR 4: exactly one head, a NEW revision chained directly from the
    PR 3 head 5e1a7c3d9b20 (the data migration must sit on top of it).

    Phase 0 lab-hours extends the chain: the head is now the lab-hours
    migration a4c251994677, chained from the PR 4 head 6e8f065cfbab, which
    still chains from the PR 3 head — the linear chain is preserved.
    """
    from alembic.script import ScriptDirectory

    directory = ScriptDirectory.from_config(
        Config(str(Path(__file__).resolve().parent / "alembic.ini"))
    )
    heads = directory.get_heads()
    assert len(heads) == 1, f"expected exactly one head, got {heads}"
    head = heads[0]
    assert head != "5e1a7c3d9b20", "no migration exists on top of the PR 3 head"
    assert head == "a4c251994677", f"expected the lab-hours migration as head, got {head}"
    assert directory.get_revision(head).down_revision == "6e8f065cfbab"
    assert directory.get_revision("6e8f065cfbab").down_revision == "5e1a7c3d9b20"
