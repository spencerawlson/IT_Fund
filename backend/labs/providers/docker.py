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

    async def reap_orphans(self, max_age_minutes: int = 180) -> int:
        """Remove lab containers (and their per-session networks) older than a cap.

        The session service destroys containers on exit/expiry, but a backend restart loses its
        in-memory sessions while the containers persist. This sweep — called opportunistically on
        each new lab start — catches those orphans so an always-on host doesn't accumulate them."""

        def _reap() -> int:
            try:
                client = self._client_or_raise()
            except LabError:
                return 0
            cutoff = _now() - timedelta(minutes=max_age_minutes)
            removed = 0
            for c in client.containers.list(all=True, filters={"label": "rtc=labs"}):
                try:
                    created = datetime.fromisoformat(c.attrs.get("Created", "").replace("Z", "+00:00"))
                except ValueError:
                    continue
                if created < cutoff:
                    try:
                        c.remove(force=True)
                        removed += 1
                    except Exception:
                        pass
            # Prune per-session networks no longer attached to anything (remove() fails if in use).
            for net in client.networks.list(filters={"label": "rtc=labs"}):
                try:
                    net.remove()
                except Exception:
                    pass
            return removed

        return await asyncio.to_thread(_reap)

    # ---------- LabProvider interface ----------

    async def create_session(self, lab: LabDefinition, user_id: str) -> LabEnvironment:
        client = self._client_or_raise()
        image = lab.environment.image
        if not image:
            raise LabError("invalid", f"Lab '{lab.id}' has no container image configured.")
        env_cfg = lab.environment
        now = _now()
        token = hashlib.sha256(f"{user_id}:{now.timestamp()}".encode()).hexdigest()[:12]
        await self.reap_orphans()  # opportunistically clear containers a prior backend run abandoned

        def _create() -> Any:
            from docker.types import Ulimit  # noqa: PLC0415  (optional dependency)
            try:
                client.images.get(image)
            except Exception:
                try:
                    client.images.pull(image)
                except Exception as exc:
                    raise LabError("unavailable", f"Lab image '{image}' is not available: {exc}")
            # Network isolation, per session. Egress-denied labs (every lab today) need no network
            # namespace at all — their targets (sshd/nginx/moto) bind to loopback, which `none` keeps.
            # That removes the shared network entirely: no learner's container can reach another's, the
            # host LAN, or the internet. Egress-allowed labs (none yet) get a private per-session bridge.
            if env_cfg.deny_internet_egress:
                net_kwargs = {"network_mode": "none"}
            else:
                net = client.networks.create(f"rtc-lab-net-{token}", internal=False, labels={"rtc": "labs"})
                net_kwargs = {"network": net.name}
            owner = hashlib.sha256(user_id.encode()).hexdigest()[:16]
            container = client.containers.run(
                image,
                command="sleep infinity",
                detach=True,
                name=f"rtc-lab-{token}",
                mem_limit=f"{env_cfg.memory_mb}m",
                nano_cpus=int(env_cfg.cpu_limit * 1_000_000_000),
                pids_limit=256,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges:true"],
                tmpfs={"/tmp": "size=64m,mode=1777"},
                # Bound a runaway single file (partial disk guard) and the fd table. A full disk quota
                # needs host-level storage pquota — tracked in the images README as a follow-up.
                ulimits=[Ulimit(name="nofile", soft=1024, hard=2048),
                         Ulimit(name="fsize", soft=128 * 1024 * 1024, hard=128 * 1024 * 1024)],
                labels={"rtc": "labs", "rtc.lab": lab.id, "rtc.owner": owner},
                **net_kwargs,
            )
            return container

        try:
            container = await asyncio.to_thread(_create)
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

        def _destroy() -> None:
            container = self._container(environment_id)
            if container is None:
                return
            nets = []
            try:
                nets = [n for n in (container.attrs.get("NetworkSettings", {}).get("Networks") or {})
                        if n.startswith("rtc-lab-net-")]
            except Exception:
                pass
            try:
                container.remove(force=True)
            except Exception:
                pass  # already gone / daemon hiccup: still a no-op for the caller
            for name in nets:  # tear down this session's private network, if any
                try:
                    self._client.networks.get(name).remove()
                except Exception:
                    pass

        await asyncio.to_thread(_destroy)
        self._last_used.pop(environment_id, None)

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
        passed, message, evidence = fn(objective.args, findings)
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
            result = container.exec_run(
                argv,
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
            code, text = await asyncio.wait_for(asyncio.to_thread(_exec), timeout=EXEC_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            raise LabError("invalid", f"Command timed out after {EXEC_TIMEOUT_SECONDS}s and was killed.")
        except LabError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LabError("unavailable", f"Command failed: {exc}")

        self._last_used[environment_id] = _now()
        if len(text) > MAX_OUTPUT_CHARS:
            text = text[:MAX_OUTPUT_CHARS] + f"\n… [output truncated at {MAX_OUTPUT_CHARS} chars]"

        # Objectives are findings-based (shared validators). The command above ran for REAL, but the
        # findings it establishes are derived by the lab's simulation shell from the same typed
        # command — so real execution reaches the same objective state as the mock. The learner sees
        # real stdout; the sim's output is discarded, only its findings/prompt are kept. The lab
        # images are seeded byte-identically to the mock, so the two agree.
        findings_delta: dict[str, Any] = {}
        prompt = None
        try:
            from labs.shells import has_shell, run as shell_run  # noqa: PLC0415
            if has_shell(lab):
                sim = shell_run(lab, command, findings)
                findings_delta, prompt = sim.findings, sim.prompt
        except Exception:
            pass  # findings are best-effort; real output is always returned
        return CommandResult(output=text, exit_code=code, findings=findings_delta, prompt=prompt)
