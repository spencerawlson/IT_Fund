"""Tests for the Cypher analytics endpoints (backend/analytics.py).

The rule under test: counts and timings only, never conversation content
or free text — the event allowlist and the meta validation are what enforce
it, so both are asserted here.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import db
import main
from auth.sessions import COOKIE_NAME, create_session
from db_models import CypherEvent, Subscription, User

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def _clean():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    yield
    client.cookies.clear()


def _signed_in_user(user_id="analytics-test", email="a@example.com"):
    with db.SessionLocal() as s:
        if s.get(User, user_id) is None:
            s.add(User(id=user_id, display_name=user_id, email=email))
            s.flush()
        raw = create_session(s, user_id)
        s.commit()
    client.cookies.set(COOKIE_NAME, raw)
    return user_id


def test_events_require_sign_in():
    client.cookies.clear()
    r = client.post("/api/analytics/events", json={"event": "panel_opened"})
    assert r.status_code == 401


def test_unknown_event_is_400():
    _signed_in_user()
    r = client.post("/api/analytics/events", json={"event": "student_asked_about_x"})
    assert r.status_code == 400


def test_free_text_meta_is_rejected():
    """meta accepts only the allowlisted keys with str/int/bool values —
    a question, an answer, or any other free text is a 400."""
    _signed_in_user()
    r = client.post(
        "/api/analytics/events",
        json={"event": "panel_opened", "meta": {"question": "how do I hack the firewall?"}},
    )
    assert r.status_code == 400
    r = client.post(
        "/api/analytics/events",
        json={"event": "panel_opened", "meta": {"answer": "the full tutor reply text"}},
    )
    assert r.status_code == 400


def test_event_recorded_with_ids_only():
    _signed_in_user()
    r = client.post(
        "/api/analytics/events",
        json={
            "event": "invite_accepted",
            "mission_id": "op-broken-shield",
            "lesson_id": "net-security",
            "meta": {"source": "lesson-panel"},
        },
    )
    assert r.status_code == 200
    assert r.json() == {"recorded": True, "event": "invite_accepted"}
    with db.SessionLocal() as s:
        rows = s.query(CypherEvent).all()
    assert len(rows) == 1
    assert rows[0].mission_id == "op-broken-shield"
    assert rows[0].lesson_id == "net-security"
    assert rows[0].meta == {"source": "lesson-panel"}


def test_summary_aggregates_own_data_only():
    _signed_in_user("user-a", "a@example.com")
    client.post("/api/analytics/events", json={"event": "panel_opened", "lesson_id": "net-security"})
    client.post("/api/analytics/events", json={"event": "panel_opened", "lesson_id": "net-security"})
    client.post("/api/analytics/events", json={"event": "invite_accepted", "mission_id": "op-broken-shield"})
    # Another user's events must not leak into this summary.
    _signed_in_user("user-b", "b@example.com")
    client.post("/api/analytics/events", json={"event": "panel_opened", "lesson_id": "net-security"})
    _signed_in_user("user-a", "a@example.com")

    r = client.get("/api/analytics/cypher-summary")
    assert r.status_code == 200
    body = r.json()
    assert body["events"] == {"panel_opened": 2, "invite_accepted": 1}
    assert body["tutor"]["calls"] == 0
    assert body["voice"]["calls"] == 0
    assert body["voice"]["cost_usd"] is None
    assert body["missions"] == {"started": 0, "completed": 0, "completion_seconds": []}


def test_summary_requires_sign_in():
    client.cookies.clear()
    r = client.get("/api/analytics/cypher-summary")
    assert r.status_code == 401
