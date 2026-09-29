"""FastAPI routes for interactive labs.

Thin HTTP layer only: it authenticates the user, then delegates to the SessionService
(API -> Lab Service -> LabProvider). No orchestration logic lives here. The user id always comes
from the session/token, never from the request body or path, so one student cannot touch another's
session. Responses use the *_public_dict() views, which omit environment ids and provider internals.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Body, Header, HTTPException, status

from labs.registry import get_lab, list_labs
from labs.sessions import LabError, service

router = APIRouter(prefix="/labs", tags=["labs"])

_STATUS = {"not_found": 404, "invalid": 400, "unavailable": 503}


def _http(err: LabError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(err.code, 400), detail=err.message)


def _current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Resolve the caller from the bearer token. Lazy import of main avoids an import cycle
    (main includes this router)."""
    token = authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else None
    import main  # noqa: PLC0415  (deferred to break the cycle)

    user = main._user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user["id"]


@router.get("/definitions")
def get_definitions() -> dict[str, Any]:
    # Public catalogue view: no images or provider internals.
    return {"labs": [lab.public_dict() for lab in list_labs()]}


@router.post("/{lab_id}/start")
async def start_lab(lab_id: str, authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    user_id = _current_user_id(authorization)
    # lab_id is looked up server-side; the client cannot pass an image, target or provider.
    if get_lab(lab_id) is None:
        raise HTTPException(status_code=404, detail="Lab not found.")
    try:
        session = await service.start(lab_id, user_id)
    except LabError as err:
        raise _http(err)
    return session.public_dict()


@router.get("/sessions/{session_id}")
def get_session(session_id: str, authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    user_id = _current_user_id(authorization)
    try:
        return service.get(session_id, user_id).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/findings")
def record_findings(session_id: str, body: dict = Body(default_factory=dict), authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    user_id = _current_user_id(authorization)
    findings = body.get("findings", body) if isinstance(body, dict) else {}
    try:
        return service.record_findings(session_id, user_id, findings).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/validate")
async def validate_session(session_id: str, authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    user_id = _current_user_id(authorization)
    try:
        return (await service.validate(session_id, user_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, authorization: Optional[str] = Header(None)) -> dict[str, Any]:
    user_id = _current_user_id(authorization)
    try:
        return (await service.reset(session_id, user_id)).public_dict()
    except LabError as err:
        raise _http(err)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, authorization: Optional[str] = Header(None)) -> None:
    user_id = _current_user_id(authorization)
    await service.destroy(session_id, user_id)  # idempotent: always 204
