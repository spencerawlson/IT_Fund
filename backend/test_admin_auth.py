"""R2C Admin sign-in (admin_auth.py) — admin platform step 2.

Who may enter: a signed-in account whose PROVIDER-VERIFIED email is on the
allow-list, plus a code from its authenticator app (TOTP). Sessions are
short, bound to the site session, and every state-changing request needs
the session's CSRF token. No shared password exists any more.
"""
import os
import sys
import time
from datetime import timedelta
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import admin as admin_mod
import admin_auth
import admin_testkit
import db
import main
from db_models import AdminAuditLog, AdminMfa, AdminSession, User

client = TestClient(main.app)
ADMIN = admin_testkit.ADMIN_EMAIL


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()
    admin_mod._admin_login_attempts.clear()
    os.environ.pop("BILLING_OWNER_EMAILS", None)


def teardown_function():
    admin_testkit.clear(client)
    os.environ.pop("BILLING_OWNER_EMAILS", None)


def _next_code(secret, steps_ahead=1):
    """A valid code for a later time step (the current one was just used)."""
    return admin_auth.totp_code(secret, at=time.time() + 30 * steps_ahead)


# ---------- TOTP ----------

def test_totp_matches_the_rfc_6238_test_vectors():
    # RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (6-digit truncation).
    secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    assert admin_auth.totp_code(secret, at=59) == "287082"
    assert admin_auth.totp_code(secret, at=1111111109) == "081804"
    assert admin_auth.totp_code(secret, at=1234567890) == "005924"


def test_codes_are_accepted_one_step_either_side_and_never_twice():
    secret = admin_auth.new_totp_secret()
    t = 1_800_000_000
    now = admin_auth.totp_code(secret, at=t)
    step = admin_auth.verify_totp(secret, now, last_step=0, at=t)
    assert step == t // 30
    assert admin_auth.verify_totp(secret, now, last_step=step, at=t) is None  # replay
    assert admin_auth.verify_totp(secret, admin_auth.totp_code(secret, at=t + 30), 0, at=t) == step + 1
    assert admin_auth.verify_totp(secret, admin_auth.totp_code(secret, at=t + 90), 0, at=t) is None
    for junk in (None, "", "12345", "1234567", "abcdef", "12 34 5x"):
        assert admin_auth.verify_totp(secret, junk, 0, at=t) is None
    assert admin_auth.verify_totp(secret, " ".join(now[:3]) + now[3:], 0, at=t) == step  # spaces ok


def test_the_secret_is_stored_encrypted():
    session = admin_testkit.admin_login(client)
    with db.SessionLocal() as s:
        row = s.get(AdminMfa, session.user_id)
    assert row.enabled_at is not None and row.pending_secret_enc is None
    assert session.secret not in row.secret_enc
    assert admin_auth.decrypt_secret(row.secret_enc) == session.secret


# ---------- who is eligible ----------

def test_not_signed_in_gets_nothing():
    os.environ["ADMIN_EMAILS"] = ADMIN
    assert client.get("/api/admin/status").json() == {
        "authenticated": False, "signed_in": False, "eligible": False, "mfa_enrolled": False,
    }
    assert client.post("/api/admin/mfa/setup").status_code == 401
    assert client.post("/api/admin/login", json={"code": "123456"}).status_code == 401
    assert client.get("/api/admin/overview").status_code == 401


def test_a_signed_in_account_off_the_allow_list_is_not_an_admin():
    os.environ["ADMIN_EMAILS"] = ADMIN
    admin_testkit.site_sign_in(client, "learner@example.com")
    status = client.get("/api/admin/status").json()
    assert status["signed_in"] is True and status["eligible"] is False and "email" not in status
    assert client.post("/api/admin/mfa/setup").status_code == 403


def test_an_unverified_identity_with_the_admin_email_is_not_an_admin():
    os.environ["ADMIN_EMAILS"] = ADMIN
    admin_testkit.site_sign_in(client, ADMIN, verified=False)
    assert client.get("/api/admin/status").json()["eligible"] is False
    assert client.post("/api/admin/mfa/setup").status_code == 403


def test_an_account_whose_stored_email_was_set_to_the_admins_is_not_an_admin():
    # User.email is writable from the admin panel (manual enrollment); only a
    # provider-verified identity email counts.
    os.environ["ADMIN_EMAILS"] = ADMIN
    uid = admin_testkit.site_sign_in(client, "someone@example.com")
    with db.SessionLocal() as s:
        s.get(User, uid).email = ADMIN
        s.commit()
    assert client.get("/api/admin/status").json()["eligible"] is False


def test_the_owner_emails_are_the_default_allow_list():
    os.environ["BILLING_OWNER_EMAILS"] = f"other@example.com, {ADMIN.upper()}"
    admin_testkit.site_sign_in(client, ADMIN)
    assert client.get("/api/admin/status").json()["eligible"] is True


# ---------- enrollment and sign-in ----------

def test_first_time_setup_then_sign_in_with_a_fresh_code():
    os.environ["ADMIN_EMAILS"] = ADMIN
    admin_testkit.site_sign_in(client, ADMIN)
    assert client.get("/api/admin/status").json()["mfa_enrolled"] is False
    assert client.post("/api/admin/login", json={"code": "123456"}).status_code == 409  # not set up yet
    setup = client.post("/api/admin/mfa/setup").json()
    assert setup["otpauth_uri"].startswith("otpauth://totp/Road%20to%20CISSP%20Admin%3Aowner%40example.com?secret=")
    assert client.post("/api/admin/mfa/activate", json={"code": "000000"}).status_code == 401
    r = client.post("/api/admin/mfa/activate", json={"code": admin_auth.totp_code(setup["secret"])})
    assert r.status_code == 200 and len(r.json()["csrf_token"]) == 64
    status = client.get("/api/admin/status").json()
    assert status["authenticated"] is True and status["mfa_enrolled"] is True
    assert status["csrf_token"] == r.json()["csrf_token"]
    # Setup can't be restarted from the web once enabled.
    assert client.post("/api/admin/mfa/setup").status_code == 409
    # Log out, then sign in again with a code.
    assert client.post("/api/admin/logout", json={}).status_code == 200
    assert client.get("/api/admin/status").json()["authenticated"] is False
    assert client.post("/api/admin/login", json={"code": "000000"}).status_code == 401
    r = client.post("/api/admin/login", json={"code": _next_code(setup["secret"])})
    assert r.status_code == 200
    assert client.get("/api/admin/overview").status_code == 200


def test_a_used_code_cannot_be_replayed():
    session = admin_testkit.admin_login(client)
    code = admin_auth.totp_code(session.secret)  # the code activation just used
    client.post("/api/admin/logout", json={})
    assert client.post("/api/admin/login", json={"code": code}).status_code == 401


def test_wrong_codes_are_rate_limited(monkeypatch):
    session = admin_testkit.admin_login(client)
    client.post("/api/admin/logout", json={})
    for _ in range(admin_mod.ADMIN_LOGIN_MAX_ATTEMPTS):
        assert client.post("/api/admin/login", json={"code": "000000"}).status_code == 401
    r = client.post("/api/admin/login", json={"code": _next_code(session.secret)})
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 0


# ---------- the admin session ----------

def test_every_state_change_needs_the_csrf_token():
    admin_testkit.admin_login(client)
    token = client.headers.pop("X-CSRF-Token")
    body = {"display_name": "Walk In", "email": "walkin@example.com"}
    assert client.post("/api/admin/accounts", json=body).status_code == 403
    assert client.post("/api/admin/accounts", json=body, headers={"X-CSRF-Token": "f" * 64}).status_code == 403
    assert client.get("/api/admin/overview").status_code == 200  # reads need no token
    assert client.post("/api/admin/accounts", json=body, headers={"X-CSRF-Token": token}).status_code == 201


def test_the_admin_session_ends_with_the_site_session_or_for_another_account():
    admin_testkit.admin_login(client)
    assert client.get("/api/admin/overview").status_code == 200
    admin_cookie = client.cookies.get(admin_auth.ADMIN_COOKIE)
    admin_testkit.site_sign_in(client, "learner@example.com")  # another account in this browser
    client.cookies.set(admin_auth.ADMIN_COOKIE, admin_cookie)
    assert client.get("/api/admin/overview").status_code == 401
    client.cookies.clear()
    client.cookies.set(admin_auth.ADMIN_COOKIE, admin_cookie)  # no site session at all
    assert client.get("/api/admin/overview").status_code == 401


def test_leaving_the_allow_list_ends_admin_access_at_once():
    admin_testkit.admin_login(client)
    os.environ["ADMIN_EMAILS"] = "someone-else@example.com"
    assert client.get("/api/admin/overview").status_code == 401


def test_sessions_expire_after_30_idle_minutes_and_8_hours_in_total():
    admin_testkit.admin_login(client)
    raw = client.cookies.get(admin_auth.ADMIN_COOKIE)
    with db.SessionLocal() as s:
        row = s.get(AdminSession, admin_auth._hash(raw))
        row.created_at = admin_auth._now() - timedelta(hours=8, minutes=1)
        s.commit()
    assert client.get("/api/admin/overview").status_code == 401  # absolute limit
    admin_testkit.clear(client)
    admin_mod._admin_login_attempts.clear()
    session = admin_testkit.admin_login(client, email="second@example.com")
    raw = client.cookies.get(admin_auth.ADMIN_COOKIE)
    with db.SessionLocal() as s:
        s.get(AdminSession, admin_auth._hash(raw)).expires_at = admin_auth._now() - timedelta(seconds=1)
        s.commit()
    assert client.get("/api/admin/overview").status_code == 401  # idle limit
    assert session.user_id


def test_old_shared_password_sessions_and_the_password_are_gone():
    os.environ["ADMIN_PASSWORD"] = "old-shared-password"
    try:
        admin_testkit.site_sign_in(client, "learner@example.com")
        assert client.post("/api/admin/login", json={"password": "old-shared-password"}).status_code == 403
        with db.SessionLocal() as s:  # a session row from the password era: no account
            s.add(AdminSession(id_hash=admin_auth._hash("legacy"), expires_at=admin_auth._now() + timedelta(hours=1)))
            s.commit()
        client.cookies.set(admin_auth.ADMIN_COOKIE, "legacy")
        assert client.get("/api/admin/overview").status_code == 401
    finally:
        os.environ.pop("ADMIN_PASSWORD", None)


def test_the_audit_log_names_the_admin_account():
    session = admin_testkit.admin_login(client)
    client.post("/api/admin/accounts", json={"display_name": "Walk In", "email": "walkin@example.com"})
    with db.SessionLocal() as s:
        rows = {a.action: a.actor for a in s.query(AdminAuditLog).all()}
    assert rows["admin.mfa_enrolled"] == session.user_id
    assert rows["account.add_with_grant"] == session.user_id


def test_server_side_reset_removes_the_enrollment_and_sessions():
    admin_testkit.admin_login(client)
    assert admin_auth.reset_mfa(ADMIN.upper()) == 1
    assert client.get("/api/admin/overview").status_code == 401
    status = client.get("/api/admin/status").json()
    assert status["eligible"] is True and status["mfa_enrolled"] is False
    assert client.post("/api/admin/mfa/setup").status_code == 200  # can enroll a new phone
