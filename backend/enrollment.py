"""Founding-membership capacity: who holds one of the places, and how many are left.

Spencer's rules (admin-platform spec, decisions of 2026-11-18):

* There are `paid_capacity` places (10,000 at launch) for PAYING memberships,
  bought online (Stripe) or in person (admin manual enrollment).
* Each entitled member holds exactly one place. A renewal, a retried
  checkout, or a duplicate webhook never takes a second one: a user has at
  most one open allocation (a partial unique index in the database).
* A failed payment takes no place: a place becomes "active" only when access
  is actually granted (Stripe subscription active/trialing, or a manual
  grant). A Stripe subscriber in the 7-day past_due grace keeps it.
* A cancelled subscription keeps its place until paid access ends; when a
  membership ends, its place goes back to the pool.
* Complimentary memberships never use the paid places (own cap, kind
  "complimentary").
* The site owner never holds a place.

Concurrency: every allocation runs inside one transaction that first locks
the single enrollment_settings row (SELECT ... FOR UPDATE on Postgres), so
two checkouts racing for the last place serialize: the second one sees the
first one's row and is refused. Nothing here trusts the browser: the public
counter only reads these rows.

Reservations: starting a Stripe checkout reserves a place for
`reservation_minutes`; the webhook turns it into an active place when the
subscription starts. A reservation that lapses frees its place. If the
payment completes after the reservation lapsed and the places are gone, the
member keeps access (they paid) and the row is flagged `over_capacity`.

`reconcile()` re-derives every allocation from the authoritative records
(Stripe subscription rows + manual grants), so the counter self-heals after
a missed webhook; it runs at startup and from the admin panel.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

import db
from db_models import EnrollmentSettings, ManualGrant, MembershipAllocation, Subscription, User

log = logging.getLogger(__name__)

SETTINGS_ID = 1
DEFAULT_PAID_CAPACITY = 10000
DEFAULT_COMP_CAPACITY = 100
DEFAULT_RESERVATION_MINUTES = 60
#: Bounds an admin may set the capacities to (validated in update_settings).
MAX_CAPACITY = 1_000_000

#: Placeholder accounts Spencer created to hold places for in-person sales
#: (the admin board's "Reserved" badge, src/pages/admin/Admin.jsx). Their
#: places are taken, but they are not members: their allocation source is
#: "placeholder", so they never count as paying members or revenue. Editing
#: one to a real name and email turns it into a paid manual member.
RESERVED_EMAIL_SUFFIX = "@road2cissp.local"
PLACEHOLDER = "placeholder"

PAID = "paid"
COMPLIMENTARY = "complimentary"
KINDS = (PAID, COMPLIMENTARY)


class CapacityFull(Exception):
    """No place of this kind is left."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:  # SQLite returns naive datetimes; they are UTC
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------- settings ----------

def _settings(s, lock: bool = False) -> EnrollmentSettings:
    """The settings row, created with the defaults on first use. With
    lock=True the row is locked for the rest of the transaction (Postgres),
    which serializes every place allocation."""
    q = select(EnrollmentSettings).where(EnrollmentSettings.id == SETTINGS_ID)
    if lock:
        q = q.with_for_update()
    row = s.execute(q).scalar_one_or_none()
    if row is None:
        row = EnrollmentSettings(
            id=SETTINGS_ID,
            paid_capacity=DEFAULT_PAID_CAPACITY,
            comp_capacity=DEFAULT_COMP_CAPACITY,
            reservation_minutes=DEFAULT_RESERVATION_MINUTES,
        )
        s.add(row)
        s.flush()
        if lock:
            row = s.execute(q).scalar_one()
    return row


def _capacity(settings: EnrollmentSettings, kind: str) -> int:
    return settings.paid_capacity if kind == PAID else settings.comp_capacity


# ---------- counting ----------

def _occupied(s, kind: str, now: datetime) -> int:
    """Places of `kind` taken right now: active allocations plus reservations
    that have not lapsed."""
    active = s.execute(
        select(func.count()).select_from(MembershipAllocation).where(
            MembershipAllocation.kind == kind, MembershipAllocation.status == "active"
        )
    ).scalar() or 0
    reserved = s.execute(
        select(func.count()).select_from(MembershipAllocation).where(
            MembershipAllocation.kind == kind,
            MembershipAllocation.status == "reserved",
            MembershipAllocation.reserved_until > now,
        )
    ).scalar() or 0
    return active + reserved


def _open_allocation(s, user_id: str) -> MembershipAllocation | None:
    return s.execute(
        select(MembershipAllocation).where(
            MembershipAllocation.user_id == user_id, MembershipAllocation.status != "released"
        )
    ).scalar_one_or_none()


def _is_live(alloc: MembershipAllocation, now: datetime) -> bool:
    if alloc.status == "active":
        return True
    return alloc.status == "reserved" and (_aware(alloc.reserved_until) or now) > now


# ---------- allocation (each call is one locked transaction) ----------

def reserve(user_id: str, kind: str = PAID) -> MembershipAllocation:
    """Hold a place while the user completes a Stripe checkout.

    Idempotent: a user who already holds a place (active, or a reservation)
    keeps it — a live reservation is extended, nothing new is taken.
    Raises CapacityFull when no place is left."""
    now = _now()
    with db.SessionLocal() as s:
        settings = _settings(s, lock=True)
        until = now + timedelta(minutes=settings.reservation_minutes)
        alloc = _open_allocation(s, user_id)
        if alloc is not None and alloc.status == "active":
            return alloc
        if alloc is not None and _is_live(alloc, now):
            alloc.reserved_until = until
            s.commit()
            return alloc
        if alloc is not None:  # a lapsed reservation: free it, then take a place afresh
            _release_row(alloc, now, "Checkout reservation expired.")
            s.flush()
        if _occupied(s, kind, now) >= _capacity(settings, kind):
            s.rollback()
            raise CapacityFull(kind)
        alloc = MembershipAllocation(
            user_id=user_id, kind=kind, source="stripe", status="reserved", reserved_until=until
        )
        s.add(alloc)
        s.commit()
        return alloc


def activate(user_id: str, kind: str, source: str, force: bool = False) -> MembershipAllocation:
    """Give the user an active place (access was granted).

    Idempotent: an active place stays as it is (a renewal takes nothing new);
    a reservation becomes active without being counted twice.
    `force=True` is for access that is already paid for (a completed Stripe
    payment, or a subscriber from before capacity existed): it never refuses,
    and flags the row `over_capacity` when the places were already gone.
    Without force, raises CapacityFull when no place is left."""
    assert kind in KINDS, kind
    now = _now()
    with db.SessionLocal() as s:
        settings = _settings(s, lock=True)
        alloc = _open_allocation(s, user_id)
        if alloc is not None and alloc.status == "active" and alloc.kind == kind:
            if alloc.source != source:
                alloc.source = source
                s.commit()
            return alloc
        if alloc is not None and alloc.kind == kind and _is_live(alloc, now):
            # A live reservation of the same kind already counts: just activate it.
            alloc.status = "active"
            alloc.source = source
            alloc.reserved_until = None
            alloc.activated_at = now
            s.commit()
            return alloc
        if alloc is not None:  # lapsed reservation, or switching kind (comp -> paid)
            _release_row(alloc, now, "Replaced by a new place.")
            s.flush()
        over = _occupied(s, kind, now) >= _capacity(settings, kind)
        if over and not force:
            s.rollback()
            raise CapacityFull(kind)
        if over:
            log.warning("place granted over capacity: user=%s kind=%s source=%s", user_id, kind, source)
        alloc = MembershipAllocation(
            user_id=user_id, kind=kind, source=source, status="active",
            activated_at=now, over_capacity=over,
        )
        s.add(alloc)
        s.commit()
        return alloc


def _release_row(alloc: MembershipAllocation, now: datetime, reason: str) -> None:
    alloc.status = "released"
    alloc.released_at = now
    alloc.release_reason = (reason or "")[:200]


def release(user_id: str, reason: str) -> bool:
    """Free the user's place (their access ended). True when a place was freed."""
    now = _now()
    with db.SessionLocal() as s:
        _settings(s, lock=True)
        alloc = _open_allocation(s, user_id)
        if alloc is None:
            return False
        _release_row(alloc, now, reason)
        s.commit()
        return True


def holds_place(user_id: str, kind: str = PAID) -> bool:
    """The user already holds an active place of `kind`."""
    with db.SessionLocal() as s:
        alloc = _open_allocation(s, user_id)
        return alloc is not None and alloc.status == "active" and alloc.kind == kind


def has_room(kind: str = PAID) -> bool:
    """A place of `kind` is free right now (an advisory pre-check; the
    authoritative check is the locked one inside activate/reserve)."""
    now = _now()
    with db.SessionLocal() as s:
        settings = _settings(s)
        return _occupied(s, kind, now) < _capacity(settings, kind)


# ---------- entitlement (what the authoritative records say) ----------

def _entitlement(s, user_id: str) -> tuple[str, str] | None:
    """(kind, source) of the place this user should hold, or None.

    Authoritative records only: the Stripe subscriptions row (written by the
    webhook) and the manual grants table. The owner and deleted accounts
    hold no place. Every manual grant is a paid in-person membership today;
    complimentary grants arrive with the manual-enrollment step."""
    import billing  # local import: billing imports this module lazily too

    if billing.is_owner(user_id):
        return None
    user = s.get(User, user_id)
    if user is None or user.deleted_at is not None:
        return None
    if billing._row_is_subscribed(s.get(Subscription, user_id)):
        return (PAID, "stripe")
    grant = s.get(ManualGrant, user_id)
    if grant is not None and grant.revoked_at is None:
        if is_placeholder_email(user.email):
            return (PAID, PLACEHOLDER)
        return (PAID, "manual")
    return None


def is_placeholder_email(email: str | None) -> bool:
    return bool(email) and email.strip().lower().endswith(RESERVED_EMAIL_SUFFIX)


def sync_user(user_id: str, force: bool = True) -> str:
    """Bring one user's place in line with their entitlement. Called after
    every change to a subscription row or a manual grant. Returns what it
    did ("activated", "kept", "released", "none"). Never raises for a
    capacity problem when force=True (access already granted)."""
    with db.SessionLocal() as s:
        want = _entitlement(s, user_id)
        alloc = _open_allocation(s, user_id)
        now = _now()
        live_reservation = alloc is not None and alloc.status == "reserved" and _is_live(alloc, now)
    if want is None:
        if alloc is not None and not live_reservation:
            release(user_id, "Access ended.")
            return "released"
        return "none"
    kind, source = want
    if alloc is not None and alloc.status == "active" and alloc.kind == kind and alloc.source == source:
        return "kept"
    activate(user_id, kind, source, force=force)
    return "activated"


def sync_user_safely(user_id: str) -> None:
    """sync_user for call sites that must never fail because of capacity
    bookkeeping (the Stripe webhook): errors are logged, and the next
    reconcile() repairs the allocation."""
    try:
        sync_user(user_id)
    except Exception:
        log.exception("enrollment sync failed for user %s (reconcile will repair it)", user_id)


def reconcile() -> dict:
    """Re-derive every allocation from the authoritative records.

    Gives a place to every entitled member who lacks one (forced: they have
    access already), frees the place of everyone whose access ended, and
    frees lapsed checkout reservations. Safe to run any time; idempotent."""
    now = _now()
    report = {"activated": 0, "released": 0, "reservations_expired": 0}
    with db.SessionLocal() as s:
        candidates = set(s.execute(select(Subscription.user_id)).scalars())
        candidates |= set(s.execute(select(ManualGrant.user_id)).scalars())
        candidates |= set(
            s.execute(
                select(MembershipAllocation.user_id).where(MembershipAllocation.status != "released")
            ).scalars()
        )
        lapsed = [
            a.user_id
            for a in s.execute(
                select(MembershipAllocation).where(MembershipAllocation.status == "reserved")
            ).scalars()
            if not _is_live(a, now)
        ]
    for user_id in lapsed:
        with db.SessionLocal() as s:
            want = _entitlement(s, user_id)
        if want is None and release(user_id, "Checkout reservation expired."):
            report["reservations_expired"] += 1
    for user_id in sorted(candidates):
        result = sync_user(user_id)
        if result == "activated":
            report["activated"] += 1
        elif result == "released":
            report["released"] += 1
    if any(report.values()):
        log.info("enrollment reconcile: %s", report)
    return report


# ---------- read models ----------

def summary() -> dict:
    """Everything the admin panel shows about capacity."""
    now = _now()
    with db.SessionLocal() as s:
        settings = _settings(s)
        s.commit()

        def count(*conds):
            return s.execute(
                select(func.count()).select_from(MembershipAllocation).where(*conds)
            ).scalar() or 0

        paid_active = count(MembershipAllocation.kind == PAID, MembershipAllocation.status == "active")
        paid_online = count(
            MembershipAllocation.kind == PAID, MembershipAllocation.status == "active",
            MembershipAllocation.source == "stripe",
        )
        paid_manual = count(
            MembershipAllocation.kind == PAID, MembershipAllocation.status == "active",
            MembershipAllocation.source == "manual",
        )
        paid_placeholder = count(
            MembershipAllocation.kind == PAID, MembershipAllocation.status == "active",
            MembershipAllocation.source == PLACEHOLDER,
        )
        paid_reserved = count(
            MembershipAllocation.kind == PAID, MembershipAllocation.status == "reserved",
            MembershipAllocation.reserved_until > now,
        )
        over = count(MembershipAllocation.status == "active", MembershipAllocation.over_capacity.is_(True))
        comp_active = count(MembershipAllocation.kind == COMPLIMENTARY, MembershipAllocation.status == "active")
        released = count(MembershipAllocation.status == "released")
        paid_occupied = paid_active + paid_reserved
        return {
            "paid_capacity": settings.paid_capacity,
            "paid_occupied": paid_occupied,
            "paid_available": max(0, settings.paid_capacity - paid_occupied),
            "paid_active": paid_active,
            "paid_online": paid_online,
            "paid_manual": paid_manual,
            # Places held by Spencer's placeholder accounts: taken, not members.
            "paid_placeholder": paid_placeholder,
            # Real paying members holding a place (online + in person).
            "paid_members": paid_online + paid_manual,
            "paid_reserved": paid_reserved,
            "over_capacity": over,
            "comp_capacity": settings.comp_capacity,
            "comp_active": comp_active,
            "comp_available": max(0, settings.comp_capacity - comp_active),
            "released_total": released,
            "reservation_minutes": settings.reservation_minutes,
        }


def public_availability() -> dict:
    """The public counter's numbers: paid places only, never complimentary.
    On any database trouble the numbers are withheld (`available` None), so
    the site shows a neutral message instead of a made-up count."""
    try:
        data = summary()
        return {
            "capacity": data["paid_capacity"],
            "available": data["paid_available"],
            "taken": data["paid_occupied"],
        }
    except Exception:
        log.exception("public availability unavailable")
        return {"capacity": None, "available": None, "taken": None}


def update_settings(paid_capacity: int | None = None, comp_capacity: int | None = None) -> tuple[dict, dict]:
    """Change the capacities. A capacity may not go below the places already
    taken (that would oversell on paper). Returns (before, after)."""
    now = _now()
    with db.SessionLocal() as s:
        settings = _settings(s, lock=True)
        before = {"paid_capacity": settings.paid_capacity, "comp_capacity": settings.comp_capacity}
        for kind, value in ((PAID, paid_capacity), (COMPLIMENTARY, comp_capacity)):
            if value is None:
                continue
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= MAX_CAPACITY:
                raise ValueError(f"{kind} capacity must be a whole number from 0 to {MAX_CAPACITY:,}.")
            taken = _occupied(s, kind, now)
            if value < taken:
                raise ValueError(f"{kind.capitalize()} capacity cannot be below the {taken:,} places already taken.")
            if kind == PAID:
                settings.paid_capacity = value
            else:
                settings.comp_capacity = value
        after = {"paid_capacity": settings.paid_capacity, "comp_capacity": settings.comp_capacity}
        s.commit()
        return before, after
