"""Tests for the admin panel (backend/admin.py) and AI tutor call logging.

Admin is Spencer-only: his own verified OAuth account + an authenticator code
(admin_auth.py). These tests sign in through that real flow (admin_testkit);
the sign-in rules themselves are covered in test_admin_auth.py.
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
import billing
import db
import main
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session
from db_models import AiTutorCall, LabCompletion, ManualGrant, Progress, Subscription, User

client = TestClient(main.app)

import admin_testkit


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    ai_tutor._hits.clear()
    ai_tutor._cache.clear()
    admin_mod._admin_login_attempts.clear()


def teardown_function():
    admin_testkit.clear(client)


@pytest.fixture(autouse=True)
def _tutor_disk_cache(tmp_path, monkeypatch):
    """A throwaway tutor disk-cache dir per test: without this, the CARD
    constant below collides with whichever test first generated an answer
    for it, since the disk cache (unlike _cache.clear() above) persists
    across tests and across runs (see ai_tutor.TUTOR_CACHE_DIR)."""
    monkeypatch.setattr(ai_tutor, "TUTOR_CACHE_DIR", tmp_path / "tutor-cache")


def _admin_login():
    return admin_testkit.admin_login(client).response


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


def test_user_session_is_not_an_admin_session():
    _, raw = _signed_in_user()
    client.cookies.set(COOKIE_NAME, raw)
    assert client.get("/api/admin/status").json()["authenticated"] is False
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
    assert body["total"] == 3  # 2 learners + the signed-in admin's own account
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
    assert body["total"] == 6 and body["page"] == 2 and len(body["items"]) == 2  # 5 seeded + the admin


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

# ---------- manual enrollment ----------


def _grant(uid, note="Enrolled in person"):
    from db_models import ManualGrant

    with db.SessionLocal() as s:
        s.add(ManualGrant(user_id=uid, note=note))
        s.commit()


def _learner_cookies(uid):
    from auth.sessions import COOKIE_NAME, create_session

    with db.SessionLocal() as s:
        raw = create_session(s, uid)
        s.commit()
    return {COOKIE_NAME: raw}


def test_manual_endpoints_reject_without_admin_session():
    for method, path in (
        ("get", "/api/admin/report"),
        ("get", "/api/admin/report.csv"),
        ("post", "/api/admin/accounts"),
        ("patch", "/api/admin/accounts/u-aaa"),
        ("delete", "/api/admin/accounts/u-aaa"),
        ("post", "/api/admin/accounts/u-aaa/manual-grant"),
        ("post", "/api/admin/accounts/u-aaa/manual-grant/revoke"),
    ):
        r = client.request(method, path, json={} if method in ("post", "patch") else None)
        assert r.status_code == 401, path


def test_add_account_creates_user_and_grant():
    _admin_login()
    r = client.post(
        "/api/admin/accounts",
        json={"display_name": "Carol", "email": "CAROL@Example.com", "note": "Met at the meetup"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "carol@example.com"  # lowercased
    assert body["user"]["display_name"] == "Carol"
    assert body["manual_grant"]["active"] is True
    assert body["manual_grant"]["note"] == "Met at the meetup"
    uid = body["user"]["id"]
    # The grant is paid access, and the Stripe table was never touched.
    assert billing.is_subscribed(uid) is True
    with db.SessionLocal() as s:
        assert s.get(Subscription, uid) is None


def test_added_customer_status_is_manual():
    _admin_login()
    r = client.post(
        "/api/admin/accounts",
        json={"display_name": "Carol", "email": "carol@example.com", "note": ""},
    )
    uid = r.json()["user"]["id"]
    client.cookies.clear()
    r = client.get("/api/billing/status", cookies=_learner_cookies(uid))
    assert r.json() == {"subscribed": True, "status": "manual", "provider": "manual", "plan": None, "current_period_end": None}


def test_add_account_rejects_duplicate_email_case_insensitive():
    _seed_user("u-aaa", "a@example.com", "Alice")
    _admin_login()
    r = client.post(
        "/api/admin/accounts",
        json={"display_name": "Alice 2", "email": "A@EXAMPLE.COM", "note": ""},
    )
    assert r.status_code == 409
    assert "already exists" in r.json()["detail"]


def test_add_account_validates_input():
    _admin_login()
    assert client.post(
        "/api/admin/accounts", json={"display_name": "", "email": "a@example.com"}
    ).status_code == 400
    assert client.post(
        "/api/admin/accounts", json={"display_name": "A", "email": "not-an-email"}
    ).status_code == 400
    assert client.post(
        "/api/admin/accounts",
        json={"display_name": "A", "email": "a@example.com", "note": "x" * 501},
    ).status_code == 400


def test_grant_revoke_cycle():
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    _admin_login()
    r = client.post(f"/api/admin/accounts/{uid}/manual-grant", json={"note": "Paid cash"})
    assert r.status_code == 201
    assert r.json()["manual_grant"]["active"] is True
    assert billing.is_subscribed(uid) is True
    # A second grant while active is a conflict.
    assert client.post(f"/api/admin/accounts/{uid}/manual-grant", json={}).status_code == 409
    # Revoke ends access; the row survives with the reason.
    r = client.post(
        f"/api/admin/accounts/{uid}/manual-grant/revoke", json={"note": "Refunded"}
    )
    assert r.status_code == 200
    assert r.json()["manual_grant"]["active"] is False
    assert r.json()["manual_grant"]["revoked_note"] == "Refunded"
    assert billing.is_subscribed(uid) is False
    # Revoking again is idempotent.
    assert client.post(f"/api/admin/accounts/{uid}/manual-grant/revoke", json={}).status_code == 200
    # And a re-grant after a revoke works.
    r = client.post(
        f"/api/admin/accounts/{uid}/manual-grant", json={"note": "Re-enrolled"}
    )
    assert r.status_code == 201
    assert r.json()["manual_grant"]["active"] is True
    assert billing.is_subscribed(uid) is True


def test_grant_unknown_user_and_revoke_without_grant():
    _admin_login()
    assert client.post("/api/admin/accounts/nope/manual-grant", json={}).status_code == 404
    assert client.post("/api/admin/accounts/nope/manual-grant/revoke", json={}).status_code == 404
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    assert client.post(f"/api/admin/accounts/{uid}/manual-grant/revoke", json={}).status_code == 404


def test_overview_and_accounts_show_manual_grants():
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    _grant(uid)
    _admin_login()
    assert client.get("/api/admin/overview").json()["manual_grants_active"] == 1
    body = client.get("/api/admin/accounts").json()
    alice = [a for a in body["items"] if a["email"] == "a@example.com"][0]
    assert alice["manual_grant"]["active"] is True
    assert alice["manual_grant"]["note"] == "Enrolled in person"


# ---------- account edit + delete (reserved-seat conversion, board management) ----------


def _add_dummy(name="Dummy 1", email="1@road2cissp.local"):
    r = client.post(
        "/api/admin/accounts",
        json={"display_name": name, "email": email, "note": "Reserved seat"},
    )
    assert r.status_code == 201, r.text
    return r.json()["user"]


def test_edit_account_keeps_manual_grant():
    """Converting a reserved seat: new name + email, same account id, same
    grant — the person keeps paid access."""
    _admin_login()
    dummy = _add_dummy()
    uid = dummy["id"]
    assert billing.is_subscribed(uid) is True
    r = client.patch(
        f"/api/admin/accounts/{uid}",
        json={"display_name": "Marie Dupont", "email": "MARIE@Example.com"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["user"]["display_name"] == "Marie Dupont"
    assert r.json()["user"]["email"] == "marie@example.com"  # lowercased
    assert r.json()["user"]["id"] == uid
    # Same grant row, still active — paid access survived the conversion.
    assert billing.is_subscribed(uid) is True
    with db.SessionLocal() as s:
        grant = s.get(ManualGrant, uid)
        assert grant is not None and grant.revoked_at is None
        assert s.get(User, uid).email == "marie@example.com"
    body = client.get("/api/admin/accounts").json()
    assert [a for a in body["items"] if a["email"] == "marie@example.com"][0]["manual_grant"]["active"] is True


def test_edit_account_name_only_and_same_email():
    _admin_login()
    dummy = _add_dummy()
    uid = dummy["id"]
    r = client.patch(f"/api/admin/accounts/{uid}", json={"display_name": "Dummy One"})
    assert r.status_code == 200
    assert r.json()["user"]["display_name"] == "Dummy One"
    assert r.json()["user"]["email"] == "1@road2cissp.local"
    # "Changing" the email to its current value is not a collision.
    r = client.patch(f"/api/admin/accounts/{uid}", json={"email": "1@road2cissp.local"})
    assert r.status_code == 200


def test_edit_account_email_collision_case_insensitive():
    _seed_user("u-aaa", "a@example.com", "Alice")
    _admin_login()
    dummy = _add_dummy()
    r = client.patch(f"/api/admin/accounts/{dummy['id']}", json={"email": "A@EXAMPLE.COM"})
    assert r.status_code == 409
    assert "already exists" in r.json()["detail"]
    with db.SessionLocal() as s:
        assert s.get(User, dummy["id"]).email == "1@road2cissp.local"


def test_edit_account_validates_input():
    _admin_login()
    dummy = _add_dummy()
    uid = dummy["id"]
    assert client.patch(f"/api/admin/accounts/{uid}", json={}).status_code == 400
    assert client.patch(
        f"/api/admin/accounts/{uid}", json={"display_name": ""}
    ).status_code == 400
    assert client.patch(
        f"/api/admin/accounts/{uid}", json={"display_name": "x" * 121}
    ).status_code == 400
    assert client.patch(
        f"/api/admin/accounts/{uid}", json={"email": "not-an-email"}
    ).status_code == 400
    assert client.patch(
        f"/api/admin/accounts/{uid}", json={"display_name": 42}
    ).status_code == 400
    assert client.patch("/api/admin/accounts/nope", json={"email": "a@example.com"}).status_code == 404


def test_delete_account_soft_deletes_revokes_grant_and_frees_seat():
    """Soft delete: the row stays (deleted_at set) so grants, progress, and
    subscription records are never orphaned — but the account leaves the
    board list, the totals, and the seats counter, its grant is revoked,
    and the seat frees."""
    _admin_login()
    dummy = _add_dummy()
    uid = dummy["id"]
    # Counts include the signed-in admin's own account (1).
    assert client.get("/api/public/seats").json()["total_accounts"] == 2
    r = client.delete(f"/api/admin/accounts/{uid}")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "deleted_user_id": uid}
    assert client.get("/api/admin/accounts").json()["total"] == 1
    assert client.get("/api/admin/overview").json()["total_users"] == 1
    assert client.get("/api/public/seats").json()["total_accounts"] == 1
    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user is not None  # the row stays
        assert user.deleted_at is not None
        grant = s.get(ManualGrant, uid)
        assert grant is not None  # the grant row stays too
        assert grant.revoked_at is not None
        assert grant.revoked_note == "Account deleted."
    assert billing.is_subscribed(uid) is False
    # A deleted account is gone for the board: editing or deleting it again
    # is a 404, not a second delete.
    assert client.patch(f"/api/admin/accounts/{uid}", json={"display_name": "X"}).status_code == 404
    assert client.delete(f"/api/admin/accounts/{uid}").status_code == 404


def test_delete_then_recreate_same_email_works():
    """The duplicate-email check ignores deleted accounts, so a deleted
    seat's email can be used again — 409 only fires against live accounts."""
    _admin_login()
    dummy = _add_dummy()
    assert client.delete(f"/api/admin/accounts/{dummy['id']}").status_code == 200
    r = client.post(
        "/api/admin/accounts",
        json={"display_name": "Marie Dupont", "email": "1@road2cissp.local", "note": ""},
    )
    assert r.status_code == 201, r.text
    assert r.json()["user"]["email"] == "1@road2cissp.local"
    assert r.json()["user"]["id"] != dummy["id"]  # a fresh account, not a resurrection
    assert client.get("/api/public/seats").json()["total_accounts"] == 2  # + the admin's own account


def _seed_subscription(uid, status):
    with db.SessionLocal() as s:
        s.add(Subscription(user_id=uid, stripe_customer_id=f"cus_{uid}", status=status))
        s.commit()


def test_delete_blocked_with_live_stripe_subscription():
    _admin_login()
    for status in ("active", "trialing", "past_due"):
        uid = _seed_user(f"u-{status}", f"{status}@example.com", status.title())
        _seed_subscription(uid, status)
        r = client.delete(f"/api/admin/accounts/{uid}")
        assert r.status_code == 409, status
        assert "Stripe" in r.json()["detail"]
        # The account is untouched.
        items = client.get("/api/admin/accounts").json()["items"]
        assert [a for a in items if a["email"] == f"{status}@example.com"], status
        with db.SessionLocal() as s:
            assert s.get(User, uid) is not None


def test_delete_allowed_when_stripe_subscription_canceled():
    _admin_login()
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    _seed_subscription(uid, "canceled")
    r = client.delete(f"/api/admin/accounts/{uid}")
    assert r.status_code == 200
    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user is not None  # soft delete: the row stays
        assert user.deleted_at is not None
        assert s.get(Subscription, uid) is not None  # the Stripe record stays too


def test_delete_unknown_account_is_404():
    _admin_login()
    assert client.delete("/api/admin/accounts/nope").status_code == 404


# ---------- report ----------


def test_report_json_and_csv_match():
    uid = _seed_user("u-aaa", "a@example.com", "Alice")
    _grant(uid)
    _admin_login()
    r = client.get("/api/admin/report")
    assert r.status_code == 200
    data = r.json()
    assert data["days"] == 30 and "generated_at" in data
    assert data["overview"]["manual_grants_active"] == 1
    assert data["accounts"]["total"] == 2  # Alice + the signed-in admin's own account
    alice = next(a for a in data["accounts"]["items"] if a["email"] == "a@example.com")
    assert alice["manual_grant"]["active"] is True
    assert data["subscriptions"]["items"] == []
    assert data["ai_costs"]["totals"]["calls"] == 0
    r = client.get("/api/admin/report.csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert "attachment" in r.headers["content-disposition"]
    assert "admin-report-" in r.headers["content-disposition"]
    text = r.text
    assert "Road to CISSP admin report" in text
    assert "a@example.com" in text
    assert "Manual enrollments (active),1" in text
    # One section only.
    r = client.get("/api/admin/report.csv?section=accounts")
    assert "a@example.com" in r.text
    assert "Road to CISSP admin report" in r.text
    assert "Subscriptions (stored Stripe state)" not in r.text
    assert client.get("/api/admin/report.csv?section=nope").status_code == 400
