"""Sign in with Apple (OIDC, authorization-code flow).

Apple is the one provider Authlib cannot register out of the box, so this
module implements its flow by hand behind the same interface oauth.py exposes
for Google/GitHub (`provider_configured` / `client(...).authorize_redirect` /
`fetch_identity`):

  - The token endpoint needs a client_secret that is a short-lived ES256 JWT
    signed with the .p8 key (Apple rejects a static secret). It is built fresh
    for every exchange and lives at most five minutes.
  - The authorize response comes back as a form POST (response_mode=form_post):
    Apple only sends the user's name in that POST body, and only on the first
    authorization. The callback route therefore accepts POST as well as GET.
  - The id_token is verified against Apple's JWKS (signature + iss + aud +
    exp); the email in it is provider-verified, including a Hide My Email
    relay address, which we accept as the account email.

All Apple credentials come from the environment — never committed, never in
the repo (see backend/.env.example and docs/APPLE_SIGNIN.md):

  APPLE_CLIENT_ID     the Services ID (e.g. com.road2cissp.signin)
  APPLE_TEAM_ID       the Apple Developer Team ID
  APPLE_KEY_ID        the Key ID of the .p8 key
  APPLE_PRIVATE_KEY   the .p8 contents (literal \\n escapes are accepted)

Only the Services ID is needed for this flow: the backend is the OAuth
client for both the website and the native app (the app opens the system
browser to /auth/apple/login, exactly like Google), so no App ID "Sign in
with Apple" capability is required.
"""
from __future__ import annotations

import hmac
import json
import os
import secrets
import time
from urllib.parse import parse_qs, urlencode

import httpx
from fastapi.responses import RedirectResponse
from joserfc import jwt
from joserfc.jwk import ECKey, KeySet
from joserfc.jwt import JWTClaimsRegistry

from auth.identity import OAuthIdentity

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_AUTHORIZE_URL = "https://appleid.apple.com/auth/authorize"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"

#: The client_secret JWT lives five minutes (Apple allows up to six months;
#: a short life means a leaked one is useless almost immediately).
_CLIENT_SECRET_TTL_SECONDS = 300

#: Apple's signing keys rotate rarely; cache the JWKS for an hour.
_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict = {"at": 0.0, "keys": None}


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    return value.strip() if value else None


def _client_id() -> str:
    return _env("APPLE_CLIENT_ID") or ""


def _private_key() -> ECKey:
    """The .p8 key as a joserfc EC key. Raises ValueError unless it parses."""
    raw = _env("APPLE_PRIVATE_KEY")
    if not raw:
        raise ValueError("APPLE_PRIVATE_KEY is not set.")
    # A .p8 pasted into an env file carries literal \n escapes, not newlines.
    pem = raw.replace("\\n", "\n").encode("utf-8")
    try:
        key = ECKey.import_key(pem)
    except Exception as exc:
        raise ValueError("APPLE_PRIVATE_KEY does not parse as a private key.") from exc
    if not isinstance(key, ECKey):
        raise ValueError("APPLE_PRIVATE_KEY is not an EC (P-256) key.")
    return key


def apple_configured() -> bool:
    """True only when every credential is present and the .p8 key parses.

    The sign-in UI reads this (via GET /auth/providers), so a missing or
    broken key hides the Apple button instead of showing a button that
    cannot work.
    """
    if not (_client_id() and _env("APPLE_TEAM_ID") and _env("APPLE_KEY_ID")):
        return False
    try:
        _private_key()
    except ValueError:
        return False
    return True


def build_client_secret(now: int | None = None) -> str:
    """The ES256 client_secret JWT Apple requires at the token endpoint."""
    issued = int(time.time()) if now is None else now
    return jwt.encode(
        {"alg": "ES256", "kid": _env("APPLE_KEY_ID")},
        {
            "iss": _env("APPLE_TEAM_ID"),
            "iat": issued,
            "exp": issued + _CLIENT_SECRET_TTL_SECONDS,
            "aud": APPLE_ISSUER,
            "sub": _client_id(),
        },
        _private_key(),
    )


def authorization_url(redirect_uri: str, state: str) -> str:
    """Apple's authorize URL. response_mode=form_post is deliberate: the
    user's name only arrives in that POST body, on the first authorization."""
    params = {
        "client_id": _client_id(),
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "name email",
        "response_mode": "form_post",
        "state": state,
    }
    return f"{APPLE_AUTHORIZE_URL}?{urlencode(params)}"


class AppleClient:
    """Authlib-shaped client for Apple: authorize_redirect only. The token
    exchange happens in fetch_apple_identity, not here."""

    async def authorize_redirect(self, request, redirect_uri: str):
        state = secrets.token_urlsafe(32)
        request.session["apple_state"] = state
        return RedirectResponse(authorization_url(redirect_uri, state), status_code=302)


def _http_post(url: str, data: dict):
    return httpx.post(url, data=data, timeout=10.0)


def _http_get(url: str):
    return httpx.get(url, timeout=10.0)


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Swap the authorization code for tokens. Raises ValueError on any
    failure so the callback can send the user back to sign-in, not a 500."""
    try:
        resp = _http_post(APPLE_TOKEN_URL, data={
            "client_id": _client_id(),
            "client_secret": build_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        })
    except Exception as exc:
        raise ValueError(f"Apple token exchange failed: {exc}") from exc
    if resp.status_code != 200:
        raise ValueError(f"Apple token exchange failed: HTTP {resp.status_code}.")
    return resp.json()


def _fetch_jwks() -> dict:
    resp = _http_get(APPLE_JWKS_URL)
    if resp.status_code != 200:
        raise ValueError(f"Apple JWKS fetch failed: HTTP {resp.status_code}.")
    return resp.json()


def _jwks() -> dict:
    if _jwks_cache["keys"] is None or time.time() - _jwks_cache["at"] > _JWKS_TTL_SECONDS:
        _jwks_cache["keys"] = _fetch_jwks()
        _jwks_cache["at"] = time.time()
    return _jwks_cache["keys"]


def verify_id_token(id_token: str) -> dict:
    """Verify Apple's id_token (signature via JWKS + iss + aud + exp) and
    return its claims. Raises on any failure."""
    token = jwt.decode(id_token, KeySet.import_key_set(_jwks()))
    JWTClaimsRegistry(
        iss={"value": APPLE_ISSUER},
        aud={"value": _client_id()},
        exp={"essential": True},
    ).validate(token.claims)
    claims = dict(token.claims)
    if not claims.get("sub"):
        raise ValueError("Apple id_token has no subject.")
    return claims


def _redirect_uri() -> str:
    # Same value the login route builds from APP_ORIGIN: the callback URL
    # registered with Apple must match it exactly.
    return f"{os.environ.get('APP_ORIGIN', 'http://localhost:5188')}/api/auth/apple/callback"


def _name_from_user_field(raw: str | None) -> str:
    """Apple sends the user's name in the form-POST `user` JSON, only on the
    first authorization. Anything else (returning sign-in, bad JSON) is an
    empty name — the caller falls back to the stored display name."""
    if not raw:
        return ""
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return ""
    name = data.get("name") or {}
    return " ".join(p for p in (name.get("firstName"), name.get("lastName")) if p).strip()


async def _read_form(request) -> dict:
    """Read an application/x-www-form-urlencoded POST body.

    Deliberately not `request.form()`: that needs python-multipart, which
    this backend does not depend on. Apple always posts urlencoded form
    data for the authorize response, so parse_qs is the whole parser.
    """
    body = await request.body()
    if not body:
        return {}
    parsed = parse_qs(body.decode("utf-8", "replace"), keep_blank_values=True)
    return {k: values[0] for k, values in parsed.items()}


async def fetch_apple_identity(request) -> OAuthIdentity:
    """Read Apple's form-POST callback and normalise it into an OAuthIdentity.

    Raises ValueError on a missing code, a state mismatch, a failed exchange,
    or an unverifiable id_token — the callback route turns that into a
    redirect back to sign-in, not a 500.
    """
    form = await _read_form(request)
    code = form.get("code")
    if not code:
        raise ValueError("Missing authorization code from Apple.")
    expected = request.session.pop("apple_state", None)
    if not expected or not hmac.compare_digest(str(form.get("state") or ""), expected):
        raise ValueError("State mismatch in Apple sign-in.")
    name = _name_from_user_field(form.get("user"))
    token = exchange_code(code, _redirect_uri())
    id_token = token.get("id_token")
    if not id_token:
        raise ValueError("Apple did not return an id_token.")
    claims = verify_id_token(id_token)
    # Apple always verifies the email it returns — including a Hide My Email
    # relay address, which is a real, deliverable address for this account.
    # (Apple sends the string "true", not a boolean.)
    verified = claims.get("email_verified") in (True, "true")
    return OAuthIdentity(
        provider="apple",
        subject=str(claims["sub"]),
        email=claims.get("email"),
        email_verified=verified,
        name=name,
        avatar_url=None,  # Apple shares no avatar.
    )
