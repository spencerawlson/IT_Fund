"""Public (unauthenticated) site stats for the landing page.

GET /public/seats reports how many accounts have been created and the seat
cap, so the public landing page can show "N of 10,000 seats taken". The
numbers are public information by design: no user data, no auth, no session.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter
from sqlalchemy import func

import db
from db_models import User

log = logging.getLogger(__name__)

# Total seat cap for the platform: 10,000 accounts. Displayed on the public
# landing page as "N of 10,000 seats taken" and enforced in auth.identity:
# once total_users reaches the cap, new public signups are refused (the
# OAuth callback redirects to /signin?error=seats_full). Admin manual
# enrollment (POST /admin/accounts) is Spencer's own action and is NOT
# capped — it never goes through the signup path.
SEAT_CAP = 10000

router = APIRouter()


@router.get("/public/seats")
def public_seats() -> dict:
    """Total accounts created and the seat cap. Public: no auth of any kind."""
    with db.SessionLocal() as s:
        # Deleted accounts (deleted_at set) do not count: deleting an
        # account frees its seat, and the board can never disagree with
        # the cap check in auth.identity (same filter there).
        total = s.query(func.count()).select_from(User).filter(User.deleted_at.is_(None)).scalar() or 0
    return {"total_accounts": total, "cap": SEAT_CAP}
