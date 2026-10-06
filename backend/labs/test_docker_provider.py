"""Tests for DockerLabProvider with a fake Docker SDK (no daemon needed).

The provider talks to the daemon only through the `docker` module, so injecting a fake
module into sys.modules exercises the full lifecycle: create, exec, reset, destroy.
"""
import asyncio
import sys
from types import ModuleType, SimpleNamespace
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest

from labs.models import LabDefinition, LabEnvironmentConfig, LabError, LabObjective, LabTarget
from labs.providers.docker import DockerLabProvider, MAX_OUTPUT_CHARS
import labs.sessions as sessions_mod


def _lab(**env_overrides):
    env = dict(provider="docker", image="test-lab:latest", deny_internet_egress=True)
    env.update(env_overrides)
    return LabDefinition(
        id="test-docker-001",
        slug="docker-test",
        title="Docker test lab",
        description="d",
        category="linux",
        difficulty="beginner",
        estimated_minutes=10,
        environment=LabEnvironmentConfig(**env),
        targets=[LabTarget(hostname="target.lab", role="t", intentionally_vulnerable=True)],
        objectives=[LabObjective(id="o1", label="L", validator="host_discovered",
                                args={"target": "target.lab"})],
    )


class FakeContainer:
    def __init__(self, cid, client, created="2026-01-01T00:00:00Z", networks=None, labels=None):
        self.id = cid
        self._client = client
        self.status = "running"
        self.labels = labels or {}
        # The reaper reads attrs["Created"]; destroy reads NetworkSettings.Networks.
        self.attrs = {"Created": created,
                      "NetworkSettings": {"Networks": dict(networks or {})}}
        self.exec_calls = []
        self.restarted = False
        self.removed = False

    def reload(self):
        pass

    def restart(self, timeout=10):
        self.restarted = True

    def remove(self, force=False):
        self.removed = True
        self._client._containers.pop(self.id, None)

    def exec_run(self, argv, **kwargs):
        self.exec_calls.append((argv, kwargs))
        cmd = " ".join(argv)
        if cmd == "boom":
            raise RuntimeError("daemon exploded")
        return SimpleNamespace(exit_code=0, output=(f"out: {cmd}\n".encode(), b""))


class FakeContainers:
    def __init__(self, client):
        self._client = client

    def run(self, *args, **kwargs):
        self._client.last_run_kwargs = kwargs
        cid = "abcdef1234567890"
        # A per-session bridge (egress-allowed labs) is attached by name; `network_mode="none"`
        # (egress-denied, the default) attaches nothing — mirror that so destroy can find it.
        networks = {kwargs["network"]: {}} if kwargs.get("network") else {}
        c = FakeContainer(cid, self._client, networks=networks, labels=kwargs.get("labels"))
        self._client._containers[cid] = c
        return c

    def get(self, cid):
        for full, c in self._client._containers.items():
            if full.startswith(cid):
                return c
        raise KeyError(cid)  # stands in for docker.errors.NotFound

    def list(self, all=False, filters=None):  # noqa: A002  (matches docker SDK signature)
        label = (filters or {}).get("label")
        out = list(self._client._containers.values())
        if label and "=" in label:
            k, v = label.split("=", 1)
            out = [c for c in out if c.labels.get(k) == v]
        return out


class FakeImages:
    def __init__(self):
        self.present = set()
        self.pulled = []

    def get(self, image):
        if image not in self.present:
            raise KeyError(image)

    def pull(self, image):
        self.pulled.append(image)
        self.present.add(image)


class FakeNetwork:
    def __init__(self, name, registry):
        self.name = name
        self.removed = False
        self._registry = registry

    def remove(self):
        self.removed = True
        self._registry.pop(self.name, None)


class FakeNetworks:
    def __init__(self):
        self.created = []
        self._by_name = {}

    def list(self, names=None, filters=None):
        return list(self._by_name.values())

    def get(self, name):
        if name not in self._by_name:
            raise KeyError(name)
        return self._by_name[name]

    def create(self, name, internal=False, labels=None):
        self.created.append({"name": name, "internal": internal})
        net = FakeNetwork(name, self._by_name)
        self._by_name[name] = net
        return net


class FakeClient:
    def __init__(self):
        self._containers = {}
        self.containers = FakeContainers(self)
        self.images = FakeImages()
        self.networks = FakeNetworks()
        self.last_run_kwargs = {}

    def ping(self):
        return True


@pytest.fixture
def fake_docker(monkeypatch):
    client = FakeClient()
    mod = ModuleType("docker")
    mod.from_env = lambda: client
    # The provider does `from docker.types import Ulimit` inside create_session; give the fake
    # module that submodule so the import resolves without a real docker install.
    types_mod = ModuleType("docker.types")
    types_mod.Ulimit = lambda name, soft, hard: SimpleNamespace(name=name, soft=soft, hard=hard)
    mod.types = types_mod
    monkeypatch.setitem(sys.modules, "docker", mod)
    monkeypatch.setitem(sys.modules, "docker.types", types_mod)
    return client


@pytest.fixture
def provider(fake_docker):
    return DockerLabProvider()


def test_unavailable_without_sdk(monkeypatch):
    monkeypatch.delitem(sys.modules, "docker", raising=False)
    # Make sure a real `docker` package can't be imported either.
    import builtins
    real_import = builtins.__import__

    def no_docker(name, *a, **k):
        if name == "docker":
            raise ImportError("nope")
        return real_import(name, *a, **k)

    monkeypatch.setattr(builtins, "__import__", no_docker)
    p = DockerLabProvider()
    with pytest.raises(LabError) as ei:
        asyncio.run(p.create_session(_lab(), "u1"))
    assert ei.value.code == "unavailable"


def test_create_pulls_missing_image_and_hardens_container(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "user-1"))
    assert env.id.startswith("docker-")
    assert env.status == "RUNNING"
    assert fake_docker.images.pulled == ["test-lab:latest"]
    kw = fake_docker.last_run_kwargs
    assert kw["cap_drop"] == ["ALL"]
    assert "no-new-privileges:true" in kw["security_opt"]
    assert kw["mem_limit"] == "512m"
    assert kw["pids_limit"] == 256
    assert kw["detach"] is True
    # deny_internet_egress=True (the default) -> no network namespace at all, and no shared/
    # per-session network is created. Loopback-only; a learner's container can reach nothing else.
    assert kw["network_mode"] == "none"
    assert "network" not in kw
    assert fake_docker.networks.created == []
    # Disk/fd guards: a single file is capped (fsize) and the fd table is bounded (nofile).
    limits = {u.name: (u.soft, u.hard) for u in kw["ulimits"]}
    assert limits["nofile"] == (1024, 2048)
    assert limits["fsize"] == (128 * 1024 * 1024, 128 * 1024 * 1024)


def test_create_uses_existing_image(provider, fake_docker):
    fake_docker.images.present.add("test-lab:latest")
    asyncio.run(provider.create_session(_lab(), "u1"))
    assert fake_docker.images.pulled == []


def test_exec_returns_real_stdout_and_exit_code(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    result = asyncio.run(provider.exec_command(env.id, _lab(), "nmap target.lab", {}))
    assert result.output == "out: nmap target.lab\n"
    assert result.exit_code == 0


def test_exec_clear_does_not_touch_daemon(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    result = asyncio.run(provider.exec_command(env.id, _lab(), "clear", {}))
    assert result.clear is True and result.output == ""
    assert container.exec_calls == []


def test_exec_truncates_huge_output(provider, fake_docker, monkeypatch):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))

    def big_exec(argv, **kwargs):
        return SimpleNamespace(exit_code=0, output=(b"x" * (MAX_OUTPUT_CHARS + 100), b""))

    monkeypatch.setattr(container, "exec_run", big_exec)
    result = asyncio.run(provider.exec_command(env.id, _lab(), "yes", {}))
    assert len(result.output) <= MAX_OUTPUT_CHARS + 60
    assert "truncated" in result.output


def test_exec_missing_container_is_not_found(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    container.remove(force=True)
    with pytest.raises(LabError) as ei:
        asyncio.run(provider.exec_command(env.id, _lab(), "ls", {}))
    assert ei.value.code == "not_found"


def test_destroy_is_idempotent(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    asyncio.run(provider.destroy_session(env.id))
    asyncio.run(provider.destroy_session(env.id))  # already gone: no error
    asyncio.run(provider.destroy_session("docker-deadbeef"))  # never existed: no error


def test_reset_restarts_container(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    asyncio.run(provider.reset_session(env.id))
    assert container.restarted is True
    asyncio.run(provider.reset_session("docker-deadbeef"))  # unknown: no error


def test_validate_objective_uses_shared_validators(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    lab = _lab()
    bad = asyncio.run(provider.validate_objective(env.id, lab, "o1", {}))
    assert bad.passed is False
    good = asyncio.run(provider.validate_objective(
        env.id, lab, "o1", {"hosts": {"target.lab": {"up": True}}}))
    assert good.passed is True


def test_exec_uses_lab_workdir(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(workdir="/home/student"), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    asyncio.run(provider.exec_command(env.id, _lab(workdir="/home/student"), "pwd", {}))
    assert container.exec_calls[0][1]["workdir"] == "/home/student"


def test_exec_defaults_to_root_workdir(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    asyncio.run(provider.exec_command(env.id, _lab(), "pwd", {}))
    assert container.exec_calls[0][1]["workdir"] == "/root"


def test_provider_registers_only_when_enabled(monkeypatch):
    monkeypatch.delenv("LAB_DOCKER_ENABLED", raising=False)
    assert "docker" not in sessions_mod._build_providers()
    monkeypatch.setenv("LAB_DOCKER_ENABLED", "1")
    providers = sessions_mod._build_providers()
    assert providers["docker"].name == "docker"


def test_exec_findings_bridge_populates_from_sim_shell(provider, fake_docker):
    """The command runs for real (fake stdout here), but objectives are findings-based, so the
    provider derives findings from the lab's simulation shell against the same typed command. Without
    this bridge, objectives could never complete on Docker."""
    from labs.registry import get_lab

    lab = get_lab("sec-logtriage-001")  # linux_logs shell; `cat auth.log` -> {'log_viewed': True}
    env = asyncio.run(provider.create_session(lab, "u1"))
    result = asyncio.run(provider.exec_command(env.id, lab, "cat auth.log", {}))
    assert result.output == "out: cat auth.log\n"      # real stdout, not the sim's
    assert result.findings == {"log_viewed": True}      # findings came from the sim shell


def test_exec_findings_bridge_silent_when_no_shell(provider, fake_docker):
    # A lab with no simulation shell still returns real output and simply no findings.
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    result = asyncio.run(provider.exec_command(env.id, _lab(), "ls", {}))
    assert result.output == "out: ls\n"
    assert result.findings == {}


def test_egress_allowed_lab_gets_private_bridge_torn_down_on_destroy(provider, fake_docker):
    """A lab that allows egress gets its OWN bridge network (not a shared one), and destroying the
    session removes that network so per-session networks don't accumulate."""
    lab = _lab(deny_internet_egress=False)
    env = asyncio.run(provider.create_session(lab, "u1"))
    # One per-session bridge was created and the container was attached to it (not network_mode).
    assert len(fake_docker.networks.created) == 1
    net_name = fake_docker.networks.created[0]["name"]
    assert net_name.startswith("rtc-lab-net-")
    assert fake_docker.last_run_kwargs.get("network") == net_name
    assert "network_mode" not in fake_docker.last_run_kwargs
    net = fake_docker.networks.get(net_name)
    asyncio.run(provider.destroy_session(env.id))
    assert net.removed is True


def test_reap_orphans_removes_only_stale_labelled_containers(provider, fake_docker):
    from datetime import datetime, timezone

    client = fake_docker
    now = datetime.now(timezone.utc)
    old = FakeContainer("old123456789", client, created="2026-01-01T00:00:00Z",
                        labels={"rtc": "labs"})
    fresh = FakeContainer("fresh12345678", client, created=now.isoformat(),
                          labels={"rtc": "labs"})
    other = FakeContainer("other12345678", client, created="2026-01-01T00:00:00Z",
                          labels={"some": "app"})  # not ours: never touched
    client._containers.update({old.id: old, fresh.id: fresh, other.id: other})
    client.networks.create("rtc-lab-net-dead", labels={"rtc": "labs"})

    removed = asyncio.run(provider.reap_orphans(max_age_minutes=180))
    assert removed == 1
    assert old.removed is True
    assert fresh.removed is False
    assert other.removed is False
    # Unused per-session networks are pruned too.
    assert client.networks._by_name == {}


def test_create_refuses_when_at_global_container_cap(provider, fake_docker):
    from datetime import datetime, timezone

    provider._max_containers = 1
    # One (fresh, so the reaper keeps it) lab container already running on the host.
    now = datetime.now(timezone.utc).isoformat()
    fake_docker._containers["existing12345"] = FakeContainer(
        "existing12345", fake_docker, created=now, labels={"rtc": "labs"})
    with pytest.raises(LabError) as ei:
        asyncio.run(provider.create_session(_lab(), "u1"))
    assert ei.value.code == "unavailable"
    assert "capacity" in ei.value.message.lower()


def test_create_omits_storage_quota_by_default(provider, fake_docker):
    asyncio.run(provider.create_session(_lab(), "u1"))
    assert "storage_opt" not in fake_docker.last_run_kwargs


def test_create_passes_storage_quota_when_configured(provider, fake_docker):
    provider._storage_size = "512m"
    asyncio.run(provider.create_session(_lab(), "u1"))
    assert fake_docker.last_run_kwargs["storage_opt"] == {"size": "512m"}


def test_create_reports_storage_quota_unsupported_clearly(provider, fake_docker, monkeypatch):
    provider._storage_size = "512m"

    def boom(*a, **k):
        raise RuntimeError("Error response from daemon: --storage-opt is supported only for "
                           "overlay over xfs with 'pquota' mount option")

    monkeypatch.setattr(fake_docker.containers, "run", boom)
    with pytest.raises(LabError) as ei:
        asyncio.run(provider.create_session(_lab(), "u1"))
    assert ei.value.code == "unavailable"
    assert "pquota" in ei.value.message.lower()
