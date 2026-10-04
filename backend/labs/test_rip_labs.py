"""Tests for the RIP configuration lab on the IOS engine."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs.registry import get_lab
from labs.sessions import SessionService

client = TestClient(main.app)

RIP = [
    "enable", "conf t", "router rip", "version 2", "no auto-summary",
    "network 192.168.1.0", "network 10.0.12.0", "end",
    "connect R2", "enable", "conf t", "router rip", "version 2", "no auto-summary",
    "network 10.0.12.0", "network 10.0.23.0", "end",
    "connect R3", "enable", "conf t", "router rip", "version 2", "no auto-summary",
    "network 10.0.23.0", "network 192.168.3.0", "end",
]


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_rip_lab_completes():
    s, _ = _run("net-rip-001", RIP + ["connect PC-A", "ping 192.168.3.10"])
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_rip_requires_version_2():
    # RIPv1 (no `version 2`) must not satisfy the validators.
    v1 = [c for c in RIP if c != "version 2"]
    s, _ = _run("net-rip-001", v1)
    assert s.progress["r1"] is False and s.progress["routes"] is False and s.progress["conn"] is False


def test_rip_requires_no_auto_summary():
    # Forgetting `no auto-summary` must not satisfy the validators.
    summarized = [c for c in RIP if c != "no auto-summary"]
    s, _ = _run("net-rip-001", summarized)
    assert s.progress["r1"] is False and s.progress["routes"] is False and s.progress["conn"] is False


def test_rip_route_show_reflects_learned_routes():
    _, res = _run("net-rip-001", RIP + ["connect R1", "show ip route"])
    assert "R    10.0.23.0/24" in res.output and "R    192.168.3.0/24" in res.output


def test_rip_protocols_shows_summarization_state():
    _, res = _run("net-rip-001", RIP + ["connect R2", "show ip protocols"])
    assert '"rip"' in res.output and "is not in effect" in res.output


def test_rip_rip_database_lists_networks():
    _, res = _run("net-rip-001", RIP + ["connect R1", "show ip rip database"])
    assert "192.168.1.0/24" in res.output and "10.0.23.0/24" in res.output


def test_rip_help_is_lab_specific():
    from labs.shells import cisco_ios
    out = cisco_ios.run(get_lab("net-rip-001"), "help", {}).output
    assert "rip" in out.lower()
    assert out != cisco_ios.run(get_lab("net-ospf-001"), "help", {}).output


def test_rip_lab_definition():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    assert len(labs["net-rip-001"]["objectives"]) == 5
    assert labs["net-rip-001"]["terminal"]["multi_device"] is True
    assert labs["net-rip-001"]["category"] == "networking"
