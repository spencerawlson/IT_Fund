"""Resolve an OAuth login to a local user, with verified-email auto-merge.

Rules (docs/ACCOUNTS_PLAN.md, D3+D4):
  - A returning identity (same provider + subject) always maps to its existing user.
  - A new identity whose email is provider-VERIFIED and matches an existing identity's verified
    email links to that same user (auto-merge Google <-> GitHub).
  - A new identity whose email is provider-VERIFIED and matches an admin-created account
    (a customer enrolled in person, before ever signing in — see ManualGrant) links to
    that account instead of creating a duplicate.
  - Otherwise a new user is created.
Merging never happens on an unverified email, which is what makes it safe against takeover:
the incoming claim must be provider-verified, whether it matches an identity or an
admin-entered account email.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select

from db_models import Identity, User
from public import SEAT_CAP


class SeatsFullError(Exception):
    """Raised when a brand-new account would exceed the seat cap (SEAT_CAP).

    Only new public signups are refused: a returning identity, a
    verified-email auto-merge into an existing user, and a first sign-in
    merging into an admin-created account all reuse an existing user and
    are unaffected. Admin manual enrollment (POST /admin/accounts) creates
    accounts directly and never goes through here, so Spencer's own
    enrollments stay available at any count.
    """


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
    if row is not None:
        return row.user
    # No identity carries this email yet: fall back to an admin-created
    # account with the same email (a customer enrolled in person before
    # ever signing in). The incoming claim is provider-verified, so this
    # is the same safety bar as the identity match above — and it is the
    # only way that account ever gains a sign-in. Deleted accounts never
    # match: a deleted account stays deleted.
    return db.execute(
        select(User).where(func.lower(User.email) == email, User.deleted_at.is_(None))
    ).scalars().first()


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
        # Seat cap: no new public accounts once the platform is full. The
        # count runs in this transaction, so two signups racing at the
        # boundary can overshoot by a small number — the cap is a gate on
        # new signups, not a hard invariant under concurrency.
        total = db.execute(
            select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        ).scalar() or 0
        if total >= SEAT_CAP:
            raise SeatsFullError(f"All {SEAT_CAP} seats are taken — sign-ups are closed.")
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
