"""Shared auth resolution used by both the auth routes and the labs API.

Order: the session cookie first, then a legacy demo bearer token (removed when the demo auth goes).
The user is always derived here from the request, never from a body or path parameter.
"""
from __future__ import annotations

from fastapi import HTTPException, Request, status

import db
from auth.sessions import COOKIE_NAME, user_for_session


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
