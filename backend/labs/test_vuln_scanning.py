"""Tests for the vulnerability assessment workflow lab (vuln_cli shell + validators + definition)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import vuln_cli
from labs.definitions.cybersecurity import VULN_SCANNING_LAB
from labs.validators import VALIDATORS

LAB = VULN_SCANNING_LAB


def _merge(findings, result):
    merged = dict(findings)
    merged.update(result.findings)
    return merged


def _walk(cmds):
    f = {}
    for c in cmds:
        r = vuln_cli.run(LAB, c, f)
        f = _merge(f, r)
    return f


def _full_walkthrough():
    """Canonical happy path; returns final findings."""
    return _walk([
        "scan 10.0.1.0/24",
        "vulns",
        "vuln VULN-001",
        "vuln VULN-003",
        "kev",
        "prioritize",
        "prioritize --by cvss",
        "prioritize VULN-001 VULN-003 VULN-002",
        "remediate VULN-001",
        "remediate VULN-003",
        "remediate VULN-002",
        "mitigate VULN-004",
        "rescan",
        "report",
    ])


# ---------- shell basics ----------

def test_shell_banner_marks_simulation():
    b = vuln_cli.banner(LAB)
    assert any("simulated" in line.lower() for line in b)


def test_help_lists_workflow():
    r = vuln_cli.run(LAB, "help", {})
    assert "scan" in r.output and "prioritize" in r.output and "remediate" in r.output


def test_unknown_command_rejected():
    r = vuln_cli.run(LAB, "nmap", {})
    assert r.exit_code == 127


# ---------- scan ----------

def test_scan_seeds_findings():
    r = vuln_cli.run(LAB, "scan 10.0.1.0/24", {})
    assert r.exit_code == 0
    assert "12 vulnerabilities" in r.output
    assert r.findings["vuln_scan_complete"] is True


def test_vulns_requires_scan_first():
    r = vuln_cli.run(LAB, "vulns", {})
    assert "No scan results yet" in r.output


def test_vulns_lists_twelve():
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "vulns", f)
    assert r.output.count("VULN-") == 12


# ---------- vuln detail ----------

def test_vuln_detail_shows_vector_epss_kev():
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "vuln VULN-003", f)
    assert "CVE-2021-41773" in r.output
    assert "CVSS:3.1/AV:N" in r.output
    assert "EPSS" in r.output
    assert "KEV" in r.output
    assert "Risk score" in r.output


def test_vuln_unknown_id():
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "vuln VULN-999", f)
    assert "Unknown finding" in r.output


# ---------- KEV ----------

def test_kev_lists_two_entries():
    r = vuln_cli.run(LAB, "kev", {})
    assert "CVE-2021-44228" in r.output
    assert "CVE-2021-41773" in r.output
    assert r.findings["vuln_kev_checked"] is True


# ---------- prioritization: the core lesson ----------

def test_risk_ranking_differs_from_cvss():
    """VULN-003 (7.5) must outrank VULN-004 (9.8) by risk."""
    ranked = [v["id"] for v in vuln_cli._ranked()]
    by_cvss = [v["id"] for v in vuln_cli._by_cvss()]
    assert ranked.index("VULN-003") < ranked.index("VULN-004")
    assert by_cvss.index("VULN-004") < by_cvss.index("VULN-003")


def test_risk_top3():
    ranked = [v["id"] for v in vuln_cli._ranked()]
    assert ranked[:3] == ["VULN-001", "VULN-003", "VULN-002"]


def test_prioritize_by_cvss_shows_naive_order():
    r = vuln_cli.run(LAB, "prioritize --by cvss", {})
    out = r.output
    # In CVSS order, VULN-004 (9.8) appears before VULN-003 (7.5)
    assert out.index("VULN-004") < out.index("VULN-003")


def test_prioritize_submission_recorded():
    f = _walk(["scan 10.0.1.0/24", "prioritize VULN-001 VULN-003 VULN-002"])
    assert f["vuln_priority_submission"] == ["VULN-001", "VULN-003", "VULN-002"]


def test_prioritize_rejects_duplicates():
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "prioritize VULN-001 VULN-001 VULN-002", f)
    assert "DISTINCT" in r.output


# ---------- validators: prioritization reasoning ----------

def test_validator_accepts_correct_top3():
    v = VALIDATORS["vuln_prioritized"]
    ok, msg, _ = v({}, {"vuln_priority_submission": ["VULN-001", "VULN-003", "VULN-002"]})
    assert ok is True


def test_validator_rejects_cvss_only_ordering():
    """Pure CVSS top-3 (10.0, 10.0, 10.0) must fail — it misses the lesson."""
    v = VALIDATORS["vuln_prioritized"]
    ok, msg, _ = v({}, {"vuln_priority_submission": ["VULN-001", "VULN-005", "VULN-011"]})
    assert ok is False
    assert "VULN-003" in msg


def test_validator_rejects_trap_vuln_in_top3():
    """VULN-004 (9.8 CVSS, low EPSS, no KEV, low asset) must not be top-3."""
    v = VALIDATORS["vuln_prioritized"]
    ok, msg, _ = v({}, {"vuln_priority_submission": ["VULN-001", "VULN-003", "VULN-004"]})
    assert ok is False
    assert "VULN-004" in msg


def test_validator_rejects_wrong_number_one():
    v = VALIDATORS["vuln_prioritized"]
    ok, msg, _ = v({}, {"vuln_priority_submission": ["VULN-003", "VULN-001", "VULN-002"]})
    assert ok is False
    assert "VULN-001" in msg


def test_validator_rejects_empty_submission():
    v = VALIDATORS["vuln_prioritized"]
    ok, _, _ = v({}, {})
    assert ok is False


# ---------- remediation vs mitigation ----------

def test_remediate_marks_fixed():
    f = _walk(["scan 10.0.1.0/24", "remediate VULN-001"])
    assert "VULN-001" in f["vuln_remediated"]
    r = vuln_cli.run(LAB, "vulns", f)
    assert "REMEDIATED" in r.output


def test_remediate_refuses_unpatchable():
    """VULN-004 has no vendor patch — remediate must refuse, mitigate is the answer."""
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "remediate VULN-004", f)
    assert r.output.startswith("Cannot remediate")
    assert "mitigate VULN-004" in r.output
    assert "VULN-004" not in r.findings["vuln_remediated"]


def test_mitigate_records_workaround():
    f = _walk(["scan 10.0.1.0/24"])
    r = vuln_cli.run(LAB, "mitigate VULN-004", f)
    assert "VULN-004" in r.findings["vuln_mitigated"]
    assert "REMAINS" in r.output
    r2 = vuln_cli.run(LAB, "vulns", r.findings)
    assert "MITIGATED" in r2.output


def test_remediation_planned_needs_both():
    v = VALIDATORS["vuln_remediation_planned"]
    ok, _, _ = v({}, {"vuln_remediated": ["VULN-001"], "vuln_mitigated": []})
    assert ok is False
    ok, _, _ = v({}, {"vuln_remediated": ["VULN-001"], "vuln_mitigated": ["VULN-004"]})
    assert ok is True


# ---------- rescan & report ----------

def test_rescan_verifies_fixes():
    f = _walk(["scan 10.0.1.0/24", "remediate VULN-001", "mitigate VULN-004", "rescan"])
    assert f["vuln_rescanned"] is True
    r = vuln_cli.run(LAB, "rescan", f)
    assert "Remediated: 1" in r.output


def test_report_generates_summary():
    f = _walk(["scan 10.0.1.0/24", "report"])
    assert f["vuln_report_generated"] is True
    r = vuln_cli.run(LAB, "report", f)
    assert "EXECUTIVE SUMMARY" in r.output
    assert "VULN-001" in r.output


# ---------- full walkthrough: every objective completable ----------

def test_full_walkthrough_completes_all_objectives():
    f = _full_walkthrough()
    for obj in LAB.objectives:
        v = VALIDATORS[obj.validator]
        ok, msg, _ = v(obj.args, f)
        assert ok is True, f"objective {obj.id} failed: {msg}"


def test_lab_definition_valid():
    assert LAB.id == "vuln-scanning-001"
    assert LAB.shell == "vuln_cli"
    assert len(LAB.objectives) == 8
    assert len(LAB.targets) == 5
    # every validator referenced exists
    for obj in LAB.objectives:
        assert obj.validator in VALIDATORS, f"unknown validator {obj.validator}"


def test_shell_registered():
    from labs.shells import _SHELLS
    assert "vuln_cli" in _SHELLS


def test_lab_registered():
    from labs.registry import get_lab
    lab = get_lab("vuln-scanning-001")
    assert lab is not None
    assert lab.title == "Vulnerability Assessment Workflow"
