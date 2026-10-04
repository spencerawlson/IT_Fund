"""Tests for the EIGRP interactive labs (configuration + troubleshooting) on the IOS engine."""
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

EIGRP = [
    "enable", "conf t", "router eigrp 100", "network 192.168.1.0 0.0.0.255", "network 10.0.12.0 0.0.0.255", "end",
    "connect R2", "enable", "conf t", "router eigrp 100", "network 10.0.12.0 0.0.0.255", "network 10.0.23.0 0.0.0.255", "end",
    "connect R3", "enable", "conf t", "router eigrp 100", "network 10.0.23.0 0.0.0.255", "network 192.168.3.0 0.0.0.255", "end",
]


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_eigrp_lab_completes():
    s, _ = _run("net-eigrp-001", EIGRP + ["connect PC-A", "ping 192.168.3.10"])
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_eigrp_wrong_as_has_no_adjacency():
    # R2 on AS 200 while everyone else is on 100: adjacency must not form.
    cmds = EIGRP[:6] + [
        "connect R2", "enable", "conf t", "router eigrp 200",
        "network 10.0.12.0 0.0.0.255", "network 10.0.23.0 0.0.0.255", "end",
    ] + EIGRP[13:]
    s, _ = _run("net-eigrp-001", cmds)
    assert s.progress["r1"] is True and s.progress["r3"] is True
    assert s.progress["r2"] is False and s.progress["adj"] is False and s.progress["conn"] is False


def test_eigrp_neighbor_show_reflects_adjacency():
    _, res = _run("net-eigrp-001", EIGRP + ["connect R2", "show ip eigrp neighbors"])
    assert "10.0.12.1" in res.output and "10.0.23.3" in res.output


def test_eigrp_protocols_shows_as_number():
    _, res = _run("net-eigrp-001", EIGRP + ["connect R1", "show ip protocols"])
    assert '"eigrp 100"' in res.output


def test_eigrp_troubleshoot_starts_broken_then_is_fixable():
    # Fresh troubleshoot session: R2 runs AS 200, so connectivity is broken until fixed.
    svc = SessionService()
    s = asyncio.run(svc.start("net-eigrp-tshoot-001", "u1"))
    s, _ = asyncio.run(svc.exec_command(s.id, "u1", "connect PC-A"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "ping 192.168.3.10"))
    assert "100% loss" in res.output
    # Diagnose: no neighbors on R2, and the protocols disagree on the AS number.
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "connect R2"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "show ip eigrp neighbors"))
    assert res.output.strip() == ""
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "show ip protocols"))
    assert '"eigrp 200"' in res.output
    # Fix: remove the wrong process, configure AS 100 with the right networks.
    for c in ["enable", "conf t", "no router eigrp 200", "router eigrp 100",
              "network 10.0.12.0 0.0.0.255", "network 10.0.23.0 0.0.0.255", "end",
              "show ip eigrp neighbors"]:
        s, res = asyncio.run(svc.exec_command(s.id, "u1", c))
    assert "10.0.12.1" in res.output and "10.0.23.3" in res.output
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "connect PC-A"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "ping 192.168.3.10"))
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_eigrp_help_is_lab_specific():
    from labs.shells import cisco_ios
    for lab_id in ("net-eigrp-001", "net-eigrp-tshoot-001"):
        lab = get_lab(lab_id)
        out = cisco_ios.run(lab, "help", {}).output
        assert "eigrp" in out.lower()
        assert lab_id not in out  # no leak of other labs' text
    # The two walkthroughs must differ (config vs troubleshooting).
    assert (cisco_ios.run(get_lab("net-eigrp-001"), "help", {}).output
            != cisco_ios.run(get_lab("net-eigrp-tshoot-001"), "help", {}).output)


def test_eigrp_lab_definitions():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    assert len(labs["net-eigrp-001"]["objectives"]) == 5
    assert len(labs["net-eigrp-tshoot-001"]["objectives"]) == 3
    for lab_id in ("net-eigrp-001", "net-eigrp-tshoot-001"):
        assert labs[lab_id]["terminal"]["multi_device"] is True
        assert labs[lab_id]["category"] == "networking"
