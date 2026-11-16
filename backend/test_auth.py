import os
import secrets
import sys
from datetime import timedelta
from pathlib import Path
from unittest import mock

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import Request, Response
from fastapi.testclient import TestClient

import db
import main
from auth import oauth as oauth_mod
from auth.deps import (
    GUEST_COOKIE,
    GUEST_HEADER,
    resolve_visitor_id,
    sign_guest_token,
    verify_guest_token,
)
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session, delete_session, user_for_session
from db_models import User
from labs import api as labs_api

client = TestClient(main.app)


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


def _google(sub, email, verified=True, name="Ada"):
    return OAuthIdentity("google", sub, email, verified, name, "http://x/a.png")


def _github(sub, email, verified=True, name="ada"):
    return OAuthIdentity("github", sub, email, verified, name, "http://x/g.png")


# ---- identity upsert + verified-email auto-merge ----

def test_returning_identity_maps_to_same_user():
    with db.SessionLocal() as s:
        u1 = upsert_identity(s, _google("g-1", "ada@example.com"))
        u2 = upsert_identity(s, _google("g-1", "ada@example.com"))
        s.commit()
        assert u1.id == u2.id


def test_auto_merge_on_matching_verified_emails():
    with db.SessionLocal() as s:
        g = upsert_identity(s, _google("g-1", "ada@example.com", verified=True))
        gh = upsert_identity(s, _github("gh-9", "Ada@example.com", verified=True))  # case-insensitive
        s.commit()
        assert g.id == gh.id
        assert sorted(i.provider for i in g.identities) == ["github", "google"]


def test_no_merge_when_email_unverified():
    with db.SessionLocal() as s:
        g = upsert_identity(s, _google("g-1", "ada@example.com", verified=True))
        gh = upsert_identity(s, _github("gh-9", "ada@example.com", verified=False))  # unverified
        s.commit()
        assert g.id != gh.id  # a separate account, not an auto-merge


def test_account_email_only_set_from_verified_claim():
    with db.SessionLocal() as s:
        u = upsert_identity(s, _github("gh-1", "priv@example.com", verified=False))
        s.commit()
        assert u.email is None  # unverified email is not promoted to the account


# ---- sessions ----

def test_session_roundtrip_and_expiry():
    with db.SessionLocal() as s:
        u = upsert_identity(s, _google("g-1", "ada@example.com"))
        raw = create_session(s, u.id)
        s.commit()
        assert user_for_session(s, raw).id == u.id
        assert user_for_session(s, "wrong-token") is None
        delete_session(s, raw)
        s.commit()
        assert user_for_session(s, raw) is None


# ---- callback -> cookie -> /me -> logout (identity injected) ----

async def _fake_fetch(provider, request):
    return _google("g-42", "learner@example.com")


def test_oauth_callback_sets_cookie_and_me_works(monkeypatch):
    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)
    r = client.get("/api/auth/google/callback", follow_redirects=False)
    assert r.status_code == 302
    assert COOKIE_NAME in r.cookies  # session cookie issued

    me = client.get("/api/auth/me")  # cookie carried by the client jar
    assert me.status_code == 200
    body = me.json()
    assert body["providers"] == ["google"] and body["display_name"] == "Ada"

    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_me_requires_auth():
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401


def test_oauth_callback_redirects_to_frontend_url(monkeypatch):
    """Post-login landing is the app origin, not the API origin (APP_ORIGIN builds
    the provider callback URL, which must stay exactly as registered)."""
    import auth.router as auth_router

    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)
    monkeypatch.setattr(auth_router, "FRONTEND_URL", "https://app.example.test")
    monkeypatch.setattr(auth_router, "APP_ORIGIN", "https://api.example.test")
    r = client.get("/api/auth/google/callback", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == "https://app.example.test/"


def test_unconfigured_provider_login_is_404():
    assert client.get("/api/auth/google/login", follow_redirects=False).status_code == 404


def test_dev_login_is_disabled_by_default(monkeypatch):
    # delenv, because a developer's backend/.env may enable it locally (that is the point of it).
    monkeypatch.delenv("ALLOW_DEV_LOGIN", raising=False)
    client.cookies.clear()
    assert client.post("/api/auth/dev-login", follow_redirects=False).status_code == 404


def test_dev_login_works_when_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "1")
    client.cookies.clear()
    r = client.post("/api/auth/dev-login", follow_redirects=False)
    assert r.status_code == 302 and COOKIE_NAME in r.cookies
    me = client.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["display_name"] == "Owner"


def test_dev_login_get_does_not_create_a_session(monkeypatch):
    # dev-login is POST-only: a GET must never sign anyone in, even with the
    # flag on. FastAPI answers a GET on a POST-only route with 405 (not 404 —
    # the path exists, the method does not); either way no session is created.
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "1")
    client.cookies.clear()
    r = client.get("/api/auth/dev-login", follow_redirects=False)
    assert r.status_code == 405
    assert COOKIE_NAME not in r.cookies
    assert client.get("/api/auth/me").status_code == 401


def test_labs_work_with_session_cookie(monkeypatch):
    # This tests the auth layer (cookie → lab access), not billing: neutralize
    # entitlement so the premium lab starts.
    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)
    monkeypatch.setattr(labs_api, "is_subscribed", lambda owner_id: True)
    client.cookies.clear()
    client.get("/api/auth/google/callback", follow_redirects=False)  # signs in, sets cookie
    r = client.post("/api/labs/cyber-nmap-001/start")  # no bearer token, cookie only
    assert r.status_code == 200 and r.json()["status"] == "RUNNING"


def test_providers_endpoint_empty_by_default():
    r = client.get("/api/auth/providers")
    assert r.status_code == 200 and r.json() == {"providers": []}


def test_providers_endpoint_reflects_configuration(monkeypatch):
    monkeypatch.setattr(oauth_mod, "provider_configured", lambda p: p == "google")
    r = client.get("/api/auth/providers")
    assert r.status_code == 200 and r.json() == {"providers": ["google"]}


def test_providers_endpoint_is_public_no_auth():
    client.cookies.clear()
    assert client.get("/api/auth/providers").status_code == 200


# ---- server-signed guest ids (auth/deps.py) ----

def _guest_request(cookies=None, headers=None):
    """A bare Request carrying a guest cookie and/or the native guest header."""
    hdrs = []
    if cookies:
        hdrs.append((b"cookie", "; ".join(f"{k}={v}" for k, v in cookies.items()).encode()))
    for k, v in (headers or {}).items():
        hdrs.append((k.lower().encode(), v.encode()))
    return Request({"type": "http", "headers": hdrs})


def test_signed_guest_token_verifies_and_forgeries_do_not():
    token = secrets.token_urlsafe(24)
    signed = sign_guest_token(token)
    assert verify_guest_token(signed) == token
    assert verify_guest_token(token) is None  # unsigned: no signature at all
    assert verify_guest_token(token + ".deadbeef") is None  # tampered signature
    assert verify_guest_token("not-a-token." + signed.split(".")[1]) is None  # bad token part
    assert verify_guest_token("") is None
    assert verify_guest_token("no-dot-at-all") is None
    assert verify_guest_token("a.b.c") is None  # extra dot: token part fails the charset check


def test_guest_token_signed_with_another_secret_does_not_verify(monkeypatch):
    suite_secret = os.environ["SESSION_SECRET"]
    token = secrets.token_urlsafe(24)
    monkeypatch.setenv("SESSION_SECRET", "a-different-secret")
    forged = sign_guest_token(token)
    monkeypatch.setenv("SESSION_SECRET", suite_secret)
    assert verify_guest_token(forged) is None
    assert verify_guest_token(sign_guest_token(token)) == token  # suite secret still works


def test_resolve_visitor_id_accepts_a_signed_cookie():
    token = secrets.token_urlsafe(24)
    signed = sign_guest_token(token)
    resp = Response()
    assert resolve_visitor_id(_guest_request(cookies={GUEST_COOKIE: signed}), resp) == f"guest:{token}"
    assert resp.headers[GUEST_HEADER] == signed  # same signed value echoed back
    assert signed in resp.headers["set-cookie"]  # cookie re-issued, same value: stable identity


def test_resolve_visitor_id_rejects_a_minted_cookie():
    minted = secrets.token_urlsafe(24)
    resp = Response()
    visitor = resolve_visitor_id(_guest_request(cookies={GUEST_COOKIE: minted}), resp)
    assert visitor != f"guest:{minted}"  # the claimed id is never trusted
    issued = resp.headers[GUEST_HEADER]
    assert verify_guest_token(issued) == visitor.removeprefix("guest:")
    assert issued in resp.headers["set-cookie"]


def test_resolve_visitor_id_mints_a_signed_id_when_absent():
    resp = Response()
    visitor = resolve_visitor_id(_guest_request(), resp)
    assert visitor.startswith("guest:")
    assert verify_guest_token(resp.headers[GUEST_HEADER]) == visitor.removeprefix("guest:")


def test_resolve_visitor_id_accepts_a_signed_header():
    token = secrets.token_urlsafe(24)
    signed = sign_guest_token(token)
    resp = Response()
    assert resolve_visitor_id(_guest_request(headers={GUEST_HEADER: signed}), resp) == f"guest:{token}"
    assert resp.headers[GUEST_HEADER] == signed


def test_signed_in_session_wins_over_any_guest_value():
    # A signed-in user never gets a guest id, even when the request also carries one.
    with db.SessionLocal() as s:
        u = upsert_identity(s, _google("g-1", "ada@example.com"))
        raw = create_session(s, u.id)
        s.commit()
    req = _guest_request(cookies={
        COOKIE_NAME: raw,
        GUEST_COOKIE: sign_guest_token(secrets.token_urlsafe(24)),
    })
    assert resolve_visitor_id(req, Response()) == u.id

# ---- admin-created accounts merge on first verified sign-in ----


def test_admin_created_account_merges_on_verified_sign_in():
    # Spencer adds a customer in person (no identity row yet); the first
    # provider-verified sign-in with that email joins the same account
    # instead of creating a duplicate.
    with db.SessionLocal() as s:
        u = User(display_name="Carol", email="carol@example.com")
        s.add(u)
        s.commit()
        uid = u.id
        merged = upsert_identity(s, _google("g-9", "Carol@Example.com", verified=True, name="Carol"))
        s.commit()
        assert merged.id == uid
        assert len(s.query(User).all()) == 1


def test_admin_created_account_not_merged_on_unverified_claim():
    with db.SessionLocal() as s:
        u = User(display_name="Carol", email="carol@example.com")
        s.add(u)
        s.commit()
        uid = u.id
        other = upsert_identity(s, _google("g-9", "carol@example.com", verified=False, name="Carol"))
        s.commit()
        assert other.id != uid
