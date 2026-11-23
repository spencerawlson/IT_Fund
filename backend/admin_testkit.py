"""Test helper: sign in to R2C Admin the real way (admin_auth.py).

Used by the backend test suites. A verified Google identity on the
allow-list, a site session, then the actual MFA setup + activation with a
real TOTP code — so every admin test exercises the production gate rather
than a bypass. Not collected by pytest (no test_ prefix); never imported by
the app.
"""
from __future__ import annotations

import os
from types import SimpleNamespace

import admin_auth
import db
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session

ADMIN_EMAIL = "owner@example.com"


def site_sign_in(client, email: str, verified: bool = True, name: str = "Admin") -> str:
    """Create (or reuse) an OAuth account and put its site session on `client`."""
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("google", f"sub-{email}", email, verified, name))
        raw = create_session(s, user.id)
        s.commit()
        uid = user.id
    client.cookies.set(COOKIE_NAME, raw)
    return uid


def admin_login(client, email: str = ADMIN_EMAIL) -> SimpleNamespace:
    """Allow-list `email`, sign in, enroll MFA and open an admin session.
    Sets the CSRF header on the client; call clear(client) in teardown."""
    os.environ["ADMIN_EMAILS"] = email
    uid = site_sign_in(client, email)
    setup = client.post("/api/admin/mfa/setup")
    assert setup.status_code == 200, setup.text
    secret = setup.json()["secret"]
    r = client.post("/api/admin/mfa/activate", json={"code": admin_auth.totp_code(secret)})
    assert r.status_code == 200, r.text
    token = r.json()["csrf_token"]
    client.headers["X-CSRF-Token"] = token
    return SimpleNamespace(user_id=uid, secret=secret, csrf=token, response=r)


def clear(client) -> None:
    os.environ.pop("ADMIN_EMAILS", None)
    client.headers.pop("X-CSRF-Token", None)
    client.cookies.clear()
