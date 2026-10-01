"""Tests for the dynamic-routing interactive labs (OSPF, OSPF troubleshooting, eBGP) on the IOS engine."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs.sessions import SessionService

client = TestClient(main.app)

OSPF = [
    "enable", "conf t", "router ospf 1", "network 192.168.1.0 0.0.0.255 area 0", "network 10.0.12.0 0.0.0.255 area 0", "end",
    "connect R2", "enable", "conf t", "router ospf 1", "network 10.0.12.0 0.0.0.255 area 0", "network 10.0.23.0 0.0.0.255 area 0", "end",
    "connect R3", "enable", "conf t", "router ospf 1", "network 10.0.23.0 0.0.0.255 area 0", "network 192.168.3.0 0.0.0.255 area 0", "end",
]
BGP = [
    "enable", "conf t", "router bgp 65001", "neighbor 192.0.2.2 remote-as 65002", "network 10.1.1.0 mask 255.255.255.0", "end",
    "connect R2", "enable", "conf t", "router bgp 65002", "neighbor 192.0.2.1 remote-as 65001", "network 10.2.2.0 mask 255.255.255.0", "end",
]


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_ospf_lab_completes():
    s, _ = _run("net-ospf-001", OSPF + ["connect PC-A", "ping 192.168.3.10"])
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_ospf_missing_one_router_has_no_connectivity():
    # Skip R2 entirely: adjacencies and connectivity must stay unmet, but R1/R3 config still validate.
    without_r2 = OSPF[:6] + OSPF[12:]
    s, _ = _run("net-ospf-001", without_r2)
    assert s.progress["r1"] is True and s.progress["r3"] is True
    assert s.progress["r2"] is False and s.progress["adj"] is False and s.progress["conn"] is False


def test_ospf_neighbor_show_reflects_adjacency():
    _, res = _run("net-ospf-001", OSPF + ["connect R2", "show ip ospf neighbor"])
    assert "FULL" in res.output and "10.0.12.1" in res.output and "10.0.23.3" in res.output


def test_ospf_troubleshoot_starts_broken_then_is_fixable():
    # Fresh troubleshoot session: connectivity is broken until R2's wrong-area network is fixed.
    svc = SessionService()
    s = asyncio.run(svc.start("net-ospf-tshoot-001", "u1"))
    s, _ = asyncio.run(svc.exec_command(s.id, "u1", "connect PC-A"))
    s, res = asyncio.run(svc.exec_command(s.id, "u1", "ping 192.168.3.10"))
    assert "100% loss" in res.output
    for c in ["connect R2", "enable", "conf t", "router ospf 1", "network 10.0.23.0 0.0.0.255 area 0", "end",
              "connect PC-A", "ping 192.168.3.10"]:
        s, res = asyncio.run(svc.exec_command(s.id, "u1", c))
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_bgp_lab_completes():
    s, _ = _run("net-bgp-001", BGP + ["connect PC1", "ping 10.2.2.10"])
    assert s.status == "COMPLETED" and all(s.progress.values())


def test_bgp_summary_shows_established_only_when_both_sides_peer():
    # Only R1 configured -> session not established.
    _, res = _run("net-bgp-001", BGP[:6] + ["show ip bgp summary"])
    assert "Active" in res.output
    _, res2 = _run("net-bgp-001", BGP + ["connect R1", "show ip bgp summary"])
    assert "65002" in res2.output


def test_routing_lab_definitions():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    assert len(labs["net-ospf-001"]["objectives"]) == 5
    assert len(labs["net-ospf-tshoot-001"]["objectives"]) == 3
    assert len(labs["net-bgp-001"]["objectives"]) == 5
    for lab_id in ("net-ospf-001", "net-bgp-001", "net-ospf-tshoot-001"):
        assert labs[lab_id]["terminal"]["multi_device"] is True
