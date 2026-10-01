"""Tests for the Docker + SIEM container security monitoring lab."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs.registry import get_lab
from labs.shells import docker_siem, meta
from labs.shells.docker_siem import ATTACKER, INCIDENT
from labs.sessions import SessionService

client = TestClient(main.app)
LAB = get_lab("sec-docker-siem-001")

STEPS = [
    "docker info",
    "docker run -d --name lab-nginx -p 8080:80 nginx",
    "docker inspect lab-nginx",
    "docker network create security-lab",
    "docker volume create pgdata",
    "docker compose up -d",
    "siem search event_type=auth_failure",
    "siem alerts",
    f"siem search src_ip={ATTACKER}",
]


def _run(cmds, start=None):
    svc = SessionService()
    s = asyncio.run(svc.start("sec-docker-siem-001", "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_lab_completes_end_to_end():
    s, _ = _run(STEPS)
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_docker_state_is_stateful_across_commands():
    s, res = _run(["docker run -d --name lab-nginx -p 8080:80 nginx", "docker ps"])
    assert "lab-nginx" in res.output and "8080" in res.output
    # a second container appears in ps -a after stop
    s, res = _run(["docker run -d --name lab-nginx -p 8080:80 nginx", "docker stop lab-nginx", "docker ps"])
    assert "lab-nginx" not in res.output  # stopped -> not in `docker ps`
    s, res = _run(["docker run -d --name lab-nginx -p 8080:80 nginx", "docker stop lab-nginx", "docker ps -a"])
    assert "lab-nginx" in res.output and "exited" in res.output


def test_curl_depends_on_nginx_running():
    # Before any container exists, curl to the published port is refused.
    assert "refused" in docker_siem.run(LAB, "curl http://localhost:8080", {}).output.lower()
    # After nginx runs (state carried in findings), curl succeeds.
    _, res = _run(["docker run -d --name lab-nginx -p 8080:80 nginx", "curl http://localhost:8080"])
    assert "Welcome to nginx" in res.output


def test_siem_search_filters_events():
    r = docker_siem.run(LAB, "siem search event_type=auth_failure", {})
    lines = [ln for ln in r.output.splitlines() if "auth_failure" in ln]
    assert len(lines) == 5  # exactly the five brute-force attempts
    assert r.findings.get("siem_searched")


def test_siem_alerts_fire_brute_force_and_recon_and_priv():
    r = docker_siem.run(LAB, "siem alerts", {})
    assert "Brute Force" in r.output and "Reconnaissance" in r.output and "Privileged" in r.output
    assert r.findings.get("bruteforce_found")


def test_attacker_identified_only_on_the_right_pivot():
    # benign source does not solve it
    r = docker_siem.run(LAB, "siem search src_ip=10.0.0.2", {})
    assert not r.findings.get("attacker_identified")
    r = docker_siem.run(LAB, f"siem search src_ip={ATTACKER}", {})
    assert r.findings.get("attacker_identified")


def test_incident_dataset_is_coherent():
    # one attacker across many event types; the brute-force rule has enough events to fire.
    attacker_types = {e.event_type for e in INCIDENT.events if e.src_ip == ATTACKER}
    assert {"port_scan", "auth_failure", "auth_success", "privileged"} <= attacker_types
    fired = {r.id for r, _ in INCIDENT.alerts()}
    assert "r1" in fired  # brute force


def test_unknown_command_is_handled():
    r = docker_siem.run(LAB, "kubectl get pods", {})
    assert r.exit_code == 0  # shell stays usable; it just reports not-found
    assert "command not found" in r.output


def test_definition_exposes_terminal_and_nine_objectives():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    d = labs["sec-docker-siem-001"]
    assert d.get("terminal") and len(d["objectives"]) == 9
    assert meta(LAB)["prompt"].startswith("student@docker-host")
