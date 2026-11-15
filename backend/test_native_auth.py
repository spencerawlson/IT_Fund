"""Native-app sign-in: system-browser OAuth -> deep link with one-time code -> PKCE exchange -> bearer."""
import os
import secrets
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

os.environ["COOKIE_INSECURE"] = "1"

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient as _TestClient

import db
import main
from auth import native
from auth import oauth as oauth_mod
from auth.identity import OAuthIdentity
from db_models import NativeAuthCode


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


class _FakeProvider:
    async def authorize_redirect(self, request, redirect_uri):
        return RedirectResponse("https://provider.example/authorize", status_code=302)


async def _fake_fetch(provider, request):
    return OAuthIdentity("google", "g-7", "native@example.com", True, "Nat", None)


def TestClient(app):
    # https, like a real browser: the OAuth session cookie is Secure unless COOKIE_INSECURE=1 was set
    # before main was first imported, which depends on test order.
    return _TestClient(app, base_url="https://testserver")


@pytest.fixture
def oauth(monkeypatch):
    monkeypatch.setattr(oauth_mod, "provider_configured", lambda p: True)
    monkeypatch.setattr(oauth_mod, "client", lambda p: _FakeProvider())
    monkeypatch.setattr(oauth_mod, "fetch_identity", _fake_fetch)


def _pkce():
    verifier = secrets.token_urlsafe(48)
    return verifier, native.challenge_for(verifier)


def _native_login(client, challenge):
    r = client.get(f"/api/auth/google/login?client=native&code_challenge={challenge}", follow_redirects=False)
    assert r.status_code == 302
    cb = client.get("/api/auth/google/callback", follow_redirects=False)
    assert cb.status_code == 302
    return cb


def test_full_native_flow_issues_working_bearer_token(oauth):
    client = TestClient(main.app)
    verifier, challenge = _pkce()
    cb = _native_login(client, challenge)

    loc = urlparse(cb.headers["location"])
    assert f"{loc.scheme}://{loc.netloc}{loc.path}" == native.NATIVE_REDIRECT
    assert "rtc_session" not in cb.cookies  # no browser session for a native login
    code = parse_qs(loc.query)["code"][0]

    ex = TestClient(main.app).post("/api/auth/native/exchange", json={"code": code, "code_verifier": verifier})
    assert ex.status_code == 200
    token = ex.json()["token"]

    fresh = TestClient(main.app)  # no cookies at all: like the app's WebView
    assert fresh.get("/api/auth/me").status_code == 401
    me = fresh.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["display_name"] == "Nat"

    assert fresh.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    assert fresh.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_intercepted_code_is_useless_without_the_verifier(oauth):
    client = TestClient(main.app)
    _, challenge = _pkce()
    code = parse_qs(urlparse(_native_login(client, challenge).headers["location"]).query)["code"][0]
    attacker_verifier, _ = _pkce()
    r = client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": attacker_verifier})
    assert r.status_code == 400


def test_code_is_single_use_even_after_a_failed_attempt(oauth):
    client = TestClient(main.app)
    verifier, challenge = _pkce()
    code = parse_qs(urlparse(_native_login(client, challenge).headers["location"]).query)["code"][0]
    wrong, _ = _pkce()
    assert client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": wrong}).status_code == 400
    # The right verifier can no longer redeem it either: one attempt per code.
    assert client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": verifier}).status_code == 400


def test_code_cannot_be_redeemed_twice(oauth):
    client = TestClient(main.app)
    verifier, challenge = _pkce()
    code = parse_qs(urlparse(_native_login(client, challenge).headers["location"]).query)["code"][0]
    body = {"code": code, "code_verifier": verifier}
    assert client.post("/api/auth/native/exchange", json=body).status_code == 200
    assert client.post("/api/auth/native/exchange", json=body).status_code == 400


def test_expired_code_is_rejected(oauth):
    client = TestClient(main.app)
    verifier, challenge = _pkce()
    code = parse_qs(urlparse(_native_login(client, challenge).headers["location"]).query)["code"][0]
    with db.SessionLocal() as s:
        row = s.get(NativeAuthCode, native._hash(code))
        row.expires_at = row.expires_at - timedelta(seconds=120)
        s.commit()
    assert client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": verifier}).status_code == 400


def test_native_login_requires_a_valid_challenge(oauth):
    client = TestClient(main.app)
    for bad in ["", "short", "x" * 43 + "!", "a" * 44]:
        r = client.get(f"/api/auth/google/login?client=native&code_challenge={bad}", follow_redirects=False)
        assert r.status_code == 400, bad


def test_website_login_after_abandoned_native_login_is_not_sent_to_the_app(oauth):
    client = TestClient(main.app)
    _, challenge = _pkce()
    client.get(f"/api/auth/google/login?client=native&code_challenge={challenge}", follow_redirects=False)
    # The user gives up and signs in on the website in the same browser instead.
    client.get("/api/auth/google/login", follow_redirects=False)
    cb = client.get("/api/auth/google/callback", follow_redirects=False)
    assert not cb.headers["location"].startswith(native.NATIVE_REDIRECT)
    assert "rtc_session" in cb.cookies


def test_failed_native_oauth_returns_to_the_app_with_an_error(oauth, monkeypatch):
    async def boom(provider, request):
        raise RuntimeError("denied")

    monkeypatch.setattr(oauth_mod, "fetch_identity", boom)
    client = TestClient(main.app)
    _, challenge = _pkce()
    cb = _native_login(client, challenge)
    assert cb.headers["location"] == f"{native.NATIVE_REDIRECT}?error=oauth"


def test_guest_header_keeps_one_visitor_across_cookieless_requests():
    """A native app's guest identity persists across cookieless requests — but
    only when the header carries a value the server signed. The app adopts the
    signed value the server returns (see src/lib/native.js installNativeFetch)."""
    from fastapi import Response
    from starlette.requests import Request

    from auth.deps import GUEST_HEADER, resolve_visitor_id, sign_guest_token

    signed = sign_guest_token(secrets.token_urlsafe(24))

    def req():
        return Request({"type": "http", "headers": [(GUEST_HEADER.lower().encode(), signed.encode())]})

    assert resolve_visitor_id(req(), Response()) == resolve_visitor_id(req(), Response()) == f"guest:{signed.split('.')[0]}"


def test_unsigned_guest_header_gets_a_fresh_server_issued_id():
    """A native app on first run mints its own guest id client-side. The
    server must not trust it: the app gets a fresh server-issued id instead,
    and the signed value comes back in the response header for the app to
    store (see src/lib/native.js installNativeFetch)."""
    from fastapi import Response
    from starlette.requests import Request

    from auth.deps import GUEST_HEADER, resolve_visitor_id, verify_guest_token

    minted = secrets.token_urlsafe(24)
    req = Request({"type": "http", "headers": [(GUEST_HEADER.lower().encode(), minted.encode())]})
    resp = Response()
    visitor = resolve_visitor_id(req, resp)
    assert visitor != f"guest:{minted}"
    assert verify_guest_token(resp.headers[GUEST_HEADER]) == visitor.removeprefix("guest:")
    # Presenting the signed value back keeps the same identity.
    req2 = Request({"type": "http", "headers": [(GUEST_HEADER.lower().encode(), resp.headers[GUEST_HEADER].encode())]})
    assert resolve_visitor_id(req2, Response()) == visitor
