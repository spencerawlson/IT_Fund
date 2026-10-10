"""Lab domain model.

Plain dataclasses, no web framework, so the orchestrator stays testable and portable. A lab is
data: the definition names the objectives and the (server-controlled) target and environment. The
client never chooses the image, target or provider; it only names a lab id.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal

LabCategory = Literal["networking", "linux", "cybersecurity", "cloud", "python", "portblast", "devops"]
LabDifficulty = Literal["beginner", "intermediate", "advanced"]


@dataclass(frozen=True)
class LabObjective:
    id: str
    label: str
    validator: str  # name resolved via validators.VALIDATORS; unknown names are rejected at load
    description: str | None = None
    args: dict[str, Any] = field(default_factory=dict)
    hints: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class LabTarget:
    hostname: str
    role: str
    intentionally_vulnerable: bool = False


@dataclass(frozen=True)
class LabEnvironmentConfig:
    provider: str = "mock"
    image: str | None = None
    cpu_limit: float = 1.0
    memory_mb: int = 512
    idle_timeout_minutes: int = 15
    max_runtime_minutes: int = 45
    deny_internet_egress: bool = True  # cyber labs must default to no outbound internet
    # Working directory for commands run by a real provider (docker exec).
    # Lab images run as a non-root user, so this must be a directory that user
    # can write to (their home). The mock provider ignores it. Defaults to the
    # historical value so existing behaviour is unchanged.
    workdir: str = "/root"


@dataclass(frozen=True)
class LabDefinition:
    id: str
    slug: str
    title: str
    description: str
    category: LabCategory
    difficulty: LabDifficulty
    estimated_minutes: int
    environment: LabEnvironmentConfig
    targets: list[LabTarget] = field(default_factory=list)
    objectives: list[LabObjective] = field(default_factory=list)
    #: Which simulated shell drives this lab's terminal (see labs/shells). None = no terminal
    #: (the lab uses another workbench). E.g. "linux_recon", "cisco_ios", "linux_net".
    shell: str | None = None

    def public_dict(self) -> dict[str, Any]:
        """Serialisable view safe to send to the browser: no image, no provider internals.

        `environment.live` tells the client the lab really executes (Docker) instead of
        simulating, so the UI can offer attestation; the image name stays server-side.
        Objective `validator` keys are opaque finding names — the client needs them to
        record attested findings for live labs.
        """
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "difficulty": self.difficulty,
            "estimated_minutes": self.estimated_minutes,
            "environment": {
                "idle_timeout_minutes": self.environment.idle_timeout_minutes,
                "max_runtime_minutes": self.environment.max_runtime_minutes,
                "deny_internet_egress": self.environment.deny_internet_egress,
                "live": self.environment.provider == "docker",
            },
            "targets": [asdict(t) for t in self.targets],
            "objectives": [
                {"id": o.id, "label": o.label, "description": o.description, "hints": o.hints,
                 "validator": o.validator}
                for o in self.objectives
            ],
        }


class LabError(Exception):
    """Carries a code the API maps to an HTTP status: not_found, unavailable, invalid."""
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
