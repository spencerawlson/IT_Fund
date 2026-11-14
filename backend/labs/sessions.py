"""Lab session service — the layer between the API and the provider.

Holds the per-user session lifecycle, findings and validation results, and enforces ownership and
expiry. Storage is in-memory for now, matching the current backend (no database yet); when C3 adds
Postgres this is the single place that swaps to persistent storage, and the API above it does not
change. The API must go through this service, never call a provider directly.
"""
from __future__ import annotations

import asyncio
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

#: Live *Docker* sessions one owner may hold at once. Containers cost real RAM/CPU
#: (512MB each), so this is tighter than the general cap. Mock sessions are cheap.
MAX_LIVE_DOCKER_SESSIONS_PER_OWNER = 3

#: GLOBAL cap on live Docker sessions across ALL owners (L-06). Guest ids are
#: client-chosen cookies, so rotating the cookie defeats every per-owner cap;
#: this backstop bounds total host exhaustion regardless of identity. 50 is a
#: host-exhaustion ceiling, not a product limit — the per-owner caps above are
#: the normal limit, and this only bites when identities are rotated to evade
#: them. Lower it on a smaller host (50 x 512 MB is ~25 GB worst case).
MAX_LIVE_DOCKER_SESSIONS_GLOBAL = 50

#: Top-level findings key a client may write freely (L-01). Everything else a
#: validator reads (config, ports, hosts, _siem, portblast, flags, ...) is
#: server-derived: only the provider/exec path may write it. Client POSTs that
#: carry other keys are handled in record_findings: dropped for mock labs,
#: accepted as explicit attestation (and marked) for Docker labs, whose exec
#: returns no findings.
CLIENT_FINDINGS_NAMESPACE = "notes"


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


def _merge_notes(dst: dict[str, Any], notes: Any) -> None:
    """Accumulate free-form learner notes under the `notes` key (L-01).

    The only client-writable findings namespace. Dicts merge, strings append
    (newline-separated), lists extend; anything else replaces."""
    existing = dst.get(CLIENT_FINDINGS_NAMESPACE)
    if existing is None:
        dst[CLIENT_FINDINGS_NAMESPACE] = notes
    elif isinstance(existing, dict) and isinstance(notes, dict):
        existing.update(notes)
    elif isinstance(existing, str) and isinstance(notes, str):
        dst[CLIENT_FINDINGS_NAMESPACE] = existing + "\n" + notes
    elif isinstance(existing, list) and isinstance(notes, list):
        existing.extend(notes)
    else:
        dst[CLIENT_FINDINGS_NAMESPACE] = notes


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
    # True when any validator-read finding in this session came from a client
    # POST (explicit "I did this" attestation) rather than server-side exec.
    # Docker labs can only complete that way today (their exec returns no
    # findings); the flag is persisted on LabCompletion so history can tell
    # attested completions from evidenced ones. Mock labs never set it: their
    # findings are server-derived from the simulated shell.
    attested: bool = False

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
            "attested": self.attested,
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


class SessionService:
    def __init__(self, providers: dict[str, LabProvider] | None = None) -> None:
        self._sessions: dict[str, LabSession] = {}
        self._providers = providers or _PROVIDERS
        # One exec lock per session (created lazily): see _exec_lock.
        self._exec_locks: dict[str, asyncio.Lock] = {}

    def _exec_lock(self, session_id: str) -> asyncio.Lock:
        """The lock serializing execs for one session.

        Each exec reads the session findings, mutates its own copy, and
        merges it back — without serialization two overlapping execs read
        the same pre-state and the second merge overwrites the first
        (last-writer-wins), so a command silently vanishes. The firewall
        console's rapid taps hit exactly this: two sequences interleaved
        their execs. Different sessions never block each other."""
        lock = self._exec_locks.get(session_id)
        if lock is None:
            lock = asyncio.Lock()
            self._exec_locks[session_id] = lock
        return lock

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
        # Docker containers cost real host resources: cap those separately and tighter.
        if lab.environment.provider == "docker":
            def _is_live_docker(s, owner_id: str | None = None) -> bool:
                if owner_id is not None and s.user_id != owner_id:
                    return False
                if s.status not in (CREATING, READY, RUNNING, VALIDATING):
                    return False
                other = get_lab(s.lab_id)
                return other is not None and other.environment.provider == "docker"

            if sum(1 for s in self._sessions.values() if _is_live_docker(s, user_id)) >= MAX_LIVE_DOCKER_SESSIONS_PER_OWNER:
                raise LabError("invalid",
                               f"You already have {MAX_LIVE_DOCKER_SESSIONS_PER_OWNER} live container labs open. "
                               "Exit one first.")
            # L-06 global backstop: per-owner caps are keyed by a client-chosen
            # guest cookie, so rotating the cookie defeats them. This cap counts
            # live Docker sessions across ALL owners and refuses past the limit
            # no matter how many identities the caller mints.
            if sum(1 for s in self._sessions.values() if _is_live_docker(s)) >= MAX_LIVE_DOCKER_SESSIONS_GLOBAL:
                raise LabError("invalid",
                               "Too many live container labs are running right now. "
                               "Try again shortly.")
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
        """Record client-posted findings (L-01 split).

        A client POST may ONLY write free-form learner notes, under the
        `notes` key. Every validator-read key (config, ports, hosts, _siem,
        portblast, flags, ...) is server-derived and is NOT writable here:
        - Mock labs: such keys are DROPPED. Mock exec derives findings
          server-side from the simulated shell, so mock labs stay completable
          through real work and can no longer be forged by POST.
        - Docker labs: exec returns no findings, so the explicit "I did this"
          attestation path is preserved — validator-read keys are accepted,
          but the session is marked `attested`, and the completion is recorded
          as attested (see LabCompletion.attested), not as evidenced. Full
          server-side probes are a roadmap project; until they exist, Docker
          completions stay attestation-based BY DESIGN and are labelled so.
        """
        session = self._owned(session_id, user_id)
        if session.status not in (READY, RUNNING):
            raise LabError("invalid", f"Cannot record findings while the session is {session.status}.")
        if not isinstance(findings, dict):
            raise LabError("invalid", "Findings must be an object.")
        lab = get_lab(session.lab_id)
        if CLIENT_FINDINGS_NAMESPACE in findings:
            _merge_notes(session.findings, findings[CLIENT_FINDINGS_NAMESPACE])
        validator_keys = {k: v for k, v in findings.items() if k != CLIENT_FINDINGS_NAMESPACE}
        if validator_keys:
            if lab is not None and lab.environment.provider == "mock":
                # Forged validator findings for a mock lab: silently dropped.
                # (The response still shows the session, with notes merged.)
                pass
            else:
                # Docker lab attestation: accepted, but provenance is recorded.
                session.findings.update(validator_keys)
                session.attested = True
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
        provider = self._provider_for(lab.environment.provider)
        results = []
        for objective in lab.objectives:
            result = await provider.validate_objective(session.environment_id, lab, objective.id, session.findings)
            session.progress[objective.id] = result.passed
            results.append({"objective_id": result.objective_id, "passed": result.passed, "message": result.message, "evidence": result.evidence})
        session.validation_results = results
        if all(session.progress.values()) and session.status != COMPLETED:
            session.status = COMPLETED
            session.completed_at = _now()
        return session

    async def exec_command(self, session_id: str, user_id: str, command: str) -> tuple[LabSession, CommandResult]:
        """Run one command in the lab's (simulated) shell, merge any findings it established, then
        re-validate so objectives update live. Returns the session and the command result."""
        session = self._owned(session_id, user_id)
        if session.status not in (READY, RUNNING, COMPLETED):
            raise LabError("invalid", f"Cannot run commands while the session is {session.status}.")
        if not isinstance(command, str):
            raise LabError("invalid", "Command must be a string.")
        # Serialized per session (see _exec_lock): the read-mutate-merge
        # below must not interleave with another exec on this session.
        async with self._exec_lock(session_id):
            lab = get_lab(session.lab_id)
            provider = self._provider_for(lab.environment.provider)
            result = await provider.exec_command(session.environment_id, lab, command, session.findings)
            if result.findings:
                _merge_findings(session.findings, result.findings)
                await self._run_validation(session)
            return session, result

    async def reset(self, session_id: str, user_id: str) -> LabSession:
        session = self._owned(session_id, user_id)
        lab = get_lab(session.lab_id)
        provider = self._provider_for(lab.environment.provider)
        await provider.reset_session(session.environment_id)
        session.findings = {}
        session.validation_results = []
        session.progress = {o.id: False for o in lab.objectives}
        session.completed_at = None
        session.attested = False
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
        self._exec_locks.pop(session_id, None)

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
                self._exec_locks.pop(session.id, None)
                removed += 1
        return removed


# One shared service for the app. Tests construct their own for isolation.
service = SessionService()
