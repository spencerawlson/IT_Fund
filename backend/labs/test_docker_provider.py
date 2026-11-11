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


def _lab(lab_id="test-docker-001", **env_overrides):
    env = dict(provider="docker", image="test-lab:latest", deny_internet_egress=True)
    env.update(env_overrides)
    return LabDefinition(
        id=lab_id,
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
        # The provider wraps commands in coreutils `timeout(1)` (L-02): strip
        # `timeout --kill-after=<n> <secs>` to recover the real command.
        cmd_argv = list(argv)
        if cmd_argv[:1] == ["timeout"]:
            cmd_argv = cmd_argv[3:]
        cmd = " ".join(cmd_argv)
        if cmd == "boom":
            raise RuntimeError("daemon exploded")
        return SimpleNamespace(exit_code=0, output=(f"out: {cmd}\n".encode(), b""))


class FakeContainers:
    def __init__(self, client):
        self._client = client
        self._next = 0

    def run(self, *args, **kwargs):
        self._client.last_run_kwargs = kwargs
        # Unique container id per run (real Docker never reuses one): the
        # provider derives environment ids from the first 12 chars, so the
        # counter goes FIRST — two sessions must differ in that prefix.
        self._next += 1
        cid = f"{self._next:012d}abcdef"
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


class FakeNetwork:
    def __init__(self, name, internal, parent):
        self.name = name
        self.internal = internal
        self.attrs = {"Internal": internal}
        self._parent = parent

    def remove(self):
        self._parent._networks.pop(self.name, None)
        self._parent.removed.append(self.name)


class FakeNetworks:
    def __init__(self):
        self.created = []
        self.removed = []
        self._networks = {}
        self._preset = []  # list() answers from here when non-empty (mismatch tests)

    def list(self, names=None):
        pool = self._preset if self._preset else list(self._networks.values())
        return [n for n in pool if names is None or n.name in names]

    def create(self, name, internal=False, labels=None):
        self.created.append({"name": name, "internal": internal})
        net = FakeNetwork(name, internal, self)
        self._networks[name] = net
        return net

    def get(self, name):
        if name in self._networks:
            return self._networks[name]
        raise KeyError(name)


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


# ---- L-02: exec timeout is enforced inside the container ----

def test_exec_wraps_command_in_coreutils_timeout(provider, fake_docker):
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))
    asyncio.run(provider.exec_command(env.id, _lab(), "nmap target.lab", {}))
    argv = container.exec_calls[0][0]
    assert argv[:3] == ["timeout", "--kill-after=5", "60"]
    assert argv[3:] == ["nmap", "target.lab"]


def test_exec_timeout_kill_is_reported_when_timeout_exits_124(provider, fake_docker, monkeypatch):
    """A fake exec that plays the role of coreutils `timeout`: it sees the
    wrapper in argv and reports exit 124 (killed). The provider must surface
    that as a timeout error that says the command was killed — which is now
    true, because the kernel enforced it inside the container."""
    env = asyncio.run(provider.create_session(_lab(), "u1"))
    container = fake_docker.containers.get(env.id.removeprefix("docker-"))

    def timeout_kill(argv, **kwargs):
        assert argv[0] == "timeout"  # the wrapper must be present
        return SimpleNamespace(exit_code=124, output=(b"", b""))

    monkeypatch.setattr(container, "exec_run", timeout_kill)
    with pytest.raises(LabError) as ei:
        asyncio.run(provider.exec_command(env.id, _lab(), "sleep 300", {}))
    assert ei.value.code == "invalid"
    assert "timed out after 60s and was killed" in ei.value.message


# ---- L-04: one network per session, verified on reuse, deleted on destroy ----

def test_two_sessions_get_distinct_networks(provider, fake_docker):
    env1 = asyncio.run(provider.create_session(_lab(), "user-1"))
    env2 = asyncio.run(provider.create_session(_lab(), "user-2"))
    assert len(fake_docker.networks.created) == 2
    name1, name2 = (n["name"] for n in fake_docker.networks.created)
    assert name1 != name2
    assert all(n["internal"] is True for n in fake_docker.networks.created)
    assert name1.startswith("rtc-labs-") and name2.startswith("rtc-labs-")


def test_destroy_removes_only_that_sessions_network(provider, fake_docker):
    env1 = asyncio.run(provider.create_session(_lab(), "user-1"))
    env2 = asyncio.run(provider.create_session(_lab(), "user-2"))
    name1 = fake_docker.networks.created[0]["name"]
    name2 = fake_docker.networks.created[1]["name"]
    asyncio.run(provider.destroy_session(env1.id))
    assert fake_docker.networks.removed == [name1]
    assert name2 in fake_docker.networks._networks
    asyncio.run(provider.destroy_session(env2.id))
    assert fake_docker.networks.removed == [name1, name2]


def test_ensure_network_refuses_mismatched_internal_flag(provider, fake_docker):
    """A pre-existing non-internal network must never be reused for a lab
    that denies egress — fail closed instead of silently granting internet."""
    bad = FakeNetwork("rtc-labs-internal", False, fake_docker.networks)
    fake_docker.networks._preset = [bad]
    with pytest.raises(LabError) as ei:
        provider._ensure_network(fake_docker, internal=True, name="rtc-labs-internal")
    assert ei.value.code == "unavailable"
    assert "internal" in ei.value.message


def test_ensure_network_reuses_matching_network(provider, fake_docker):
    good = FakeNetwork("rtc-labs-internal", True, fake_docker.networks)
    fake_docker.networks._preset = [good]
    assert provider._ensure_network(fake_docker, internal=True, name="rtc-labs-internal") is good
    assert fake_docker.networks.created == []


# ---- L-01b: per-session CTF flags ----

def test_pentest_web_session_gets_fresh_random_flags(provider, fake_docker):
    from labs.registry import LABS

    lab = LABS["sec-pentest-web-001"]
    env1 = asyncio.run(provider.create_session(lab, "user-1"))
    env2 = asyncio.run(provider.create_session(lab, "user-2"))
    flags1 = provider._session_flags[env1.id]
    flags2 = provider._session_flags[env2.id]
    assert set(flags1) == {"sqli", "idor", "cmdi"}
    assert flags1 != flags2  # fresh per session
    import re as _re
    for value in flags1.values():
        assert _re.fullmatch(r"FLAG-[A-Z]+-[0-9a-f]{6}", value), value
    # Injected into the container as env vars so the seed app can read them.
    kw = fake_docker.last_run_kwargs
    assert kw["environment"]["CTF_FLAG_SQLI"] == flags2["sqli"]
    assert kw["environment"]["CTF_FLAG_IDOR"] == flags2["idor"]
    assert kw["environment"]["CTF_FLAG_CMDI"] == flags2["cmdi"]
    # Other labs get no flags and no env injection.
    env3 = asyncio.run(provider.create_session(_lab(), "user-1"))
    assert env3.id not in provider._session_flags
    assert fake_docker.last_run_kwargs["environment"] is None


def test_pentest_web_validator_uses_per_session_flags(provider, fake_docker):
    from labs.registry import LABS

    lab = LABS["sec-pentest-web-001"]
    env = asyncio.run(provider.create_session(lab, "user-1"))
    flags = provider._session_flags[env.id]
    good = asyncio.run(provider.validate_objective(
        env.id, lab, "sqli-union", {"flags": {"sqli": flags["sqli"]}}))
    assert good.passed is True
    # The old static literals no longer pass, even when posted verbatim.
    stale = asyncio.run(provider.validate_objective(
        env.id, lab, "sqli-union", {"flags": {"sqli": "FLAG-SQLI-7a1c9e"}}))
    assert stale.passed is False
    wrong = asyncio.run(provider.validate_objective(
        env.id, lab, "idor", {"flags": {"idor": "FLAG-IDOR-000000"}}))
    assert wrong.passed is False
