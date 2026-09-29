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
