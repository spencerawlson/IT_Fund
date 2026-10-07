"""Startup migrations: idempotent, and safe under concurrent uvicorn workers.

Regression test for 2026-10-07: uvicorn --workers 2 runs the lifespan in every
worker, and with a pending migration both workers raced `alembic upgrade head`.
The loser crashed startup ("Child process failed to start, stopping the parent
process"), taking the whole backend down behind a healthy Cloudflare tunnel
(HTTP 502). _run_migrations now serializes Postgres workers with a
session-level advisory lock.
"""
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine, text

import main


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
    assert _alembic_version(url) == "ea90a8d9b101"


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
    assert _alembic_version(url) == "ea90a8d9b101"
