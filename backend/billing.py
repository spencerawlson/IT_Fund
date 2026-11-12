"""Stripe subscription billing: $19/mo for premium access.

Free tier (no payment): 5 sample lessons, 57 flashcards, 2 labs, all marketing pages.
Everything else requires an active subscription.

Env vars (never hardcoded):
  STRIPE_SECRET_KEY     — Stripe secret key (sk_...). If unset, billing endpoints 503.
  STRIPE_WEBHOOK_SECRET — signing secret for /billing/webhook (whsec_...).
  STRIPE_PRICE_ID       — the $19/mo recurring Price id (price_...).
  BILLING_APP_URL       — where to send users after checkout/cancel (default: https://www.road2cissp.com).
  BILLING_OWNER_EMAILS  — comma-separated emails with full access, never billed (the owner's accounts).

Subscription state lives in the `subscriptions` table and is written ONLY by the
Stripe webhook — client input is never trusted for access decisions. Gate premium
content with is_subscribed(user_id): True when status is "active" or "trialing"
and the current period has not provably ended (see _row_is_subscribed), or when
status is "past_due" and the 7-day grace from past_due_since has not expired.

Refund / failed-payment policy (published on Pricing and in Terms):
  - 14-day money-back on a FIRST subscription; after that, refunds are
    case-by-case — a human decides, the code does not. The code enforces the
    consequence of a refund, not the decision: a fully-refunded subscription
    charge (charge.refunded) revokes access and cancels the Stripe
    subscription, so nobody keeps paying after a refund. Partial refunds
    change nothing automatically.
  - past_due gets a 7-day grace before access is revoked (PAST_DUE_GRACE).
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func

import db
from auth.deps import require_user_id
from db_models import ProcessedWebhookEvent, Subscription

log = logging.getLogger("billing")

router = APIRouter(prefix="/billing", tags=["billing"])

#: Stripe subscription statuses that count as "subscribed" for gating.
ACTIVE_STATUSES = {"active", "trialing"}

BILLING_UNAVAILABLE = "Billing is not configured yet. Set STRIPE_SECRET_KEY to enable subscriptions."


def _stripe():
    """Return the configured stripe module, or None when STRIPE_SECRET_KEY is unset."""
    key = os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        return None
    import stripe

    stripe.api_key = key
    # Fail fast on network trouble: without this, a blackholed route (e.g. broken
    # IPv6 on the host) hangs checkout for minutes instead of erroring in seconds.
    try:
        stripe.default_http_client = stripe.http_client.RequestsClient(timeout=10)
    except Exception:
        pass
    return stripe


def _require_stripe():
    stripe = _stripe()
    if stripe is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=BILLING_UNAVAILABLE,
        )
    return stripe


def _owner_emails() -> set[str]:
    """Email addresses that always have full access (the owner's accounts)."""
    raw = os.environ.get("BILLING_OWNER_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _user_email(user_id: str) -> str | None:
    try:
        with db.SessionLocal() as s:
            from db_models import User

            user = s.get(User, user_id)
            return user.email.lower() if user and user.email else None
    except Exception:
        return None


def is_owner(user_id: str) -> bool:
    """True when the user is the site owner (full access, never billed)."""
    email = _user_email(user_id)
    return bool(email and email in _owner_emails())


#: Clock-skew grace added to current_period_end in _row_is_subscribed().
#: Stripe keeps status "active" until period end, so this only catches rows
#: whose period provably ended without a status update (e.g. a missed
#: webhook) — it never revokes anyone early.
CLOCK_SKEW_GRACE = timedelta(minutes=5)

#: Grace after a failed renewal: a past_due subscription keeps access for 7
#: days from the day it went past_due, so a failed card (or a slow bank) does
#: not lock a learner out instantly. Anchored at past_due_since — NOT at
#: current_period_end, which Stripe advances to the end of the new (unpaid)
#: period when a renewal fails, so anchoring there would grant a full extra
#: month of free access.
PAST_DUE_GRACE = timedelta(days=7)


def _row_is_subscribed(row: Subscription | None) -> bool:
    """True when a subscriptions row grants access: status active/trialing
    AND the current period has not ended (plus a small clock-skew grace);
    or status past_due AND the 7-day grace from past_due_since has not
    expired. A missing period end (legacy row) falls back to the status
    alone; a past_due row with no past_due_since (legacy row, never synced
    since the anchor shipped) fails closed — the grace cannot be measured.
    """
    if row is None:
        return False
    if row.status in ACTIVE_STATUSES:
        end = row.current_period_end
        if end is None:
            return True
        if end.tzinfo is None:  # SQLite returns naive datetimes; treat them as UTC
            end = end.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < end + CLOCK_SKEW_GRACE
    if row.status == "past_due":
        since = row.past_due_since
        if since is None:
            return False
        if since.tzinfo is None:  # SQLite returns naive datetimes; treat them as UTC
            since = since.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < since + PAST_DUE_GRACE
    return False


def is_subscribed(user_id: str) -> bool:
    """True when the user has an active (or trialing) subscription whose
    current period has not ended. Never raises."""
    if is_owner(user_id):
        return True
    try:
        with db.SessionLocal() as s:
            row = s.get(Subscription, user_id)
            return _row_is_subscribed(row)
    except Exception:  # fail closed on DB trouble, but don't take the app down
        log.exception("is_subscribed check failed for user %s", user_id)
        return False


def _get_or_create_customer(stripe, user_id: str, email: str | None) -> str:
    """Return the Stripe customer id for this user, creating one on first use."""
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
        if row and row.stripe_customer_id:
            return row.stripe_customer_id
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id},
        )
        s.merge(
            Subscription(
                user_id=user_id,
                stripe_customer_id=customer.id,
                status=row.status if row else "incomplete",
                stripe_subscription_id=row.stripe_subscription_id if row else None,
                current_period_end=row.current_period_end if row else None,
            )
        )
        s.commit()
        return customer.id


def _sync_from_subscription(user_id: str, sub, event_created: datetime | None = None) -> None:
    """Upsert the subscriptions row from a Stripe Subscription object (webhook source of truth).

    `event_created` is the webhook event's own timestamp: when the new status
    is past_due it becomes past_due_since — the anchor of the 7-day grace.
    It is set only on the transition INTO past_due (or when a legacy row has
    no anchor yet); later updated events while past_due must NOT reset it,
    or the grace would never expire. Leaving past_due clears it.
    """
    period_end = sub.get("current_period_end")
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
        if row is None:
            row = Subscription(user_id=user_id, stripe_customer_id=sub["customer"])
            s.add(row)
        was_past_due = row.status == "past_due"
        row.stripe_customer_id = sub["customer"]
        row.stripe_subscription_id = sub["id"]
        row.status = sub["status"]
        row.current_period_end = (
            datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None
        )
        if sub["status"] == "past_due":
            if not was_past_due or row.past_due_since is None:
                row.past_due_since = event_created or datetime.now(timezone.utc)
        else:
            row.past_due_since = None
        # Phase 3: copy the campaign tag from the Subscription metadata
        # into the account record — first-touch only. The subscription
        # object carries the tag (subscription_data at Checkout
        # creation), so a webhook that never saw the landing page can
        # still record how the subscriber arrived. A tag already on the
        # account is never overwritten. No capture time is set here: the
        # webhook carries no capture time, and the tag arrived via
        # Stripe, not a landing capture.
        tag = (sub.get("metadata") or {}).get("ventoryn_tag")
        if tag and _ATTRIBUTION_TAG_RE.match(tag):
            from db_models import User

            user = s.get(User, user_id)
            if user is not None and not user.attribution_tag:
                user.attribution_tag = tag
        s.commit()
    log.info("subscription synced: user=%s status=%s", user_id, sub["status"])


#: Shown when the live Stripe price can't be read (local dev / billing unconfigured).
#: The frontend uses this so the page never renders a blank or wrong price.
PRICE_FALLBACK = {"configured": False, "display": "$19", "interval": "month"}

#: Shape Ventoryn signs into a campaign link's utm_content param
#: (ventoryn/signature.py: make_tag). Road to CISSP has no way to
#: verify the signature itself (that key lives in Ventoryn) — it
#: only ever passes through a tag that already matches Ventoryn's
#: own shape, validated here, never trusted as proof by itself.
_ATTRIBUTION_TAG_RE = re.compile(r"^vtn_[A-Za-z0-9_.-]{1,120}$")


#: Road to CISSP's site id on Ventoryn. Every Checkout carries it so
#: Ventoryn counts the sale as a paying customer (unattributed unless a
#: campaign tag rides along). VENTORYN_SITE_ID overrides it; "off" (or
#: anything that is not 24 hex chars) turns the metadata off.
VENTORYN_SITE_ID_DEFAULT = "418e926be25e251d95badb9e"
_VENTORYN_SITE_ID_RE = re.compile(r"^[0-9a-f]{24}$")


def _ventoryn_site_id() -> str | None:
    site_id = os.environ.get("VENTORYN_SITE_ID", VENTORYN_SITE_ID_DEFAULT).strip()
    return site_id if _VENTORYN_SITE_ID_RE.match(site_id) else None


def _attribution_metadata(attribution_tag: str | None) -> dict:
    """Ventoryn metadata for a Checkout Session: the site id always
    (unless turned off), plus the campaign tag when it is present and
    well-formed. Never blocks or alters checkout itself."""
    site_id = _ventoryn_site_id()
    if not site_id:
        return {}
    meta = {"ventoryn_site_id": site_id}
    if attribution_tag and _ATTRIBUTION_TAG_RE.match(attribution_tag):
        meta["ventoryn_tag"] = attribution_tag
    return meta


#: Attribution window (decision D3): a stored campaign tag attributes a
#: checkout only within 30 days of capture. Enforced server-side from
#: users.attribution_captured_at; no browser timestamp is trusted.
ATTRIBUTION_WINDOW = timedelta(days=30)


def _stored_tag_is_fresh(user, now: datetime) -> bool:
    """True when the user's stored tag may still attribute a checkout:
    captured within the 30-day window. A legacy row with a tag but no
    captured_at (PR #37 shipped before the timestamp existed) is
    treated as fresh — it is at most a few days old, and first-touch
    preservation wins over guessing an expiry. SQLite returns naive
    datetimes; treat them as UTC."""
    if not user.attribution_tag:
        return False
    if user.attribution_captured_at is None:
        return True
    captured = user.attribution_captured_at
    if captured.tzinfo is None:
        captured = captured.replace(tzinfo=timezone.utc)
    return now - captured <= ATTRIBUTION_WINDOW


def _record_attribution(user_id: str, attribution_tag: str) -> None:
    """First-touch only: a user's recorded tag is never overwritten by a
    later visit through a different campaign — except when the stored
    tag is older than the 30-day window, in which case a fresh capture
    replaces it (the old campaign no longer owns the visit). The capture
    time is recorded alongside the tag so the window can be enforced
    server-side. Recorded regardless of whether VENTORYN_SITE_ID is
    configured — it is Road to CISSP's own record of how the visitor
    arrived, independent of whether the Stripe metadata pass-through to
    Ventoryn is turned on."""
    if not _ATTRIBUTION_TAG_RE.match(attribution_tag):
        return
    now = datetime.now(timezone.utc)
    with db.SessionLocal() as s:
        from db_models import User

        user = s.get(User, user_id)
        if user is None:
            return
        if user.attribution_tag and _stored_tag_is_fresh(user, now):
            return  # first-touch preserved
        user.attribution_tag = attribution_tag
        user.attribution_captured_at = now
        s.commit()


def _format_price(unit_amount: int | None, currency: str) -> str:
    """Cents + currency -> a compact display string: 1900/usd -> "$19", 999 -> "$9.99"."""
    if unit_amount is None:
        return ""
    symbol = {"usd": "$", "eur": "€", "gbp": "£"}.get((currency or "").lower(), "")
    dollars = unit_amount / 100
    body = f"{dollars:.0f}" if unit_amount % 100 == 0 else f"{dollars:.2f}"
    return f"{symbol}{body}"


@router.get("/price")
def plan_price() -> dict:
    """Public: the live subscription price from Stripe, so the page, the structured
    data, and the actual charge share one source. Falls back (never errors) when
    Stripe isn't configured, so the pricing page always renders."""
    stripe = _stripe()
    price_id = os.environ.get("STRIPE_PRICE_ID")
    if stripe is None or not price_id:
        return dict(PRICE_FALLBACK)
    try:
        price = stripe.Price.retrieve(price_id)
        unit = price.get("unit_amount")
        currency = price.get("currency", "usd")
        interval = (price.get("recurring") or {}).get("interval", "month")
        return {
            "configured": True,
            "unit_amount": unit,
            "currency": currency,
            "interval": interval,
            "display": _format_price(unit, currency),
        }
    except Exception:  # network/stripe error — fall back rather than break the page
        log.exception("plan_price: could not read Stripe price %s", price_id)
        return dict(PRICE_FALLBACK)


@router.post("/checkout")
async def create_checkout(request: Request,
                          user_id: str = Depends(require_user_id)) -> dict:
    """Create a Stripe Checkout Session in subscription mode. Returns { checkout_url }.
    An optional JSON body ``{"attribution_tag": "vtn_..."}`` carries a
    Ventoryn campaign tag captured on the landing page; it is validated
    for shape and passed through to Stripe metadata (see
    _attribution_metadata) — never trusted as proof of attribution by
    itself, and never required for checkout to work."""
    stripe = _require_stripe()
    price_id = os.environ.get("STRIPE_PRICE_ID")
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured yet. Set STRIPE_PRICE_ID to enable subscriptions.",
        )
    attribution_tag = None
    try:
        body = await request.json()
        raw_tag = (body or {}).get("attribution_tag")
        if isinstance(raw_tag, str) and _ATTRIBUTION_TAG_RE.match(raw_tag):
            attribution_tag = raw_tag
    except Exception:
        pass  # no body, or not JSON — attribution is optional
    if is_subscribed(user_id):
        # Already paying: never open a second Checkout Session (a second
        # live subscription would double-charge while the single
        # subscriptions row tracks only the newest). Manage/cancel via the
        # Customer Portal instead.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already subscribed. Manage your subscription in the Customer Portal.",
        )
    app_url = os.environ.get("BILLING_APP_URL", "https://www.road2cissp.com").rstrip("/")
    with db.SessionLocal() as s:
        from db_models import User

        user = s.get(User, user_id)
        email = user.email if user else None
        # Fallback chain (decision D3): the tag that rides to Stripe is
        # the request tag when one arrives, else the stored account tag
        # when it is still inside the 30-day window, else none — so a
        # tag captured on one device still attributes a checkout from
        # another. The subscription's attribution is the tag on that
        # subscription's metadata; the DB record is the account-level
        # fallback.
        stored_tag = user.attribution_tag if user else None
        stored_fresh = bool(user) and _stored_tag_is_fresh(user, datetime.now(timezone.utc))
    effective_tag = attribution_tag or (stored_tag if stored_fresh else None)
    # Record the capture BEFORE creating the Stripe session: a DB failure
    # here fails checkout cleanly with no session created, instead of
    # losing the checkout URL after the session already exists.
    if attribution_tag:
        _record_attribution(user_id, attribution_tag)
    customer_id = _get_or_create_customer(stripe, user_id, email)
    attribution_meta = _attribution_metadata(effective_tag)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{app_url}/app?subscribed=1",
        cancel_url=f"{app_url}/pricing",
        metadata={"user_id": user_id, **attribution_meta},
        # Put user_id (and the attribution metadata) on the Subscription
        # object itself, so subscription events are self-describing and do
        # not depend on the customer-ID fallback lookup.
        subscription_data={"metadata": {"user_id": user_id, **attribution_meta}},
        # Double-submit safety: same user + price retries the same Session
        # instead of creating a second one.
        idempotency_key=f"checkout:{user_id}:{price_id}",
    )
    return {"checkout_url": session.url}


@router.get("/status")
def subscription_status(user_id: str = Depends(require_user_id)) -> dict:
    """Return the caller's subscription state for the frontend paywall.
    A local DB read only — it must not depend on Stripe being configured
    or reachable."""
    if is_owner(user_id):
        return {"subscribed": True, "status": "owner", "current_period_end": None}
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
    if row is None:
        return {"subscribed": False, "status": "none", "current_period_end": None}
    return {
        "subscribed": _row_is_subscribed(row),
        "status": row.status,
        "current_period_end": row.current_period_end.isoformat() if row.current_period_end else None,
    }


@router.post("/portal")
def customer_portal(user_id: str = Depends(require_user_id)) -> dict:
    """Create a Stripe Customer Portal session for self-serve manage/cancel. Returns { portal_url }."""
    stripe = _require_stripe()
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No billing customer yet. Subscribe first.",
        )
    app_url = os.environ.get("BILLING_APP_URL", "https://www.road2cissp.com").rstrip("/")
    session = stripe.billing_portal.Session.create(
        customer=row.stripe_customer_id,
        return_url=f"{app_url}/signin",
    )
    return {"portal_url": session.url}


def _event_created_dt(event: dict) -> datetime | None:
    """Stripe event `created` (unix seconds) as an aware datetime, or None
    when the event carries no usable timestamp."""
    created = event.get("created")
    if not isinstance(created, (int, float)):
        return None
    try:
        return datetime.fromtimestamp(created, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def _is_event_processed(stripe_event_id: str) -> bool:
    """True when this Stripe event id was already applied. A DB error here
    fails open (returns False) — the dispatch below will fail the same way
    and the webhook returns 503, so Stripe redelivers."""
    try:
        with db.SessionLocal() as s:
            return s.get(ProcessedWebhookEvent, stripe_event_id) is not None
    except Exception:
        log.exception("processed-event lookup failed for %s", stripe_event_id)
        return False


def _last_applied_event_created(stripe_subscription_id: str) -> datetime | None:
    """Newest `event.created` among the events applied for this
    subscription, or None when none was applied yet."""
    with db.SessionLocal() as s:
        latest = (
            s.query(func.max(ProcessedWebhookEvent.event_created))
            .filter(ProcessedWebhookEvent.stripe_subscription_id == stripe_subscription_id)
            .scalar()
        )
    if latest is not None and latest.tzinfo is None:  # SQLite returns naive datetimes
        latest = latest.replace(tzinfo=timezone.utc)
    return latest


def _record_processed_event(
    stripe_event_id: str,
    stripe_subscription_id: str,
    event_type: str,
    event_created: datetime | None,
) -> None:
    """Persist an applied event id. Called only after the state change is
    durably committed, so a failure here (503) makes Stripe redeliver an
    event whose re-apply is a harmless upsert."""
    with db.SessionLocal() as s:
        s.merge(
            ProcessedWebhookEvent(
                stripe_event_id=stripe_event_id,
                stripe_subscription_id=stripe_subscription_id,
                event_type=event_type,
                event_created=event_created,
            )
        )
        s.commit()


def _revoke_for_refund(stripe, charge: dict) -> str | None:
    """Handle a fully-refunded subscription charge (charge.refunded).

    A FULL refund of a subscription invoice revokes access AND cancels the
    Stripe subscription, so the learner is not billed again next month for a
    subscription they were refunded for. Returns the subscription id
    revoked, or None when nothing was done.

    Partial refunds change nothing automatically (case-by-case by policy).
    A charge with no subscription invoice (this product sells no one-off
    charges) is logged and left alone. The revoke only applies when the
    invoice's subscription is the one the row currently tracks — so a refund
    for an OLD subscription cannot revoke a NEW one if the learner
    resubscribed since. Re-delivery is safe: a row already canceled fails
    the status guard and is skipped.
    """
    amount = charge.get("amount") or 0
    refunded = charge.get("amount_refunded") or 0
    charge_id = charge.get("id")
    if refunded < amount:
        log.info(
            "partial refund for charge %s (%s of %s refunded); access unchanged",
            charge_id, refunded, amount,
        )
        return None
    invoice_id = charge.get("invoice")
    sub_id = None
    if invoice_id:
        invoice = stripe.Invoice.retrieve(invoice_id)
        sub_id = (
            invoice.get("subscription")
            if isinstance(invoice, dict)
            else getattr(invoice, "subscription", None)
        )
    if not sub_id:
        log.info("refunded charge %s has no subscription invoice; access unchanged", charge_id)
        return None
    with db.SessionLocal() as s:
        row = (
            s.query(Subscription)
            .filter(Subscription.stripe_subscription_id == sub_id)
            .first()
        )
        if row is None or row.status not in ("active", "trialing", "past_due"):
            log.info(
                "refunded charge %s: subscription %s not active (row=%s); nothing to revoke",
                charge_id, sub_id, row.status if row else None,
            )
            return None
    # Cancel in Stripe BEFORE revoking locally: a failure here 503s and
    # Stripe redelivers with nothing changed. A subscription already ended
    # in Stripe (a redelivery after a successful cancel) is not an error —
    # the local revoke below still applies.
    try:
        stripe.Subscription.cancel(sub_id)
    except Exception as exc:  # noqa: BLE001 — Stripe error shape varies by version
        message = str(exc).lower()
        if "canceled" in message or "cancelled" in message or "no such subscription" in message:
            log.info("subscription %s already ended in Stripe; proceeding with local revoke", sub_id)
        else:
            raise
    with db.SessionLocal() as s:
        row = (
            s.query(Subscription)
            .filter(Subscription.stripe_subscription_id == sub_id)
            .first()
        )
        if row is not None and row.status in ("active", "trialing", "past_due"):
            row.status = "canceled"
            row.current_period_end = datetime.now(timezone.utc)
            row.past_due_since = None
            s.commit()
    log.info("subscription %s revoked after full refund of charge %s", sub_id, charge_id)
    return sub_id


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Stripe event webhook. No auth — the signature is the auth.

    Returns 200 only after the state change is durably committed (or for
    events that are deterministically unprocessable, e.g. an unknown
    customer after the fallback lookup). Transient failures — Stripe API
    or DB errors inside the dispatch — return 503 so Stripe redelivers
    with backoff instead of the payment silently never activating.
    Duplicate deliveries (same event id) and stale events (older than the
    last-applied event for that subscription) are acknowledged with 200
    without re-applying.
    """
    stripe = _stripe()
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if stripe is None or not webhook_secret:
        log.warning("webhook received but billing is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=BILLING_UNAVAILABLE,
        )
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
    except Exception as exc:  # bad signature or malformed payload
        log.warning("webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    etype = event["type"]
    event_id = event.get("id")
    event_created = _event_created_dt(event)
    log.info("webhook event: %s", etype)

    # Idempotency: Stripe may deliver the same event more than once.
    if event_id and _is_event_processed(event_id):
        log.info("webhook event %s already processed; skipping", event_id)
        return {"received": True}

    # Ordering: ignore events older than the last-applied event for the
    # same subscription, so a delayed updated(active) cannot resurrect a
    # subscription that a newer deleted(canceled) already cancelled.
    data_object = (event.get("data") or {}).get("object") or {}
    sub_id_for_ordering = None
    if etype == "checkout.session.completed":
        sub_id_for_ordering = data_object.get("subscription")
    elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
        sub_id_for_ordering = data_object.get("id")
    if event_created is not None and sub_id_for_ordering:
        try:
            last_applied = _last_applied_event_created(sub_id_for_ordering)
        except Exception:
            log.exception("webhook ordering check failed for event %s", etype)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Webhook handler failed; Stripe will retry.",
            )
        if last_applied is not None and event_created < last_applied:
            log.info(
                "stale webhook event %s (%s) for subscription %s; last applied %s — skipping",
                event_id,
                etype,
                sub_id_for_ordering,
                last_applied,
            )
            return {"received": True}

    try:
        applied_sub_id: str | None = None
        if etype == "checkout.session.completed":
            session_obj = data_object
            user_id = (session_obj.get("metadata") or {}).get("user_id")
            sub_id = session_obj.get("subscription")
            if user_id and sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                _sync_from_subscription(user_id, sub, event_created)
                applied_sub_id = sub_id
            else:
                log.warning("checkout.session.completed without user_id/subscription metadata")
        elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
            sub = data_object
            user_id = (sub.get("metadata") or {}).get("user_id")
            if not user_id:
                # Fall back to the customer mapping when metadata is absent.
                with db.SessionLocal() as s:
                    row = (
                        s.query(Subscription)
                        .filter(Subscription.stripe_customer_id == sub["customer"])
                        .first()
                    )
                    user_id = row.user_id if row else None
            if user_id:
                _sync_from_subscription(user_id, sub, event_created)
                applied_sub_id = sub["id"]
            else:
                # Deterministically unprocessable: no row to attach this
                # subscription to. Acknowledge (retrying would not help)
                # and leave the trace in the logs.
                log.warning("subscription event for unknown customer %s", sub.get("customer"))
        elif etype == "charge.refunded":
            # No subscription id on the event itself — the invoice lookup
            # inside _revoke_for_refund finds it, and the status guard there
            # keeps a stale refund from revoking a resubscription.
            applied_sub_id = _revoke_for_refund(stripe, data_object)
        # Other event types are acknowledged and ignored.
        if event_id and applied_sub_id:
            _record_processed_event(event_id, applied_sub_id, etype, event_created)
    except HTTPException:
        raise
    except Exception:
        log.exception("webhook handler failed for event %s", etype)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook handler failed; Stripe will retry.",
        )
    return {"received": True}
