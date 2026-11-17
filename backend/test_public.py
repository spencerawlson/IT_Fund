"""Tests for the public seats endpoint (backend/public.py).

GET /public/seats (and /api/public/seats) is unauthenticated by design: it
reports the total accounts created and the 10,000-seat cap for the landing
page counter. No user data of any kind leaves here — just two numbers.
"""
import os
import sys
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import db
import main
from db_models import User
from public import SEAT_CAP

client = TestClient(main.app)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


def _seed(n):
    with db.SessionLocal() as s:
        s.bulk_save_objects(
            [User(id=f"seat-{i:05d}", display_name=f"Seat {i}", email=f"seat{i}@example.com") for i in range(n)]
        )
        s.commit()


def test_seats_empty_reports_zero_and_cap():
    r = client.get("/api/public/seats")
    assert r.status_code == 200
    assert r.json() == {"total_accounts": 0, "cap": 10000}
    assert SEAT_CAP == 10000


def test_seats_counts_seeded_accounts():
    _seed(3)
    assert client.get("/api/public/seats").json() == {"total_accounts": 3, "cap": 10000}


def test_seats_public_on_both_prefixes_without_auth():
    _seed(2)
    # No login of any kind: the endpoint is public by design, and it answers
    # on both prefixes like every other router.
    for path in ("/public/seats", "/api/public/seats"):
        r = client.get(path)
        assert r.status_code == 200
        assert r.json() == {"total_accounts": 2, "cap": 10000}


def test_seats_counts_admin_created_accounts_too():
    # Admin-enrolled accounts are User rows, so they count toward the seats
    # total exactly like self-signed-up ones (same query as the admin
    # overview's total_users).
    with db.SessionLocal() as s:
        s.add(User(id="admin-enrolled", display_name="Enrolled", email="enrolled@example.com"))
        s.commit()
    assert client.get("/api/public/seats").json()["total_accounts"] == 1
