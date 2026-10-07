"""ORM models for accounts and progress (C3).

Decisions (docs/ACCOUNTS_PLAN.md): OAuth-only sign-in (optional), store the provider-verified
email, and auto-merge a Google and GitHub login when both verified emails match. Sessions are a
random id whose *hash* is stored, so a leaked row can't be used as a cookie.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def _uuid() -> str:
    return secrets.token_hex(16)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # Provider-verified email. Stored to enable safe auto-merge; only ever set from a verified claim.
    email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    identities: Mapped[list["Identity"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Identity(Base):
    __tablename__ = "identities"
    __table_args__ = (UniqueConstraint("provider", "provider_subject", name="uq_provider_subject"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(20))  # "google" | "github"
    provider_subject: Mapped[str] = mapped_column(String(255))  # the provider's stable user id
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped[User] = relationship(back_populates="identities")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    # Only the hash of the session id is stored; the raw id lives solely in the cookie.
    id_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Progress(Base):
    __tablename__ = "progress"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class LabCompletion(Base):
    """One completed interactive-lab run, for signed-in learners.

    Written when a lab session completes (see labs/api.py). One row per session —
    the (user_id, session_id) unique constraint makes repeat validations idempotent.
    Guests keep history in the browser only (see src/lib/labProgress.js).
    Feeds GET /api/labs/history, which the lab progress page aggregates into
    per-lab completions and best/last times.
    """
    __tablename__ = "lab_completions"
    __table_args__ = (
        UniqueConstraint("user_id", "session_id", name="uq_lab_completion_session"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lab_id: Mapped[str] = mapped_column(String(128), index=True)
    session_id: Mapped[str] = mapped_column(String(64))
    duration_seconds: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
