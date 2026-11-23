"""PR 4 — Alembic data migration + fault injection (test strategy v2.2 #21, #8, #3).

All tests run against scratch databases, never production:
- Postgres: one module-scoped database, reset per test (rows deleted,
  alembic_version stamped back to the old head). Skipped with a reason when
  no scratch Postgres is reachable.
- SQLite: tmp_path files (the dev path — no advisory lock, direct upgrade).

Verified mechanics: Alembic runs each revision inside a transaction
(backend/alembic/env.py — context.begin_transaction() in both paths);
_run_migrations() serialises workers with a session-level advisory lock on
Postgres (backend/main.py, _MIGRATION_LOCK_KEY); the data migration is
chained from head 5e1a7c3d9b20 and is pure DML on Progress.state.
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest
import sqlalchemy as sa

BACKEND_DIR = Path(__file__).resolve().parent

OLD_HEAD = "5e1a7c3d9b20"
# Set after the implementation lands (the new revision id). The chain test in
# test_main_migrations.py asserts the head is a new revision on top of OLD_HEAD.
KILL_ROWS = 1500
KILL_CARDS_PER_ROW = 100
KILL_DELAY_S = 0.5

sys.path.insert(0, str(BACKEND_DIR))
import pr4_fixtures  # noqa: E402


# ---------------------------------------------------------------- helpers

def _pg_available() -> bool:
    try:
        import psycopg

        with psycopg.connect(
            host="localhost", port=5432, user="postgres", password="postgres",
            dbname="postgres", connect_timeout=2,
        ):
            return True
    except Exception:
        return False


PG_AVAILABLE = _pg_available()


def _pg_url(dbname: str) -> str:
    return f"postgresql+psycopg://postgres:postgres@localhost:5432/{dbname}"


def _pg_maintenance():
    import psycopg

    return psycopg.connect(
        host="localhost", port=5432, user="postgres", password="postgres",
        dbname="postgres", autocommit=True, connect_timeout=5,
    )


def _create_pg_db(dbname: str) -> None:
    with _pg_maintenance() as conn:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{dbname}"')
            cur.execute(f'CREATE DATABASE "{dbname}"')


def _drop_pg_db(dbname: str) -> None:
    with _pg_maintenance() as conn:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{dbname}"')


def _engine(url: str):
    return sa.create_engine(url, future=True)


def _alembic_version(url: str) -> str | None:
    eng = _engine(url)
    try:
        with eng.connect() as conn:
            return conn.execute(sa.text("SELECT version_num FROM alembic_version")).scalar()
    finally:
        eng.dispose()


def _reset_db(url: str) -> None:
    """Back to the pre-migration state: empty progress/users, version at OLD_HEAD.

    Safe here because the PR 4 migration is pure DML — the schema at the new
    head is identical to the schema at OLD_HEAD, so re-stamping the version
    marker is a faithful reset (no downgrade() run needed).
    """
    eng = _engine(url)
    try:
        with eng.begin() as conn:
            conn.execute(sa.text("DELETE FROM progress"))
            conn.execute(sa.text("DELETE FROM users"))
            conn.execute(sa.text("DELETE FROM alembic_version"))
            conn.execute(
                sa.text("INSERT INTO alembic_version (version_num) VALUES (:v)"),
                {"v": OLD_HEAD},
            )
    finally:
        eng.dispose()


def _seed(url: str, rows) -> None:
    """rows: iterable of (user_id, state). Inserts a users row per progress row.

    created_at is set explicitly: the tables are reflected (autoload), so the
    Python-side column defaults from db_models do not fire on Core insert.
    """
    from datetime import datetime, timezone

    eng = _engine(url)
    try:
        users = sa.Table("users", sa.MetaData(), autoload_with=eng)
        progress = sa.Table("progress", sa.MetaData(), autoload_with=eng)
        now = datetime.now(timezone.utc)
        with eng.begin() as conn:
            for user_id, state in rows:
                conn.execute(users.insert().values(
                    id=user_id, display_name=user_id,
                    email=f"{user_id}@example.invalid", created_at=now,
                ))
                conn.execute(progress.insert().values(
                    user_id=user_id, state=state, version=0, updated_at=now,
                ))
    finally:
        eng.dispose()


def _read_rows(url: str) -> dict[str, tuple[dict, int]]:
    eng = _engine(url)
    try:
        progress = sa.Table("progress", sa.MetaData(), autoload_with=eng)
        with eng.connect() as conn:
            out = {}
            for user_id, state, version in conn.execute(
                sa.select(progress.c.user_id, progress.c.state, progress.c.version)
            ):
                out[user_id] = (state, version)
            return out
    finally:
        eng.dispose()


def _row_hashes(url: str) -> dict[str, str]:
    return {
        uid: json.dumps(state, sort_keys=True) + f"|v{version}"
        for uid, (state, version) in _read_rows(url).items()
    }


def _upgrade_in_process(url: str) -> None:
    """Run main._run_migrations() against url (honours the advisory-lock path
    on Postgres, direct upgrade on SQLite). Restores DATABASE_URL after."""
    import main

    old = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = url
    try:
        main._run_migrations()
    finally:
        if old is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = old


def _upgrade_subprocess(url: str, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": url}
    return subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", *args],
        cwd=str(BACKEND_DIR), env=env, capture_output=True, text=True, timeout=300,
    )


@pytest.fixture(scope="module")
def pg_db():
    if not PG_AVAILABLE:
        pytest.skip("no scratch Postgres reachable on localhost:5432")
    dbname = "itfund_pr4_test"
    _create_pg_db(dbname)
    url = _pg_url(dbname)
    # Build the schema at the pre-migration head.
    result = _upgrade_subprocess(url, OLD_HEAD)
    assert result.returncode == 0, result.stdout + result.stderr
    assert _alembic_version(url) == OLD_HEAD
    yield url
    _drop_pg_db(dbname)


@pytest.fixture()
def sqlite_db(tmp_path):
    url = f"sqlite:///{tmp_path}/pr4.db"
    result = _upgrade_subprocess(url, OLD_HEAD)
    assert result.returncode == 0, result.stdout + result.stderr
    assert _alembic_version(url) == OLD_HEAD
    return url


@pytest.fixture()
def id_map():
    return pr4_fixtures.load_id_map()


@pytest.fixture()
def fixtures(id_map):
    return pr4_fixtures.build_fixtures(id_map)


def _new_head() -> str:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    return ScriptDirectory.from_config(
        Config(str(BACKEND_DIR / "alembic.ini"))
    ).get_current_head()


# ---------------------------------------------------------------- the migration itself

@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_migrate_translates_fixture_rows(request, db_fixture, fixtures):
    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    _upgrade_in_process(url)
    assert _alembic_version(url) == _new_head()
    rows = _read_rows(url)
    for uid, _state, expected, bump in fixtures:
        assert uid in rows, f"row {uid} missing after migration"
        state, version = rows[uid]
        assert state == expected, f"row {uid}: state mismatch\n{state}\n!=\n{expected}"
        assert version == bump, f"row {uid}: version {version} != {bump}"


@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_migrate_is_idempotent(request, db_fixture, fixtures):
    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    _upgrade_in_process(url)
    assert _alembic_version(url) == _new_head()
    # Non-vacuous: the first run must actually have translated rows, or this
    # test would pass on a no-op upgrade too.
    rows = _read_rows(url)
    assert rows["pr4-a"][0] == fixtures[0][2], "first run translated nothing"
    before = _row_hashes(url)
    _upgrade_in_process(url)
    assert _alembic_version(url) == _new_head()
    assert _row_hashes(url) == before, "second run changed rows"


# ---------------------------------------------------------------- fault injection (#21)

@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_forced_error_rolls_back_and_proves_single_transaction(
    request, db_fixture, fixtures, monkeypatch,
):
    """A translator failure after N rows must roll back the WHOLE revision:
    zero rows changed, alembic_version unchanged, error loud. This is also
    the partial-execution proof: the migration must NOT batch-commit — if it
    did, the first N rows would stay translated."""
    import progress_migration

    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    before = _row_hashes(url)

    calls = {"n": 0}
    real_translate = progress_migration.translate_progress_state

    def failing_translate(state, id_map):
        calls["n"] += 1
        if calls["n"] > 3:
            raise RuntimeError("boom-test: forced translator failure")
        return real_translate(state, id_map)

    monkeypatch.setattr(
        progress_migration, "translate_progress_state", failing_translate
    )
    with pytest.raises(RuntimeError, match="boom-test"):
        _upgrade_in_process(url)
    assert calls["n"] > 3, "the failure never fired mid-run"
    assert _alembic_version(url) == OLD_HEAD
    assert _row_hashes(url) == before, "partial rows survived the rollback"


@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_kill_mid_migration_rolls_back(request, db_fixture, id_map):
    """SIGKILL alembic upgrade head mid-run: alembic_version stays at the old
    head, zero rows are partially translated (all-or-nothing), a re-run
    completes, and a third run changes zero rows."""
    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    kill_rows = pr4_fixtures.kill_fixture_rows(id_map, KILL_ROWS, KILL_CARDS_PER_ROW)
    _seed(url, kill_rows)
    before = _row_hashes(url)

    env = {**os.environ, "DATABASE_URL": url}
    proc = subprocess.Popen(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_DIR), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        start_new_session=True,
    )
    time.sleep(KILL_DELAY_S)
    assert proc.poll() is None, (
        "migration finished before the kill — increase KILL_ROWS so the "
        "run takes seconds; otherwise this test proves nothing"
    )
    if hasattr(os, "killpg"):
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    else:  # Windows has no process groups/SIGKILL: TerminateProcess is the hard kill
        proc.kill()
    _, stderr = proc.communicate()
    # POSIX reports death by signal as -SIGKILL; Windows' TerminateProcess
    # exits with code 1. Either way the run must not have finished cleanly.
    assert proc.returncode == (-signal.SIGKILL if hasattr(signal, "SIGKILL") else 1)

    assert _alembic_version(url) == OLD_HEAD, "killed run advanced the version"
    assert _row_hashes(url) == before, "killed run left partially translated rows"

    _upgrade_in_process(url)
    assert _alembic_version(url) == _new_head()
    rows = _read_rows(url)
    sample = rows["pr4-kill-0"][0]
    assert sample.get("cardIdVersion") == 2
    assert not any(
        k.rsplit("-", 1)[-1].isdigit() and k in id_map for k in sample["cards"]
    ), "legacy keys remain after the re-run"
    after = _row_hashes(url)
    _upgrade_in_process(url)
    assert _row_hashes(url) == after, "third run changed rows"


def test_concurrent_upgrades_serialise(pg_db, fixtures, id_map):
    """Two `upgrade head` processes at once against scratch Postgres: exactly
    one applies the migration, the other waits on the advisory lock and then
    no-ops; neither crashes; rows are migrated exactly once. The kill-sized
    seed stretches the migration to seconds so the two processes genuinely
    overlap (with tiny fixtures one could finish before the other starts)."""
    url = pg_db
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    _seed(url, pr4_fixtures.kill_fixture_rows(id_map, 200, KILL_CARDS_PER_ROW))
    env = {**os.environ, "DATABASE_URL": url}
    cmd = [sys.executable, "-c", "import main; main._run_migrations()"]
    p1 = subprocess.Popen(cmd, cwd=str(BACKEND_DIR), env=env,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    p2 = subprocess.Popen(cmd, cwd=str(BACKEND_DIR), env=env,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    _, err1 = p1.communicate(timeout=300)
    _, err2 = p2.communicate(timeout=300)
    assert p1.returncode == 0, err1
    assert p2.returncode == 0, err2
    assert _alembic_version(url) == _new_head()
    rows = _read_rows(url)
    for uid, _state, expected, bump in fixtures:
        assert rows[uid][0] == expected, f"row {uid} wrong after concurrent upgrade"
        assert rows[uid][1] == bump, f"row {uid} version {rows[uid][1]} != {bump}"
    # The stretched seed was migrated exactly once too.
    assert rows["pr4-kill-0"][0].get("cardIdVersion") == 2
    assert rows["pr4-kill-0"][1] == 1


@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_validation_gate_refuses_stale_content(request, db_fixture, fixtures,
                                               monkeypatch, tmp_path):
    """content.json at version 1: the migration refuses BEFORE touching any
    row — zero rows changed, alembic_version unchanged, and the failure names
    the version mismatch."""
    import progress_migration

    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    before = _row_hashes(url)

    stale = tmp_path / "content-v1.json"
    stale.write_text(json.dumps({"version": 1, "tracks": []}), encoding="utf-8")
    monkeypatch.setattr(progress_migration, "CONTENT_PATH", stale)
    with pytest.raises(RuntimeError, match="version is 1, expected 2"):
        _upgrade_in_process(url)
    assert _alembic_version(url) == OLD_HEAD
    assert _row_hashes(url) == before


@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_validation_gate_refuses_frozen_map_mismatch(request, db_fixture, fixtures,
                                                     monkeypatch, tmp_path):
    """content.json v2 but a frozen-map pair that disagrees with it: refuse
    before touching any row, naming the legacy id."""
    import progress_migration

    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    before = _row_hashes(url)

    frozen = json.loads((BACKEND_DIR / ".." / "scripts" / "legacy-card-ids.json").read_text())
    frozen["cards"][0] = {**frozen["cards"][0], "id": "00000000-0000-4000-8000-000000000000"}
    bad_map = tmp_path / "legacy-card-ids-bad.json"
    bad_map.write_text(json.dumps(frozen), encoding="utf-8")
    monkeypatch.setattr(progress_migration, "FROZEN_MAP_PATH", bad_map)
    with pytest.raises(RuntimeError, match="py-basics-0"):
        _upgrade_in_process(url)
    assert _alembic_version(url) == OLD_HEAD
    assert _row_hashes(url) == before


# ---------------------------------------------------------------- dry run (#3)

def test_max_bytes_matches_progress_api_cap():
    """The migration's size check must use the same cap as the PUT endpoint
    (progress_api.py:22) — if either changes without the other, the dry run
    would report against a stale number."""
    import progress_api
    import progress_migration

    assert progress_migration.MAX_BYTES == progress_api.MAX_BYTES == 256 * 1024

@pytest.mark.parametrize("db_fixture", ["pg_db", "sqlite_db"])
def test_dry_run_script_is_read_only_and_reports(request, db_fixture, fixtures, tmp_path):
    """The dry-run script performs the exact translation in memory, writes
    only the report file, and never commits: row bytes + versions unchanged."""
    url = request.getfixturevalue(db_fixture)
    _reset_db(url)
    _seed(url, [(uid, state) for uid, state, _exp, _bump in fixtures])
    before = _row_hashes(url)
    version_before = _alembic_version(url)

    report = tmp_path / "dry-run-report.md"
    result = subprocess.run(
        [sys.executable, "dry_run_card_id_migration.py",
         "--db", url, "--out", str(report)],
        cwd=str(BACKEND_DIR), capture_output=True, text=True, timeout=300,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert report.exists()
    text = report.read_text(encoding="utf-8")
    assert "py-basics-999" in text, "unmapped key must be listed"
    assert _alembic_version(url) == version_before
    assert _row_hashes(url) == before, "dry run wrote to the database"
