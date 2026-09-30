"""Resolve an OAuth login to a local user, with verified-email auto-merge.

Rules (docs/ACCOUNTS_PLAN.md, D3+D4):
  - A returning identity (same provider + subject) always maps to its existing user.
  - A new identity whose email is provider-VERIFIED and matches an existing identity's verified
    email links to that same user (auto-merge Google <-> GitHub).
  - Otherwise a new user is created.
Merging never happens on an unverified email, which is what makes it safe against takeover.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select

from db_models import Identity, User


@dataclass
class OAuthIdentity:
    provider: str          # "google" | "github"
    subject: str           # provider's stable user id
    email: str | None
    email_verified: bool
    name: str = ""
    avatar_url: str | None = None

    @property
    def norm_email(self) -> str | None:
        return self.email.strip().lower() if self.email else None


def _find_user_by_verified_email(db, email: str) -> User | None:
    row = db.execute(
        select(Identity).where(func.lower(Identity.email) == email, Identity.email_verified.is_(True))
    ).scalars().first()
    return row.user if row else None


def upsert_identity(db, info: OAuthIdentity) -> User:
    existing = db.execute(
        select(Identity).where(Identity.provider == info.provider, Identity.provider_subject == info.subject)
    ).scalars().first()

    if existing is not None:
        existing.email = info.email
        existing.email_verified = info.email_verified
        _apply_profile(existing.user, info)
        db.flush()
        return existing.user

    user = None
    if info.email_verified and info.norm_email:
        user = _find_user_by_verified_email(db, info.norm_email)  # auto-merge
    if user is None:
        user = User(display_name=info.name or "", avatar_url=info.avatar_url)
        db.add(user)
        db.flush()

    db.add(Identity(
        user_id=user.id,
        provider=info.provider,
        provider_subject=info.subject,
        email=info.email,
        email_verified=info.email_verified,
    ))
    _apply_profile(user, info)
    db.flush()
    return user


def _apply_profile(user: User, info: OAuthIdentity) -> None:
    if not user.display_name and info.name:
        user.display_name = info.name
    if info.avatar_url and not user.avatar_url:
        user.avatar_url = info.avatar_url
    # Store the account email only from a verified claim.
    if info.email_verified and info.norm_email and not user.email:
        user.email = info.norm_email
