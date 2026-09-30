"""MockLabProvider — a simulation that executes NOTHING.

It runs no commands, opens no sockets, pulls no images and exposes no shell. It only tracks a
fake environment lifecycle so the API, session service, validators and UI can be built and tested
end to end. Objectives are validated against the findings a student records, via the shared
outcome-based validators. This is the safe default until a reviewed DockerLabProvider exists on a
real execution host.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from labs.models import LabDefinition
from labs.providers.base import CommandResult, LabEnvironment, LabProvider, ValidationResult
from labs.scenarios import simulate_command
from labs.validators import VALIDATORS


class MockLabProvider(LabProvider):
    name = "mock"

    def __init__(self) -> None:
        self._envs: dict[str, LabEnvironment] = {}

    async def create_session(self, lab: LabDefinition, user_id: str) -> LabEnvironment:
        now = datetime.now(timezone.utc)
        env = LabEnvironment(
            id=f"mock-{secrets.token_hex(8)}",
            status="READY",
            created_at=now,
            expires_at=now + timedelta(minutes=lab.environment.max_runtime_minutes),
            internal={"simulated": True},
        )
        self._envs[env.id] = env
        return env

    async def get_session(self, environment_id: str) -> LabEnvironment | None:
        return self._envs.get(environment_id)

    async def reset_session(self, environment_id: str) -> None:
        env = self._envs.get(environment_id)
        if env:
            env.status = "READY"

    async def destroy_session(self, environment_id: str) -> None:
        # Idempotent: destroying an unknown/already-destroyed environment is fine.
        self._envs.pop(environment_id, None)

    async def validate_objective(
        self, environment_id: str, lab: LabDefinition, objective_id: str, findings: dict[str, Any]
    ) -> ValidationResult:
        objective = next((o for o in lab.objectives if o.id == objective_id), None)
        if objective is None:
            return ValidationResult(objective_id, False, "Unknown objective.", None)
        fn = VALIDATORS.get(objective.validator)
        if fn is None:  # guarded at load time; belt and braces
            return ValidationResult(objective_id, False, "No validator configured.", None)
        passed, message, evidence = fn(objective.args, findings)
        return ValidationResult(objective_id, passed, message, evidence)

    async def exec_command(
        self, environment_id: str, lab: LabDefinition, command: str, findings: dict[str, Any]
    ) -> CommandResult:
        # Pure interpretation of the scenario: matches the command string, executes nothing.
        return simulate_command(lab, command, findings)
