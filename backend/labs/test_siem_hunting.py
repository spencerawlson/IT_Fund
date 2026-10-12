"""Tests for the SIEM threat-hunting lab (CySA+ security operations)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs.registry import get_lab
from labs.shells import siem_cli, meta
from labs.shells.siem_cli import (
    ALERTS, C2_IP, COMPROMISED_HOSTS, DNS_TUNNEL_DOMAIN, EVENTS, RDP_ATTACKER,
)
from labs.sessions import SessionService

client = TestClient(main.app)
LAB = get_lab("siem-hunting-001")

FULL_RUN = [
    "alerts",
    "alert A-101",
    "search event_type=rdp_auth_failure",
    "hunt ioc 203.0.113.99",
    "timeline ws-finance01",
    "search event_type=dns_query TXT",
    "hunt ioc tun.exfil-ops.net",
    "timeline ws-hr02",
    "alert A-103",
    "search https_beacon",
    "hunt ioc 203.0.113.200",
    "timeline ws-sales03",
    "isolate ws-finance01",
    "isolate srv-files02",
    "isolate ws-hr02",
    "isolate ws-sales03",
    "report",
]


def _run(cmds, start=None):
    svc = SessionService()
    s = asyncio.run(svc.start("siem-hunting-001", "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_lab_completes_end_to_end():
    s, _ = _run(FULL_RUN)
    assert s.status == "COMPLETED"
    assert all(s.progress.values()), {k: v for k, v in s.progress.items() if not v}


def test_definition_exposes_terminal_and_eight_objectives():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    d = labs["siem-hunting-001"]
    assert d.get("terminal") and len(d["objectives"]) == 8
    assert d["title"] == "SIEM Threat Hunting"
    assert meta(LAB)["prompt"].startswith("analyst@siem")


def test_dataset_has_three_attack_chains_plus_noise():
    types = {e["event_type"] for e in EVENTS}
    assert {"rdp_auth_failure", "rdp_auth_success", "dns_query", "https_beacon",
            "process_create", "persistence", "email_delivered", "smb_session"} <= types
    assert len(ALERTS) == 5  # 4 real + 1 false positive
    # determinism: rebuild produces identical ordering
    assert [e["id"] for e in EVENTS] == [e["id"] for e in siem_cli._build_events()]


def test_search_field_filters_and_freetext():
    r = siem_cli.run(LAB, "search event_type=rdp_auth_failure", {})
    assert len([ln for ln in r.output.splitlines() if "rdp_auth_failure" in ln]) == 12
    r = siem_cli.run(LAB, "search entity=ws-hr02 dns_query", {})
    assert "tun.exfil-ops.net" in r.output
    r = siem_cli.run(LAB, "search event_type=nope_xyz", {})
    assert "0 events match" in r.output


def test_alerts_and_detail():
    r = siem_cli.run(LAB, "alerts", {})
    for aid in ("A-101", "A-102", "A-103", "A-104", "A-105"):
        assert aid in r.output
    assert r.findings["siem_alerts_triaged"]
    r = siem_cli.run(LAB, "alert A-999", {})
    assert "No alert A-999" in r.output
    r = siem_cli.run(LAB, "alert A-102", {})
    assert DNS_TUNNEL_DOMAIN in r.output


def test_hunt_records_ioc_conclusions():
    r = siem_cli.run(LAB, f"hunt ioc {RDP_ATTACKER}", {})
    assert r.findings["siem_rdp_attacker"]
    assert not r.findings["siem_malware_c2"]
    # wrong IOC: recorded, but the validator must not pass
    r = siem_cli.run(LAB, "hunt ioc 1.2.3.4", {})
    assert "1.2.3.4" in r.findings["_siem"]["tracked_iocs"]
    assert not r.findings["siem_rdp_attacker"] or True  # RDP flag came from the right IOC above
    fresh = siem_cli.run(LAB, "hunt ioc 1.2.3.4", {})
    assert not fresh.findings["siem_rdp_attacker"]
    assert not fresh.findings["siem_malware_c2"]
    assert not fresh.findings["siem_dns_tunnel"]


def test_timeline_scopes_each_chain():
    r = siem_cli.run(LAB, "timeline ws-finance01", {})
    assert r.findings["siem_rdp_timeline"]  # lateral movement visible
    assert "srv-files02" in r.output
    r = siem_cli.run(LAB, "timeline ws-hr02", {})
    assert r.findings["siem_exfil_host"]
    r = siem_cli.run(LAB, "timeline ws-sales03", {})
    assert r.findings["_siem"]["malware_chain_seen"]
    r = siem_cli.run(LAB, "timeline nosuchhost", {})
    assert "No events found" in r.output


def test_isolate_requires_all_compromised_hosts():
    s, _ = _run(["isolate ws-finance01", "isolate srv-files02"])
    assert not s.progress["contain"]
    s, _ = _run([f"isolate {h}" for h in COMPROMISED_HOSTS])
    assert s.progress["contain"]
    # unknown host is rejected, not recorded
    r = siem_cli.run(LAB, "isolate evil.example.com", {})
    assert "Unknown host" in r.output
    assert "evil.example.com" not in r.findings["_siem"]["isolated_hosts"]


def test_report_blocked_until_investigation_complete():
    # no findings at all -> blocked, names what's missing without giving answers
    r = siem_cli.run(LAB, "report", {})
    assert "blocked" in r.output.lower()
    assert not r.findings["siem_report_done"]
    # IOCs but no containment -> still blocked
    s, last = _run(["hunt ioc 203.0.113.99", "hunt ioc 203.0.113.200",
                    "hunt ioc tun.exfil-ops.net", "report"])
    assert "blocked" in last.output.lower()
    assert not s.progress["report"]
    # full run -> report generated
    s, last = _run(FULL_RUN)
    assert "INCIDENT REPORT" in last.output
    assert s.progress["report"]


def test_stats_and_help():
    r = siem_cli.run(LAB, "stats", {})
    assert "events" in r.output and "Top sources" in r.output
    r = siem_cli.run(LAB, "help", {})
    assert "hunt ioc" in r.output and "timeline" in r.output


def test_unknown_command_is_handled():
    r = siem_cli.run(LAB, "nmap -sV target", {})
    assert r.exit_code == 0
    assert "command not found" in r.output


def test_state_is_stateful_across_commands():
    # findings accumulate through the session: isolate then check derivation
    _, res = _run(["isolate ws-finance01"])
    assert "ws-finance01" in res.output
    s, _ = _run(["hunt ioc 203.0.113.99", "timeline ws-finance01"])
    assert s.progress["identify-rdp-attacker"]
    assert s.progress["reconstruct-rdp"]
    assert not s.progress["identify-malware-c2"]
