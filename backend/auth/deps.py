"""Shared auth resolution used by both the auth routes and the labs API.

The caller is always derived here from the request, never from a body or path parameter.
The credential is the session cookie (website) or the same server-side session id sent as
`Authorization: Bearer <token>` (native apps, which get it from /auth/native/exchange because
cookies don't flow from the app's origin). Both resolve through the same hashed session table.

Two levels:
  - `require_user_id` for anything that needs a real account (progress sync).
  - `resolve_visitor_id` for features open to everyone, which still need to tell one visitor from
    another (interactive labs).
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets

from fastapi import HTTPException, Request, Response, status

import db
from auth.sessions import COOKIE_NAME, cookie_kwargs, user_for_session

#: Per-browser id for anonymous visitors. Opaque and unprivileged: it grants nothing, it only keeps
#: one visitor's lab sessions separate from another's.
GUEST_COOKIE = "rtc_guest"
GUEST_PREFIX = "guest:"
_GUEST_TOKEN = re.compile(r"\A[A-Za-z0-9_-]{22,64}\Z")
#: Native apps can't keep the guest cookie (cross-site), so they send their guest token here.
GUEST_HEADER = "X-RTC-Guest"

#: Domain-separation label for the guest-id HMAC, so a signature for one
#: purpose can never be replayed as another.
_GUEST_SIGNATURE_DOMAIN = "rtc-guest:"

#: Fallback secret used only when SESSION_SECRET is unset (see
#: `_guest_signing_secret`); generated once per process.
_EPHEMERAL_GUEST_SECRET: bytes | None = None


def _guest_signing_secret() -> bytes:
    """HMAC secret for guest ids: the same SESSION_SECRET that signs the
    Starlette OAuth session cookie (main.py boot guards require it to be set,
    so production always has one — no new env var). When the backend is
    imported standalone without it (unit tests that never boot main), fall
    back to an ephemeral per-process secret: guest ids still can't be forged,
    and a restart orphans guest lab sessions anyway because they're in-memory.
    """
    secret = os.environ.get("SESSION_SECRET")
    if secret:
        return secret.encode()
    global _EPHEMERAL_GUEST_SECRET
    if _EPHEMERAL_GUEST_SECRET is None:
        _EPHEMERAL_GUEST_SECRET = secrets.token_bytes(32)
    return _EPHEMERAL_GUEST_SECRET


def sign_guest_token(token: str) -> str:
    """The signed guest value for `token`: `token.signature` (HMAC-SHA256
    over the token with the server secret)."""
    sig = hmac.new(
        _guest_signing_secret(),
        f"{_GUEST_SIGNATURE_DOMAIN}{token}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{token}.{sig}"


def verify_guest_token(value: str) -> str | None:
    """The token inside a server-issued guest value, or None when the value
    was not signed by this server: minted by the client, tampered with, or
    signed with another secret — including an unsigned token from before this
    change, which has no signature at all."""
    token, sep, sig = value.rpartition(".")
    if not sep or not _GUEST_TOKEN.match(token):
        return None
    expected = hmac.new(
        _guest_signing_secret(),
        f"{_GUEST_SIGNATURE_DOMAIN}{token}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    return token


def bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer":
        return None
    return token.strip() or None


def resolve_user_id(request: Request) -> str | None:
    raw = request.cookies.get(COOKIE_NAME) or bearer_token(request)
    if not raw:
        return None
    with db.SessionLocal() as s:
        user = user_for_session(s, raw)
        if user is not None:
            s.commit()  # persist sliding-expiry update
            return user.id
    return None


def require_user_id(request: Request) -> str:
    uid = resolve_user_id(request)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return uid


def is_guest(visitor_id: str) -> bool:
    return visitor_id.startswith(GUEST_PREFIX)


def resolve_visitor_id(request: Request, response: Response) -> str:
    """Who is asking, whether or not they have an account.

    The signed-in user id when there is a session, otherwise a random per-browser guest id kept in
    its own cookie and returned as `guest:<token>`. The prefix means a guest id can never collide
    with an account id, so callers that scope data by owner (labs) stay safe either way. Re-setting
    the cookie on every call gives it a sliding expiry.

    Guest ids are server-signed (see `sign_guest_token`): the cookie / header value is
    `token.signature`, and only a value the server signed is trusted. A client that presents an
    unsigned, malformed, or forged value — including an unsigned cookie issued before this change —
    is handed a fresh server-issued id instead of the one it claimed, so one guest can never reach
    another guest's lab sessions by presenting their token. Native apps get the fresh signed id
    back in the `X-RTC-Guest` response header (same name as the request header) because they can't
    keep the cookie cross-site; the header is exposed for CORS in main.py.
    """
    uid = resolve_user_id(request)
    if uid:
        return uid
    raw = request.cookies.get(GUEST_COOKIE) or request.headers.get(GUEST_HEADER) or ""
    token = verify_guest_token(raw)
    if token is None:
        token = secrets.token_urlsafe(24)
    signed = sign_guest_token(token)
    response.set_cookie(GUEST_COOKIE, signed, **cookie_kwargs())
    response.headers[GUEST_HEADER] = signed
    return f"{GUEST_PREFIX}{token}"
