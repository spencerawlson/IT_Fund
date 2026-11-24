"""Tests for learner reviews (backend/reviews.py, backend/public.py,
backend/admin.py moderation).

Rules under test: any signed-in learner may submit; a review is stored
unapproved and stays off the public list until an admin approves it; one
review per user (a re-submission updates in place and goes back to
moderation); reject deletes the row; the public list never leaks a user id
or an email. No seeded or fake reviews anywhere — the public page launches
empty.
"""
import os
import sys
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import admin_testkit
import db
import main
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session
from db_models import Review

client = TestClient(main.app)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    client.cookies.clear()
    client.headers.pop("X-CSRF-Token", None)


def teardown_function():
    admin_testkit.clear(client)


def _signed_in_user(email="learner@example.com", name="Learner"):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", f"sub-{email}", email, True, name))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    client.cookies.set(COOKIE_NAME, raw)
    return uid


def _submit(rating=5, body="The labs made the concepts stick.", display_name="Learner"):
    payload = {"rating": rating, "body": body}
    if display_name is not None:
        payload["display_name"] = display_name
    return client.post("/api/reviews", json=payload)


def _review_count():
    with db.SessionLocal() as s:
        return s.query(Review).count()


def test_unauthenticated_post_is_401():
    r = client.post("/api/reviews", json={"rating": 5, "body": "Great course, really."})
    assert r.status_code == 401


def test_invalid_rating_and_body_are_422():
    _signed_in_user()
    for payload in (
        {"rating": 0, "body": "Great course, really."},
        {"rating": 6, "body": "Great course, really."},
        {"rating": 5, "body": "tiny"},
        {"rating": 5, "body": "x" * 2001},
        {"rating": 5, "body": "Great course, really.", "display_name": "x" * 121},
    ):
        assert client.post("/api/reviews", json=payload).status_code == 422, payload
    assert _review_count() == 0


def test_submit_stored_unapproved_and_not_public():
    _signed_in_user()
    r = _submit()
    assert r.status_code == 201
    body = r.json()
    assert body["rating"] == 5
    assert body["approved"] is False
    assert "user_id" not in body and "email" not in body
    with db.SessionLocal() as s:
        row = s.query(Review).one()
        assert row.approved is False
    assert client.get("/api/public/reviews").json() == {"reviews": []}


def test_approve_puts_review_on_public_list():
    uid = _signed_in_user()
    assert _submit().status_code == 201
    admin_testkit.admin_login(client)
    with db.SessionLocal() as s:
        review_id = s.query(Review).one().id
    r = client.post(f"/api/admin/reviews/{review_id}/approve")
    assert r.status_code == 200
    pub = client.get("/api/public/reviews").json()["reviews"]
    assert len(pub) == 1
    assert pub[0]["rating"] == 5
    assert pub[0]["body"] == "The labs made the concepts stick."
    assert pub[0]["display_name"] == "Learner"
    assert set(pub[0].keys()) == {"rating", "body", "display_name", "created_at"}
    assert uid not in str(pub) and "learner@example.com" not in str(pub)


def test_public_list_anonymises_blank_display_name():
    _signed_in_user()
    assert _submit(display_name=None).status_code == 201
    admin_testkit.admin_login(client)
    with db.SessionLocal() as s:
        review_id = s.query(Review).one().id
    client.post(f"/api/admin/reviews/{review_id}/approve")
    pub = client.get("/api/public/reviews").json()["reviews"]
    assert pub[0]["display_name"] == "Anonymous learner"


def test_reject_deletes_the_row():
    _signed_in_user()
    assert _submit().status_code == 201
    admin_testkit.admin_login(client)
    with db.SessionLocal() as s:
        review_id = s.query(Review).one().id
    r = client.post(f"/api/admin/reviews/{review_id}/reject")
    assert r.status_code == 200
    assert _review_count() == 0
    assert client.get("/api/public/reviews").json() == {"reviews": []}
    # A second decision on the same id is a 404, not a silent success.
    assert client.post(f"/api/admin/reviews/{review_id}/approve").status_code == 404


def test_second_submit_updates_in_place_and_returns_to_moderation():
    _signed_in_user()
    assert _submit().status_code == 201
    admin_testkit.admin_login(client)
    with db.SessionLocal() as s:
        review_id = s.query(Review).one().id
    assert client.post(f"/api/admin/reviews/{review_id}/approve").status_code == 200
    assert len(client.get("/api/public/reviews").json()["reviews"]) == 1
    # The same learner submits again (fresh site session; admin cookies
    # cleared by the testkit teardown pattern — re-sign-in as the learner).
    client.cookies.clear()
    _signed_in_user()
    r = _submit(rating=3, body="Good, but I wanted more labs.", display_name="Learner 2")
    assert r.status_code == 200
    assert r.json()["updated"] is True
    assert _review_count() == 1
    with db.SessionLocal() as s:
        row = s.query(Review).one()
        assert row.id == review_id
        assert row.rating == 3
        assert row.approved is False
    assert client.get("/api/public/reviews").json() == {"reviews": []}


def test_admin_list_pending_first_and_requires_admin():
    assert client.get("/api/admin/reviews").status_code == 401
    _signed_in_user()
    assert client.get("/api/admin/reviews").status_code == 401
    _submit()
    admin_testkit.admin_login(client)
    r = client.get("/api/admin/reviews")
    assert r.status_code == 200
    items = r.json()["reviews"]
    assert len(items) == 1
    assert items[0]["approved"] is False
    assert items[0]["email"] == "learner@example.com"
