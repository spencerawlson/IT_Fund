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
import progress_api
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session

client = TestClient(main.app)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    progress_api._writes.clear()


def _signed_in(sub="u1", email="u1@example.com"):
    """Create a user + session and return a cookie dict for that user."""
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", sub, email, True, "U"))
        raw = create_session(s, user.id)
        s.commit()
    return {COOKIE_NAME: raw}


def test_progress_requires_auth():
    client.cookies.clear()
    assert client.get("/api/academy/progress").status_code == 401


def test_new_user_starts_empty():
    r = client.get("/api/academy/progress", cookies=_signed_in())
    assert r.status_code == 200 and r.json() == {"state": {}, "version": 0}


def test_put_then_get_roundtrip():
    c = _signed_in()
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": {"xp": 10}}, cookies=c)
    assert r.status_code == 200 and r.json()["version"] == 1
    g = client.get("/api/academy/progress", cookies=c)
    assert g.json() == {"state": {"xp": 10}, "version": 1}


def test_stale_version_conflicts_and_returns_server_copy():
    c = _signed_in()
    client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": {"xp": 10}}, cookies=c)
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": {"xp": 999}}, cookies=c)
    assert r.status_code == 409
    assert r.json() == {"state": {"xp": 10}, "version": 1}  # server copy, unchanged


def test_missing_if_match_is_428():
    assert client.put("/api/academy/progress", json={"state": {}}, cookies=_signed_in()).status_code == 428


def test_non_object_state_is_400():
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": "nope"}, cookies=_signed_in())
    assert r.status_code == 400


def test_oversized_payload_is_413():
    big = {"state": {"blob": "x" * (256 * 1024 + 10)}}
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json=big, cookies=_signed_in())
    assert r.status_code == 413


def test_users_are_isolated():
    a, b = _signed_in("a", "a@example.com"), _signed_in("b", "b@example.com")
    client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": {"who": "a"}}, cookies=a)
    # B has its own empty progress; cannot see A's.
    assert client.get("/api/academy/progress", cookies=b).json() == {"state": {}, "version": 0}
    client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": {"who": "b"}}, cookies=b)
    assert client.get("/api/academy/progress", cookies=a).json()["state"] == {"who": "a"}


def test_write_rate_limit():
    c = _signed_in()
    version = 0
    # Push past the limit; expect a 429 within RATE_MAX+1 attempts.
    got_429 = False
    for _ in range(progress_api.RATE_MAX + 5):
        r = client.put("/api/academy/progress", headers={"If-Match": str(version)}, json={"state": {"n": version}}, cookies=c)
        if r.status_code == 429:
            got_429 = True
            break
        version = r.json()["version"]
    assert got_429
