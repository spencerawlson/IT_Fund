import os
import sys
from datetime import timedelta
from pathlib import Path

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient

import db
import main
from auth import oauth as oauth_mod
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, create_session, delete_session, user_for_session

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


def test_labs_work_with_session_cookie(monkeypatch):
    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)
    client.cookies.clear()
    client.get("/api/auth/google/callback", follow_redirects=False)  # signs in, sets cookie
    r = client.post("/api/labs/cyber-nmap-001/start")  # no bearer token, cookie only
    assert r.status_code == 200 and r.json()["status"] == "RUNNING"
