"""FastAPI routes for Cyber Missions (vertical slice: op-broken-shield).

Thin HTTP layer only: it identifies the caller, enforces the subscription
entitlement, then delegates the lab half to the labs SessionService and keeps
the mission half (attempt row, mission findings, choices) in Postgres via
db_models.MissionAttempt.

Every endpoint requires a signed-in subscriber (401 anonymous, 402
non-subscriber; entitlement re-checked per call). The owner id always comes
from the session cookie, never from the request body or path, so one learner
cannot touch another's attempt — another user's attempt reads as 404.

Mounted on both /missions/* and /api/missions/* (see main.py), like the labs
router. The lab session itself is driven through the existing /labs API
(exec/validate), which is what records the LabCompletion row the XP rule
reads (see _first_time_xp).
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select

import db
from auth.deps import require_user_id
from billing import is_subscribed
from db_models import LabCompletion, MissionAttempt
from labs.missions import TOPOLOGY_DEVICES, copy_findings, get_mission, initial_findings, list_missions
from labs.sessions import COMPLETED, RUNNING, LabError, service
from labs.validators import VALIDATORS

router = APIRouter(prefix="/missions", tags=["missions"])


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
                detail="Mission rate limit reached. Slow down and try again shortly.",
            )
        q.append(now)

    check.clear = hits.clear  # tests reset between cases
    return check


_check_start_rate = _rate_limiter(30, 3600)    # mission starts per owner per hour (same as lab starts)
_check_action_rate = _rate_limiter(300, 3600)  # mission actions per owner per hour

_STATUS = {"not_found": 404, "invalid": 400, "unavailable": 503}

#: Max length of one incident-report field (document action).
MAX_REPORT_FIELD_CHARS = 2000

#: XP for completing the mission the first time (see _first_time_xp).
MISSION_XP = 80


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _check_mission_entitlement(user_id: str) -> None:
    """Missions are premium-only: every mission wraps a premium lab, so there
    is no free-tier mission. Guests can never be subscribed."""
    if is_subscribed(user_id):
        return
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="This mission needs a subscription — upgrade to unlock Cyber Missions.",
    )


def _http(err: LabError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(err.code, 400), detail=err.message)


# ---- objective evaluation ----

def _lab_objective_results(definition, lab_session) -> list[dict[str, Any]]:
    """Per-objective results for the wrapped lab, from the session's latest
    validation (no re-validation here — the caller decides when to refresh)."""
    results: list[dict[str, Any]] = []
    if lab_session is None:
        for obj in definition.lab_objectives():
            results.append({"id": obj.id, "label": obj.label, "passed": False,
                            "message": "The lab session is no longer available."})
        return results
    by_id = {r.get("objective_id"): r for r in (lab_session.validation_results or [])}
    for obj in definition.lab_objectives():
        stored = by_id.get(obj.id)
        if stored is not None:
            results.append({"id": obj.id, "label": obj.label,
                            "passed": bool(stored.get("passed")),
                            "message": stored.get("message", "")})
        else:
            results.append({"id": obj.id, "label": obj.label,
                            "passed": bool((lab_session.progress or {}).get(obj.id, False)),
                            "message": ""})
    return results


def _mission_objective_results(definition, findings: dict[str, Any]) -> list[dict[str, Any]]:
    """Per-objective results for the mission-only objectives, by running their
    validators against the attempt's mission findings."""
    results: list[dict[str, Any]] = []
    for obj in definition.objectives:
        fn = VALIDATORS[obj.validator]
        try:
            passed, message, _evidence = fn(obj.args, findings)
        except Exception:  # noqa: BLE001 — a validator bug must fail the objective, not the request
            passed, message = False, "Could not evaluate this objective."
        results.append({"id": obj.id, "label": obj.label, "passed": bool(passed), "message": message})
    return results


def _objective_results(definition, lab_session, findings: dict[str, Any]) -> list[dict[str, Any]]:
    """All 9 objectives in order: the lab's 5, then the mission's 4."""
    return _lab_objective_results(definition, lab_session) + _mission_objective_results(definition, findings)


def _get_lab_session(attempt: MissionAttempt, user_id: str):
    """The wrapped lab session, or None when it is gone (expired/destroyed).
    Never raises for a missing session — the attempt outlives it."""
    try:
        return service.get(attempt.lab_session_id, user_id)
    except LabError:
        return None


def _attempt_dict(attempt: MissionAttempt, passed_ids: list[str]) -> dict[str, Any]:
    return {
        "id": attempt.id,
        "mission_id": attempt.mission_id,
        "status": attempt.status,
        "score": attempt.score,
        "xp_awarded": attempt.xp_awarded,
        "objectives_passed": list(passed_ids),
        "findings": copy_findings(attempt.findings),
        "choices": list(attempt.choices or []),
        "lab_session_id": attempt.lab_session_id,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


def _attempt_view(attempt: MissionAttempt, user_id: str) -> dict[str, Any]:
    """{attempt, session, objectives} — the shared read shape for GET attempt
    and POST action. objectives_passed on the attempt reflects this evaluation."""
    definition = get_mission(attempt.mission_id)
    lab_session = _get_lab_session(attempt, user_id)
    findings = copy_findings(attempt.findings)
    objectives = _objective_results(definition, lab_session, findings)
    passed_ids = [o["id"] for o in objectives if o["passed"]]
    return {
        "attempt": _attempt_dict(attempt, passed_ids),
        "session": lab_session.public_dict() if lab_session is not None else None,
        "objectives": objectives,
    }


def _load_attempt(s, attempt_id: str, user_id: str) -> MissionAttempt:
    """An attempt owned by this user; another user's (or a missing) attempt
    reads as the same 404, so ownership can't be probed."""
    row = s.get(MissionAttempt, attempt_id)
    if row is None or row.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission attempt not found.")
    return row


def _first_time_xp(s, attempt: MissionAttempt) -> int:
    """80 XP the first time this learner completes the mission's lab with
    server-verified (non-attested) evidence, else 0 — no double XP.

    "Prior" means before this attempt: the LabCompletion row this attempt's
    own lab session produced (via the /labs exec/validate endpoints) is not
    prior evidence, so it is excluded by session id. A prior completed
    attempt of the same mission also disqualifies (covers a replay driven
    without the /labs API, where no LabCompletion row would exist yet)."""
    definition = get_mission(attempt.mission_id)
    prior_lab = s.execute(
        select(LabCompletion.id).where(
            LabCompletion.user_id == attempt.user_id,
            LabCompletion.lab_id == definition.lab_id,
            LabCompletion.attested.is_(False),
            LabCompletion.session_id != attempt.lab_session_id,
        )
    ).first()
    if prior_lab is not None:
        return 0
    prior_mission = s.execute(
        select(MissionAttempt.id).where(
            MissionAttempt.user_id == attempt.user_id,
            MissionAttempt.mission_id == attempt.mission_id,
            MissionAttempt.status == "completed",
            MissionAttempt.id != attempt.id,
        )
    ).first()
    if prior_mission is not None:
        return 0
    return MISSION_XP


# ---- catalogue ----

@router.get("/definitions")
def get_definitions(user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    _check_mission_entitlement(user_id)
    return {"missions": [m.public_list_dict() for m in list_missions()]}


@router.get("/history")
def mission_history(user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    """The signed-in learner's mission attempts, newest first."""
    _check_mission_entitlement(user_id)
    with db.SessionLocal() as s:
        rows = s.execute(
            select(MissionAttempt)
            .where(MissionAttempt.user_id == user_id)
            .order_by(MissionAttempt.started_at.desc())
        ).scalars().all()
    return {
        "history": [
            {
                "id": r.id,
                "mission_id": r.mission_id,
                "status": r.status,
                "score": r.score,
                "xp_awarded": r.xp_awarded,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in rows
        ]
    }


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    _check_mission_entitlement(user_id)
    with db.SessionLocal() as s:
        attempt = _load_attempt(s, attempt_id, user_id)
        return _attempt_view(attempt, user_id)


@router.get("/{mission_id}")
def get_mission_definition(mission_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    _check_mission_entitlement(user_id)
    definition = get_mission(mission_id)
    if definition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found.")
    return definition.public_dict()


# ---- lifecycle ----

@router.post("/{mission_id}/start")
async def start_mission(mission_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    definition = get_mission(mission_id)
    if definition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found.")
    _check_mission_entitlement(user_id)
    # Resume: a reload/remount must return the learner's in-progress attempt,
    # not start a fresh one at 0/9. Only a live lab session is resumable —
    # RUNNING, or COMPLETED when the lab work is done but the report is not.
    # An attempt whose session is gone (expired/destroyed) is abandoned and a
    # fresh one starts instead. At most one attempt per (user, mission) stays
    # in_progress, so a reload never strands the learner on a dead attempt.
    # A resume is not a start, so it does not consume the start rate budget.
    with db.SessionLocal() as s:
        priors = s.execute(
            select(MissionAttempt)
            .where(MissionAttempt.user_id == user_id,
                   MissionAttempt.mission_id == definition.id,
                   MissionAttempt.status == "in_progress")
            .order_by(MissionAttempt.started_at.desc())
        ).scalars().all()
    if priors:
        latest = priors[0]
        lab_session = _get_lab_session(latest, user_id)
        if lab_session is not None and lab_session.status in (RUNNING, COMPLETED):
            with db.SessionLocal() as s:
                attempt = _load_attempt(s, latest.id, user_id)
                view = _attempt_view(attempt, user_id)
            return {"attempt": view["attempt"], "session": lab_session.public_dict(),
                    "objectives": view["objectives"], "mission": definition.public_dict(),
                    "resumed": True}
        with db.SessionLocal() as s:
            for prior in priors:
                row = s.get(MissionAttempt, prior.id)
                if row is not None and row.status == "in_progress":
                    row.status = "abandoned"
            s.commit()
    _check_start_rate(user_id)
    try:
        lab_session = await service.start(definition.lab_id, user_id)
    except LabError as err:
        raise _http(err)
    with db.SessionLocal() as s:
        attempt = MissionAttempt(
            user_id=user_id,
            mission_id=definition.id,
            definition_version=definition.version,
            lab_session_id=lab_session.id,
            status="in_progress",
            score=None,
            objectives_passed=[],
            choices=[],
            findings=initial_findings(),
            xp_awarded=0,
            started_at=_now(),
            completed_at=None,
        )
        s.add(attempt)
        s.commit()
        attempt_id = attempt.id
    with db.SessionLocal() as s:
        attempt = _load_attempt(s, attempt_id, user_id)
        view = _attempt_view(attempt, user_id)
    return {"attempt": view["attempt"], "session": lab_session.public_dict(), "objectives": view["objectives"], "mission": definition.public_dict()}


@router.post("/attempts/{attempt_id}/action")
async def mission_action(
    attempt_id: str,
    body: dict = Body(default_factory=dict),
    user_id: str = Depends(require_user_id),
) -> dict[str, Any]:
    _check_mission_entitlement(user_id)
    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body must be an object.")
    action_type = body.get("type")
    with db.SessionLocal() as s:
        attempt = _load_attempt(s, attempt_id, user_id)
        if attempt.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot act on a mission attempt that is {attempt.status}.",
            )
        _check_action_rate(user_id)
        definition = get_mission(attempt.mission_id)
        findings = copy_findings(attempt.findings)
        choices = list(attempt.choices or [])

        if action_type == "inspect_device":
            device = body.get("device")
            if device not in TOPOLOGY_DEVICES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"device must be one of {', '.join(TOPOLOGY_DEVICES)}.",
                )
            inspected = findings["topology"]["inspected"]
            if device not in inspected:
                inspected.append(device)
            choices.append({"type": "inspect_device", "device": device})
        elif action_type == "inspect_firewall":
            findings["firewall"]["inspected"] = True
            choices.append({"type": "inspect_firewall"})
        elif action_type == "document":
            report = findings["incident_report"]
            for key in ("summary", "root_cause", "fix"):
                value = body.get(key)
                if not isinstance(value, str) or len(value) > MAX_REPORT_FIELD_CHARS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{key} must be a string of at most {MAX_REPORT_FIELD_CHARS} characters.",
                    )
                report[key] = value.strip()
            choices.append({"type": "document"})
        elif action_type == "submit_report":
            lab_session = _get_lab_session(attempt, user_id)
            objectives = _objective_results(definition, lab_session, findings)
            missing = [o["id"] for o in objectives
                       if not o["passed"] and o["id"] != "report"]
            if missing:
                return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                                    content={"missing": missing})
            findings["incident_report"]["submitted"] = True
            choices.append({"type": "submit_report"})
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown action type: {action_type!r}.",
            )

        attempt.findings = findings
        attempt.choices = choices
        # Refresh the stored passed list so the row reflects this action.
        objectives = _objective_results(definition, _get_lab_session(attempt, user_id), findings)
        attempt.objectives_passed = [o["id"] for o in objectives if o["passed"]]
        s.commit()
        return _attempt_view(attempt, user_id)


@router.post("/attempts/{attempt_id}/complete")
async def complete_mission(attempt_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    _check_mission_entitlement(user_id)
    with db.SessionLocal() as s:
        attempt = _load_attempt(s, attempt_id, user_id)
        definition = get_mission(attempt.mission_id)
        if attempt.status == "completed":
            # Idempotent re-complete: the stored result, same XP, no re-award.
            view = _attempt_view(attempt, user_id)
            return {
                "attempt": view["attempt"],
                "score": attempt.score,
                "xp_awarded": attempt.xp_awarded,
                "objectives": view["objectives"],
                "debrief": definition.debrief_win,
            }
        if attempt.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot complete a mission attempt that is {attempt.status}.",
            )
        lab_session = _get_lab_session(attempt, user_id)
        if lab_session is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The lab session is no longer available; start a new attempt.",
            )
        try:
            lab_session = await service.validate(lab_session.id, user_id)
        except LabError as err:
            raise _http(err)
        findings = copy_findings(attempt.findings)
        objectives = _objective_results(definition, lab_session, findings)
        missing = [o["id"] for o in objectives if not o["passed"]]
        if missing:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                                content={"missing": missing})
        passed_count = len(objectives)
        score = definition.scoring["per_objective"] * passed_count + definition.scoring["completion_bonus"]
        xp = _first_time_xp(s, attempt)
        attempt.status = "completed"
        attempt.completed_at = _now()
        attempt.score = score
        attempt.xp_awarded = xp
        attempt.objectives_passed = [o["id"] for o in objectives]
        s.commit()
        view = _attempt_view(attempt, user_id)
        return {
            "attempt": view["attempt"],
            "score": score,
            "xp_awarded": xp,
            "objectives": objectives,
            "debrief": definition.debrief_win,
        }
