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
from db_models import Review, User

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


@router.get("/public/reviews")
def public_reviews() -> dict:
    """Approved learner reviews only, newest first, capped at 50. Public: no
    auth of any kind. Unapproved reviews never appear here, and no user id
    or email ever leaves — only the rating, text, display name (or
    "Anonymous learner" when blank), and date."""
    with db.SessionLocal() as s:
        rows = (
            s.query(Review)
            .filter(Review.approved.is_(True))
            .order_by(Review.created_at.desc())
            .limit(50)
            .all()
        )
    return {
        "reviews": [
            {
                "rating": r.rating,
                "body": r.body,
                "display_name": (r.display_name or "").strip() or "Anonymous learner",
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.get("/public/enrollment")
def public_enrollment() -> dict:
    """Founding-membership places left (paid memberships only; complimentary
    ones never count). Public: no auth, no user data. When the numbers can't
    be read they are null, and the site shows a neutral message instead."""
    import enrollment

    return enrollment.public_availability()
