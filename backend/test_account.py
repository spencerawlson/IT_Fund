"""Tests for self-service account deletion (backend/account.py).

Guideline 5.1.1(v): a signed-in user can delete their own account from
inside the app. Stripe is fully mocked — no network. The endpoint cancels
a live Stripe subscription first (so nobody keeps paying after deleting),
then soft-deletes the account (the codebase's existing pattern) while
scrubbing personal data and purging learning data.
"""
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# ---- fake stripe module (only Subscription.cancel is exercised here) ----
fake_stripe = types.ModuleType("stripe")
fake_stripe.api_key = None


class _FakeSubscription:
    cancel_calls = []
    cancel_mode = "ok"  # "ok" | "already_canceled" | "fail"

    @staticmethod
    def cancel(sub_id):
        _FakeSubscription.cancel_calls.append(sub_id)
        if _FakeSubscription.cancel_mode == "already_canceled":
            raise RuntimeError("subscription already canceled")
        if _FakeSubscription.cancel_mode == "fail":
            raise RuntimeError("stripe down")
        return {"id": sub_id, "status": "canceled"}


fake_stripe.Subscription = _FakeSubscription
sys.modules["stripe"] = fake_stripe

import pytest
from fastapi.testclient import TestClient

import audit
import billing
import db
import main
from auth import native as native_mod
from auth import oauth as oauth_mod
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session
from db_models import (
    AdminMfa,
    AdminSession,
    AiTutorCall,
    AuthSession,
    CypherEvent,
    Identity,
    LabCompletion,
    LabSession,
    LabUsageEvent,
    ManualGrant,
    MissionAttempt,
    NativeAuthCode,
    Progress,
    Subscription,
    User,
    VoiceCall,
)

client = TestClient(main.app)

_prev_stripe = None


def setup_function():
    global _prev_stripe
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    client.cookies.clear()  # a Set-Cookie from an earlier test must never leak into the next
    # Re-install our fake here, not just at import: billing resolves stripe
    # lazily, and another test module (test_billing.py) installs its own
    # fake at import time — whichever module was collected last wins.
    # Teardown restores whatever was there so the other file's tests keep
    # their fake.
    _prev_stripe = sys.modules.get("stripe")
    sys.modules["stripe"] = fake_stripe
    _FakeSubscription.cancel_calls = []
    _FakeSubscription.cancel_mode = "ok"
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
    # Lab sessions live in the app-wide in-memory service; clear between tests.
    from labs import sessions as sessions_mod

    sessions_mod.service._sessions.clear()
    sessions_mod.service._exec_locks.clear()


def teardown_function():
    if _prev_stripe is not None:
        sys.modules["stripe"] = _prev_stripe
    os.environ.pop("STRIPE_SECRET_KEY", None)


def _signed_in_user(email="u1@example.com", name="U One", subject=None):
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", subject or email, email, True, name))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    return uid, {COOKIE_NAME: raw}


def _seed_user_data(uid):
    """A representative spread of the user's rows across tables."""
    now = datetime.now(timezone.utc)
    with db.SessionLocal() as s:
        s.add(Progress(user_id=uid, state={"xp": 10}, version=1))
        s.add(LabCompletion(user_id=uid, lab_id="net-vlan-001", session_id="sess-1",
                            duration_seconds=60))
        s.add(LabUsageEvent(user_id=uid, session_id="sess-1", lab_id="net-vlan-001",
                            provider="docker", started_at=now - timedelta(minutes=5),
                            expires_at=now + timedelta(minutes=85),
                            period_start=now - timedelta(days=1), period_end=now + timedelta(days=30)))
        s.add(MissionAttempt(user_id=uid, mission_id="op-broken-shield",
                             definition_version=1, lab_session_id="sess-1"))
        s.add(AiTutorCall(user_id=uid, mode="hint", model="gpt-4o-mini"))
        s.add(VoiceCall(user_id=uid, character="cypher", model="eleven-v3", chars=42))
        s.add(CypherEvent(user_id=uid, event="mission_started", mission_id="op-broken-shield"))
        s.add(LabSession(id="sess-1", lab_id="net-vlan-001", owner_id=uid, status="running",
                         environment_id="env-1", provider="mock", created_at=now,
                         expires_at=now + timedelta(minutes=85), progress={},
                         validation_results={}, findings={}))
        s.commit()


def _seed_subscription(uid, status="active", sub_id="sub_test_1"):
    with db.SessionLocal() as s:
        s.merge(Subscription(user_id=uid, stripe_customer_id="cus_test_1",
                             stripe_subscription_id=sub_id, status=status,
                             current_period_end=datetime.now(timezone.utc) + timedelta(days=30)))
        s.commit()


def _delete(uid_cookies):
    # TestClient.delete() takes no body in this httpx version.
    return client.request("DELETE", "/api/account", cookies=uid_cookies, json={"confirm": True})


# ---------- auth + confirmation ----------


def test_delete_requires_sign_in():
    r = client.request("DELETE", "/api/account", json={"confirm": True})
    assert r.status_code == 401


def test_delete_requires_explicit_confirmation():
    uid, cookies = _signed_in_user()
    for body in ({}, {"confirm": False}):
        r = client.request("DELETE", "/api/account", cookies=cookies, json=body)
        assert r.status_code in (400, 422), body
    # The account is untouched by the refused attempts.
    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user is not None and user.deleted_at is None


# ---------- the happy path ----------


def test_delete_soft_deletes_scrubs_pii_and_purges_data():
    uid, cookies = _signed_in_user()
    _seed_user_data(uid)
    _seed_subscription(uid, "canceled")  # nothing left to bill
    with db.SessionLocal() as s:
        s.add(ManualGrant(user_id=uid, note="in person"))
        s.add(NativeAuthCode(code_hash="x" * 64, user_id=uid, code_challenge="c" * 43,
                             expires_at=datetime.now(timezone.utc) + timedelta(seconds=60)))
        s.commit()
    assert client.get("/api/public/seats").json()["total_accounts"] == 1

    r = _delete(cookies)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "deleted_user_id": uid}

    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user is not None  # the row stays (soft delete)
        assert user.deleted_at is not None
        # Personal data is scrubbed: no name, email, avatar, or attribution left.
        assert user.display_name == ""
        assert user.email is None
        assert user.avatar_url is None
        assert user.attribution_tag is None
        # Learning + session data is purged.
        assert s.query(Identity).filter_by(user_id=uid).count() == 0
        assert s.query(AuthSession).filter_by(user_id=uid).count() == 0
        assert s.query(NativeAuthCode).filter_by(user_id=uid).count() == 0
        assert s.query(Progress).filter_by(user_id=uid).count() == 0
        assert s.query(LabCompletion).filter_by(user_id=uid).count() == 0
        assert s.query(LabUsageEvent).filter_by(user_id=uid).count() == 0
        assert s.query(MissionAttempt).filter_by(user_id=uid).count() == 0
        assert s.query(LabSession).filter_by(owner_id=uid).count() == 0
        assert s.query(AiTutorCall).filter_by(user_id=uid).count() == 0
        assert s.query(VoiceCall).filter_by(user_id=uid).count() == 0
        assert s.query(CypherEvent).filter_by(user_id=uid).count() == 0
        # Billing + grant history survives (records, not personal data).
        sub = s.get(Subscription, uid)
        assert sub is not None and sub.status == "canceled"
        grant = s.get(ManualGrant, uid)
        assert grant is not None and grant.revoked_at is not None
        assert grant.revoked_note == "Account deleted."
    # The seat frees and the account is gone everywhere it counts.
    assert client.get("/api/public/seats").json()["total_accounts"] == 0
    assert billing.is_subscribed(uid) is False
    assert client.get("/api/auth/me", cookies=cookies).status_code == 401
    # The audit trail records the self-delete.
    assert any(e["action"] == "account.delete.self" for e in audit.recent(limit=10))


def test_delete_frees_seat_for_reuse():
    """A deleted seat's email can sign up again as a fresh account."""
    uid, cookies = _signed_in_user(email="gone@example.com")
    assert _delete(cookies).status_code == 200
    uid2, _ = _signed_in_user(email="gone@example.com")
    assert uid2 != uid  # a fresh account, not a resurrection
    with db.SessionLocal() as s:
        assert s.get(User, uid).deleted_at is not None


# ---------- Stripe ----------


def test_delete_cancels_live_stripe_subscription():
    uid, cookies = _signed_in_user()
    _seed_subscription(uid, "active", sub_id="sub_live_1")
    r = _delete(cookies)
    assert r.status_code == 200, r.text
    assert _FakeSubscription.cancel_calls == ["sub_live_1"]
    with db.SessionLocal() as s:
        sub = s.get(Subscription, uid)
        assert sub.status == "canceled"


def test_delete_tolerates_already_canceled_stripe_subscription():
    uid, cookies = _signed_in_user()
    _seed_subscription(uid, "active", sub_id="sub_live_1")
    _FakeSubscription.cancel_mode = "already_canceled"
    r = _delete(cookies)
    assert r.status_code == 200, r.text
    with db.SessionLocal() as s:
        assert s.get(User, uid).deleted_at is not None


def test_delete_refuses_when_stripe_cancel_fails():
    """A failed cancel must change nothing: the user would otherwise keep
    being charged after deleting. 503, retry later."""
    uid, cookies = _signed_in_user()
    _seed_subscription(uid, "active", sub_id="sub_live_1")
    _seed_user_data(uid)
    _FakeSubscription.cancel_mode = "fail"
    r = _delete(cookies)
    assert r.status_code == 503, r.text
    with db.SessionLocal() as s:
        user = s.get(User, uid)
        assert user.deleted_at is None  # untouched
        assert s.get(Subscription, uid).status == "active"
        assert s.query(Progress).filter_by(user_id=uid).count() == 1


def test_delete_refuses_when_billing_unconfigured_with_live_subscription():
    uid, cookies = _signed_in_user()
    _seed_subscription(uid, "active", sub_id="sub_live_1")
    os.environ.pop("STRIPE_SECRET_KEY", None)
    r = _delete(cookies)
    assert r.status_code == 503, r.text
    with db.SessionLocal() as s:
        assert s.get(User, uid).deleted_at is None


def test_delete_without_subscription_never_touches_stripe():
    uid, cookies = _signed_in_user()
    r = _delete(cookies)
    assert r.status_code == 200, r.text
    assert _FakeSubscription.cancel_calls == []


# ---------- idempotency + no resurrection ----------


def test_second_delete_with_revoked_session_is_401_and_stays_deleted():
    uid, cookies = _signed_in_user()
    assert _delete(cookies).status_code == 200
    r = _delete(cookies)  # same token, session now revoked
    assert r.status_code == 401
    with db.SessionLocal() as s:
        assert s.get(User, uid).deleted_at is not None


def test_sign_in_after_delete_creates_fresh_account(monkeypatch):
    """Signing in again after deleting does NOT resurrect the old account:
    the identity rows and email were purged/scrubbed, so the same provider
    identity starts a fresh, empty account — and the old user id holds no
    session and stays deleted."""
    uid, cookies = _signed_in_user(email="gone@example.com", subject="g-gone")
    assert _delete(cookies).status_code == 200

    async def _fake_fetch(provider, request):
        return OAuthIdentity("google", "g-gone", "gone@example.com", True, "Gone")

    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)
    import auth.router as auth_router

    monkeypatch.setattr(auth_router, "FRONTEND_URL", "https://app.example.test")
    r = client.get("/api/auth/google/callback", follow_redirects=False)
    assert r.status_code == 302
    assert "error=" not in r.headers["location"]
    assert COOKIE_NAME in r.headers.get("set-cookie", "")
    with db.SessionLocal() as s:
        users = s.query(User).all()
        live = [u for u in users if u.deleted_at is None]
        assert len(live) == 1 and live[0].id != uid  # fresh account, not a resurrection
        assert s.get(User, uid).deleted_at is not None
        assert s.query(AuthSession).filter_by(user_id=uid).count() == 0
        assert s.query(AuthSession).filter_by(user_id=live[0].id).count() == 1
        assert s.query(Identity).filter_by(user_id=live[0].id).count() == 1


def test_upsert_identity_refuses_deleted_account(monkeypatch):
    """The in-flight race: a sign-in that resolved the identity while the
    account was still live must not restore personal data onto the deleted
    row if the delete lands first. (Simulated by soft-deleting with the
    identity row still present.)"""
    from auth.identity import AccountDeletedError

    uid, _ = _signed_in_user(email="race@example.com", subject="g-race")
    with db.SessionLocal() as s:
        user = s.get(User, uid)
        user.deleted_at = datetime.now(timezone.utc)
        s.commit()
    with db.SessionLocal() as s:
        with pytest.raises(AccountDeletedError):
            upsert_identity(s, OAuthIdentity("google", "g-race", "attacker@example.com", True, "Attacker"))
        # Nothing was restored or overwritten onto the deleted rows.
        user = s.get(User, uid)
        assert user.deleted_at is not None and user.email == "race@example.com"
        ident = s.query(Identity).filter_by(user_id=uid).first()
        assert ident.email == "race@example.com"


def test_native_exchange_refuses_deleted_account():
    """A one-time native code minted before deletion is worthless after it:
    the delete purges native codes with the account, so the exchange fails
    and no session is ever minted for the deleted user."""
    uid, cookies = _signed_in_user()
    verifier = "v" * 43
    challenge = native_mod.challenge_for(verifier)
    with db.SessionLocal() as s:
        code = native_mod.create_code(s, uid, challenge)
        s.commit()
    assert _delete(cookies).status_code == 200
    r = client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": verifier})
    assert r.status_code == 400  # the code was purged with the account
    with db.SessionLocal() as s:
        assert s.get(User, uid).deleted_at is not None
        assert s.query(AuthSession).filter_by(user_id=uid).count() == 0


def test_create_session_refuses_deleted_account():
    """The session layer itself refuses a deleted user id — the backstop
    for a sign-in or code exchange that was already in flight when the
    delete landed."""
    from auth.identity import AccountDeletedError

    uid, cookies = _signed_in_user()
    assert _delete(cookies).status_code == 200
    with db.SessionLocal() as s:
        with pytest.raises(AccountDeletedError):
            create_session(s, uid)


# ---------- live lab sessions ----------


def test_delete_destroys_live_lab_sessions():
    """The deleted user's running lab containers stop with the account —
    nothing keeps running (or accruing) after deletion."""
    uid, cookies = _signed_in_user()
    start = client.post("/api/labs/net-vlan-001/start", cookies=cookies)
    assert start.status_code == 200, start.text
    session_id = start.json()["id"]
    assert client.get(f"/api/labs/sessions/{session_id}", cookies=cookies).status_code == 200
    assert _delete(cookies).status_code == 200
    assert client.get(f"/api/labs/sessions/{session_id}", cookies=cookies).status_code in (401, 404)
    from labs import sessions as sessions_mod

    assert session_id not in sessions_mod.service._sessions
