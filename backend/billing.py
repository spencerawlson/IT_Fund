"""Stripe subscription billing: $19/mo for premium access.

Free tier (no payment): 1 sample lesson, 50 flashcards, 1 lab, all marketing pages.
Everything else requires an active subscription.

Env vars (never hardcoded):
  STRIPE_SECRET_KEY     — Stripe secret key (sk_...). If unset, billing endpoints 503.
  STRIPE_WEBHOOK_SECRET — signing secret for /billing/webhook (whsec_...).
  STRIPE_PRICE_ID       — the $19/mo recurring Price id (price_...).
  BILLING_APP_URL       — where to send users after checkout/cancel (default: https://www.road2cissp.com).

Subscription state lives in the `subscriptions` table and is written ONLY by the
Stripe webhook — client input is never trusted for access decisions. Gate premium
content with is_subscribed(user_id): True when status is "active" or "trialing".
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

import db
from auth.deps import require_user_id
from db_models import Subscription

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
    return stripe


def _require_stripe():
    stripe = _stripe()
    if stripe is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=BILLING_UNAVAILABLE,
        )
    return stripe


def is_subscribed(user_id: str) -> bool:
    """True when the user has an active (or trialing) subscription. Never raises."""
    try:
        with db.SessionLocal() as s:
            row = s.get(Subscription, user_id)
            return bool(row and row.status in ACTIVE_STATUSES)
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


def _sync_from_subscription(user_id: str, sub) -> None:
    """Upsert the subscriptions row from a Stripe Subscription object (webhook source of truth)."""
    period_end = sub.get("current_period_end")
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
        if row is None:
            row = Subscription(user_id=user_id, stripe_customer_id=sub["customer"])
            s.add(row)
        row.stripe_customer_id = sub["customer"]
        row.stripe_subscription_id = sub["id"]
        row.status = sub["status"]
        row.current_period_end = (
            datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None
        )
        s.commit()
    log.info("subscription synced: user=%s status=%s", user_id, sub["status"])


@router.post("/checkout")
def create_checkout(user_id: str = Depends(require_user_id)) -> dict:
    """Create a Stripe Checkout Session in subscription mode. Returns { checkout_url }."""
    stripe = _require_stripe()
    price_id = os.environ.get("STRIPE_PRICE_ID")
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured yet. Set STRIPE_PRICE_ID to enable subscriptions.",
        )
    app_url = os.environ.get("BILLING_APP_URL", "https://www.road2cissp.com").rstrip("/")
    with db.SessionLocal() as s:
        from db_models import User

        user = s.get(User, user_id)
        email = user.email if user else None
    customer_id = _get_or_create_customer(stripe, user_id, email)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{app_url}/app?subscribed=1",
        cancel_url=f"{app_url}/pricing",
        metadata={"user_id": user_id},
    )
    return {"checkout_url": session.url}


@router.get("/status")
def subscription_status(user_id: str = Depends(require_user_id)) -> dict:
    """Return the caller's subscription state for the frontend paywall."""
    _require_stripe()
    with db.SessionLocal() as s:
        row = s.get(Subscription, user_id)
    if row is None:
        return {"subscribed": False, "status": "none", "current_period_end": None}
    return {
        "subscribed": row.status in ACTIVE_STATUSES,
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


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Stripe event webhook. No auth — the signature is the auth. Returns 200 fast."""
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
    log.info("webhook event: %s", etype)
    try:
        if etype == "checkout.session.completed":
            session_obj = event["data"]["object"]
            user_id = (session_obj.get("metadata") or {}).get("user_id")
            sub_id = session_obj.get("subscription")
            if user_id and sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                _sync_from_subscription(user_id, sub)
            else:
                log.warning("checkout.session.completed without user_id/subscription metadata")
        elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
            sub = event["data"]["object"]
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
                _sync_from_subscription(user_id, sub)
            else:
                log.warning("subscription event for unknown customer %s", sub.get("customer"))
        # Other event types are acknowledged and ignored.
    except Exception:
        log.exception("webhook handler failed for event %s", etype)
        # Return 200 anyway: Stripe retries failures, and a poisoned event must not
        # wedge the delivery queue. The failure is in the logs for investigation.
    return {"received": True}
