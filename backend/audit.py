"""Admin audit log: one append-only row per administrative change.

`record` never raises — an audit write failing must not undo the change it
describes (that change is already committed); the failure is logged loudly
instead. Details are small structured values: never secrets, tokens or
payment card data.
"""
from __future__ import annotations

import logging

import db
from db_models import AdminAuditLog

log = logging.getLogger(__name__)

#: Fallback actor when no admin account is known (e.g. a server console).
#: Admin requests record the signed-in admin's own account id: require_admin
#: puts it on request.state.admin_user_id, and record() reads it from there.
SHARED_ADMIN = "admin"


def client_ip(request) -> str | None:
    try:
        return request.client.host if request is not None and request.client else None
    except Exception:
        return None


def record(action: str, *, actor: str | None = None, target_user_id: str | None = None,
           details: dict | None = None, request=None) -> None:
    if actor is None:
        actor = getattr(getattr(request, "state", None), "admin_user_id", None) or SHARED_ADMIN
    try:
        with db.SessionLocal() as s:
            s.add(AdminAuditLog(
                actor=actor[:64], action=action[:64], target_user_id=target_user_id,
                details=details or None, ip=client_ip(request),
            ))
            s.commit()
    except Exception:
        log.exception("AUDIT WRITE FAILED: action=%s target=%s", action, target_user_id)


def recent(limit: int = 50) -> list[dict]:
    with db.SessionLocal() as s:
        rows = s.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "at": r.created_at.isoformat() if r.created_at else None,
                "actor": r.actor,
                "action": r.action,
                "target_user_id": r.target_user_id,
                "details": r.details,
            }
            for r in rows
        ]
