"""Auth routes: OAuth login/callback, sign-out, and the current user.

Mounted at both /auth and /api/auth by main.py, so the browser-facing paths are
/api/auth/{provider}/login, /api/auth/{provider}/callback, /api/auth/logout and /api/auth/me.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse

import db
from auth import oauth as oauth_mod
from auth.deps import require_user_id
from auth.identity import OAuthIdentity, upsert_identity
from auth.sessions import COOKIE_NAME, cookie_kwargs, create_session, delete_session
from db_models import User

router = APIRouter(prefix="/auth", tags=["auth"])

PROVIDERS = {"google", "github"}
APP_ORIGIN = os.environ.get("APP_ORIGIN", "http://localhost:5188")


def _check_provider(provider: str) -> None:
    if provider not in PROVIDERS or not oauth_mod.provider_configured(provider):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown or unconfigured provider.")


@router.api_route("/dev-login", methods=["GET", "POST"])
def dev_login():
    """Local-only owner sign-in for testing before the OAuth apps exist. Disabled unless
    ALLOW_DEV_LOGIN=1 (never set in production), so it 404s everywhere by default."""
    if os.environ.get("ALLOW_DEV_LOGIN") != "1":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    with db.SessionLocal() as s:
        user = upsert_identity(s, OAuthIdentity("dev", "owner", "owner@local.dev", True, "Owner"))
        raw = create_session(s, user.id)
        s.commit()
    # Relative redirect on purpose: the browser resolves it against whichever dev origin it used
    # (Vite picks 5173, 5174, 5188...), so this works without matching APP_ORIGIN to the port.
    resp = RedirectResponse("/", status_code=status.HTTP_302_FOUND)
    resp.set_cookie(COOKIE_NAME, raw, **cookie_kwargs())
    return resp


@router.get("/{provider}/login")
async def login(provider: str, request: Request):
    _check_provider(provider)
    redirect_uri = f"{APP_ORIGIN}/api/auth/{provider}/callback"
    return await oauth_mod.client(provider).authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback")
async def callback(provider: str, request: Request):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown provider.")
    try:
        info = await oauth_mod.fetch_identity(provider, request)
    except Exception:
        # Bad/expired state, denied consent, etc. Send the user back to sign-in, not a 500.
        return RedirectResponse(f"{APP_ORIGIN}/signin?error=oauth", status_code=status.HTTP_302_FOUND)
    with db.SessionLocal() as s:
        user = upsert_identity(s, info)
        raw = create_session(s, user.id)
        s.commit()
    resp = RedirectResponse(f"{APP_ORIGIN}/", status_code=status.HTTP_302_FOUND)
    resp.set_cookie(COOKIE_NAME, raw, **cookie_kwargs())
    return resp


@router.post("/logout")
def logout(request: Request):
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        with db.SessionLocal() as s:
            delete_session(s, raw)
            s.commit()
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie(COOKIE_NAME, path="/")
    return resp


@router.get("/me")
def me(user_id: str = Depends(require_user_id)):
    with db.SessionLocal() as s:
        user = s.get(User, user_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        return {
            "id": user.id,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "providers": sorted({i.provider for i in user.identities}),
        }
