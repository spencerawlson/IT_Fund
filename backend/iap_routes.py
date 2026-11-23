"""In-app purchase API routes (App Store Guideline 3.1.1).

Mounted at both /iap and /api/iap by main.py, like the other routers.

- POST /iap/verify — the iOS app, after a StoreKit 2 purchase (or a
  restore / launch sync), sends the transaction's signed JWS. The server
  verifies it (see iap.py) and grants the entitlement. Authenticated: the
  purchase is linked to the signed-in account, never to a bare device.
- POST /iap/notifications — App Store Server Notifications V2. Apple POSTs
  a signed JWS (`signedPayload`) here whenever a subscription renews,
  expires, is refunded/revoked, or enters/exits its grace period. No
  session: the JWS signature IS the authentication (the same trust model
  as the Stripe webhook signature). The URL to configure in App Store
  Connect is https://api.road2cissp.com/api/iap/notifications.

Both endpoints are idempotent: re-verifying the same transaction changes
nothing, and a retried notification (same notificationUUID) is recorded
once and acknowledged without re-applying.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

import iap as iap_mod
from auth.deps import require_user_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/iap", tags=["iap"])


class VerifyBody(BaseModel):
    signed_transaction: str


class NotificationBody(BaseModel):
    signedPayload: str


@router.post("/verify")
async def verify_purchase(
    body: VerifyBody, user_id: str = Depends(require_user_id)
) -> dict:
    """Verify a StoreKit signed transaction and grant the entitlement.

    A bad JWS (forged, wrong bundle/product, non-subscription) is a 400 —
    nothing is granted. A genuine transaction that is already expired or
    revoked is still applied (the row records the real state) and the
    response says so with subscribed:false, not an error: the purchase was
    real, the access is just over.
    """
    try:
        txn = iap_mod.verify_signed_transaction(body.signed_transaction)
    except iap_mod.IapVerificationError as exc:
        log.warning("IAP verify refused for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That App Store purchase could not be verified.",
        ) from exc
    try:
        return iap_mod.apply_transaction(user_id, txn)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        ) from exc


@router.post("/notifications")
async def apple_notifications(request: Request) -> dict:
    """App Store Server Notifications V2 endpoint.

    Apple POSTs {"signedPayload": "<JWS>"}; the JWS is verified against
    the Apple Root CA - G3 chain before anything is trusted. A payload that
    fails verification is a 400 (Apple retries failed deliveries, so a
    transient 500 would be retried too — verification failures are
    permanent, not transient). Unknown notification types are recorded and
    acknowledged, never rejected: Apple adds types over time.
    """
    try:
        body = await request.json()
    except Exception as exc:  # noqa: BLE001 — a non-JSON body is a bad notification, not a crash
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification body is not JSON.",
        ) from exc
    signed_payload = body.get("signedPayload") if isinstance(body, dict) else None
    if not isinstance(signed_payload, str) or not signed_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification has no signedPayload.",
        )
    try:
        payload = iap_mod.verify_signed_notification(signed_payload)
    except iap_mod.IapVerificationError as exc:
        log.warning("Apple notification refused: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification signature could not be verified.",
        ) from exc
    result = iap_mod.handle_notification(payload)
    log.info(
        "Apple notification %s processed=%s user=%s",
        result.get("notification_type"),
        result.get("processed"),
        result.get("user_id"),
    )
    return {"ok": True, **result}
