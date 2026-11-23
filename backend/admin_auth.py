"""Per-admin sign-in for R2C Admin (admin platform step 2, 2026-11-23).

Replaces the shared ADMIN_PASSWORD gate (Spencer's decision, 2026-11-18):

1. Identity: the admin signs in to the site normally (Google/GitHub). Only an
   account with a PROVIDER-VERIFIED email on the allow-list is eligible —
   ADMIN_EMAILS, or BILLING_OWNER_EMAILS when that is unset. User.email alone
   is never trusted (the admin panel itself writes User.email for manual
   enrollments); the email must come from a verified OAuth identity.
2. MFA: a TOTP authenticator app (RFC 6238: SHA-1, 6 digits, 30 s), enrolled
   on first use and required at every admin sign-in. Codes are accepted
   within one step of the clock and never twice (replay: `last_step`). The
   shared secret is stored encrypted (Fernet, key derived from
   ADMIN_MFA_KEY or SESSION_SECRET) — a database leak alone cannot mint codes.
3. Admin session: separate from the site session, bound to the same user,
   30 minutes idle / 8 hours absolute; ends when the site session ends or the
   account leaves the allow-list. Only the session's hash is stored.
4. CSRF: every state-changing admin request must carry X-CSRF-Token, an HMAC
   of the admin session, handed to the page in JSON (the site and the API are
   on different hosts, so a readable cookie would not work). A forged
   cross-site request cannot know it.

Lockout recovery is a server-side command, never a web endpoint:
    python -m admin_auth reset-mfa <email>
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import secrets
import struct
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from sqlalchemy import func, select

import db
from db_models import AdminMfa, AdminSession, Identity, User

log = logging.getLogger("admin")

ADMIN_COOKIE = "rtc_admin"
CSRF_HEADER = "x-csrf-token"
IDLE = timedelta(minutes=30)
ABSOLUTE = timedelta(hours=8)
TOTP_PERIOD = 30
TOTP_DIGITS = 6
TOTP_ISSUER = "Road to CISSP Admin"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _server_secret() -> bytes:
    secret = os.environ.get("SESSION_SECRET")
    if not secret:  # main.py refuses to boot without it outside dev
        raise RuntimeError("SESSION_SECRET is not set")
    return secret.encode()


# ---------- who may be an admin ----------

def admin_emails() -> set[str]:
    raw = os.environ.get("ADMIN_EMAILS") or os.environ.get("BILLING_OWNER_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def eligible_email(s, user_id: str | None) -> str | None:
    """The allow-listed, provider-verified email of this account, or None."""
    if not user_id:
        return None
    allowed = admin_emails()
    if not allowed:
        return None
    user = s.get(User, user_id)
    if user is None or user.deleted_at is not None:
        return None
    rows = s.execute(
        select(Identity.email).where(Identity.user_id == user_id, Identity.email_verified.is_(True))
    ).scalars()
    for email in rows:
        if email and email.strip().lower() in allowed:
            return email.strip().lower()
    return None


# ---------- TOTP (RFC 6238) ----------

def new_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _hotp(secret_b32: str, counter: int) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** TOTP_DIGITS)
    return f"{code:0{TOTP_DIGITS}d}"


def totp_code(secret_b32: str, at: float | None = None) -> str:
    return _hotp(secret_b32, int((time.time() if at is None else at) // TOTP_PERIOD))


def verify_totp(secret_b32: str, code, last_step: int = 0, at: float | None = None) -> int | None:
    """The accepted time step, or None. Accepts the current step +/-1, never a
    step at or before `last_step` (a code is single-use)."""
    code = "".join(str(code or "").split())
    if len(code) != TOTP_DIGITS or not code.isdigit():
        return None
    now_step = int((time.time() if at is None else at) // TOTP_PERIOD)
    for step in (now_step - 1, now_step, now_step + 1):
        if step > (last_step or 0) and hmac.compare_digest(_hotp(secret_b32, step), code):
            return step
    return None


def otpauth_uri(secret_b32: str, email: str) -> str:
    label = quote(f"{TOTP_ISSUER}:{email}")
    return (
        f"otpauth://totp/{label}?secret={secret_b32}&issuer={quote(TOTP_ISSUER)}"
        f"&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_PERIOD}"
    )


def _fernet():
    from cryptography.fernet import Fernet

    material = os.environ.get("ADMIN_MFA_KEY", "").encode() or _server_secret()
    key = base64.urlsafe_b64encode(hashlib.sha256(material + b"|r2c-admin-mfa").digest())
    return Fernet(key)


def encrypt_secret(secret_b32: str) -> str:
    return _fernet().encrypt(secret_b32.encode()).decode()


def decrypt_secret(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


# ---------- admin sessions ----------

def csrf_token(raw_session: str) -> str:
    return hmac.new(_server_secret(), b"admin-csrf|" + raw_session.encode(), hashlib.sha256).hexdigest()


def create_session(user_id: str) -> str:
    raw = secrets.token_urlsafe(32)
    with db.SessionLocal() as s:
        s.add(AdminSession(id_hash=_hash(raw), user_id=user_id, expires_at=_now() + IDLE))
        s.commit()
    return raw


def delete_session(raw: str | None) -> None:
    if not raw:
        return
    try:
        with db.SessionLocal() as s:
            row = s.get(AdminSession, _hash(raw))
            if row is not None:
                s.delete(row)
                s.commit()
    except Exception:
        log.exception("admin session delete failed")


def session_user(raw: str | None, site_user_id: str | None) -> str | None:
    """The admin user id for a live admin session, else None (slides the idle expiry).

    Live means: not idle for 30 min, under 8 h old, bound to the same account
    as the site session in this browser, that account still allow-listed and
    still MFA-enrolled."""
    if not raw or not site_user_id:
        return None
    try:
        with db.SessionLocal() as s:
            row = s.get(AdminSession, _hash(raw))
            if row is None or not row.user_id:
                return None
            now = _now()
            if _aware(row.expires_at) <= now or _aware(row.created_at) + ABSOLUTE <= now:
                s.delete(row)
                s.commit()
                return None
            if row.user_id != site_user_id or eligible_email(s, row.user_id) is None:
                return None
            mfa = s.get(AdminMfa, row.user_id)
            if mfa is None or mfa.enabled_at is None:
                return None
            row.last_seen_at = now
            row.expires_at = min(now + IDLE, _aware(row.created_at) + ABSOLUTE)
            s.commit()
            return row.user_id
    except Exception:
        log.exception("admin session check failed")
        return None


def cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": os.environ.get("COOKIE_INSECURE") != "1",
        "samesite": "lax",
        "max_age": int(ABSOLUTE.total_seconds()),
        "path": "/",
    }


# ---------- MFA records ----------

def mfa_state(s, user_id: str) -> AdminMfa | None:
    return s.get(AdminMfa, user_id)


def reset_mfa(email: str) -> int:
    """Remove the MFA enrollment (and admin sessions) of every account whose
    verified email is `email`. Server-side recovery only. Returns rows removed."""
    email = email.strip().lower()
    removed = 0
    with db.SessionLocal() as s:
        ids = set(
            s.execute(
                select(Identity.user_id).where(func.lower(Identity.email) == email, Identity.email_verified.is_(True))
            ).scalars()
        )
        for uid in ids:
            row = s.get(AdminMfa, uid)
            if row is not None:
                s.delete(row)
                removed += 1
            for sess in s.execute(select(AdminSession).where(AdminSession.user_id == uid)).scalars():
                s.delete(sess)
        s.commit()
    return removed


if __name__ == "__main__":  # pragma: no cover - operator command
    if len(sys.argv) == 3 and sys.argv[1] == "reset-mfa":
        n = reset_mfa(sys.argv[2])
        print(f"Removed {n} MFA enrollment(s) for {sys.argv[2]}. Sign in to /admin to enroll again.")
        try:
            import audit

            audit.record("admin.mfa_reset", actor="server-console", details={"email": sys.argv[2], "removed": n})
        except Exception:
            pass
    else:
        print("usage: python -m admin_auth reset-mfa <email>")
        sys.exit(2)
