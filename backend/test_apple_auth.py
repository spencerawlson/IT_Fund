"""Sign in with Apple: client-secret JWT, authorize URL, token exchange, id_token
verification, form-POST callback identity, relay email, first-auth name, linking,
and the unconfigured-hidden behaviour.

Apple is implemented by hand in backend/auth/apple.py (Authlib cannot build
Apple's ES256 client_secret or accept its form-POST authorize response), so
these tests use fake EC keys and stubbed Apple HTTP — no network, no real
credentials.
"""
import json
import os
import sys
import time
from pathlib import Path
from unittest import mock

os.environ["COOKIE_INSECURE"] = "1"  # allow the session cookie over http in tests

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

import db
import main
from auth import oauth as oauth_mod
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME
from db_models import User

client = TestClient(main.app, base_url="https://testserver")
# https base URL (same as test_native_auth.py): the session cookie is Secure
# unless COOKIE_INSECURE=1 was set before main was first imported, which
# depends on test order — https makes the cookie round-trip either way, so
# the login -> callback state survives regardless of which module imported
# main first.

APPLE_ENV = {
    "APPLE_CLIENT_ID": "com.road2cissp.signin",
    "APPLE_TEAM_ID": "RAXA72UKAC",
    "APPLE_KEY_ID": "KEY1234567",
}


def setup_function():
    db.configure("sqlite+pysqlite:///:memory:")
    db.init_db()


def _make_ec_key():
    """A throwaway P-256 key; returns (pem_private_str, joserfc ECKey, jwk_dict)."""
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    from joserfc.jwk import ECKey

    k = ec.generate_private_key(ec.SECP256R1())
    pem = k.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    pub_pem = k.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    return pem, ECKey.import_key(pem), dict(ECKey.import_key(pub_pem).as_dict(), kid="KEY1234567", use="sig")


@pytest.fixture
def apple_env(monkeypatch):
    """Apple fully configured with a fake .p8 key; resets oauth's registration cache."""
    pem, key, jwk = _make_ec_key()
    for k, v in APPLE_ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setenv("APPLE_PRIVATE_KEY", pem)
    saved = set(oauth_mod._registered)
    oauth_mod._registered.clear()
    import auth.apple as apple_mod

    apple_mod._jwks_cache["at"] = 0
    apple_mod._jwks_cache["keys"] = None
    yield {"pem": pem, "key": key, "jwk": jwk}
    oauth_mod._registered.clear()
    oauth_mod._registered.update(saved)


def _id_token(key, jwk, sub="001234.abcdef", email="ada@privaterelay.appleid.com", **overrides):
    """A real ES256 id_token signed with the fake key (Apple's shape)."""
    from joserfc import jwt

    now = int(time.time())
    claims = {
        "iss": "https://appleid.apple.com",
        "sub": sub,
        "aud": APPLE_ENV["APPLE_CLIENT_ID"],
        "exp": now + 3600,
        "iat": now,
        "email": email,
        "email_verified": "true",  # Apple sends the string "true", not a boolean
    }
    claims.update(overrides)
    return jwt.encode({"alg": "ES256", "kid": "KEY1234567"}, claims, key)


class _FakeRequest:
    """Minimal stand-in for a Starlette request: session + urlencoded body."""

    def __init__(self, form, session=None):
        self._form = form
        self.session = session if session is not None else {}

    async def body(self):
        from urllib.parse import urlencode

        return urlencode(self._form).encode("utf-8")


# ---- configuration ----

def test_apple_unconfigured_without_env(monkeypatch):
    import auth.apple as apple_mod

    for var in list(APPLE_ENV) + ["APPLE_PRIVATE_KEY"]:
        monkeypatch.delenv(var, raising=False)
    saved = set(oauth_mod._registered)
    oauth_mod._registered.clear()
    try:
        assert apple_mod.apple_configured() is False
        assert oauth_mod.provider_configured("apple") is False
    finally:
        oauth_mod._registered.clear()
        oauth_mod._registered.update(saved)


def test_apple_unconfigured_with_malformed_key(monkeypatch, apple_env):
    import auth.apple as apple_mod

    monkeypatch.setenv("APPLE_PRIVATE_KEY", "not a pem at all")
    oauth_mod._registered.clear()
    assert apple_mod.apple_configured() is False
    assert oauth_mod.provider_configured("apple") is False


def test_apple_configured_with_valid_key(apple_env):
    import auth.apple as apple_mod

    assert apple_mod.apple_configured() is True
    assert oauth_mod.provider_configured("apple") is True


def test_apple_login_404s_when_unconfigured():
    assert client.get("/api/auth/apple/login", follow_redirects=False).status_code == 404


def test_providers_excludes_apple_when_unconfigured():
    assert client.get("/api/auth/providers").json() == {"providers": []}


def test_providers_includes_apple_when_configured(apple_env):
    assert client.get("/api/auth/providers").json() == {"providers": ["apple"]}


# ---- client_secret JWT ----

def test_client_secret_is_es256_jwt_with_apple_claims(apple_env):
    import auth.apple as apple_mod

    from joserfc import jwt

    secret = apple_mod.build_client_secret(now=1_700_000_000)
    # Verify the signature with the key and read header + claims off the token.
    token = jwt.decode(secret, apple_env["key"])
    assert token.header["alg"] == "ES256"
    assert token.header["kid"] == "KEY1234567"
    claims = dict(token.claims)
    assert claims["iss"] == "RAXA72UKAC"
    assert claims["sub"] == "com.road2cissp.signin"
    assert claims["aud"] == "https://appleid.apple.com"
    assert claims["iat"] == 1_700_000_000
    assert claims["exp"] - claims["iat"] == 300  # short-lived: five minutes


def test_client_secret_accepts_escaped_newlines_in_key(monkeypatch, apple_env):
    """A .p8 pasted into an env file carries literal \\n escapes; both forms parse."""
    import auth.apple as apple_mod

    monkeypatch.setenv("APPLE_PRIVATE_KEY", apple_env["pem"].replace("\n", "\\n"))
    assert apple_mod.apple_configured() is True
    assert isinstance(apple_mod.build_client_secret(), str)


# ---- authorize URL ----

def test_authorize_url_is_form_post_with_name_email_scope(apple_env):
    import auth.apple as apple_mod

    url = apple_mod.authorization_url("https://api.example.test/api/auth/apple/callback", "state-123")
    assert url.startswith("https://appleid.apple.com/auth/authorize?")
    assert "client_id=com.road2cissp.signin" in url
    assert "response_type=code" in url
    assert "response_mode=form_post" in url  # the name only arrives in the form POST
    assert "scope=name+email" in url or "scope=name%20email" in url
    assert "state=state-123" in url
    assert "redirect_uri=https%3A%2F%2Fapi.example.test%2Fapi%2Fauth%2Fapple%2Fcallback" in url


# ---- token exchange + JWKS cache ----

def test_exchange_code_posts_apple_token_endpoint(apple_env, monkeypatch):
    import auth.apple as apple_mod

    calls = []

    class _Resp:
        status_code = 200

        def json(self):
            return {"id_token": "tok", "access_token": "acc"}

    def _post(url, data):
        calls.append({"url": url, "data": data})
        return _Resp()

    monkeypatch.setattr(apple_mod, "_http_post", _post)
    out = apple_mod.exchange_code("auth-code", "https://api.example.test/api/auth/apple/callback")
    assert out["id_token"] == "tok"
    assert len(calls) == 1
    assert calls[0]["url"] == "https://appleid.apple.com/auth/token"
    data = calls[0]["data"]
    assert data["client_id"] == "com.road2cissp.signin"
    assert data["code"] == "auth-code"
    assert data["grant_type"] == "authorization_code"
    assert data["redirect_uri"] == "https://api.example.test/api/auth/apple/callback"
    assert data["client_secret"]  # a real JWT, not a static secret


def test_exchange_code_refuses_non_200(apple_env, monkeypatch):
    import auth.apple as apple_mod

    class _Resp:
        status_code = 400

        def json(self):
            return {"error": "invalid_grant"}

    monkeypatch.setattr(apple_mod, "_http_post", lambda url, data: _Resp())
    with pytest.raises(ValueError, match="400"):
        apple_mod.exchange_code("bad-code", "https://api.example.test/api/auth/apple/callback")


def test_jwks_is_cached_then_refreshed(apple_env, monkeypatch):
    import auth.apple as apple_mod

    calls = {"n": 0}

    def _fetch():
        calls["n"] += 1
        return {"keys": [apple_env["jwk"]]}

    monkeypatch.setattr(apple_mod, "_fetch_jwks", _fetch)
    apple_mod._jwks()
    apple_mod._jwks()
    assert calls["n"] == 1  # second call served from the cache
    apple_mod._jwks_cache["at"] = 0  # force expiry
    apple_mod._jwks()
    assert calls["n"] == 2


# ---- id_token verification ----

def test_verify_id_token_accepts_valid_token(apple_env, monkeypatch):
    import auth.apple as apple_mod

    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [apple_env["jwk"]]})
    claims = apple_mod.verify_id_token(_id_token(apple_env["key"], apple_env["jwk"]))
    assert claims["sub"] == "001234.abcdef"
    assert claims["email"] == "ada@privaterelay.appleid.com"


def test_verify_id_token_rejects_wrong_issuer(apple_env, monkeypatch):
    import auth.apple as apple_mod

    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [apple_env["jwk"]]})
    bad = _id_token(apple_env["key"], apple_env["jwk"], iss="https://evil.example")
    with pytest.raises(Exception):
        apple_mod.verify_id_token(bad)


def test_verify_id_token_rejects_wrong_audience(apple_env, monkeypatch):
    import auth.apple as apple_mod

    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [apple_env["jwk"]]})
    bad = _id_token(apple_env["key"], apple_env["jwk"], aud="com.someone-else.signin")
    with pytest.raises(Exception):
        apple_mod.verify_id_token(bad)


def test_verify_id_token_rejects_expired_token(apple_env, monkeypatch):
    import auth.apple as apple_mod

    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [apple_env["jwk"]]})
    bad = _id_token(apple_env["key"], apple_env["jwk"], exp=int(time.time()) - 60)
    with pytest.raises(Exception):
        apple_mod.verify_id_token(bad)


def test_verify_id_token_rejects_wrong_signing_key(apple_env, monkeypatch):
    import auth.apple as apple_mod

    _, _, other_jwk = _make_ec_key()
    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [other_jwk]})
    with pytest.raises(Exception):
        apple_mod.verify_id_token(_id_token(apple_env["key"], apple_env["jwk"]))


# ---- fetch_apple_identity (form POST) ----

def _stub_apple_http(monkeypatch, apple_env, id_token):
    """Stub the token exchange + JWKS fetch so no network is touched."""
    import auth.apple as apple_mod

    monkeypatch.setattr(apple_mod, "exchange_code", lambda code, redirect_uri: {"id_token": id_token})
    monkeypatch.setattr(apple_mod, "_fetch_jwks", lambda: {"keys": [apple_env["jwk"]]})


async def _fetch(form, session=None):
    import auth.apple as apple_mod

    return await apple_mod.fetch_apple_identity(_FakeRequest(form, session))


def test_fetch_identity_accepts_relay_email_as_verified(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    import asyncio

    info = asyncio.run(_fetch(
        {"code": "c1", "state": "s1"},
        {"apple_state": "s1"},
    ))
    assert info.provider == "apple"
    assert info.subject == "001234.abcdef"
    assert info.email == "ada@privaterelay.appleid.com"
    assert info.email_verified is True  # relay address counts as verified
    assert info.name == ""  # no `user` JSON on a returning sign-in


def test_fetch_identity_captures_name_only_on_first_authorization(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    import asyncio

    info = asyncio.run(_fetch(
        {"code": "c1", "state": "s1",
         "user": json.dumps({"name": {"firstName": "Ada", "lastName": "Lovelace"}})},
        {"apple_state": "s1"},
    ))
    assert info.name == "Ada Lovelace"


def test_fetch_identity_rejects_state_mismatch(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    import asyncio

    with pytest.raises(ValueError, match="State"):
        asyncio.run(_fetch({"code": "c1", "state": "attacker"}, {"apple_state": "s1"}))


def test_fetch_identity_rejects_missing_code(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    import asyncio

    with pytest.raises(ValueError, match="code"):
        asyncio.run(_fetch({"state": "s1"}, {"apple_state": "s1"}))


# ---- identity linking (reuse of the existing verified-email merge) ----

def test_apple_links_to_existing_google_account_by_verified_email():
    with db.SessionLocal() as s:
        g = upsert_identity(s, OAuthIdentity("google", "g-1", "ada@example.com", True, "Ada", None))
        a = upsert_identity(s, OAuthIdentity("apple", "001234.abcdef", "ada@example.com", True, "", None))
        s.commit()
        assert g.id == a.id  # one account, not a second account for the same person
        assert sorted(i.provider for i in g.identities) == ["apple", "google"]


def test_apple_first_auth_name_is_stored_then_never_blanked():
    """The name arrives only on the first authorization; a later sign-in
    without it must not overwrite the stored display name with nothing."""
    with db.SessionLocal() as s:
        u = upsert_identity(s, OAuthIdentity("apple", "001234.abcdef", "ada@example.com", True, "Ada Lovelace", None))
        s.commit()
        assert u.display_name == "Ada Lovelace"
        u2 = upsert_identity(s, OAuthIdentity("apple", "001234.abcdef", "ada@example.com", True, "", None))
        s.commit()
        assert u2.id == u.id
        assert u2.display_name == "Ada Lovelace"


# ---- end-to-end callback (TestClient, stubbed Apple HTTP) ----

def test_apple_login_redirects_to_apple_with_form_post(apple_env):
    r = client.get("/api/auth/apple/login", follow_redirects=False)
    assert r.status_code == 302
    loc = r.headers["location"]
    assert loc.startswith("https://appleid.apple.com/auth/authorize?")
    assert "response_mode=form_post" in loc
    assert "state=" in loc


def test_apple_callback_post_signs_in_and_sets_cookie(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    # Start the login to plant the state in the session (same client jar).
    login = client.get("/api/auth/apple/login", follow_redirects=False)
    assert login.status_code == 302
    from urllib.parse import parse_qs, urlparse

    state = parse_qs(urlparse(login.headers["location"]).query)["state"][0]
    r = client.post(
        "/api/auth/apple/callback",
        data={"code": "c1", "state": state,
              "user": json.dumps({"name": {"firstName": "Ada", "lastName": "Lovelace"}})},
        follow_redirects=False,
    )
    assert r.status_code == 302
    assert COOKIE_NAME in r.cookies
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["display_name"] == "Ada Lovelace"
    assert me.json()["providers"] == ["apple"]


def test_apple_callback_post_with_bad_state_redirects_to_signin(apple_env, monkeypatch):
    import auth.apple as apple_mod

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    client.get("/api/auth/apple/login", follow_redirects=False)
    r = client.post(
        "/api/auth/apple/callback",
        data={"code": "c1", "state": "not-the-state"},
        follow_redirects=False,
    )
    assert r.status_code == 302
    assert r.headers["location"].endswith("/signin?error=oauth")
    assert COOKIE_NAME not in r.cookies


def test_apple_native_flow_returns_deep_link_code(apple_env, monkeypatch):
    """Native: system browser -> form POST callback -> deep link with the
    one-time code, redeemed with the PKCE verifier for a bearer <redacted>"""
    import secrets

    import auth.apple as apple_mod
    from auth import native

    token = _id_token(apple_env["key"], apple_env["jwk"])
    _stub_apple_http(monkeypatch, apple_env, token)
    verifier = secrets.token_urlsafe(48)
    challenge = native.challenge_for(verifier)
    login = client.get(
        f"/api/auth/apple/login?client=native&code_challenge={challenge}",
        follow_redirects=False,
    )
    assert login.status_code == 302
    from urllib.parse import parse_qs, urlparse

    state = parse_qs(urlparse(login.headers["location"]).query)["state"][0]
    cb = client.post(
        "/api/auth/apple/callback",
        data={"code": "c1", "state": state},
        follow_redirects=False,
    )
    assert cb.status_code == 302
    assert cb.headers["location"].startswith("com.road2cissp.app://auth/callback?code=")
    code = parse_qs(urlparse(cb.headers["location"]).query)["code"][0]
    ex = client.post("/api/auth/native/exchange", json={"code": code, "code_verifier": verifier})
    assert ex.status_code == 200
    assert ex.json()["token"]


def test_apple_callback_get_without_code_redirects_to_signin(apple_env):
    """Apple only ever POSTs the callback; a plain GET must fail closed."""
    r = client.get("/api/auth/apple/callback", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"].endswith("/signin?error=oauth")
