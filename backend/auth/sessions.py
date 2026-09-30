"""Server-side sessions backed by an HttpOnly cookie.

The cookie holds a random id; only its SHA-256 hash is stored, so a leaked `auth_sessions` row
cannot be replayed as a cookie. Sessions slide: each use pushes the expiry forward.
"""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from db_models import AuthSession, User

COOKIE_NAME = "rtc_session"
SESSION_DAYS = 30


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    # SQLite returns naive datetimes; treat stored values as UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def create_session(db, user_id: str) -> str:
    raw = secrets.token_urlsafe(32)
    db.add(AuthSession(id_hash=_hash(raw), user_id=user_id, expires_at=_now() + timedelta(days=SESSION_DAYS)))
    db.flush()
    return raw


def user_for_session(db, raw: str) -> User | None:
    row = db.get(AuthSession, _hash(raw))
    if row is None:
        return None
    if _aware(row.expires_at) <= _now():
        db.delete(row)
        db.flush()
        return None
    row.last_seen_at = _now()
    row.expires_at = _now() + timedelta(days=SESSION_DAYS)  # sliding expiry
    user = db.get(User, row.user_id)
    if user is None or user.deleted_at is not None:
        return None
    return user


def delete_session(db, raw: str) -> None:
    row = db.get(AuthSession, _hash(raw))
    if row is not None:
        db.delete(row)
        db.flush()


def cookie_kwargs() -> dict:
    """Set-cookie options. Secure is on unless COOKIE_INSECURE=1 (local http dev)."""
    return {
        "httponly": True,
        "secure": os.environ.get("COOKIE_INSECURE") != "1",
        "samesite": "lax",
        "max_age": SESSION_DAYS * 24 * 3600,
        "path": "/",
    }
