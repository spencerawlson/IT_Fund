"""Tests for the blue-team log-analysis labs (generic logfile shell)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

import pytest
from fastapi.testclient import TestClient
import main
from labs.registry import get_lab
from labs.shells import logfile, meta
from labs.sessions import SessionService

client = TestClient(main.app)

SEQS = {
    "sec-c2beacon-001": ["cat conn.log", "grep 185.220.101.47 conn.log", "grep 10.0.0.23 conn.log",
                         "grep /api/v1/beacon http.log", "grep Go-http-client http.log"],
    "sec-dns-typo-001": ["cat dns.log", "grep TXT dns.log", "grep g1obocorp dns.log",
                         "grep dnsexfil dns.log", "grep 10.0.0.88 dns.log"],
    "sec-ransomware-001": ["cat smb.log", "grep .locked smb.log", "grep win10-victim smb.log",
                           "grep DECRYPT smb.log", "grep write smb.log"],
}


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    for c in cmds:
        s, _ = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s


@pytest.mark.parametrize("lab_id", list(SEQS))
def test_blue_team_lab_completes(lab_id):
    s = _run(lab_id, SEQS[lab_id])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_grep_really_filters_with_quotes():
    lab = get_lab("sec-c2beacon-001")
    r = logfile.run(lab, 'grep "185.220.101.47" conn.log', {})
    lines = r.output.splitlines()
    assert lines and all("185.220.101.47" in ln for ln in lines)
    assert r.findings.get("beacon_dst")


def test_benign_search_does_not_fire_a_detection():
    lab = get_lab("sec-c2beacon-001")
    r = logfile.run(lab, "grep 93.184.216.34 conn.log", {})  # a benign destination
    assert r.findings == {}


def test_grep_no_match_is_silent_exit_1():
    lab = get_lab("sec-dns-typo-001")
    r = logfile.run(lab, "grep nonsense-token dns.log", {})
    assert r.output == "" and r.exit_code == 1 and r.findings == {}


def test_wc_counts_and_marks_viewed():
    lab = get_lab("sec-ransomware-001")
    r = logfile.run(lab, "wc -l smb.log", {})
    assert r.output.split()[0].isdigit() and r.findings.get("log_viewed")


def test_unknown_file_errors():
    lab = get_lab("sec-dns-typo-001")
    assert logfile.run(lab, "cat nope.log", {}).exit_code == 1


def test_definitions_have_terminal_and_five_objectives():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    for lab_id in SEQS:
        assert labs[lab_id].get("terminal") and len(labs[lab_id]["objectives"]) == 5
        assert labs[lab_id]["terminal"]["multi_device"] is False
    assert meta(get_lab("sec-c2beacon-001"))["prompt"].startswith("analyst@soc")
