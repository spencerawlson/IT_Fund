"""Shared auth resolution used by both the auth routes and the labs API.

Order: the session cookie first, then a legacy demo bearer token (removed when the demo auth goes).
The caller is always derived here from the request, never from a body or path parameter.

Two levels:
  - `require_user_id` for anything that needs a real account (progress sync).
  - `resolve_visitor_id` for features open to everyone, which still need to tell one visitor from
    another (interactive labs).
"""
from __future__ import annotations

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


def resolve_user_id(request: Request) -> str | None:
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        with db.SessionLocal() as s:
            user = user_for_session(s, raw)
            if user is not None:
                s.commit()  # persist sliding-expiry update
                return user.id
    # Legacy demo bearer token (temporary; removed with the demo auth).
    authz = request.headers.get("authorization")
    if authz and authz.startswith("Bearer "):
        import main
        user = main._user_from_token(authz.split(" ", 1)[1])
        if user:
            return user["id"]
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
    """
    uid = resolve_user_id(request)
    if uid:
        return uid
    raw = request.cookies.get(GUEST_COOKIE) or ""
    if not _GUEST_TOKEN.match(raw):
        raw = secrets.token_urlsafe(24)
    response.set_cookie(GUEST_COOKIE, raw, **cookie_kwargs())
    return f"{GUEST_PREFIX}{raw}"
