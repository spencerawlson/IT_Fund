"""Authlib provider registry and identity fetch.

`fetch_identity` normalises Google and GitHub responses into an OAuthIdentity. Tests monkeypatch it,
so the callback logic (upsert, merge, session) is exercised without any network or real credentials.
"""
from __future__ import annotations

import os

from authlib.integrations.starlette_client import OAuth

from auth.identity import OAuthIdentity

oauth = OAuth()
_registered: set[str] = set()


def _ensure_registered() -> None:
    if os.environ.get("GOOGLE_CLIENT_ID") and "google" not in _registered:
        oauth.register(
            "google",
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )
        _registered.add("google")
    if os.environ.get("GITHUB_CLIENT_ID") and "github" not in _registered:
        oauth.register(
            "github",
            client_id=os.environ["GITHUB_CLIENT_ID"],
            client_secret=os.environ.get("GITHUB_CLIENT_SECRET"),
            access_token_url="https://github.com/login/oauth/access_token",
            authorize_url="https://github.com/login/oauth/authorize",
            api_base_url="https://api.github.com/",
            client_kwargs={"scope": "read:user user:email"},
        )
        _registered.add("github")


def provider_configured(provider: str) -> bool:
    _ensure_registered()
    return provider in _registered


def client(provider: str):
    _ensure_registered()
    return getattr(oauth, provider)


async def fetch_identity(provider: str, request) -> OAuthIdentity:
    c = client(provider)
    token = await c.authorize_access_token(request)  # verifies state; exchanges the code
    if provider == "google":
        info = token.get("userinfo") or await c.userinfo(token=token)
        return OAuthIdentity(
            provider="google",
            subject=str(info["sub"]),
            email=info.get("email"),
            email_verified=bool(info.get("email_verified")),
            name=info.get("name", ""),
            avatar_url=info.get("picture"),
        )
    # GitHub: the profile email may be private, so read the verified primary from /user/emails.
    user = (await c.get("user", token=token)).json()
    email, verified = user.get("email"), False
    resp = await c.get("user/emails", token=token)
    if resp.status_code == 200:
        for e in resp.json():
            if e.get("primary"):
                email, verified = e.get("email"), bool(e.get("verified"))
                break
    return OAuthIdentity(
        provider="github",
        subject=str(user["id"]),
        email=email,
        email_verified=verified,
        name=user.get("name") or user.get("login", ""),
        avatar_url=user.get("avatar_url"),
    )
