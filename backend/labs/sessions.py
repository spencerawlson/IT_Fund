"""Lab session service — the layer between the API and the provider.

Holds the per-user session lifecycle, findings and validation results, and enforces ownership and
expiry. Storage is in-memory for now, matching the current backend (no database yet); when C3 adds
Postgres this is the single place that swaps to persistent storage, and the API above it does not
change. The API must go through this service, never call a provider directly.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from labs.providers.base import LabProvider
from labs.providers.mock import MockLabProvider
from labs.registry import get_lab

# Session states (see the brief). A session moves READY -> RUNNING -> COMPLETED, or to EXPIRED /
# DESTROYED. VALIDATING/FAILED/CREATING/DESTROYING exist for providers that need them later.
CREATING, READY, RUNNING, VALIDATING, COMPLETED, FAILED, EXPIRED, DESTROYING, DESTROYED = (
    "CREATING", "READY", "RUNNING", "VALIDATING", "COMPLETED", "FAILED", "EXPIRED", "DESTROYING", "DESTROYED",
)


#: Live sessions one owner (account or guest) may hold at once. A guard, not a product limit: lab
#: starts are open to anonymous visitors, and session storage is in-memory.
MAX_LIVE_SESSIONS_PER_OWNER = 5


class LabError(Exception):
    """Carries a code the API maps to an HTTP status: not_found, unavailable, invalid."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class LabSession:
    id: str
    lab_id: str
    user_id: str
    status: str
    environment_id: str
    created_at: datetime
    expires_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    progress: dict[str, bool] = field(default_factory=dict)  # objective_id -> passed
    validation_results: list[dict] = field(default_factory=list)  # last result per objective
    findings: dict[str, Any] = field(default_factory=dict)

    def public_dict(self) -> dict[str, Any]:
        """View safe for the browser: no environment_id or provider internals."""
        return {
            "id": self.id,
            "lab_id": self.lab_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "expires_at": self.expires_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress": self.progress,
            "validation_results": self.validation_results,
            "findings": self.findings,
        }


# Only implemented providers may run. The client never chooses a provider; this maps a lab's
# server-side provider name to an instance, and refuses anything not built yet.
_PROVIDERS: dict[str, LabProvider] = {"mock": MockLabProvider()}


class SessionService:
    def __init__(self, providers: dict[str, LabProvider] | None = None) -> None:
        self._sessions: dict[str, LabSession] = {}
        self._providers = providers or _PROVIDERS

    def _provider_for(self, provider_name: str) -> LabProvider:
        provider = self._providers.get(provider_name)
        if provider is None:
            raise LabError("unavailable", f"Lab provider '{provider_name}' is not available.")
        return provider

    def _owned(self, session_id: str, user_id: str) -> LabSession:
        session = self._sessions.get(session_id)
        # Not found and not-yours are the same 404, so ownership can't be probed.
        if session is None or session.user_id != user_id:
            raise LabError("not_found", "Lab session not found.")
        self._expire_if_due(session)
        return session

    def _expire_if_due(self, session: LabSession) -> None:
        if session.status not in (COMPLETED, EXPIRED, DESTROYED) and _now() >= session.expires_at:
            session.status = EXPIRED

    async def start(self, lab_id: str, user_id: str) -> LabSession:
        lab = get_lab(lab_id)
        if lab is None:
            raise LabError("not_found", "Lab not found.")
        # Starting a lab is open to anonymous visitors, so every start sweeps finished sessions and
        # caps how many one owner may hold live. Without this, `_sessions` grows for as long as
        # anyone keeps calling start.
        await self.cleanup_expired()
        live = sum(1 for s in self._sessions.values()
                   if s.user_id == user_id and s.status in (CREATING, READY, RUNNING, VALIDATING))
        if live >= MAX_LIVE_SESSIONS_PER_OWNER:
            raise LabError("invalid", f"You already have {MAX_LIVE_SESSIONS_PER_OWNER} labs open. Exit one first.")
        provider = self._provider_for(lab.environment.provider)
        env = await provider.create_session(lab, user_id)
        now = _now()
        session = LabSession(
            id=f"sess-{secrets.token_hex(12)}",
            lab_id=lab_id,
            user_id=user_id,
            status=RUNNING,
            environment_id=env.id,
            created_at=now,
            started_at=now,
            expires_at=env.expires_at,
            progress={o.id: False for o in lab.objectives},
            validation_results=[],
        )
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str, user_id: str) -> LabSession:
        return self._owned(session_id, user_id)

    def record_findings(self, session_id: str, user_id: str, findings: dict[str, Any]) -> LabSession:
        session = self._owned(session_id, user_id)
        if session.status not in (READY, RUNNING):
            raise LabError("invalid", f"Cannot record findings while the session is {session.status}.")
        if not isinstance(findings, dict):
            raise LabError("invalid", "Findings must be an object.")
        # Merge so a student can record incrementally.
        session.findings.update(findings)
        return session

    async def validate(self, session_id: str, user_id: str) -> LabSession:
        session = self._owned(session_id, user_id)
        if session.status == EXPIRED:
            raise LabError("invalid", "This session has expired. Reset or start a new one.")
        lab = get_lab(session.lab_id)
        provider = self._provider_for(lab.environment.provider)
        results = []
        for objective in lab.objectives:
            result = await provider.validate_objective(session.environment_id, lab, objective.id, session.findings)
            session.progress[objective.id] = result.passed
            results.append({"objective_id": result.objective_id, "passed": result.passed, "message": result.message, "evidence": result.evidence})
        session.validation_results = results
        if all(session.progress.values()):
            session.status = COMPLETED
            session.completed_at = _now()
        return session

    async def reset(self, session_id: str, user_id: str) -> LabSession:
        session = self._owned(session_id, user_id)
        lab = get_lab(session.lab_id)
        provider = self._provider_for(lab.environment.provider)
        await provider.reset_session(session.environment_id)
        session.findings = {}
        session.validation_results = []
        session.progress = {o.id: False for o in lab.objectives}
        session.completed_at = None
        if session.status in (COMPLETED, EXPIRED, FAILED):
            session.status = RUNNING
        return session

    async def destroy(self, session_id: str, user_id: str) -> None:
        # Idempotent: destroying an unknown/foreign session is a silent no-op, never an error.
        session = self._sessions.get(session_id)
        if session is None or session.user_id != user_id:
            return
        lab = get_lab(session.lab_id)
        if lab is not None:
            await self._provider_for(lab.environment.provider).destroy_session(session.environment_id)
        session.status = DESTROYED
        self._sessions.pop(session_id, None)

    async def cleanup_expired(self) -> int:
        """Destroy the environments of expired/finished sessions and forget them.

        Safe to call repeatedly. A COMPLETED or FAILED session is kept until its window is over, so
        a learner can still read their results; after that the environment is gone anyway.
        """
        removed = 0
        for session in list(self._sessions.values()):
            self._expire_if_due(session)
            if session.status in (COMPLETED, FAILED) and _now() >= session.expires_at:
                session.status = EXPIRED
            if session.status in (EXPIRED, DESTROYED):
                lab = get_lab(session.lab_id)
                if lab is not None:
                    await self._provider_for(lab.environment.provider).destroy_session(session.environment_id)
                self._sessions.pop(session.id, None)
                removed += 1
        return removed


# One shared service for the app. Tests construct their own for isolation.
service = SessionService()
