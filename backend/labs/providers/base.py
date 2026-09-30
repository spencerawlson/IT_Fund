"""LabProvider abstraction.

Road to CISSP depends on this interface, never on a concrete runtime, so labs can move from the
mock to Docker, Proxmox or Kubernetes later without touching the API or the session service
(API -> Lab Service -> LabProvider -> runtime).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from labs.models import LabDefinition


@dataclass
class LabEnvironment:
    """A running (or simulated) environment for one session. Holds no secrets that could reach a
    browser: no connection strings, socket paths or credentials live here."""

    id: str
    status: str
    created_at: datetime
    expires_at: datetime
    # Provider-internal detail (e.g. a container id). Never serialised to the client.
    internal: dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    objective_id: str
    passed: bool
    message: str
    evidence: Any | None = None


@dataclass
class CommandResult:
    """The result of one command run in a lab's shell.

    `output` is the terminal text to show the learner. `findings` are outcome facts the command
    established (host up, ports, services, versions...), merged into the session so the same
    outcome-based validators pass whether the learner used the terminal or recorded findings by
    hand. A real provider fills `output` from the tool's real stdout and `findings` from parsing it
    (or leaves `findings` empty and lets `validate_objective` read live state); the mock derives
    both from a fixed scenario. `clear` asks the client to wipe the screen (e.g. `clear`)."""

    output: str
    findings: dict[str, Any] = field(default_factory=dict)
    exit_code: int = 0
    clear: bool = False


class LabProvider(ABC):
    """Create, inspect, reset and destroy lab environments, and validate objectives against the
    environment's resulting STATE (not against which commands a student typed)."""

    name: str = "base"

    @abstractmethod
    async def create_session(self, lab: LabDefinition, user_id: str) -> LabEnvironment: ...

    @abstractmethod
    async def get_session(self, environment_id: str) -> LabEnvironment | None: ...

    @abstractmethod
    async def reset_session(self, environment_id: str) -> None: ...

    @abstractmethod
    async def destroy_session(self, environment_id: str) -> None:
        """Must be idempotent: destroying an unknown or already-destroyed environment is a no-op."""

    @abstractmethod
    async def validate_objective(
        self, environment_id: str, lab: LabDefinition, objective_id: str, findings: dict[str, Any]
    ) -> ValidationResult: ...

    async def exec_command(
        self, environment_id: str, lab: LabDefinition, command: str, findings: dict[str, Any]
    ) -> CommandResult:
        """Run one command in the environment's shell and report its output and any findings.

        Optional: providers for labs without a terminal (e.g. device-config labs) inherit this
        default. `command` is untrusted learner input; a simulated provider must only pattern-match
        it, never execute it. `findings` is the session's current recorded state (read-only here),
        so a command can reflect it (e.g. comparing two prior results)."""
        return CommandResult(output=f"{command.split()[0] if command.split() else command}: "
                             "this lab has no interactive shell.", exit_code=127)
