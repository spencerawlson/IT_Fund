"""FastAPI routes for interactive labs.

Thin HTTP layer only: it authenticates the user (via the shared auth dependency: session cookie,
or legacy bearer during the transition), then delegates to the SessionService
(API -> Lab Service -> LabProvider). No orchestration logic lives here. The user id always comes
from the session/token, never from the request body or path, so one student cannot touch another's
session. Responses use the *_public_dict() views, which omit environment ids and provider internals.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status

from auth.deps import require_user_id
from labs.registry import get_lab, list_labs
from labs.sessions import LabError, service

router = APIRouter(prefix="/labs", tags=["labs"])

_STATUS = {"not_found": 404, "invalid": 400, "unavailable": 503}


def _http(err: LabError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(err.code, 400), detail=err.message)


@router.get("/definitions")
def get_definitions() -> dict[str, Any]:
    # Public catalogue view: no images or provider internals.
    return {"labs": [lab.public_dict() for lab in list_labs()]}


@router.post("/{lab_id}/start")
async def start_lab(lab_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    # lab_id is looked up server-side; the client cannot pass an image, target or provider.
    if get_lab(lab_id) is None:
        raise HTTPException(status_code=404, detail="Lab not found.")
    try:
        session = await service.start(lab_id, user_id)
    except LabError as err:
        raise _http(err)
    return session.public_dict()


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    try:
        return service.get(session_id, user_id).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/findings")
def record_findings(session_id: str, body: dict = Body(default_factory=dict), user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    findings = body.get("findings", body) if isinstance(body, dict) else {}
    try:
        return service.record_findings(session_id, user_id, findings).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/validate")
async def validate_session(session_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    try:
        return (await service.validate(session_id, user_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, user_id: str = Depends(require_user_id)) -> dict[str, Any]:
    try:
        return (await service.reset(session_id, user_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user_id: str = Depends(require_user_id)) -> None:
    await service.destroy(session_id, user_id)  # idempotent: always 204
