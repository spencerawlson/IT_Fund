"""FastAPI routes for interactive labs.

Thin HTTP layer only: it identifies the caller (via `resolve_visitor_id`), then delegates to the
SessionService (API -> Lab Service -> LabProvider). No orchestration logic lives here. The owner id
always comes from the session cookie or the guest cookie, never from the request body or path, so
one student cannot touch another's session. Responses use the *_public_dict() views, which omit
environment ids and provider internals.

Labs are **open to everyone during development**, signed in or not: an anonymous visitor gets a
guest id (see `auth.deps`) that scopes their own sessions. `_check_lab_entitlement` below is the one
place the paid gate goes when billing lands.
"""
from __future__ import annotations

import json
import logging
import time
from collections import defaultdict, deque
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select

import db
from auth.deps import require_user_id, resolve_user_id, resolve_visitor_id
from db_models import LabCompletion
from labs.registry import get_lab, list_labs
from labs.sessions import LabError, service
from labs.shells import meta as shell_meta

router = APIRouter(prefix="/labs", tags=["labs"])

log = logging.getLogger(__name__)


def _rate_limiter(max_calls: int, window: int):
    """Tiny in-memory per-owner rate limiter (one instance per endpoint)."""
    hits: dict[str, deque] = defaultdict(deque)

    def check(owner_id: str) -> None:
        now = time.monotonic()
        q = hits[owner_id]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Lab rate limit reached. Slow down and try again shortly.",
            )
        q.append(now)

    check.clear = hits.clear  # tests reset between cases
    return check


_check_start_rate = _rate_limiter(30, 3600)   # lab starts per owner per hour
_check_exec_rate = _rate_limiter(600, 3600)   # shell commands per owner per hour

#: Findings payload cap: a client dict merged into session state must stay small so one
#: visitor can't grow per-session memory without bound.
MAX_FINDINGS_BYTES = 16 * 1024

_STATUS = {"not_found": 404, "invalid": 400, "unavailable": 503}

#: Planned: a free trial may start this many labs, after which a subscription is required.
TRIAL_LAB_STARTS = 10


def _check_lab_entitlement(owner_id: str) -> None:
    """Whether this caller may start another lab. Open to all during development.

    When labs become a paid feature this is the single check to implement: count the owner's lab
    starts, allow the first TRIAL_LAB_STARTS, and otherwise require an active subscription (which
    also means requiring a real account, since a guest id is per browser and free to discard).
    Raise HTTPException(402/403) to refuse; the client already surfaces the `detail` message.
    """
    return None


def _http(err: LabError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(err.code, 400), detail=err.message)


@router.get("/definitions")
def get_definitions() -> dict[str, Any]:
    # Public catalogue view: no images or provider internals. Terminal labs also advertise their
    # shell's initial prompt + welcome banner so the client can seed the terminal.
    labs = []
    for lab in list_labs():
        view = lab.public_dict()
        terminal = shell_meta(lab)
        if terminal:
            view["terminal"] = terminal
        labs.append(view)
    return {"labs": labs}


def _record_completion(user_id: str | None, sess: dict[str, Any]) -> None:
    """Persist one lab completion for signed-in learners.

    Guests keep history in the browser only. Idempotent per session via the
    (user_id, session_id) unique constraint — repeat validations can't double
    count. A failed write must never fail the lab response, so errors are
    logged, not raised.
    """
    if not user_id or sess.get("status") != "COMPLETED":
        return
    try:
        started = datetime.fromisoformat(sess["started_at"])
        completed = datetime.fromisoformat(sess["completed_at"])
    except (KeyError, ValueError, TypeError):
        return
    duration = max(0, int((completed - started).total_seconds()))
    try:
        with db.SessionLocal() as s:
            exists = s.execute(
                select(LabCompletion.id).where(
                    LabCompletion.user_id == user_id,
                    LabCompletion.session_id == sess["id"],
                )
            ).first()
            if exists:
                return
            s.add(LabCompletion(
                user_id=user_id,
                lab_id=sess["lab_id"],
                session_id=sess["id"],
                duration_seconds=duration,
                completed_at=completed,
            ))
            s.commit()
    except Exception:  # noqa: BLE001 — history is best-effort; the lab already worked
        log.exception("failed to record lab completion")


@router.get("/history")
def lab_history(user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    """The signed-in learner's lab completions, newest first. The progress page
    aggregates these into per-lab completions and best/last times."""
    with db.SessionLocal() as s:
        rows = s.execute(
            select(
                LabCompletion.lab_id,
                LabCompletion.duration_seconds,
                LabCompletion.completed_at,
            )
            .where(LabCompletion.user_id == user_id)
            .order_by(LabCompletion.completed_at.desc())
            .limit(1000)
        ).all()
    return {
        "history": [
            {
                "lab_id": r.lab_id,
                "duration_seconds": r.duration_seconds,
                "completed_at": r.completed_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.post("/{lab_id}/start")
async def start_lab(lab_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    # lab_id is looked up server-side; the client cannot pass an image, target or provider.
    if get_lab(lab_id) is None:
        raise HTTPException(status_code=404, detail="Lab not found.")
    _check_lab_entitlement(owner_id)
    _check_start_rate(owner_id)
    try:
        session = await service.start(lab_id, owner_id)
    except LabError as err:
        raise _http(err)
    return session.public_dict()


@router.get("/sessions/{session_id}")
def get_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    try:
        return service.get(session_id, owner_id).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/findings")
def record_findings(
    session_id: str,
    request: Request,
    body: dict = Body(default_factory=dict),
    owner_id: str = Depends(resolve_visitor_id),
) -> dict[str, Any]:
    findings = body.get("findings", body) if isinstance(body, dict) else {}
    if len(json.dumps(findings, default=str)) > MAX_FINDINGS_BYTES:
        raise HTTPException(status_code=413, detail="Findings payload too large.")
    try:
        return service.record_findings(session_id, owner_id, findings).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/exec")
async def exec_in_session(
    session_id: str,
    body: dict = Body(default_factory=dict),
    owner_id: str = Depends(resolve_visitor_id),
    user_id: str | None = Depends(resolve_user_id),
) -> dict[str, Any]:
    _check_exec_rate(owner_id)
    # The command is untrusted input; the (mock) provider only pattern-matches it, never runs it.
    command = body.get("command", "") if isinstance(body, dict) else ""
    if not isinstance(command, str):
        raise HTTPException(status_code=400, detail="command must be a string.")
    try:
        session, result = await service.exec_command(session_id, owner_id, command)
    except LabError as err:
        raise _http(err)
    sess = session.public_dict()
    _record_completion(user_id, sess)
    return {
        "output": result.output,
        "exit_code": result.exit_code,
        "clear": result.clear,
        "prompt": result.prompt,
        "session": sess,
    }


@router.post("/sessions/{session_id}/validate")
async def validate_session(
    session_id: str,
    owner_id: str = Depends(resolve_visitor_id),
    user_id: str | None = Depends(resolve_user_id),
) -> dict[str, Any]:
    try:
        sess = (await service.validate(session_id, owner_id)).public_dict()
    except LabError as err:
        raise _http(err)
    _record_completion(user_id, sess)
    return sess


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    try:
        return (await service.reset(session_id, owner_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> None:
    await service.destroy(session_id, owner_id)  # idempotent: always 204
