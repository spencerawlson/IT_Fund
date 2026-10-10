"""Tests for the Docker fundamentals lab (docker_cli shell + definition + validators)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import docker_cli
from labs.definitions.docker_fundamentals import DOCKER_FUNDAMENTALS_LAB
from labs.validators import VALIDATORS

LAB = DOCKER_FUNDAMENTALS_LAB
VALIDATOR_NAMES = [o.validator for o in LAB.objectives]


def _run(cmds, findings=None):
    """Thread findings through the shell like the mock provider does."""
    f = findings if findings is not None else {}
    last = None
    for c in cmds:
        last = docker_cli.run(LAB, c, f)
        f = {**f, **last.findings}
    return f, last


# ---- lab definition ----

def test_lab_definition_loads():
    assert LAB.id == "docker-fundamentals-001"
    assert LAB.slug == "docker-fundamentals"
    assert LAB.category == "devops"
    assert LAB.difficulty == "beginner"
    assert LAB.estimated_minutes == 45
    assert LAB.shell == "docker_cli"
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert len(set(ids)) == 8  # unique objective ids
    for o in LAB.objectives:
        assert o.label and o.description and o.hints, o.id


def test_all_objective_validators_registered():
    for name in VALIDATOR_NAMES:
        assert name in VALIDATORS, f"validator {name!r} not registered"
    assert len(set(VALIDATOR_NAMES)) == 8  # unique validator per objective


def test_banner_and_prompt():
    assert docker_cli.initial_prompt(LAB).endswith("$ ")
    banner = docker_cli.banner(LAB)
    assert isinstance(banner, list) and len(banner) >= 2


def test_help_and_unknown_command():
    _, res = _run(["help"])
    assert "docker run" in res.output
    _, res = _run(["frobnicate"])
    assert res.exit_code == 127


def test_clear():
    _, res = _run(["clear"])
    assert res.clear is True


# ---- engine & images ----

def test_docker_info_verifies_engine():
    f, res = _run(["docker info"])
    assert "Server Version" in res.output
    assert f["df_engine_verified"] is True


def test_images_preseeded():
    _, res = _run(["docker images"])
    for img in ("nginx", "postgres", "redis"):
        assert img in res.output, img


def test_pull_new_image():
    f, res = _run(["docker pull hello-world"])
    assert "Downloaded newer image" in res.output
    _, res2 = _run(["docker images"], f)
    assert "hello-world" in res2.output


def test_pull_unknown_image_fails():
    _, res = _run(["docker pull not-a-real-image-xyz"])
    assert res.exit_code == 1
    assert "pull access denied" in res.output


def test_pull_uptodate_when_present():
    _, res = _run(["docker pull redis:7"])
    assert "up to date" in res.output


# ---- container lifecycle ----

def test_run_ps_lifecycle():
    f, res = _run(["docker run -d --name web nginx"])
    cid = res.output.strip()
    assert len(cid) == 12
    _, res = _run(["docker ps"], f)
    assert "web" in res.output and "nginx" in res.output
    # stop hides it from plain ps but not ps -a
    f, _ = _run(["docker stop web"], f)
    _, res = _run(["docker ps"], f)
    assert "web" not in res.output
    _, res = _run(["docker ps -a"], f)
    assert "web" in res.output and "Exited" in res.output
    # start brings it back
    f, _ = _run(["docker start web"], f)
    _, res = _run(["docker ps"], f)
    assert "web" in res.output
    # rm removes it
    f, _ = _run(["docker stop web", "docker rm web"], f)
    _, res = _run(["docker ps -a"], f)
    assert "web" not in res.output


def test_run_duplicate_name_conflicts():
    f, _ = _run(["docker run -d --name web nginx"])
    _, res = _run(["docker run -d --name web nginx"], f)
    assert res.exit_code == 1 and "Conflict" in res.output


def test_rm_running_container_requires_force():
    f, _ = _run(["docker run -d --name web nginx"])
    _, res = _run(["docker rm web"], f)
    assert res.exit_code == 1 and "is running" in res.output
    f, _ = _run(["docker rm -f web"], f)
    _, res = _run(["docker ps -a"], f)
    assert "web" not in res.output


def test_run_unknown_image_fails():
    _, res = _run(["docker run -d not-a-real-image-xyz"])
    assert res.exit_code == 1


def test_hello_world_runs():
    _, res = _run(["docker run hello-world"])
    assert "Hello from Docker!" in res.output


# ---- ports ----

def test_port_mapping_and_curl():
    f, res = _run(["docker run -d --name web -p 8080:80 nginx"])
    assert "web" in f["_docker_cli"]["containers"]
    f, res = _run(["curl http://localhost:8080"], f)
    assert "Welcome to nginx!" in res.output
    assert f["df_port_mapped"] is True


def test_curl_refused_without_container():
    _, res = _run(["curl http://localhost:8080"])
    assert res.exit_code == 7 and "Connection refused" in res.output


def test_port_conflict():
    f, _ = _run(["docker run -d --name web -p 8080:80 nginx"])
    _, res = _run(["docker run -d --name web2 -p 8080:80 nginx"], f)
    assert res.exit_code == 1 and "port is already allocated" in res.output


# ---- exec & logs ----

def test_exec_and_logs():
    f, _ = _run(["docker run -d --name web nginx"])
    f, res = _run(["docker exec web cat /etc/hostname"], f)
    assert len(res.output.strip()) == 12  # container id
    f, res = _run(["docker logs web"], f)
    assert "ready for start up" in res.output or "GET /" in res.output
    assert f["df_container_explored"] is True


def test_exec_missing_container():
    _, res = _run(["docker exec ghost cat /etc/hostname"])
    assert res.exit_code == 1 and "No such container" in res.output


def test_inspect():
    f, _ = _run(["docker run -d --name web -p 8080:80 nginx"])
    _, res = _run(["docker inspect web"], f)
    assert '"Name": "/web"' in res.output and "172." in res.output


# ---- build ----

def test_build_image():
    f, res = _run(["docker build -t hello-lab:1.0 ."])
    assert "naming to docker.io/library/hello-lab:1.0" in res.output
    _, res = _run(["docker images"], f)
    assert "hello-lab" in res.output
    assert f["df_image_built"] is True


def test_build_requires_tag():
    _, res = _run(["docker build ."])
    assert res.exit_code == 1


def test_built_image_runs_and_serves():
    f, _ = _run(["docker build -t hello-lab:1.0 ."])
    f, _ = _run(["docker run -d --name myapp -p 3000:3000 hello-lab:1.0"], f)
    _, res = _run(["curl http://localhost:3000"], f)
    assert "Hello from your custom image!" in res.output


def test_workspace_files():
    _, res = _run(["cat Dockerfile"])
    assert "FROM node:20-alpine" in res.output
    _, res = _run(["cat compose.yml"])
    assert "services:" in res.output
    _, res = _run(["ls"])
    assert "Dockerfile" in res.output and "compose.yml" in res.output


# ---- volumes & persistence ----

def test_volume_lifecycle():
    f, res = _run(["docker volume create pgdata"])
    assert res.output.strip() == "pgdata"
    _, res = _run(["docker volume ls"], f)
    assert "pgdata" in res.output
    _, res = _run(["docker volume inspect pgdata"], f)
    assert "/var/lib/docker/volumes/pgdata/_data" in res.output


def test_volume_data_persistence_end_to_end():
    cmds = [
        "docker volume create pgdata",
        "docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16",
    ]
    f, _ = _run(cmds)
    f, res = _run(["docker exec db psql -U postgres -c \"INSERT INTO users(name) VALUES ('ada')\""], f)
    assert "INSERT 0 1" in res.output
    f, res = _run(["docker exec db psql -U postgres -c \"SELECT * FROM users\""], f)
    assert "ada" in res.output and "(1 row)" in res.output
    # delete the container entirely, then start a fresh one on the same volume
    f, _ = _run(["docker rm -f db"], f)
    f, _ = _run(["docker run -d --name db2 -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16"], f)
    f, res = _run(["docker exec db2 psql -U postgres -c \"SELECT * FROM users\""], f)
    assert "ada" in res.output, "data should survive container replacement via the volume"
    assert f["df_volume_persisted"] is True


# ---- networks ----

def test_network_create_and_ping():
    f, res = _run(["docker network create appnet"])
    assert len(res.output.strip()) == 64
    f, _ = _run(["docker run -d --name web --network appnet nginx",
                 "docker run -d --name api --network appnet python:3.12-slim"], f)
    f, res = _run(["docker exec web ping -c 2 api"], f)
    assert "0% packet loss" in res.output
    assert f["df_network_connected"] is True


def test_ping_by_name_fails_on_default_bridge():
    f, _ = _run(["docker run -d --name web nginx", "docker run -d --name api nginx"])
    _, res = _run(["docker exec web ping -c 2 api"], f)
    assert res.exit_code == 1 and "bad address" in res.output


def test_network_connect():
    f, _ = _run(["docker network create appnet",
                 "docker run -d --name web nginx",
                 "docker run -d --name api nginx",
                 "docker network connect appnet web",
                 "docker network connect appnet api"])
    _, res = _run(["docker exec web ping -c 2 api"], f)
    assert "0% packet loss" in res.output


# ---- compose ----

def test_compose_up_ps_down():
    f, res = _run(["docker compose up -d"])
    assert "Started" in res.output
    assert f["df_compose_up"] is True
    _, res = _run(["docker compose ps"], f)
    assert "fundamentals-web-1" in res.output and "running" in res.output
    f, _ = _run(["docker compose down"], f)
    assert f["df_compose_up"] is False
    _, res = _run(["docker compose ps"], f)
    assert "exited" in res.output


# ---- determinism ----

def test_deterministic_ids():
    _, r1 = _run(["docker run -d --name web -p 8080:80 nginx"])
    _, r2 = _run(["docker run -d --name web -p 8080:80 nginx"])
    assert r1.output.strip() == r2.output.strip()
    _, n1 = _run(["docker network create appnet"])
    _, n2 = _run(["docker network create appnet"])
    assert n1.output == n2.output


# ---- validators ----

def test_validators_fail_on_empty_findings():
    for name in VALIDATOR_NAMES:
        passed, msg, _ = VALIDATORS[name]({}, {})
        assert passed is False, f"{name} should fail on empty findings"


def test_each_validator_passes_after_its_steps():
    steps = {
        "df_engine_verified": ["docker info"],
        "df_container_running": ["docker run -d --name web nginx"],
        "df_port_mapped": ["docker run -d --name web -p 8080:80 nginx", "curl http://localhost:8080"],
        "df_container_explored": ["docker run -d --name web nginx", "docker exec web cat /etc/hostname", "docker logs web"],
        "df_image_built": ["docker build -t hello-lab:1.0 ."],
        "df_volume_persisted": [
            "docker volume create pgdata",
            "docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16",
            "docker exec db psql -U postgres -c \"INSERT INTO users(name) VALUES ('ada')\"",
            "docker rm -f db",
            "docker run -d --name db2 -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16",
            "docker exec db2 psql -U postgres -c \"SELECT * FROM users\"",
        ],
        "df_network_connected": [
            "docker network create appnet",
            "docker run -d --name web --network appnet nginx",
            "docker run -d --name api --network appnet nginx",
            "docker exec web ping -c 2 api",
        ],
        "df_compose_up": ["docker compose up -d"],
    }
    for name, cmds in steps.items():
        f, _ = _run(cmds)
        passed, msg, _ = VALIDATORS[name]({}, f)
        assert passed is True, f"{name}: {msg}"


def test_full_lab_completion():
    """Walk the whole lab like a learner would; every objective's validator must pass."""
    walkthrough = [
        "docker info",
        "docker pull hello-world",
        "docker run -d --name web -p 8080:80 nginx",
        "curl http://localhost:8080",
        "docker exec web cat /etc/hostname",
        "docker logs web",
        "cat Dockerfile",
        "docker build -t hello-lab:1.0 .",
        "docker volume create pgdata",
        "docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16",
        "docker exec db psql -U postgres -c \"INSERT INTO users(name) VALUES ('ada')\"",
        "docker rm -f db",
        "docker run -d --name db2 -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16",
        "docker exec db2 psql -U postgres -c \"SELECT * FROM users\"",
        "docker network create appnet",
        "docker run -d --name frontend --network appnet nginx",
        "docker run -d --name backend --network appnet nginx",
        "docker exec frontend ping -c 2 backend",
        "docker compose up -d",
        "docker compose ps",
    ]
    f, _ = _run(walkthrough)
    failed = [o.id for o in LAB.objectives if not VALIDATORS[o.validator]({}, f)[0]]
    assert not failed, f"objectives not passing: {failed}"
