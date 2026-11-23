"""Phase 0 lab-hours meter: usage ledger, windows, and the /labs/usage endpoint.

Shadow mode: the meter measures and displays only. No Stripe calls, no
invoices, no charging anywhere in this file or the code it covers.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

import pytest

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import db
import main
from auth.sessions import COOKIE_NAME, create_session
from db_models import LabUsageEvent, ManualGrant, Subscription, User
from labs import api as labs_api
from labs import sessions as sessions_mod
from labs import usage
from labs.sessions import _now

client = TestClient(main.app)
run = asyncio.run

DOCKER_LAB = "cyber-nmap-001"  # docker-backed (mock provider stands in, per conftest)
MOCK_LAB = "net-vlan-001"  # mock, free
SHOWCASE_LAB = "py-basics-001"  # docker-backed showcase, free + unmetered


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    client.cookies.clear()
    sessions_mod.service._sessions.clear()
    sessions_mod.service._providers["mock"]._envs.clear()
    labs_api._check_start_rate.clear()
    labs_api._check_exec_rate.clear()


def _user(uid: str, email: str | None = None):
    """Per-request session cookie for a real DB-backed user."""
    with db.SessionLocal() as s:
        if s.get(User, uid) is None:
            s.add(User(id=uid, display_name=uid, email=email or f"{uid}@example.com"))
            s.flush()
        raw = create_session(s, uid)
        s.commit()
    return {COOKIE_NAME: raw}


def _set_sub(uid, status="active", period_start=None, period_end=None):
    with db.SessionLocal() as s:
        s.merge(
            Subscription(
                user_id=uid,
                stripe_customer_id="cus_test_1",
                stripe_subscription_id="sub_test_1",
                status=status,
                current_period_start=period_start,
                current_period_end=period_end,
            )
        )
        s.commit()


def _set_grant(uid, granted_at):
    with db.SessionLocal() as s:
        s.merge(ManualGrant(user_id=uid, note="test", granted_at=granted_at))
        s.commit()


def _utc(dt):
    """SQLite returns naive datetimes; treat them as UTC for comparison."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _usage_rows(uid):
    with db.SessionLocal() as s:
        return list(
            s.query(LabUsageEvent).filter(LabUsageEvent.user_id == uid).all()
        )


# ---------- pure math: billed_seconds ----------


def test_billed_seconds_rounds_up_to_the_started_minute():
    start = datetime(2026, 11, 23, 10, 0, tzinfo=timezone.utc)
    expires = datetime(2026, 11, 23, 11, 0, tzinfo=timezone.utc)
    assert usage.billed_seconds(start, start + timedelta(seconds=61), expires) == 120
    assert usage.billed_seconds(start, start + timedelta(seconds=60), expires) == 60
    assert usage.billed_seconds(start, start + timedelta(seconds=1), expires) == 60
    assert usage.billed_seconds(start, start + timedelta(minutes=30), expires) == 1800


def test_billed_seconds_caps_at_expiry():
    start = datetime(2026, 11, 23, 10, 0, tzinfo=timezone.utc)
    expires = datetime(2026, 11, 23, 11, 0, tzinfo=timezone.utc)
    assert usage.billed_seconds(start, start + timedelta(minutes=90), expires) == 3600


def test_billed_seconds_zero_or_negative_is_zero():
    start = datetime(2026, 11, 23, 10, 0, tzinfo=timezone.utc)
    expires = datetime(2026, 11, 23, 11, 0, tzinfo=timezone.utc)
    assert usage.billed_seconds(start, start, expires) == 0
    assert usage.billed_seconds(start, start - timedelta(seconds=5), expires) == 0


# ---------- pure math: monthly slices ----------


def test_monthly_slice_passes_a_monthly_period_through():
    start = datetime(2026, 11, 17, tzinfo=timezone.utc)
    end = datetime(2026, 12, 17, tzinfo=timezone.utc)
    now = datetime(2026, 11, 23, tzinfo=timezone.utc)
    assert usage.monthly_slice(start, end, now) == (start, end)


def test_monthly_slice_cuts_an_annual_period_at_the_anchor_day():
    start = datetime(2026, 1, 15, tzinfo=timezone.utc)
    end = datetime(2027, 1, 15, tzinfo=timezone.utc)
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    assert usage.monthly_slice(start, end, now) == (
        datetime(2026, 3, 15, tzinfo=timezone.utc),
        datetime(2026, 4, 15, tzinfo=timezone.utc),
    )


def test_monthly_slice_clamps_month_end_anchors():
    # Subscribed Jan 31: Feb has no 31st, so the slice is Feb 28–Mar 31.
    start = datetime(2026, 1, 31, tzinfo=timezone.utc)
    end = datetime(2027, 1, 31, tzinfo=timezone.utc)
    now = datetime(2026, 3, 5, tzinfo=timezone.utc)
    assert usage.monthly_slice(start, end, now) == (
        datetime(2026, 2, 28, tzinfo=timezone.utc),
        datetime(2026, 3, 31, tzinfo=timezone.utc),
    )


def test_monthly_slice_handles_leap_day_anchor():
    start = datetime(2024, 2, 29, tzinfo=timezone.utc)
    end = datetime(2025, 2, 28, tzinfo=timezone.utc)
    assert usage.monthly_slice(start, end, datetime(2024, 3, 15, tzinfo=timezone.utc)) == (
        datetime(2024, 2, 29, tzinfo=timezone.utc),
        datetime(2024, 3, 29, tzinfo=timezone.utc),
    )
    # Past the period end: the last slice, not an error.
    assert usage.monthly_slice(start, end, datetime(2025, 3, 1, tzinfo=timezone.utc)) == (
        datetime(2025, 1, 29, tzinfo=timezone.utc),
        datetime(2025, 2, 28, tzinfo=timezone.utc),
    )


# ---------- exclusion rules ----------


def test_should_record_only_docker_sessions_for_signed_in_users():
    assert usage.should_record("u1", DOCKER_LAB, "docker") is True
    assert usage.should_record("u1", SHOWCASE_LAB, "docker") is False
    assert usage.should_record("u1", MOCK_LAB, "mock") is False
    assert usage.should_record("guest:abc", DOCKER_LAB, "docker") is False
    assert usage.should_record("guest:abc", SHOWCASE_LAB, "docker") is False


# ---------- windows ----------


def test_current_window_monthly_subscriber():
    cookies, uid = _user("u1"), "u1"
    now = _now()
    start, end = now - timedelta(days=5), now + timedelta(days=25)
    _set_sub(uid, period_start=start, period_end=end)
    assert usage.current_window(uid, now) == (start, end)


def test_current_window_legacy_row_without_period_start():
    _, uid = _user("u1"), "u1"
    now = _now()
    end = now + timedelta(days=25)
    _set_sub(uid, period_start=None, period_end=end)
    start, got_end = usage.current_window(uid, now)
    assert got_end == end
    # Falls back to a 31-day window ending at the period end.
    assert start == end - timedelta(days=31)


def test_current_window_annual_subscriber_gets_monthly_slice():
    _, uid = _user("u1"), "u1"
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    _set_sub(
        uid,
        period_start=datetime(2026, 1, 15, tzinfo=timezone.utc),
        period_end=datetime(2027, 1, 15, tzinfo=timezone.utc),
    )
    assert usage.current_window(uid, now) == (
        datetime(2026, 3, 15, tzinfo=timezone.utc),
        datetime(2026, 4, 15, tzinfo=timezone.utc),
    )


def test_current_window_manual_grant_uses_30_day_slices():
    _, uid = _user("u1"), "u1"
    now = _now()
    granted = now - timedelta(days=45)
    _set_grant(uid, granted)
    start, end = usage.current_window(uid, now)
    assert start == granted + timedelta(days=30)
    assert end == granted + timedelta(days=60)


def test_current_window_owner_gets_calendar_month(monkeypatch):
    monkeypatch.setenv("BILLING_OWNER_EMAILS", "owner@example.com")
    cookies, uid = _user("u1", email="owner@example.com"), "u1"
    now = datetime(2026, 11, 23, 10, 0, tzinfo=timezone.utc)
    assert usage.current_window(uid, now) == (
        datetime(2026, 11, 1, tzinfo=timezone.utc),
        datetime(2026, 12, 1, tzinfo=timezone.utc),
    )


def test_current_window_free_tier_user_has_no_window():
    _, uid = _user("u1"), "u1"
    assert usage.current_window(uid, _now()) is None


# ---------- ledger: record + finalize ----------


def test_starting_a_docker_lab_writes_a_usage_row():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    r = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies)
    assert r.status_code == 200, r.text
    rows = _usage_rows("u1")
    assert len(rows) == 1
    row = rows[0]
    assert row.lab_id == DOCKER_LAB
    assert row.provider == "docker"
    assert row.session_id == r.json()["id"]
    assert row.ended_at is None and row.billed_seconds is None
    assert _utc(row.period_start) == now - timedelta(days=5)
    assert _utc(row.period_end) == now + timedelta(days=25)
    # The start response carries the usage summary for the warning banner.
    assert r.json()["usage"]["metered"] is True
    assert r.json()["usage"]["used_seconds"] == 60  # live session, under a minute


def test_starting_a_mock_lab_writes_no_row():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    r = client.post(f"/api/labs/{MOCK_LAB}/start", cookies=cookies)
    assert r.status_code == 200, r.text
    assert _usage_rows("u1") == []


def test_starting_the_showcase_lab_writes_no_row():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    r = client.post(f"/api/labs/{SHOWCASE_LAB}/start", cookies=cookies)
    assert r.status_code == 200, r.text
    assert _usage_rows("u1") == []


def test_guest_starting_the_showcase_lab_writes_no_row():
    guest = TestClient(main.app)
    r = guest.post(f"/api/labs/{SHOWCASE_LAB}/start")
    assert r.status_code == 200, r.text
    with db.SessionLocal() as s:
        assert s.query(LabUsageEvent).count() == 0


def test_destroy_finalizes_the_row_at_one_started_minute():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=cookies).status_code == 204
    rows = _usage_rows("u1")
    assert len(rows) == 1
    assert rows[0].ended_at is not None
    assert rows[0].billed_seconds == 60  # lived under a minute


def test_reset_does_not_open_a_second_row():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    assert client.post(f"/api/labs/sessions/{sid}/reset", cookies=cookies).status_code == 200
    assert len(_usage_rows("u1")) == 1
    assert _usage_rows("u1")[0].ended_at is None  # clock keeps running


def test_restart_after_destroy_opens_a_new_row():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=cookies).status_code == 204
    sid2 = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    assert sid2 != sid
    assert len(_usage_rows("u1")) == 2


def test_cleanup_expired_finalizes_abandoned_sessions():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    # Force the session past expiry without touching the API.
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(seconds=1)
    assert run(sessions_mod.service.cleanup_expired()) >= 1
    rows = _usage_rows("u1")
    assert len(rows) == 1
    assert rows[0].ended_at is not None
    assert rows[0].billed_seconds == 60


def test_finalize_stale_rows_closes_orphaned_rows_at_expiry():
    _user("u1")
    now = _now()
    with db.SessionLocal() as s:
        s.add(
            LabUsageEvent(
                user_id="u1",
                session_id="sess-orphan",
                lab_id=DOCKER_LAB,
                provider="docker",
                started_at=now - timedelta(minutes=90),
                expires_at=now - timedelta(minutes=45),
                period_start=now - timedelta(days=5),
                period_end=now + timedelta(days=25),
            )
        )
        s.commit()
    assert usage.finalize_stale_rows(now) == 1
    rows = _usage_rows("u1")
    assert _utc(rows[0].ended_at) == now - timedelta(minutes=45)
    assert rows[0].billed_seconds == 45 * 60
    # Idempotent: a second sweep changes nothing.
    assert usage.finalize_stale_rows(now) == 0


# ---------- GET /labs/usage ----------


def test_usage_endpoint_reports_live_and_finalized_time():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    assert client.delete(f"/api/labs/sessions/{sid}", cookies=cookies).status_code == 204
    client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies)
    r = client.get("/api/labs/usage", cookies=cookies)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["metered"] is True
    assert data["allowance_seconds"] == 20 * 3600
    # One finalized minute + one live minute.
    assert data["used_seconds"] == 120
    assert data["live_seconds"] == 60
    assert data["overage_seconds"] == 0
    assert data["resets_at"] == (now + timedelta(days=25)).isoformat()
    # Shadow mode: no money in the response, ever.
    assert "amount" not in str(data) and "cents" not in str(data) and "invoice" not in str(data)


def test_usage_endpoint_unmetered_for_free_tier_user():
    cookies = _user("u1")
    r = client.get("/api/labs/usage", cookies=cookies)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["metered"] is False
    assert data["used_seconds"] == 0
    assert data["resets_at"] is None


def test_usage_endpoint_requires_sign_in():
    assert client.get("/api/labs/usage").status_code == 401


def test_usage_endpoint_overage_counts_past_the_allowance():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    # 21 finalized hours: one row of 21h, bypassing the API clock.
    with db.SessionLocal() as s:
        s.add(
            LabUsageEvent(
                user_id="u1",
                session_id="sess-big",
                lab_id=DOCKER_LAB,
                provider="docker",
                started_at=now - timedelta(hours=21),
                expires_at=now + timedelta(hours=1),
                ended_at=now,
                billed_seconds=21 * 3600,
                period_start=now - timedelta(days=5),
                period_end=now + timedelta(days=25),
            )
        )
        s.commit()
    data = client.get("/api/labs/usage", cookies=cookies).json()
    assert data["used_seconds"] == 21 * 3600
    assert data["overage_seconds"] == 3600


# ---------- webhook: period start sync ----------


def test_period_start_extraction_mirrors_period_end():
    sub = {
        "current_period_start": 1700000000,
        "current_period_end": 1702592000,
        "items": {"data": [{"current_period_start": 1700000001, "current_period_end": 1702592001}]},
    }
    import billing

    assert billing._period_start(sub) == 1700000000
    assert billing._period_start({"items": {"data": [{"current_period_start": 5}, {"current_period_start": 9}]}}) == 5
    assert billing._period_start({}) is None


def test_webhook_sync_stores_period_start():
    import billing

    _, uid = _user("u1"), "u1"
    sub = {
        "id": "sub_test_1",
        "customer": "cus_test_1",
        "status": "active",
        "current_period_start": 1700000000,
        "current_period_end": 1702592000,
        "metadata": {},
    }
    with mock.patch("enrollment.sync_user_safely"):
        billing._sync_from_subscription(uid, sub)
    with db.SessionLocal() as s:
        row = s.get(Subscription, uid)
        assert _utc(row.current_period_start) == datetime(2023, 11, 14, 22, 13, 20, tzinfo=timezone.utc)
        assert _utc(row.current_period_end) == datetime(2023, 12, 14, 22, 13, 20, tzinfo=timezone.utc)


# ---------- migration ----------


def test_migration_creates_usage_table_and_period_start(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path}/usage-mig.db"
    monkeypatch.setenv("DATABASE_URL", url)
    main._run_migrations()
    main._run_migrations()  # idempotent
    from sqlalchemy import create_engine, inspect

    eng = create_engine(url)
    try:
        insp = inspect(eng)
        assert "lab_usage_events" in insp.get_table_names()
        cols = {c["name"] for c in insp.get_columns("lab_usage_events")}
        assert {"id", "user_id", "session_id", "lab_id", "started_at", "expires_at",
                "ended_at", "billed_seconds", "period_start", "period_end"} <= cols
        sub_cols = {c["name"] for c in insp.get_columns("subscriptions")}
        assert "current_period_start" in sub_cols
    finally:
        eng.dispose()


# ---------- periodic reaper ----------


def test_reap_once_destroys_expired_sessions_and_finalizes_rows():
    cookies = _user("u1")
    now = _now()
    _set_sub("u1", period_start=now - timedelta(days=5), period_end=now + timedelta(days=25))
    sid = client.post(f"/api/labs/{DOCKER_LAB}/start", cookies=cookies).json()["id"]
    sessions_mod.service._sessions[sid].expires_at = _now() - timedelta(seconds=1)
    assert run(main._reap_lab_containers_once()) >= 1
    assert sid not in sessions_mod.service._sessions
    rows = _usage_rows("u1")
    assert len(rows) == 1 and rows[0].ended_at is not None


def test_reaper_loop_exits_cleanly_on_cancel():
    with mock.patch.object(asyncio, "sleep", side_effect=asyncio.CancelledError):
        with pytest.raises(asyncio.CancelledError):
            run(main._lab_reaper_loop(interval_seconds=300))
