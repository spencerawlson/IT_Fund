"""Lab session service — the layer between the API and the provider.

Holds the per-user session lifecycle, findings and validation results, and enforces ownership and
expiry. Storage is behind a `LabSessionStore`: in-memory for dev/tests (fast, isolated) and the
shared database in production (`DbLabSessionStore`), so a session survives a restart and is visible
to every worker/instance. Selected by `_default_store()` (APP_ENV / LAB_SESSION_STORE). The API must
go through this service, never call a provider directly.
"""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from labs.models import LabError
from labs.providers.base import CommandResult, LabProvider
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

#: Optional host-wide ceiling on live sessions across ALL owners — defence-in-depth for the
#: in-memory store and a process-local backstop to the Docker provider's daemon-level container cap
#: (`LAB_DOCKER_MAX_CONTAINERS`). 0 (the default) leaves it unlimited so current behaviour is
#: unchanged; set LAB_MAX_TOTAL_SESSIONS to cap it.
MAX_LIVE_SESSIONS_TOTAL = max(0, int(os.environ.get("LAB_MAX_TOTAL_SESSIONS", "0") or 0))

#: Statuses that count as holding a live environment.
_LIVE_STATUSES = (CREATING, READY, RUNNING, VALIDATING)


class LabError(Exception):
    """Carries a code the API maps to an HTTP status: not_found, unavailable, invalid."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _merge_findings(dst: dict[str, Any], delta: dict[str, Any]) -> dict[str, Any]:
    """Accumulate outcome findings from a command into the session's findings.

    Unlike the shallow update used by manual recording, this unions ports by (target, port) so a
    later `-sV` scan upgrades earlier entries with versions instead of replacing them, and appends
    research notes. Everything a learner discovers is kept."""
    for key, val in delta.items():
        if key == "ports" and isinstance(val, list):
            index = {(p.get("target"), p.get("port")): p for p in dst.get("ports", [])}
            for p in val:
                k = (p.get("target"), p.get("port"))
                if k in index:
                    for field_name in ("service", "version"):
                        if p.get(field_name):
                            index[k][field_name] = p[field_name]
                else:
                    index[k] = dict(p)
            dst["ports"] = list(index.values())
        elif key == "hosts" and isinstance(val, dict):
            hosts = dst.setdefault("hosts", {})
            for host, state in val.items():
                hosts.setdefault(host, {}).update(state if isinstance(state, dict) else {})
        elif key == "research" and isinstance(val, list):
            dst["research"] = (dst.get("research") or []) + val
        else:
            dst[key] = val
    return dst


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
    # Provider actually chosen for this session (resolved once at start). A lab may prefer Docker
    # but fall back to mock when no daemon is present; every later call (exec/validate/reset/
    # destroy) must use the SAME provider the environment was created on, not re-derive it.
    provider: str = "mock"
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


def _build_providers() -> dict[str, LabProvider]:
    import os

    providers: dict[str, LabProvider] = {"mock": MockLabProvider()}
    # The Docker provider only registers on hosts that opted in (LAB_DOCKER_ENABLED=1) with a
    # reachable daemon; otherwise a lab naming provider="docker" fails "unavailable".
    if os.environ.get("LAB_DOCKER_ENABLED") == "1":
        from labs.providers.docker import DockerLabProvider

        providers["docker"] = DockerLabProvider()
    return providers


# Only implemented providers may run. The client never chooses a provider; this maps a lab's
# server-side provider name to an instance, and refuses anything not built yet.
_PROVIDERS: dict[str, LabProvider] = _build_providers()


# ---------------------------------------------------------------------------
# Session storage
# ---------------------------------------------------------------------------
# The service talks to storage only through a LabSessionStore, so the same logic runs whether
# sessions live in this process's memory (dev/tests: fast, isolated) or in the shared database
# (production: durable across restarts and visible to every worker/instance). The store holds the
# LabSession dataclass as its unit; the DB store converts it to and from a `lab_sessions` row.


class InMemoryLabSessionStore:
    """Per-process dict. The default: fast and isolated, but a session vanishes on restart and is
    invisible to other workers — fine for a single dev process and for tests, not for prod."""

    def __init__(self) -> None:
        self._sessions: dict[str, LabSession] = {}

    def get(self, session_id: str) -> LabSession | None:
        return self._sessions.get(session_id)

    def save(self, session: LabSession) -> None:
        self._sessions[session.id] = session

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def all(self) -> list[LabSession]:
        return list(self._sessions.values())

    def live_count(self, owner_id: str | None = None) -> int:
        return sum(1 for s in self._sessions.values()
                   if s.status in _LIVE_STATUSES and (owner_id is None or s.user_id == owner_id))

    def clear(self) -> None:
        self._sessions.clear()


def _as_utc(dt: datetime | None) -> datetime | None:
    # SQLite drops tzinfo on round-trip; treat a naive value as UTC so comparisons with _now()
    # (tz-aware) never raise "can't compare offset-naive and offset-aware datetimes".
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class DbLabSessionStore:
    """Shared, durable storage in the app database (`lab_sessions`). Every operation is its own
    short transaction, so writes from any worker are immediately visible to the others. Concurrent
    writes to the same session are last-writer-wins, which is fine: one learner's terminal is
    sequential."""

    def _row_to_session(self, row) -> LabSession:
        return LabSession(
            id=row.id, lab_id=row.lab_id, user_id=row.owner_id, status=row.status,
            environment_id=row.environment_id, provider=row.provider,
            created_at=_as_utc(row.created_at), expires_at=_as_utc(row.expires_at),
            started_at=_as_utc(row.started_at), completed_at=_as_utc(row.completed_at),
            progress=dict(row.progress or {}), validation_results=list(row.validation_results or []),
            findings=dict(row.findings or {}),
        )

    def get(self, session_id: str) -> LabSession | None:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            row = s.get(Row, session_id)
            return self._row_to_session(row) if row is not None else None

    def save(self, session: LabSession) -> None:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            row = s.get(Row, session.id)
            if row is None:
                row = Row(id=session.id)
                s.add(row)
            row.lab_id = session.lab_id
            row.owner_id = session.user_id
            row.status = session.status
            row.environment_id = session.environment_id
            row.provider = session.provider
            row.created_at = session.created_at
            row.started_at = session.started_at
            row.completed_at = session.completed_at
            row.expires_at = session.expires_at
            # New objects each time so SQLAlchemy detects the change (JSON is mutable-in-place).
            row.progress = dict(session.progress)
            row.validation_results = list(session.validation_results)
            row.findings = dict(session.findings)
            s.commit()

    def delete(self, session_id: str) -> None:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            row = s.get(Row, session_id)
            if row is not None:
                s.delete(row)
                s.commit()

    def all(self) -> list[LabSession]:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            return [self._row_to_session(r) for r in s.query(Row).all()]

    def live_count(self, owner_id: str | None = None) -> int:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            q = s.query(Row).filter(Row.status.in_(_LIVE_STATUSES))
            if owner_id is not None:
                q = q.filter(Row.owner_id == owner_id)
            return q.count()

    def clear(self) -> None:
        import db
        from db_models import LabSession as Row
        with db.SessionLocal() as s:
            s.query(Row).delete()
            s.commit()


def _default_store():
    """DB-backed in production (durable, shared across workers); in-memory otherwise. Force the DB
    store anywhere with LAB_SESSION_STORE=db (e.g. a multi-worker staging host on SQLite)."""
    choice = os.environ.get("LAB_SESSION_STORE", "").lower()
    if choice == "db" or (choice != "memory" and os.environ.get("APP_ENV", "development").lower() == "production"):
        return DbLabSessionStore()
    return InMemoryLabSessionStore()


class SessionService:
    def __init__(self, providers: dict[str, LabProvider] | None = None, store=None) -> None:
        self._store = store if store is not None else InMemoryLabSessionStore()
        self._providers = providers or _PROVIDERS

    @property
    def _sessions(self) -> dict[str, LabSession]:
        """Back-compat accessor for the in-memory store's dict (tests inspect it directly)."""
        return self._store._sessions

    def _provider_for(self, provider_name: str) -> LabProvider:
        provider = self._providers.get(provider_name)
        if provider is None:
            raise LabError("unavailable", f"Lab provider '{provider_name}' is not available.")
        return provider

    def _effective_provider_name(self, lab) -> str:
        """Resolve which provider a lab actually runs on, given what's available here.

        A lab's explicit `provider` is honoured as-is. The softer `prefers_docker` opt-in upgrades
        a lab to real Docker execution only when the Docker provider is registered (daemon present
        and LAB_DOCKER_ENABLED=1); on every other host it transparently stays on the mock shell, so
        the same lab definition works identically whether or not Docker exists. A lab that both
        names provider="docker" and is missing the daemon still fails loudly via `_provider_for`."""
        env = lab.environment
        if getattr(env, "prefers_docker", False) and "docker" in self._providers:
            return "docker"
        return env.provider

    def _owned(self, session_id: str, user_id: str) -> LabSession:
        session = self._store.get(session_id)
        # Not found and not-yours are the same 404, so ownership can't be probed.
        if session is None or session.user_id != user_id:
            raise LabError("not_found", "Lab session not found.")
        if self._expire_if_due(session):
            self._store.save(session)
        return session

    def _expire_if_due(self, session: LabSession) -> bool:
        """Flip a past-its-window session to EXPIRED. Returns whether it changed (so the caller can
        persist it)."""
        if session.status not in (COMPLETED, EXPIRED, DESTROYED) and _now() >= session.expires_at:
            session.status = EXPIRED
            return True
        return False

    async def start(self, lab_id: str, user_id: str) -> LabSession:
        lab = get_lab(lab_id)
        if lab is None:
            raise LabError("not_found", "Lab not found.")
        # Starting a lab is open to anonymous visitors, so every start sweeps finished sessions and
        # caps how many one owner may hold live. Without this, `_sessions` grows for as long as
        # anyone keeps calling start.
        await self.cleanup_expired()
        if self._store.live_count(user_id) >= MAX_LIVE_SESSIONS_PER_OWNER:
            raise LabError("invalid", f"You already have {MAX_LIVE_SESSIONS_PER_OWNER} labs open. Exit one first.")
        # Host-wide ceiling (defence-in-depth; the Docker provider enforces its own daemon-level cap).
        if MAX_LIVE_SESSIONS_TOTAL and self._store.live_count() >= MAX_LIVE_SESSIONS_TOTAL:
            raise LabError("unavailable",
                           "All lab environments are in use right now. Please try again in a few minutes.")
        provider_name = self._effective_provider_name(lab)
        provider = self._provider_for(provider_name)
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
            provider=provider_name,
            progress={o.id: False for o in lab.objectives},
            validation_results=[],
        )
        self._store.save(session)
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
        self._store.save(session)
        return session

    async def validate(self, session_id: str, user_id: str) -> LabSession:
        session = self._owned(session_id, user_id)
        if session.status == EXPIRED:
            raise LabError("invalid", "This session has expired. Reset or start a new one.")
        await self._run_validation(session)
        return session

    async def _run_validation(self, session: LabSession) -> LabSession:
        """Re-validate every objective against the current findings and mark completion.

        Shared by `validate` (explicit "Check my work") and `exec_command` (so the terminal ticks
        objectives off live as the learner discovers things). Never un-completes a session."""
        lab = get_lab(session.lab_id)
        provider = self._provider_for(session.provider)
        results = []
        for objective in lab.objectives:
            result = await provider.validate_objective(session.environment_id, lab, objective.id, session.findings)
            session.progress[objective.id] = result.passed
            results.append({"objective_id": result.objective_id, "passed": result.passed, "message": result.message, "evidence": result.evidence})
        session.validation_results = results
        if all(session.progress.values()) and session.status != COMPLETED:
            session.status = COMPLETED
            session.completed_at = _now()
        self._store.save(session)
        return session

    async def exec_command(self, session_id: str, user_id: str, command: str) -> tuple[LabSession, CommandResult]:
        """Run one command in the lab's (simulated) shell, merge any findings it established, then
        re-validate so objectives update live. Returns the session and the command result."""
        session = self._owned(session_id, user_id)
        if session.status not in (READY, RUNNING, COMPLETED):
            raise LabError("invalid", f"Cannot run commands while the session is {session.status}.")
        if not isinstance(command, str):
            raise LabError("invalid", "Command must be a string.")
        lab = get_lab(session.lab_id)
        provider = self._provider_for(session.provider)
        result = await provider.exec_command(session.environment_id, lab, command, session.findings)
        if result.findings:
            _merge_findings(session.findings, result.findings)
            await self._run_validation(session)
        return session, result

    async def reset(self, session_id: str, user_id: str) -> LabSession:
        session = self._owned(session_id, user_id)
        lab = get_lab(session.lab_id)
        provider = self._provider_for(session.provider)
        await provider.reset_session(session.environment_id)
        session.findings = {}
        session.validation_results = []
        session.progress = {o.id: False for o in lab.objectives}
        session.completed_at = None
        if session.status in (COMPLETED, EXPIRED, FAILED):
            session.status = RUNNING
        self._store.save(session)
        return session

    async def destroy(self, session_id: str, user_id: str) -> None:
        # Idempotent: destroying an unknown/foreign session is a silent no-op, never an error.
        session = self._store.get(session_id)
        if session is None or session.user_id != user_id:
            return
        provider = self._providers.get(session.provider)
        if provider is not None:
            await provider.destroy_session(session.environment_id)
        self._store.delete(session_id)

    async def cleanup_expired(self) -> int:
        """Destroy the environments of expired/finished sessions and forget them.

        Safe to call repeatedly. A COMPLETED or FAILED session is kept until its window is over, so
        a learner can still read their results; after that the environment is gone anyway.
        """
        removed = 0
        for session in self._store.all():
            changed = self._expire_if_due(session)
            if session.status in (COMPLETED, FAILED) and _now() >= session.expires_at:
                session.status = EXPIRED
                changed = True
            if session.status in (EXPIRED, DESTROYED):
                provider = self._providers.get(session.provider)
                if provider is not None:
                    await provider.destroy_session(session.environment_id)
                self._store.delete(session.id)
                removed += 1
            elif changed:
                self._store.save(session)
        return removed


# One shared service for the app: DB-backed in production (durable, shared across workers),
# in-memory otherwise. Tests construct their own with an explicit store for isolation.
service = SessionService(store=_default_store())
