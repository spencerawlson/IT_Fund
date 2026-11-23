"""Self-service account deletion (App Store Guideline 5.1.1(v)).

DELETE /api/account — a signed-in user deletes their own account from
inside the app (web or the Capacitor shell). The delete:

1. Requires an explicit confirmation ({"confirm": true}); without it the
   request is refused and nothing changes.
2. Cancels the user's Stripe subscription FIRST (billing.revoke_subscription),
   so nobody keeps paying after deleting. If billing is unconfigured while
   a live subscription exists, or the cancel fails, the delete refuses with
   503 and nothing changes.
3. Destroys the user's live lab sessions (their containers stop with the
   account — nothing keeps running or accruing lab-hours).
4. Soft-deletes the account (the codebase's existing pattern: the row
   stays with deleted_at set, so foreign keys and billing history survive)
   while scrubbing personal data (name, email, avatar, attribution tag)
   and purging learning + session data: OAuth identities, sessions, native
   auth codes, progress, lab completions, lab usage events, mission
   attempts, lab sessions, tutor calls, voice calls, Cypher events.
   The billing row survives (records, not personal data) and any manual
   grant is revoked. The seat is freed via enrollment.sync_user_safely.
5. Is idempotent-safe: a second delete with the (now revoked) session is
   a 401, and the account stays deleted — re-signing in with the same
   provider cannot resurrect it (see the guard in auth/router.py).

Apple subscriptions: an Apple subscription is tracked on the same
`subscriptions` row (provider="apple", see iap.py). There is no
server-side way to cancel one — only the user can, in iOS Settings —
so this endpoint does NOT refuse while one is active: refusing would
block deletion until the paid period ends, because cancelling in
Settings leaves the subscription active until expiry. The delete marks
the row canceled (billing.revoke_subscription, which needs no Stripe
call when there is no Stripe subscription id) so nothing can resurrect
it, and the UI tells iOS users to cancel in Settings first so Apple
does not charge them again after the account is gone.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete

import audit
import billing
import db
import enrollment
from auth.deps import require_user_id
from db_models import (
    AiTutorCall,
    AuthSession,
    CypherEvent,
    Identity,
    LabCompletion,
    LabSession,
    LabUsageEvent,
    ManualGrant,
    MissionAttempt,
    NativeAuthCode,
    Progress,
    User,
    VoiceCall,
)
from labs import sessions as lab_sessions

log = logging.getLogger(__name__)
router = APIRouter()


class DeleteAccountBody(BaseModel):
    confirm: bool = False


@router.delete("/account")
async def delete_own_account(
    body: DeleteAccountBody, user_id: str = Depends(require_user_id)
) -> dict:
    if not body.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account deletion requires explicit confirmation.",
        )
    with db.SessionLocal() as s:
        user = s.get(User, user_id)
        if user is None or user.deleted_at is not None:
            # Already gone (e.g. an admin deleted the account while this
            # session was still live): report success, resurrect nothing.
            return {"ok": True, "deleted_user_id": user_id}

    # Cancel the Stripe subscription FIRST: a failure here refuses the
    # delete with 503 and changes nothing, so the user never keeps paying
    # after their account is gone.
    try:
        billing.revoke_subscription(user_id)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — Stripe errors vary; the delete must refuse
        log.exception("account delete refused: Stripe cancel failed for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is unavailable right now; your subscription could not be canceled. Please try again later.",
        ) from exc

    # Stop the user's live lab containers with the account.
    await lab_sessions.service.destroy_for_owner(user_id)

    now = datetime.now(timezone.utc)
    with db.SessionLocal() as s:
        user = s.get(User, user_id)
        if user is None or user.deleted_at is not None:
            return {"ok": True, "deleted_user_id": user_id}
        # Soft-delete + scrub personal data (the row stays for billing
        # history and foreign keys; the email is gone, so the address can
        # sign up again as a fresh account).
        user.deleted_at = now
        user.display_name = ""
        user.email = None
        user.avatar_url = None
        user.attribution_tag = None
        # Revoke the manual grant, if any (the row survives as a record).
        grant = s.get(ManualGrant, user_id)
        if grant is not None and grant.revoked_at is None:
            grant.revoked_at = now
            grant.revoked_note = "Account deleted."
        # Purge learning + session data.
        for model, column in (
            (Identity, Identity.user_id),
            (AuthSession, AuthSession.user_id),
            (NativeAuthCode, NativeAuthCode.user_id),
            (Progress, Progress.user_id),
            (LabCompletion, LabCompletion.user_id),
            (LabUsageEvent, LabUsageEvent.user_id),
            (MissionAttempt, MissionAttempt.user_id),
            (AiTutorCall, AiTutorCall.user_id),
            (VoiceCall, VoiceCall.user_id),
            (CypherEvent, CypherEvent.user_id),
        ):
            s.execute(sa_delete(model).where(column == user_id))
        s.execute(sa_delete(LabSession).where(LabSession.owner_id == user_id))
        s.commit()

    # Free the seat (deleted accounts hold no place; reconcile repairs any
    # allocation this misses).
    enrollment.sync_user_safely(user_id)
    audit.record(
        "account.delete.self",
        actor=user_id,
        target_user_id=user_id,
        details={"source": "self-service"},
    )
    return {"ok": True, "deleted_user_id": user_id}
