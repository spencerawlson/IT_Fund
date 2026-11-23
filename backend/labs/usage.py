"""Phase 0 lab-hours meter (shadow mode: measure, don't charge).

The included lab-hours model, decided 2026-11-23: every subscription
includes 20 Docker lab-hours per billing period, with overage billed later
(Phase 1). Phase 0 only measures: durable `lab_usage_events` rows, one per
Docker session for a signed-in subscriber, and a read-only usage summary
for the meter UI. No Stripe calls, no invoices, no dollar amounts anywhere
in this module — the meter shows hours used, never money owed.

Rules (from the design doc):
- Guests write nothing. The showcase lab (py-basics-001) is free and
  unmetered — it writes nothing either. Mock labs write nothing.
- Billed time is container lifetime, per started minute:
  ceil((min(ended_at, expires_at) - started_at) / 60) * 60.
- The period window is fixed at session start. Monthly subscribers get
  their Stripe period; annual subscribers get monthly slices of it,
  anchored on the subscription's start day; manual grants get 30-day
  slices from the grant date; the owner gets the calendar month.
- Reset does not reset the clock. A session destroyed, expired, or
  completed is finalized once; a restart opens a new row.
- Restart-orphaned usage is unbilled and unrecoverable: if the process
  dies with a live session, its row stays open with no end. The periodic
  reaper closes rows whose session already expired (`finalize_stale_rows`);
  rows whose session is still within its expiry when the process died
  simply never finalize — that usage is lost, by design, in this phase.
"""
from __future__ import annotations

import math
from calendar import monthrange
from datetime import datetime, timedelta, timezone

import db
from db_models import LabUsageEvent, ManualGrant, Subscription

#: Included Docker lab-hours per billing period (20h = 72,000 seconds).
ALLOWANCE_SECONDS = 20 * 3600

#: The free tier's only Docker lab. Free and unmetered for everyone,
#: including guests — it never writes a usage row.
SHOWCASE_LAB_ID = "py-basics-001"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; treat them as UTC."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


# ---------------------------------------------------------------------------
# Pure math
# ---------------------------------------------------------------------------


def billed_seconds(started_at: datetime, ended_at: datetime, expires_at: datetime) -> int:
    """Container lifetime billed per started minute, capped at expiry.

    A session that lived 61 seconds bills 120; a session that ran past its
    expiry bills only up to the expiry; a zero/negative lifetime bills 0.
    """
    started_at, ended_at, expires_at = _utc(started_at), _utc(ended_at), _utc(expires_at)
    effective_end = min(ended_at, expires_at)
    seconds = (effective_end - started_at).total_seconds()
    if seconds <= 0:
        return 0
    return math.ceil(seconds / 60) * 60


def add_months(dt: datetime, months: int) -> datetime:
    """Add calendar months, anchoring on the original day-of-month.

    Jan 31 + 1 month = Feb 28 (clamped); Feb 28 is then NOT the anchor —
    the anchor stays the 31st, so Jan 31 + 2 months = Mar 31. Matches how
    Stripe advances a monthly period whose anchor day doesn't exist in
    the next month.
    """
    index = (dt.year * 12 + (dt.month - 1)) + months
    year, month = divmod(index, 12)
    month += 1
    day = min(dt.day, monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def monthly_slice(
    period_start: datetime, period_end: datetime, now: datetime
) -> tuple[datetime, datetime]:
    """The monthly slice of a (possibly annual) billing period containing `now`.

    Monthly periods pass through unchanged. Annual periods are cut into
    monthly slices anchored on the period start day. Before the period
    start, the first slice; after the period end, the last slice.
    """
    period_start, period_end, now = _utc(period_start), _utc(period_end), _utc(now)
    if period_start is None or period_end is None:
        raise ValueError("monthly_slice needs both period anchors")
    if period_end <= period_start:
        return period_start, period_end
    k = 0
    while True:
        slice_start = add_months(period_start, k)
        slice_end = add_months(period_start, k + 1)
        if now < slice_end or slice_end >= period_end:
            return slice_start, min(slice_end, period_end)
        k += 1


# ---------------------------------------------------------------------------
# Exclusion rules
# ---------------------------------------------------------------------------


def should_record(user_id: str, lab_id: str, provider: str) -> bool:
    """True only for a Docker session of a signed-in user on a metered lab."""
    if provider != "docker":
        return False
    if lab_id == SHOWCASE_LAB_ID:
        return False
    # Guests have ids like "guest:<token>" (see auth.deps.is_guest).
    if not user_id or user_id.startswith("guest:"):
        return False
    return True


# ---------------------------------------------------------------------------
# Billing-period windows
# ---------------------------------------------------------------------------


def current_window(user_id: str, now: datetime | None = None) -> tuple[datetime, datetime] | None:
    """The user's current lab-hours window, or None when unmetered.

    Owner: the calendar month. Subscriber: the Stripe period, cut into
    monthly slices for annual plans (monthly slices anchored on the
    subscription start day). A legacy subscription row with no
    current_period_start falls back to a 31-day window ending at
    current_period_end. Manual grant: 30-day slices from the grant date.
    Free-tier signed-in users have no window — the meter is unmetered.
    """
    from billing import _row_is_subscribed, has_active_manual_grant, is_owner, is_subscribed

    now = _utc(now) if now is not None else _now()
    if not is_subscribed(user_id):
        return None
    if is_owner(user_id):
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, add_months(start, 1)
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
        # Only the subscription's own window when the row itself grants
        # access — a cancelled row must not shadow an active manual grant.
        if row is not None and _row_is_subscribed(row):
            start = _utc(row.current_period_start)
            end = _utc(row.current_period_end)
            if end is not None:
                if start is None:
                    return end - timedelta(days=31), end
                return monthly_slice(start, end, now)
        grant = s.get(ManualGrant, user_id)
        if grant is not None and grant.revoked_at is None and has_active_manual_grant(user_id):
            granted = _utc(grant.granted_at)
            k = 0
            while granted + timedelta(days=30 * (k + 1)) <= now:
                k += 1
            return granted + timedelta(days=30 * k), granted + timedelta(days=30 * (k + 1))
    return None


# ---------------------------------------------------------------------------
# Ledger
# ---------------------------------------------------------------------------


def record_start(
    user_id: str,
    session_id: str,
    lab_id: str,
    provider: str,
    started_at: datetime,
    expires_at: datetime,
    now: datetime | None = None,
) -> LabUsageEvent | None:
    """Write the usage row for a new session, or None when unmetered.

    Idempotent on session_id: a second call for the same session returns
    the existing row (a reset must never open a second row).
    """
    if not should_record(user_id, lab_id, provider):
        return None
    now = _utc(now) if now is not None else _now()
    window = current_window(user_id, now)
    if window is None:
        return None
    with db.SessionLocal() as s:
        existing = s.query(LabUsageEvent).filter(LabUsageEvent.session_id == session_id).first()
        if existing is not None:
            return existing
        row = LabUsageEvent(
            user_id=user_id,
            session_id=session_id,
            lab_id=lab_id,
            provider=provider,
            started_at=_utc(started_at),
            expires_at=_utc(expires_at),
            period_start=window[0],
            period_end=window[1],
        )
        s.add(row)
        s.commit()
        s.refresh(row)
        return row


def finalize_session(
    session_id: str, ended_at: datetime | None = None, now: datetime | None = None
) -> LabUsageEvent | None:
    """Finalize a session's row at termination (destroy / expire / complete).

    Idempotent: finalizing an already-finalized row returns it unchanged.
    Returns None when the session has no row (guest, mock, showcase).
    """
    now = _utc(now) if now is not None else _now()
    ended = _utc(ended_at) if ended_at is not None else now
    with db.SessionLocal() as s:
        row = s.query(LabUsageEvent).filter(LabUsageEvent.session_id == session_id).first()
        if row is None or row.ended_at is not None:
            return row
        row.ended_at = ended
        row.billed_seconds = billed_seconds(row.started_at, ended, row.expires_at)
        s.commit()
        s.refresh(row)
        return row


def finalize_stale_rows(now: datetime | None = None) -> int:
    """Close open rows whose session already expired (reaper sweep).

    Each stale row is finalized at its expires_at — the last moment its
    container could have run. Returns the number of rows closed. Rows
    whose session has not expired yet are left alone; rows orphaned by a
    restart whose session is still within expiry stay open and unbilled.
    """
    now = _utc(now) if now is not None else _now()
    closed = 0
    with db.SessionLocal() as s:
        stale = (
            s.query(LabUsageEvent)
            .filter(LabUsageEvent.ended_at.is_(None), LabUsageEvent.expires_at <= now)
            .all()
        )
        for row in stale:
            row.ended_at = _utc(row.expires_at)
            row.billed_seconds = billed_seconds(row.started_at, row.expires_at, row.expires_at)
            closed += 1
        if closed:
            s.commit()
    return closed


def usage_summary(user_id: str, now: datetime | None = None) -> dict:
    """The meter payload for GET /labs/usage (shadow mode: hours, never money).

    used_seconds = finalized rows in the current window + live time accrued
    by open sessions in the window (per started minute, capped at expiry).
    live_seconds is the open-session part alone, so the UI can say how much
    of the total is still running. overage_seconds is informational only —
    nothing in Phase 0 bills it.
    """
    now = _utc(now) if now is not None else _now()
    window = current_window(user_id, now)
    if window is None:
        return {
            "metered": False,
            "used_seconds": 0,
            "allowance_seconds": ALLOWANCE_SECONDS,
            "overage_seconds": 0,
            "live_seconds": 0,
            "resets_at": None,
        }
    used = 0
    live = 0
    with db.SessionLocal() as s:
        rows = s.query(LabUsageEvent).filter(LabUsageEvent.user_id == user_id).all()
        for row in rows:
            if _utc(row.period_start) != window[0] or _utc(row.period_end) != window[1]:
                continue
            if row.ended_at is not None:
                used += row.billed_seconds or 0
            else:
                accrued = billed_seconds(row.started_at, now, row.expires_at)
                used += accrued
                live += accrued
    return {
        "metered": True,
        "used_seconds": used,
        "allowance_seconds": ALLOWANCE_SECONDS,
        "overage_seconds": max(0, used - ALLOWANCE_SECONDS),
        "live_seconds": live,
        "resets_at": window[1].isoformat(),
    }
