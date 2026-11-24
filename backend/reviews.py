"""Learner reviews: submission by any signed-in learner (backend/reviews.py).

One review per user: a second submission updates the existing row in place
and sends it back to moderation (approved=False) rather than creating a
second row. Nothing here is public — the public listing lives in
backend/public.py and returns approved reviews only; moderation lives in
backend/admin.py. No sensitive data is collected: rating, free text, and an
optional display name only.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field

import db
from auth.deps import require_user_id
from db_models import Review

log = logging.getLogger("reviews")

router = APIRouter(tags=["reviews"])

MAX_BODY_CHARS = 2000
MAX_NAME_CHARS = 120


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=5, max_length=MAX_BODY_CHARS)
    display_name: str | None = Field(default=None, max_length=MAX_NAME_CHARS)


def _review_dict(review: Review) -> dict:
    """The review as the author sees it. No user id, no email — the author
    already knows who they are, and nothing sensitive is stored here."""
    return {
        "id": review.id,
        "rating": review.rating,
        "body": review.body,
        "display_name": review.display_name,
        "approved": review.approved,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
def submit_review(payload: ReviewIn, response: Response, user_id: str = Depends(require_user_id)) -> dict:
    """Submit (or re-submit) the caller's review. A re-submission updates the
    existing row in place and goes back to moderation. Returns 201 for a new
    review, 200 for an update."""
    body = payload.body.strip()
    display_name = (payload.display_name or "").strip() or None
    with db.SessionLocal() as s:
        existing = s.query(Review).filter(Review.user_id == user_id).first()
        if existing is not None:
            existing.rating = payload.rating
            existing.body = body
            existing.display_name = display_name
            existing.approved = False
            s.commit()
            response.status_code = status.HTTP_200_OK
            return {**_review_dict(existing), "updated": True}
        review = Review(
            user_id=user_id,
            rating=payload.rating,
            body=body,
            display_name=display_name,
            approved=False,
        )
        s.add(review)
        s.commit()
        return _review_dict(review)
