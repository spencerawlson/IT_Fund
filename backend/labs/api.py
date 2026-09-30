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

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status

from auth.deps import resolve_visitor_id
from labs.registry import get_lab, list_labs
from labs.sessions import LabError, service

router = APIRouter(prefix="/labs", tags=["labs"])

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
    # Public catalogue view: no images or provider internals.
    return {"labs": [lab.public_dict() for lab in list_labs()]}


@router.post("/{lab_id}/start")
async def start_lab(lab_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    # lab_id is looked up server-side; the client cannot pass an image, target or provider.
    if get_lab(lab_id) is None:
        raise HTTPException(status_code=404, detail="Lab not found.")
    _check_lab_entitlement(owner_id)
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
def record_findings(session_id: str, body: dict = Body(default_factory=dict), owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    findings = body.get("findings", body) if isinstance(body, dict) else {}
    try:
        return service.record_findings(session_id, owner_id, findings).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/validate")
async def validate_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    try:
        return (await service.validate(session_id, owner_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> dict[str, Any]:
    try:
        return (await service.reset(session_id, owner_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, owner_id: str = Depends(resolve_visitor_id)) -> None:
    await service.destroy(session_id, owner_id)  # idempotent: always 204
