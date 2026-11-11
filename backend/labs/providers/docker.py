"""DockerLabProvider — real container execution for interactive labs.

One Docker container per lab session, created from the lab definition's image. This is the
provider the mock was always a stand-in for: commands actually run, in a real (tool-bearing)
container, isolated per learner.

Security posture (this endpoint runs untrusted learner input):
  - No privileged containers, ever. All Linux capabilities are dropped and
    `no-new-privileges` is set, so a container breakout buys the attacker nothing.
  - Resource bounds from the lab definition: CPU (`nano_cpus`) and memory (`mem_limit`),
    plus a PID limit so a fork bomb dies inside the container.
  - Network isolation: labs with `deny_internet_egress=True` (the default, and mandatory
    for cyber labs) are attached to an *internal-only* Docker network — no outbound
    internet, no route to the host's LAN. The learner's container cannot scan the host.
    Each session gets its OWN network (created at start, deleted at destroy), so one
    learner's container cannot reach another learner's container either; a reused
    network whose `internal` flag mismatches the lab's requirement is refused.
  - Exec timeout is enforced inside the container by coreutils `timeout(1)` (present
    in every lab image: all bases are Debian/python slim, which ship coreutils), with
    SIGKILL 5 s after the grace period — `asyncio.wait_for` alone cannot kill the
    blocking exec thread, so it is only a backstop for a hung daemon.
  - The Docker socket is never exposed inside the container; learners cannot manage Docker.
  - Output of every exec is truncated (32 KB) so a runaway command can't flood memory.
  - The client never chooses the image, the command's working context, or the provider —
    those all come from the server-side lab definition.

Availability: the provider is only registered when `LAB_DOCKER_ENABLED=1` is set on the
host AND the `docker` SDK can reach a daemon. Otherwise labs that name `provider="docker"`
fail with "unavailable" and the mock keeps serving everything else.

Blocking I/O: the Docker SDK is synchronous, so every daemon call runs in a thread
(`asyncio.to_thread`) to keep the event loop responsive.
"""
from __future__ import annotations

import asyncio
import hashlib
import secrets
import shlex
from datetime import datetime, timedelta, timezone
from typing import Any

from labs.models import LabDefinition, LabError
from labs.providers.base import CommandResult, LabEnvironment, LabProvider, ValidationResult
from labs.validators import VALIDATORS

#: `docker exec` output kept per command; more is truncated with a notice.
MAX_OUTPUT_CHARS = 32 * 1024
#: Seconds a single command may run before it is killed.
EXEC_TIMEOUT_SECONDS = 60
#: Grace period `timeout(1)` gives the command after SIGTERM before SIGKILL.
EXEC_TIMEOUT_KILL_AFTER_SECONDS = 5
#: Backstop for a hung daemon: `timeout(1)` should already have killed the
#: command by EXEC_TIMEOUT_SECONDS + EXEC_TIMEOUT_KILL_AFTER_SECONDS; only a
#: daemon that never returns trips this, and the message says so honestly.
EXEC_WAIT_SECONDS = EXEC_TIMEOUT_SECONDS + EXEC_TIMEOUT_KILL_AFTER_SECONDS + 5

#: Lab whose CTF flags are generated per session (L-01b). The provider injects
#: them as container env vars at start and keeps the expected values server-side;
#: the seed app reads them from the environment and ships no flag literals.
CTF_FLAG_LAB_ID = "sec-pentest-web-001"


def _new_ctf_flags() -> dict[str, str]:
    """Fresh random flags for one pentest-web session (FLAG-<KIND>-<6 hex>)."""
    return {
        "sqli": f"FLAG-SQLI-{secrets.token_hex(3)}",
        "idor": f"FLAG-IDOR-{secrets.token_hex(3)}",
        "cmdi": f"FLAG-CMDI-{secrets.token_hex(3)}",
    }


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DockerLabProvider(LabProvider):
    name = "docker"

    def __init__(self, network_name: str | None = None) -> None:
        # No daemon contact here: __init__ must stay cheap and import-safe. The client is
        # created lazily on first use so a missing/broken Docker doesn't break app startup.
        import os

        self._network_name = network_name or os.environ.get("LAB_DOCKER_NETWORK", "rtc-labs-internal")
        self._client: Any = None
        self._client_failed: str | None = None
        # environment_id -> last activity (for idle expiry)
        self._last_used: dict[str, datetime] = {}
        # environment_id -> per-session Docker network name (deleted in destroy_session)
        self._session_networks: dict[str, str] = {}
        # environment_id -> expected per-session CTF flags (sec-pentest-web-001 only)
        self._session_flags: dict[str, dict[str, str]] = {}

    # ---------- daemon access ----------

    def _client_or_raise(self) -> Any:
        if self._client is not None:
            return self._client
        if self._client_failed is not None:
            raise LabError("unavailable", f"Docker is not available: {self._client_failed}")
        try:
            import docker  # noqa: PLC0415  (optional dependency)
        except ImportError:
            self._client_failed = "the 'docker' package is not installed"
            raise LabError("unavailable", "Docker is not available: the 'docker' package is not installed")
        try:
            client = docker.from_env()
            client.ping()
        except Exception as exc:  # noqa: BLE001  (daemon unreachable, bad socket, ...)
            self._client_failed = str(exc) or type(exc).__name__
            raise LabError("unavailable", f"Docker is not available: {self._client_failed}")
        self._client = client
        return client

    def _container(self, environment_id: str) -> Any:
        """The live container for an environment id, or None if it's gone."""
        client = self._client_or_raise()
        container_id = environment_id.removeprefix("docker-")
        try:
            container = client.containers.get(container_id)
        except Exception:  # not found (docker.errors.NotFound) or daemon hiccup
            return None
        return container

    def _ensure_network(self, client: Any, internal: bool, name: str | None = None) -> Any:
        """Return the named network, creating it if absent.

        Fail closed on reuse: if a network with that name already exists, its
        `internal` flag must match the lab's requirement — a pre-existing
        non-internal network must never silently give an egress-denied lab
        internet access (L-04). A network whose flag cannot be verified is
        refused for the same reason.
        """
        name = name or self._network_name
        for net in client.networks.list(names=[name]):
            attrs = getattr(net, "attrs", None)
            existing = attrs.get("Internal") if isinstance(attrs, dict) else getattr(net, "internal", None)
            if existing is None:
                raise LabError(
                    "unavailable",
                    f"Docker network '{name}' exists but its internal flag could not be verified; "
                    "refusing to reuse it.",
                )
            if bool(existing) != bool(internal):
                raise LabError(
                    "unavailable",
                    f"Docker network '{name}' exists with internal={bool(existing)}, but this lab "
                    f"requires internal={bool(internal)}; refusing to reuse it.",
                )
            return net
        return client.networks.create(name, internal=internal, labels={"rtc": "labs"})

    # ---------- LabProvider interface ----------

    async def create_session(self, lab: LabDefinition, user_id: str) -> LabEnvironment:
        client = self._client_or_raise()
        image = lab.environment.image
        if not image:
            raise LabError("invalid", f"Lab '{lab.id}' has no container image configured.")
        env_cfg = lab.environment
        now = _now()
        # One network per session (L-04): a random name, internal=<deny_egress>,
        # deleted in destroy_session. Two sessions never share a network.
        network_name = f"rtc-labs-{secrets.token_hex(6)}"
        # Per-session CTF flags (L-01b): generated here, injected as env vars so
        # the seed app can read them, and kept server-side for validation. The
        # image itself ships no flag values.
        session_flags = _new_ctf_flags() if lab.id == CTF_FLAG_LAB_ID else None
        flag_env = (
            {
                "CTF_FLAG_SQLI": session_flags["sqli"],
                "CTF_FLAG_IDOR": session_flags["idor"],
                "CTF_FLAG_CMDI": session_flags["cmdi"],
            }
            if session_flags is not None
            else None
        )

        def _create() -> tuple[Any, Any]:
            try:
                client.images.get(image)
            except Exception:
                try:
                    client.images.pull(image)
                except Exception as exc:
                    raise LabError("unavailable", f"Lab image '{image}' is not available: {exc}")
            network = self._ensure_network(client, internal=env_cfg.deny_internet_egress, name=network_name)
            owner = hashlib.sha256(user_id.encode()).hexdigest()[:16]
            container = client.containers.run(
                image,
                command="sleep infinity",
                detach=True,
                name=f"rtc-lab-{hashlib.sha256(str(now.timestamp()).encode()).hexdigest()[:12]}",
                network=network.name,
                environment=flag_env,
                mem_limit=f"{env_cfg.memory_mb}m",
                nano_cpus=int(env_cfg.cpu_limit * 1_000_000_000),
                pids_limit=256,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges:true"],
                tmpfs={"/tmp": "size=64m,mode=1777"},
                # Stable target hostnames (e.g. target.lab -> 127.0.0.1) for labs
                # whose "remote" target is a service inside the same container.
                extra_hosts=(env_cfg.extra_hosts or None),
                labels={"rtc": "labs", "rtc.lab": lab.id, "rtc.owner": owner},
            )
            return container, network

        try:
            container, network = await asyncio.to_thread(_create)
        except LabError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LabError("unavailable", f"Could not start the lab environment: {exc}")

        env_id = f"docker-{container.id[:12]}"
        env = LabEnvironment(
            id=env_id,
            status="RUNNING",
            created_at=now,
            expires_at=now + timedelta(minutes=env_cfg.max_runtime_minutes),
            internal={"container_id": container.id, "lab_id": lab.id},
        )
        self._last_used[env_id] = now
        self._session_networks[env_id] = network.name
        if session_flags is not None:
            self._session_flags[env_id] = session_flags
        return env

    async def get_session(self, environment_id: str) -> LabEnvironment | None:
        def _inspect() -> LabEnvironment | None:
            container = self._container(environment_id)
            if container is None:
                return None
            container.reload()
            status = {"running": "RUNNING", "paused": "PAUSED"}.get(container.status, "STOPPED")
            created = container.attrs.get("Created", "")
            try:
                created_at = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except ValueError:
                created_at = _now()
            return LabEnvironment(
                id=environment_id,
                status=status,
                created_at=created_at,
                expires_at=created_at + timedelta(hours=1),
                internal={"container_id": container.id},
            )

        return await asyncio.to_thread(_inspect)

    async def reset_session(self, environment_id: str) -> None:
        """Restart the container: processes die, the filesystem keeps its state.

        A full filesystem reset would require recreating the container, which needs the lab
        definition (not available in this call's signature); restart is the honest primitive
        and matches "give me a fresh shell".
        """

        def _reset() -> None:
            container = self._container(environment_id)
            if container is None:
                return
            container.restart(timeout=10)

        await asyncio.to_thread(_reset)
        self._last_used[environment_id] = _now()

    async def destroy_session(self, environment_id: str) -> None:
        # Idempotent: destroying an unknown or already-destroyed environment is a no-op.
        network_name = self._session_networks.pop(environment_id, None)
        self._session_flags.pop(environment_id, None)

        def _destroy() -> None:
            container = self._container(environment_id)
            if container is not None:
                try:
                    container.remove(force=True)
                except Exception:
                    pass  # already gone / daemon hiccup: still a no-op for the caller
            # The per-session network goes with the session (L-04), even when
            # the container is already gone; a failure here must not fail the
            # destroy, so swallow it.
            if network_name is not None:
                try:
                    client = self._client_or_raise()
                    client.networks.get(network_name).remove()
                except Exception:
                    pass

        await asyncio.to_thread(_destroy)
        self._last_used.pop(environment_id, None)

    async def reap_orphans(self, max_age_minutes: int = 120) -> int:
        """Destroy lab containers older than max_age_minutes, by label.

        Covers the restart gap: `_sessions` is in-memory, so a backend restart
        orphans containers no worker tracks anymore. Labels (`rtc=labs`) make
        this safe across workers — anything this old has outlived every lab's
        max_runtime_minutes. Idempotent; returns the number removed.
        """
        def _reap() -> int:
            client = self._client_or_raise()
            cutoff = _now() - timedelta(minutes=max_age_minutes)
            removed = 0
            for container in client.containers.list(all=True, filters={"label": "rtc=labs"}):
                try:
                    created = container.attrs.get("Created", "")
                    # Docker timestamps: "2026-10-12T11:30:00.123456789Z"
                    ts = created[:26] + "+00:00" if created.endswith("Z") else created
                    born = datetime.fromisoformat(ts)
                    if born.tzinfo is None:
                        born = born.replace(tzinfo=timezone.utc)
                    if born < cutoff:
                        container.remove(force=True)
                        removed += 1
                except Exception:
                    continue  # never let one bad container stop the sweep
            return removed

        try:
            return await asyncio.to_thread(_reap)
        except Exception:
            return 0

    async def validate_objective(
        self, environment_id: str, lab: LabDefinition, objective_id: str, findings: dict[str, Any]
    ) -> ValidationResult:
        # Outcome-based, exactly like the mock: objectives are validated against the state the
        # learner produced, not against which commands they typed. A Docker provider could
        # additionally probe live container state here; the shared validators are the contract.
        objective = next((o for o in lab.objectives if o.id == objective_id), None)
        if objective is None:
            return ValidationResult(objective_id, False, "Unknown objective.", None)
        fn = VALIDATORS.get(objective.validator)
        if fn is None:  # guarded at load time; belt and braces
            return ValidationResult(objective_id, False, "No validator configured.", None)
        # Per-session CTF flags (L-01b) are injected into a COPY of the findings
        # for validation only — never stored in the session, never sent to the
        # client. Validators that need them read `_session_flags`; without it
        # they fail closed (no static fallback values exist anywhere).
        effective = dict(findings)
        flags = self._session_flags.get(environment_id)
        if flags is not None:
            effective["_session_flags"] = dict(flags)
        passed, message, evidence = fn(objective.args, effective)
        return ValidationResult(objective_id, passed, message, evidence)

    async def exec_command(
        self, environment_id: str, lab: LabDefinition, command: str, findings: dict[str, Any]
    ) -> CommandResult:
        stripped = command.strip()
        if stripped in ("clear", "reset"):
            self._last_used[environment_id] = _now()
            return CommandResult(output="", clear=True)
        try:
            argv = shlex.split(command, posix=True)
        except ValueError:
            argv = command.split()
        if not argv:
            return CommandResult(output="", exit_code=0)

        last_used = self._last_used.get(environment_id)
        if last_used is not None:
            idle = (_now() - last_used).total_seconds() / 60
            if idle > lab.environment.idle_timeout_minutes:
                raise LabError("invalid", "This lab sat idle too long. Reset it to keep working.")

        def _exec() -> tuple[int, str]:
            container = self._container(environment_id)
            if container is None:
                raise LabError("not_found", "Lab environment is gone. Start the lab again.")
            # L-02: enforce the timeout INSIDE the container with coreutils
            # `timeout(1)` — every lab image ships it (Debian/python-slim
            # bases). `asyncio.wait_for` alone cannot kill the blocking
            # exec thread, so without this the process would keep running
            # after the timeout error. `timeout` exits 124 when it kills.
            wrapped = [
                "timeout",
                f"--kill-after={EXEC_TIMEOUT_KILL_AFTER_SECONDS}",
                str(EXEC_TIMEOUT_SECONDS),
                *argv,
            ]
            result = container.exec_run(
                wrapped,
                stdout=True,
                stderr=True,
                demux=True,
                # The lab definition's workdir: images run as a non-root user,
                # so this must be writable by them (their home directory).
                workdir=lab.environment.workdir,
            )
            code = result.exit_code
            out_b, err_b = result.output if isinstance(result.output, tuple) else (result.output, b"")
            text = (out_b or b"").decode("utf-8", "replace")
            err = (err_b or b"").decode("utf-8", "replace")
            if err:
                text = text + ("\n" if text else "") + err
            return code, text

        try:
            code, text = await asyncio.wait_for(asyncio.to_thread(_exec), timeout=EXEC_WAIT_SECONDS)
        except asyncio.TimeoutError:
            # Only a hung daemon trips this: `timeout(1)` should already have
            # killed the command at EXEC_TIMEOUT_SECONDS + kill-after. Say so
            # honestly instead of claiming the process was killed.
            raise LabError(
                "unavailable",
                f"Command did not return within {EXEC_WAIT_SECONDS}s; the in-container timeout "
                f"should have killed it after {EXEC_TIMEOUT_SECONDS}s, but the daemon did not "
                "confirm — the command may still be running.",
            )
        except LabError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LabError("unavailable", f"Command failed: {exc}")

        if code == 124:
            raise LabError(
                "invalid",
                f"Command timed out after {EXEC_TIMEOUT_SECONDS}s and was killed.",
            )

        self._last_used[environment_id] = _now()
        if len(text) > MAX_OUTPUT_CHARS:
            text = text[:MAX_OUTPUT_CHARS] + f"\n… [output truncated at {MAX_OUTPUT_CHARS} chars]"
        return CommandResult(output=text, exit_code=code)
