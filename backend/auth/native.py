"""Native-app sign-in: OAuth in the system browser, handed to the app with a one-time code + PKCE.

Flow:
  1. The app makes a random `code_verifier`, keeps it, and opens
     /api/auth/{provider}/login?client=native&code_challenge=BASE64URL(SHA256(verifier))
     in the system browser (Google blocks OAuth inside embedded WebViews).
  2. The normal OAuth callback signs the user in, then redirects to NATIVE_REDIRECT?code=<code>.
  3. The app catches that deep link and POSTs {code, code_verifier} to /api/auth/native/exchange,
     which returns a session token the app sends as `Authorization: Bearer <token>`.

The deep link can be intercepted by another app registering the same scheme, which is why the
code alone is worthless: redeeming it needs the verifier that never left the app (RFC 7636).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from db_models import NativeAuthCode

#: Deep link the app registers (Android intent filter, iOS CFBundleURLTypes).
NATIVE_REDIRECT = "com.road2cissp.app://auth/callback"
CODE_TTL = timedelta(seconds=60)

# RFC 7636: S256 challenge is base64url(sha256) without padding = 43 chars; verifier is 43-128 chars.
_CHALLENGE = re.compile(r"\A[A-Za-z0-9_-]{43}\Z")
_VERIFIER = re.compile(r"\A[A-Za-z0-9._~-]{43,128}\Z")


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def valid_challenge(challenge: str | None) -> bool:
    return bool(challenge and _CHALLENGE.match(challenge))


def challenge_for(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()


def create_code(db, user_id: str, challenge: str) -> str:
    code = secrets.token_urlsafe(32)
    db.add(NativeAuthCode(code_hash=_hash(code), user_id=user_id, code_challenge=challenge,
                          expires_at=_now() + CODE_TTL))
    db.flush()
    return code


def redeem_code(db, code: str, verifier: str) -> str | None:
    """The user id for a valid, unexpired code whose challenge matches the verifier, else None.

    The code is deleted on any redemption attempt, so it can never be tried twice.
    """
    if not code or not verifier or not _VERIFIER.match(verifier):
        return None
    row = db.get(NativeAuthCode, _hash(code))
    if row is None:
        return None
    db.delete(row)
    db.flush()
    if _aware(row.expires_at) <= _now():
        return None
    if not hmac.compare_digest(row.code_challenge, challenge_for(verifier)):
        return None
    return row.user_id
