"""Server-side progress: one JSON document per user.

Matches the shape the Academy already stores in localStorage (itfund-academy-v1), so the client and
server share one format and a `serverAdapter` can write through (C3.4). The user always comes from
the session, never the body. Writes are guarded by an optimistic version (If-Match) so two devices
can't silently overwrite each other, and are bounded in size and rate.
"""
from __future__ import annotations

import json
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

import db
from auth.deps import require_user_id
from db_models import Progress

router = APIRouter(prefix="/academy", tags=["progress"])

MAX_BYTES = 256 * 1024          # a full Academy state is a few KB; 256KB is generous headroom
RATE_MAX = 30                   # writes
RATE_WINDOW = 60                # seconds, per user

_writes: dict[str, deque] = defaultdict(deque)


def _rate_limit(user_id: str) -> None:
    now = time.monotonic()
    q = _writes[user_id]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_MAX:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many writes; slow down.")
    q.append(now)


def _read(user_id: str) -> tuple[dict, int]:
    with db.SessionLocal() as s:
        row = s.get(Progress, user_id)
        return (row.state, row.version) if row else ({}, 0)


@router.get("/progress")
def get_progress(user_id: str = Depends(require_user_id)) -> dict:
    state, version = _read(user_id)
    return {"state": state, "version": version}


@router.put("/progress")
async def put_progress(request: Request, response: Response, user_id: str = Depends(require_user_id)) -> dict:
    if_match = request.headers.get("if-match")
    if if_match is None:
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="If-Match (version) header required.")
    try:
        expected = int(if_match.strip().strip('"'))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="If-Match must be an integer version.")

    raw = await request.body()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Progress payload too large.")  # 413 Content Too Large
    try:
        body = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body must be JSON.")
    state = body.get("state") if isinstance(body, dict) else None
    if not isinstance(state, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="`state` must be an object.")

    _rate_limit(user_id)

    with db.SessionLocal() as s:
        row = s.get(Progress, user_id)
        current = row.version if row else 0
        if expected != current:
            # Another device wrote first: hand back the current server copy so the client can merge.
            response.status_code = status.HTTP_409_CONFLICT
            return {"state": row.state if row else {}, "version": current}
        if row is None:
            row = Progress(user_id=user_id, state=state, version=1)
            s.add(row)
        else:
            row.state = state
            row.version = current + 1
        new_version = row.version
        s.commit()
    return {"version": new_version}
