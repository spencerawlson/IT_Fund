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
    def __init__(self, cid, client):
        self.id = cid
        self._client = client
        self.status = "running"
        self.attrs = {"Created": "2026-01-01T00:00:00Z"}
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
        c = FakeContainer(cid, self._client)
        self._client._containers[cid] = c
        return c

    def get(self, cid):
        for full, c in self._client._containers.items():
            if full.startswith(cid):
                return c
        raise KeyError(cid)  # stands in for docker.errors.NotFound


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


class FakeNetworks:
    def __init__(self):
        self.created = []

    def list(self, names=None):
        return []

    def create(self, name, internal=False, labels=None):
        self.created.append({"name": name, "internal": internal})
        return SimpleNamespace(name=name)


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
    monkeypatch.setitem(sys.modules, "docker", mod)
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
    # deny_internet_egress=True -> internal-only network
    assert fake_docker.networks.created[0]["internal"] is True


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


def test_provider_registers_only_when_enabled(monkeypatch):
    monkeypatch.delenv("LAB_DOCKER_ENABLED", raising=False)
    assert "docker" not in sessions_mod._build_providers()
    monkeypatch.setenv("LAB_DOCKER_ENABLED", "1")
    providers = sessions_mod._build_providers()
    assert providers["docker"].name == "docker"
