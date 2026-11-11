"""Tests for the admin panel (backend/admin.py) and AI tutor call logging.

Admin is Spencer-only, password-gated (ADMIN_PASSWORD env var), browser-only
via /admin. Tests use throwaway passwords only — no real secrets anywhere.
"""
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import admin as admin_mod
import ai_tutor
import db
import main
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session
from db_models import AiTutorCall, LabCompletion, Progress, Subscription, User

client = TestClient(main.app)

ADMIN_PASSWORD = "test-admin-password-only"


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    os.environ["ADMIN_PASSWORD"] = ADMIN_PASSWORD
    ai_tutor._hits.clear()
    ai_tutor._cache.clear()
    admin_mod._admin_login_attempts.clear()


def teardown_function():
    os.environ.pop("ADMIN_PASSWORD", None)
    client.cookies.clear()


def _admin_login(password=ADMIN_PASSWORD):
    r = client.post("/api/admin/login", json={"password": password})
    return r


def _signed_in_user(email="u1@example.com", name="U One"):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", email, email, True, name))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    return uid, raw


def _seed_user(uid, email, name, created=None):
    with db.SessionLocal() as s:
        u = User(id=uid, display_name=name, email=email)
        s.add(u)
        s.commit()
        return u.id


# ---------- admin gate ----------


def test_admin_endpoints_reject_without_admin_session():
    for path in ("/api/admin/overview", "/api/admin/accounts", "/api/admin/subscriptions", "/api/admin/ai-calls"):
        assert client.get(path).status_code == 401


def test_admin_login_wrong_password_rejected_with_generic_error():
    r = _admin_login("wrong-password")
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid password"
    assert client.get("/api/admin/overview").status_code == 401


def test_admin_login_fails_when_password_unset(monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    r = _admin_login("anything")
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid password"


def test_admin_login_correct_password_admits_and_status_reflects():
    r = _admin_login()
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert client.get("/api/admin/status").json() == {"authenticated": True}
    assert client.get("/api/admin/overview").status_code == 200


def test_admin_login_rate_limited(monkeypatch):
    # Shrink the window so the test can observe expiry (limit constants are
    # module-level in admin.py and read at call time).
    monkeypatch.setattr(admin_mod, "ADMIN_LOGIN_WINDOW_SECONDS", 2)
    for _ in range(admin_mod.ADMIN_LOGIN_MAX_ATTEMPTS):
        assert _admin_login("wrong-password").status_code == 401
    r = _admin_login("wrong-password")
    assert r.status_code == 429
    assert "retry-after" in r.headers
    assert int(r.headers["retry-after"]) > 0
    # A correct password during the window is also refused.
    assert _admin_login().status_code == 429
    assert client.get("/api/admin/overview").status_code == 401
    # After the window passes, login works again.
    import time

    time.sleep(2.2)
    assert _admin_login().status_code == 200
    assert client.get("/api/admin/overview").status_code == 200


def test_admin_logout_clears_session():
    _admin_login()
    assert client.get("/api/admin/status").json() == {"authenticated": True}
    assert client.post("/api/admin/logout", json={}).status_code == 200
    assert client.get("/api/admin/status").json() == {"authenticated": False}
    assert client.get("/api/admin/overview").status_code == 401


def test_user_session_is_not_an_admin_session():
    _, raw = _signed_in_user()
    client.cookies.set(COOKIE_NAME, raw)
    assert client.get("/api/admin/status").json() == {"authenticated": False}
    assert client.get("/api/admin/overview").status_code == 401


def test_non_admin_endpoints_unaffected_by_admin_gate():
    assert client.get("/health").status_code == 200
    _admin_login()
    assert client.get("/health").status_code == 200


# ---------- accounts ----------


def test_accounts_lists_users_with_progress_and_subscription():
    uid1 = _seed_user("u-aaa", "a@example.com", "Alice")
    uid2 = _seed_user("u-bbb", "b@example.com", "Bob")
    with db.SessionLocal() as s:
        s.merge(Progress(user_id=uid1, state={"lessons": {"l1": {"best": 90}, "l2": {"best": 40}, "l3": {"best": 70}}}))
        s.merge(Subscription(user_id=uid1, stripe_customer_id="cus_1", status="active"))
        s.add(LabCompletion(user_id=uid1, lab_id="net-dns-001", session_id="s1", duration_seconds=120))
        s.commit()
    _admin_login()
    r = client.get("/api/admin/accounts")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    by_email = {a["email"]: a for a in body["items"]}
    alice = by_email["a@example.com"]
    assert alice["lessons_passed"] == 2  # best >= 70 only
    assert alice["labs_completed"] == 1
    assert alice["subscription_status"] == "active"
    assert alice["last_active"] is not None  # progress save counts as activity
    bob = by_email["b@example.com"]
    assert bob["lessons_passed"] == 0
    assert bob["subscription_status"] == "none"
    assert bob["last_active"] is None  # no session, no progress: genuinely unknown


def test_accounts_search_and_pagination():
    for i in range(5):
        _seed_user(f"u-{i}", f"user{i}@example.com", f"User {i}")
    _admin_login()
    r = client.get("/api/admin/accounts?q=user3")
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["email"] == "user3@example.com"
    r = client.get("/api/admin/accounts?page=2&page_size=2")
    body = r.json()
    assert body["total"] == 5 and body["page"] == 2 and len(body["items"]) == 2


def test_accounts_search_escapes_wildcards():
    _seed_user("u-aaa", "a@example.com", "Alice")
    _seed_user("u-bbb", "b@example.com", "Bob")
    _seed_user("u-pct", "pct@example.com", "100% Sure")
    _admin_login()
    # q=% must match only accounts literally containing %, not every account.
    r = client.get("/api/admin/accounts?q=%")
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["email"] == "pct@example.com"
    # Same for the single-character wildcard _.
    r = client.get("/api/admin/accounts?q=_")
    assert r.json()["total"] == 0
    # Ordinary substring search still works.
    r = client.get("/api/admin/accounts?q=alice")
    assert r.json()["total"] == 1


# ---------- subscriptions ----------


def test_subscriptions_totals_and_mrr_unknown_without_stripe():
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    with db.SessionLocal() as s:
        s.merge(Subscription(user_id=uid, stripe_customer_id="cus_1", stripe_subscription_id="sub_1", status="active"))
        s.commit()
    _admin_login()
    r = client.get("/api/admin/subscriptions")
    assert r.status_code == 200
    body = r.json()
    assert body["totals_by_status"] == {"active": 1}
    assert body["mrr"] is None  # Stripe not configured: unknown, never invented
    assert body["items"][0]["email"] == "a@example.com"
    assert body["items"][0]["status"] == "active"


# ---------- AI cost math ----------


def test_cost_usd_math_against_price_table():
    # gpt-4o-mini: $0.15/1M in, $0.60/1M out.
    assert ai_tutor.cost_usd("gpt-4o-mini", 1_000_000, 1_000_000) == 0.75
    assert ai_tutor.cost_usd("gpt-4o-mini", 1000, 500) == 0.00045
    assert ai_tutor.cost_usd("gpt-4o", 1_000_000, 0) == 2.5


def test_cost_usd_unknown_when_model_or_counts_missing():
    assert ai_tutor.cost_usd("some-future-model", 1000, 500) is None
    assert ai_tutor.cost_usd("gpt-4o-mini", None, 500) is None
    assert ai_tutor.cost_usd("gpt-4o-mini", 1000, None) is None


# ---------- AI call logging ----------


class FakeCompletionsWithUsage:
    """Fake OpenAI client whose final chunk carries usage, like stream_options
    include_usage does on the real API."""

    def __init__(self, parts=("Hello", " world")):
        self.parts, self.calls = parts, []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        chunks = [SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=p))], usage=None) for p in self.parts]
        chunks.append(SimpleNamespace(choices=[], usage=SimpleNamespace(prompt_tokens=120, completion_tokens=8, total_tokens=128)))
        return iter(chunks)


def _tutor_user(monkeypatch):
    uid, raw = _signed_in_user()
    # The tutor is paywalled: the fixture user needs an active subscription.
    with db.SessionLocal() as s:
        s.merge(Subscription(user_id=uid, stripe_customer_id="cus_test", status="active"))
        s.commit()
    monkeypatch.setattr(
        ai_tutor,
        "get_client",
        lambda: SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletionsWithUsage())),
    )
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    client.cookies.set(COOKIE_NAME, raw)
    return uid


CARD = {"mode": "explain", "question": "Which port does SSH use?", "answer": "22/TCP"}


def _events(resp):
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


def test_tutor_call_logs_tokens_and_cost(monkeypatch):
    uid = _tutor_user(monkeypatch)
    r = client.post("/api/ai/tutor", json=CARD)
    assert r.status_code == 200
    assert "".join(e.get("t", "") for e in _events(r)) == "Hello world"
    with db.SessionLocal() as s:
        rows = s.query(AiTutorCall).filter(AiTutorCall.user_id == uid).all()
    assert len(rows) == 1
    row = rows[0]
    assert row.mode == "explain" and row.model == "gpt-4o-mini"
    assert row.prompt_tokens == 120 and row.completion_tokens == 8
    # 120 * 0.15/1M + 8 * 0.60/1M = 0.000018 + 0.0000048 = 0.000023 (rounded 6dp)
    assert row.cost_usd == pytest.approx(0.000023)
    assert row.cached is False and row.error is False


def test_cached_tutor_call_logs_zero_cost(monkeypatch):
    uid = _tutor_user(monkeypatch)
    client.post("/api/ai/tutor", json=CARD)
    client.post("/api/ai/tutor", json=CARD)  # second call is served from cache
    with db.SessionLocal() as s:
        rows = s.query(AiTutorCall).filter(AiTutorCall.user_id == uid).order_by(AiTutorCall.created_at).all()
    assert len(rows) == 2
    assert rows[1].cached is True
    assert rows[1].cost_usd == 0.0
    assert rows[1].prompt_tokens is None


def test_tutor_error_still_logs_a_row(monkeypatch):
    uid, raw = _signed_in_user()
    # The tutor is paywalled: this user needs an active subscription.
    with db.SessionLocal() as s:
        s.merge(Subscription(user_id=uid, stripe_customer_id="cus_test", status="active"))
        s.commit()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")

    class Failing:
        def create(self, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(ai_tutor, "get_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=Failing())))
    client.cookies.set(COOKIE_NAME, raw)
    r = client.post("/api/ai/tutor", json=CARD)
    assert r.status_code == 200
    assert "error" in _events(r)[0]
    with db.SessionLocal() as s:
        rows = s.query(AiTutorCall).filter(AiTutorCall.user_id == uid).all()
    assert len(rows) == 1
    assert rows[0].error is True
    assert rows[0].cost_usd is None


def test_ai_calls_endpoint_aggregates(monkeypatch):
    uid = _tutor_user(monkeypatch)
    client.post("/api/ai/tutor", json=CARD)
    _admin_login()
    r = client.get("/api/admin/ai-calls?days=30")
    assert r.status_code == 200
    body = r.json()
    assert body["totals"]["calls"] == 1
    assert body["totals"]["prompt_tokens"] == 120
    assert body["totals"]["completion_tokens"] == 8
    assert body["totals"]["cost_usd"] == pytest.approx(0.000023)
    assert len(body["per_day"]) == 1
    assert body["per_user"][0]["user_id"] == uid
    assert len(body["recent"]) == 1
    assert body["recent"][0]["mode"] == "explain"
