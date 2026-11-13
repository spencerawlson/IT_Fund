"""Cypher analytics (Cyber Missions Phase 2 — lightweight, no PII).

Reuses existing tracking first: mission starts/completions and completion
time come from mission_attempts (started_at, completed_at, status); AI
token usage + estimated cost from ai_tutor_calls; ElevenLabs usage from
voice_calls. This module adds only what those tables cannot see — the UI
interactions — as counts, never conversation content:

- POST /analytics/events — one Cypher interaction event. `event` must be in
  the allowlist; `meta` holds small ids/flags only (objective_id, mode,
  source) and is validated server-side. No free text is accepted anywhere,
  so a student question or answer can never land in this table.
- GET /analytics/cypher-summary — the requesting learner's own aggregates:
  events by type, tutor calls + cost, voice calls + characters spoken,
  missions started/completed + completion times. Self-service only for this
  round; a cross-student rollup for Spencer is a follow-up (it needs the
  admin gate, not a per-user endpoint).

Lesson-to-mission conversion is derived, not stored: a mission_attempts row
for op-broken-shield whose started_at follows a cypher_events invite_accepted
for the net-security lesson is a conversion — the summary reports both
counts side by side so Spencer can compute it.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Integer, func, select

from auth.deps import require_user_id

log = logging.getLogger("analytics")

router = APIRouter()

#: The only events the frontend may log. Anything else is a 400 — the
#: allowlist is what keeps this table counts-only.
EVENT_ALLOWLIST = {
    "panel_opened",  # Cypher lesson panel shown
    "invite_shown",  # mission invitation shown in the panel
    "invite_accepted",  # student clicked through to the mission
    "hint_viewed",  # a mission hint was shown (terminal `hint` or panel)
    "debrief_viewed",  # mission debrief shown
    "voice_played",  # a Cypher voice clip played
    "voice_fallback",  # voice fell back to text-only
}

#: The only meta keys accepted, and the only value types. No free text.
META_KEYS = {"objective_id", "mode", "source"}
META_MAX_STR = 120


class EventReq(BaseModel):
    event: str = Field(max_length=48)
    mission_id: Optional[str] = Field(default=None, max_length=64)
    lesson_id: Optional[str] = Field(default=None, max_length=64)
    meta: Optional[dict] = None


def _validate_meta(meta: Optional[dict]) -> Optional[dict]:
    if meta is None:
        return None
    if not isinstance(meta, dict):
        raise HTTPException(status_code=400, detail="meta must be an object")
    for k, v in meta.items():
        if k not in META_KEYS:
            raise HTTPException(status_code=400, detail=f"meta key not allowed: {k}")
        if isinstance(v, bool):
            continue
        if isinstance(v, int):
            continue
        if isinstance(v, str) and len(v) <= META_MAX_STR:
            continue
        raise HTTPException(status_code=400, detail=f"meta value not allowed for key: {k}")
    return meta


@router.post("/analytics/events")
def log_event(body: EventReq, user_id: str = Depends(require_user_id)):
    if body.event not in EVENT_ALLOWLIST:
        raise HTTPException(status_code=400, detail=f"Unknown event: {body.event}")
    meta = _validate_meta(body.meta)
    try:
        import db
        from db_models import CypherEvent

        with db.SessionLocal() as s:
            s.add(
                CypherEvent(
                    user_id=user_id,
                    event=body.event,
                    mission_id=body.mission_id,
                    lesson_id=body.lesson_id,
                    meta=meta,
                )
            )
            s.commit()
    except Exception:
        log.exception("cypher event logging failed for user %s", user_id)
        raise HTTPException(status_code=500, detail="Could not record the event.")
    return {"recorded": True, "event": body.event}


@router.get("/analytics/cypher-summary")
def cypher_summary(user_id: str = Depends(require_user_id)):
    """The requesting learner's own Cypher engagement + cost aggregates."""
    import db
    from db_models import AiTutorCall, CypherEvent, MissionAttempt, VoiceCall

    with db.SessionLocal() as s:
        event_rows = s.execute(
            select(CypherEvent.event, func.count()).where(CypherEvent.user_id == user_id).group_by(CypherEvent.event)
        ).all()
        events = dict(event_rows)

        tutor_rows = s.execute(
            select(
                func.count(),
                func.coalesce(func.sum(AiTutorCall.cost_usd), 0.0),
                func.coalesce(func.sum(AiTutorCall.prompt_tokens), 0),
                func.coalesce(func.sum(AiTutorCall.completion_tokens), 0),
            ).where(AiTutorCall.user_id == user_id)
        ).one()

        voice_rows = s.execute(
            select(
                func.count(),
                func.coalesce(func.sum(VoiceCall.chars), 0),
                func.coalesce(func.sum(func.cast(VoiceCall.cached, Integer)), 0),
            ).where(VoiceCall.user_id == user_id)
        ).one()

        attempts = s.execute(
            select(MissionAttempt).where(MissionAttempt.user_id == user_id)
        ).scalars().all()

    started = len(attempts)
    completed_rows = [a for a in attempts if a.status == "completed" and a.completed_at and a.started_at]
    completion_seconds = [
        (a.completed_at - a.started_at).total_seconds() for a in completed_rows
    ]
    return {
        "events": events,
        "tutor": {
            "calls": int(tutor_rows[0]),
            "cost_usd": round(float(tutor_rows[1]), 6),
            "prompt_tokens": int(tutor_rows[2]),
            "completion_tokens": int(tutor_rows[3]),
        },
        "voice": {
            "calls": int(voice_rows[0]),
            "chars": int(voice_rows[1]),
            "cached": int(voice_rows[2]),
            "cost_usd": None,  # unknown — see voice.py
        },
        "missions": {
            "started": started,
            "completed": len(completed_rows),
            "completion_seconds": [round(x, 1) for x in completion_seconds],
        },
    }
