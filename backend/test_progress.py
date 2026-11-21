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


def test_deeply_nested_payload_is_400_not_500():
    # 10,000 levels of nesting: json.loads raises RecursionError, which must
    # surface as a 400 (malformed payload), never a 500.
    deep = b'{"state": ' + b'[' * 10000 + b']' * 10000 + b'}'
    r = client.put(
        "/api/academy/progress",
        headers={"If-Match": "0", "Content-Type": "application/json"},
        content=deep,
        cookies=_signed_in(),
    )
    assert r.status_code == 400


# PR 3 tests (card UUID migration, plan v2.2 §5 / compatibility-contract §2-§4).
# Written FIRST against the current code and observed FAILING: the server
# stores state opaquely — a legacy-keyed PUT stays legacy-keyed, GET returns
# whatever was stored, and there is no marker protocol at all.
# Fixture ids are REAL catalogue pairs from scripts/legacy-card-ids.json.
UUID_0 = "8e8346a1-95b5-4133-9b6f-f5465012b3ce"  # py-basics-0
UUID_1 = "7c7a2fa0-041b-46c4-b804-37defae1fa7d"  # py-basics-1
UUID_P0 = "6a4f89a7-e1f1-4040-b904-ba2aff82cc8e"  # py-basics-p0 (puzzle)


def test_put_translates_legacy_keys_and_stores_uuid_only():
    c = _signed_in()
    state = {"cards": {"py-basics-0": {"box": 3, "due": 100, "right": 5, "wrong": 2, "revSeen": 1}}, "xp": 40}
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": state}, cookies=c)
    assert r.status_code == 200
    # The stored row (read back as the new client) is UUID-only.
    g = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert g.json()["state"]["cards"] == {UUID_0: {"box": 3, "due": 100, "right": 5, "wrong": 2, "revSeen": 1}}
    assert g.json()["state"]["xp"] == 40


def test_put_translates_for_unmarked_old_clients_too():
    # An old client sends no marker; its legacy keys are still translated.
    c = _signed_in()
    state = {"cards": {"py-basics-1": {"box": 1, "due": 50, "right": 0, "wrong": 1}}}
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": state}, cookies=c)
    assert r.status_code == 200
    g = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert list(g.json()["state"]["cards"]) == [UUID_1]


def test_put_combines_a_legacy_entry_with_its_uuid_entry():
    c = _signed_in()
    state = {
        "cards": {
            "py-basics-0": {"box": 2, "due": 100, "right": 3, "wrong": 1, "revSeen": 1},
            UUID_0: {"box": 3, "due": 50, "right": 1, "wrong": 2, "revSeen": 1},
        }
    }
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": state}, cookies=c)
    assert r.status_code == 200
    g = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert g.json()["state"]["cards"] == {UUID_0: {"box": 3, "due": 50, "right": 3, "wrong": 2, "revSeen": 1}}
    # Idempotent: PUT the same dual-keyed state twice -> identical result.
    r2 = client.put(
        "/api/academy/progress",
        headers={"If-Match": "1"},
        json={"state": state},
        cookies=c,
    )
    assert r2.status_code == 200
    g2 = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert g2.json()["state"]["cards"] == {UUID_0: {"box": 3, "due": 50, "right": 3, "wrong": 2, "revSeen": 1}}


def test_put_translates_resume_plans_and_tries():
    c = _signed_in()
    state = {
        "resume": {
            "deckId": "py-basics",
            "plan": [
                {"k": "w", "id": "py-basics-1"},
                {"k": "c", "id": "py-basics-0"},
                {"k": "p", "id": "py-basics-p0"},
            ],
            "index": 1,
            "tries": {"py-basics-1-review": False, "py-basics-0": True},
            "retried": ["py-basics-1-review"],
            "at": 500,
        }
    }
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": state}, cookies=c)
    assert r.status_code == 200
    resume = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c).json()["state"]["resume"]
    assert resume["plan"] == [
        {"k": "w", "id": UUID_1, "deckId": "py-basics"},
        {"k": "c", "id": UUID_0, "deckId": "py-basics"},
        {"k": "p", "id": UUID_P0},
    ]
    assert resume["tries"] == {f"{UUID_1}-review": False, UUID_0: True}
    assert resume["retried"] == [f"{UUID_1}-review"]
    assert resume["deckId"] == "py-basics" and resume["index"] == 1 and resume["at"] == 500


def test_put_preserves_unmapped_legacy_keys():
    c = _signed_in()
    state = {"cards": {"py-basics-999": {"box": 4, "due": 90, "right": 7, "wrong": 1}}}
    r = client.put("/api/academy/progress", headers={"If-Match": "0"}, json={"state": state}, cookies=c)
    assert r.status_code == 200
    g = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert g.json()["state"]["cards"] == {"py-basics-999": {"box": 4, "due": 90, "right": 7, "wrong": 1}}


def test_get_without_marker_returns_dual_keyed_state_and_does_not_write():
    c = _signed_in()
    client.put(
        "/api/academy/progress",
        headers={"If-Match": "0", "X-Card-Id-Version": "2"},
        json={"state": {"cards": {UUID_0: {"box": 3, "due": 100, "right": 5, "wrong": 2}}, "xp": 40}},
        cookies=c,
    )
    g = client.get("/api/academy/progress", cookies=c)  # no marker: old client
    assert g.status_code == 200
    cards = g.json()["state"]["cards"]
    assert cards[UUID_0] == {"box": 3, "due": 100, "right": 5, "wrong": 2}
    assert cards["py-basics-0"] == {"box": 3, "due": 100, "right": 5, "wrong": 2}  # same values, legacy key
    assert g.json()["state"]["xp"] == 40
    # Display must not write: the stored row is unchanged (UUID-only).
    g2 = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert list(g2.json()["state"]["cards"]) == [UUID_0]
    assert g2.json()["version"] == 1


def test_get_without_marker_adds_no_legacy_key_for_new_cards():
    c = _signed_in()
    new_uuid = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"  # authored after the migration
    client.put(
        "/api/academy/progress",
        headers={"If-Match": "0", "X-Card-Id-Version": "2"},
        json={"state": {"cards": {new_uuid: {"box": 1, "due": 10, "right": 0, "wrong": 1}}}},
        cookies=c,
    )
    g = client.get("/api/academy/progress", cookies=c)
    assert list(g.json()["state"]["cards"]) == [new_uuid]


def test_get_with_marker_returns_stored_state_as_is():
    c = _signed_in()
    client.put(
        "/api/academy/progress",
        headers={"If-Match": "0"},
        json={"state": {"cards": {"py-basics-0": {"box": 2, "due": 10, "right": 1, "wrong": 0}}}},
        cookies=c,
    )
    g = client.get("/api/academy/progress", headers={"X-Card-Id-Version": "2"}, cookies=c)
    assert list(g.json()["state"]["cards"]) == [UUID_0]
    assert "py-basics-0" not in g.json()["state"]["cards"]
