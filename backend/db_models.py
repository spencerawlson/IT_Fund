"""ORM models for accounts and progress (C3).

Decisions (docs/ACCOUNTS_PLAN.md): OAuth-only sign-in (optional), store the provider-verified
email, and auto-merge a Google and GitHub login when both verified emails match. Sessions are a
random id whose *hash* is stored, so a leaked row can't be used as a cookie.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
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
    # Ventoryn campaign attribution: the vtn_ tag from the first signed
    # link that brought this visitor in (see backend/billing.py). First
    # touch only — never overwritten. None for the vast majority of users.
    attribution_tag: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # When that tag was captured (UTC). The 30-day attribution window
    # (decision D3) is enforced server-side from this timestamp; a tag
    # older than 30 days no longer attributes a checkout and may be
    # replaced by a fresh capture. None on legacy rows from before this
    # column existed — those are treated as fresh (see billing.py).
    attribution_captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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


class NativeAuthCode(Base):
    """One-time code handing a finished OAuth login from the system browser to the native app.

    The app deep link carries only the code; redeeming it also needs the PKCE verifier the app kept,
    so an app that intercepts the link cannot use it. Only the code's hash is stored, it lives
    60 seconds and is deleted on first use.
    """
    __tablename__ = "native_auth_codes"

    code_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code_challenge: Mapped[str] = mapped_column(String(128))
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
    # L-01 provenance: True when the completion rests on client attestation
    # ("I did this" findings POSTed by the learner) rather than server-side
    # evidence from exec. Docker labs can only complete that way today (their
    # exec returns no findings); mock-lab completions are always evidenced.
    attested: Mapped[bool] = mapped_column(Boolean, default=False)


class Subscription(Base):
    """One row per user tracking their Stripe subscription state.

    Written by the Stripe webhook (see billing.py) — never trust client input for
    subscription status. `status` mirrors Stripe's subscription status
    ("active", "trialing", "past_due", "canceled", ...). A user counts as
    subscribed when status is "active" or "trialing" (see billing.is_subscribed),
    or when status is "past_due" and the 7-day grace from `past_due_since`
    has not expired.
    """
    __tablename__ = "subscriptions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    stripe_customer_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="incomplete")
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # When the subscription went past_due (webhook-set, see billing.py).
    # The 7-day past_due grace is anchored here — never at
    # current_period_end, which Stripe advances to the end of the new
    # (unpaid) period on a failed renewal. NULL unless status is past_due.
    past_due_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class ProcessedWebhookEvent(Base):
    """One row per Stripe webhook event id actually applied (see billing.py).

    Idempotency: a redelivered event id is acknowledged without
    re-applying. Ordering: `event_created` per subscription is compared
    against the last-applied event, so a delayed older event cannot
    overwrite newer state. Only events that changed subscription state
    are recorded; ignored event types and deterministically
    unprocessable events leave no row.
    """
    __tablename__ = "processed_webhook_events"

    stripe_event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    event_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class LabSession(Base):
    """Durable interactive-lab session row, exactly as created by
    migration b7f3a1c9d2e4.

    No code uses this ORM model yet — it exists so Alembic autogenerate
    sees the table the migration created instead of wanting to drop it.
    `owner_id` is intentionally NOT a foreign key: most lab users are
    anonymous guests with no `users` row.
    """
    __tablename__ = "lab_sessions"

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    lab_id: Mapped[str] = mapped_column(String(64), index=True)
    owner_id: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[str] = mapped_column(String(16))
    environment_id: Mapped[str] = mapped_column(String(128))
    provider: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    progress: Mapped[dict] = mapped_column(JSON)
    validation_results: Mapped[dict] = mapped_column(JSON)
    findings: Mapped[dict] = mapped_column(JSON)


class AdminSession(Base):
    """One admin-panel login session (Kay Ayiti model: password gate, no admin
    accounts). Only the hash of the session token is stored, like auth_sessions.
    """
    __tablename__ = "admin_sessions"

    id_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AiTutorCall(Base):
    """One AI tutor call, append-only. Written by ai_tutor._log_call for every
    call that passes auth + rate limiting — success, cached answer, or upstream
    error. cost_usd is computed from the explicit MODEL_PRICES table in
    ai_tutor.py; None means the model has no listed price (shown as "unknown"),
    0.0 means a cached answer (no new spend). No call history exists before
    this table ships.
    """
    __tablename__ = "ai_tutor_calls"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mode: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(64))
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    cached: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


def _mission_attempt_id() -> str:
    return "att-" + secrets.token_hex(12)


class MissionAttempt(Base):
    """One Cyber Mission attempt (op-broken-shield vertical slice).

    Written by backend/missions.py. `user_id` is intentionally NOT a foreign
    key (matching lab_sessions' owner_id pattern): missions require a signed-in
    user, so a real user id is always present, but no FK constraint is enforced.
    `findings` is the versioned mission-findings schema (see
    labs/missions.py initial_findings, v1); `objectives_passed` is the list of
    the 9 objective ids passing at the last evaluation; `choices` is the
    append-only log of mission actions the learner took.
    """
    __tablename__ = "mission_attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_mission_attempt_id)
    user_id: Mapped[str] = mapped_column(String(32), index=True)
    mission_id: Mapped[str] = mapped_column(String(64), index=True)
    definition_version: Mapped[int] = mapped_column(Integer)
    lab_session_id: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="in_progress")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    objectives_passed: Mapped[list] = mapped_column(JSON, default=list)
    choices: Mapped[list] = mapped_column(JSON, default=list)
    findings: Mapped[dict] = mapped_column(JSON, default=dict)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
