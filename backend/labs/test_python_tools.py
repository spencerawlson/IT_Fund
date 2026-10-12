"""Contract tests for the Phase 3 Python-tools labs (py-loganalysis-001, py-sqli-001,
py-semgrep-001). No Docker daemon: definitions and validators are exercised in-process.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import labs.validators_python  # noqa: F401  (registers the validators)
from labs.definitions.python_tools import PY_LOGANALYSIS_LAB, PY_SEMGREP_LAB, PY_SQLI_LAB
from labs.validators import VALIDATORS


LABS = {
    "py-loganalysis-001": (PY_LOGANALYSIS_LAB, "beginner", 20, 5),
    "py-sqli-001": (PY_SQLI_LAB, "intermediate", 25, 5),
    "py-semgrep-001": (PY_SEMGREP_LAB, "intermediate", 25, 5),
}


def test_definition_fields():
    for lab_id, (lab, difficulty, minutes, n_objectives) in LABS.items():
        assert lab.id == lab_id
        assert lab.category == "python"
        assert lab.difficulty == difficulty
        assert lab.estimated_minutes == minutes
        assert lab.shell == "linux_python"
        assert len(lab.objectives) == n_objectives, lab_id
        assert [o.id for o in lab.objectives] == list(dict.fromkeys(o.id for o in lab.objectives)), lab_id
        assert lab.targets and lab.targets[0].hostname == "auto01"


def test_environment_hardening():
    for lab_id, (lab, *_rest) in LABS.items():
        env = lab.environment
        assert env.provider == "docker", lab_id
        assert env.image == "road-to-cissp/python-tools:latest", lab_id
        assert env.workdir == "/home/analyst", lab_id
        assert env.idle_timeout_minutes == 15, lab_id
        assert env.max_runtime_minutes == 45, lab_id
        assert env.deny_internet_egress is True, lab_id
        assert env.cpu_limit == 1.0, lab_id
        assert env.memory_mb == 512, lab_id


def test_objective_validators_are_registered():
    for lab_id, (lab, *_rest) in LABS.items():
        for obj in lab.objectives:
            assert obj.validator in VALIDATORS, f"{lab_id}: unknown validator {obj.validator}"


def _run(name, findings):
    return VALIDATORS[name]({}, findings)


# ---- py-loganalysis-001 ----

def test_pylog_failed_count():
    ok, msg, ev = _run("pylog_failed_count", {"pylog_failed_count": {"count": 73}})
    assert ok and ev["count"] == 73
    ok, msg, _ = _run("pylog_failed_count", {"pylog_failed_count": {"count": 72}})
    assert not ok and "72" in msg
    ok, _, _ = _run("pylog_failed_count", {})
    assert not ok


def test_pylog_attacker_ips():
    ok, msg, _ = _run("pylog_attacker_ips", {"pylog_attacker_ips": {"ips": ["203.0.113.66", "198.51.100.23"]}})
    assert ok and "203.0.113.66" in msg
    ok, _, _ = _run("pylog_attacker_ips", {"pylog_attacker_ips": {"ips": ["198.51.100.23"]}})
    assert not ok
    ok, _, _ = _run("pylog_attacker_ips", {})
    assert not ok


def test_pylog_top_user():
    ok, _, ev = _run("pylog_top_user", {"pylog_top_user": {"user": "admin"}})
    assert ok and ev["user"] == "admin"
    ok, msg, _ = _run("pylog_top_user", {"pylog_top_user": {"user": "root"}})
    assert not ok and "root" in msg
    ok, _, _ = _run("pylog_top_user", {})
    assert not ok


def test_pylog_scan_src():
    ok, _, _ = _run("pylog_scan_src", {"pylog_scan_src": {"ip": "192.0.2.77"}})
    assert ok
    ok, _, _ = _run("pylog_scan_src", {"pylog_scan_src": {"ip": "203.0.113.66"}})
    assert not ok
    ok, _, _ = _run("pylog_scan_src", {})
    assert not ok


def test_pylog_report_written():
    ok, _, ev = _run("pylog_report_written",
                     {"pylog_report": {"file": "incident_report.txt", "failed_count": 73}})
    assert ok and ev["file"] == "incident_report.txt"
    ok, _, _ = _run("pylog_report_written", {"pylog_report": {"file": "report.txt"}})
    assert not ok
    ok, _, _ = _run("pylog_report_written", {})
    assert not ok


# ---- py-sqli-001 ----

def test_sqli_injection_demo():
    ok, _, ev = _run("sqli_injection_demo", {"sqli_injected": {"payload": "' OR '1'='1", "rows": 3}})
    assert ok and ev["rows"] == 3
    ok, _, _ = _run("sqli_injection_demo", {"sqli_injected": {"payload": "admin", "rows": 1}})
    assert not ok
    ok, _, _ = _run("sqli_injection_demo", {})
    assert not ok


def test_sqli_vuln_located():
    ok, _, _ = _run("sqli_vuln_located",
                    {"sqli_vuln_location": {"file": "vuln_app.py", "function": "get_user", "flaw": "f-string"}})
    assert ok
    ok, _, _ = _run("sqli_vuln_located",
                    {"sqli_vuln_location": {"file": "vuln_app.py", "function": "add_note"}})
    assert not ok
    ok, _, _ = _run("sqli_vuln_located", {})
    assert not ok


def test_sqli_insert_vuln():
    ok, _, _ = _run("sqli_insert_vuln",
                    {"sqli_insert_vuln": {"file": "vuln_app.py", "function": "add_note"}})
    assert ok
    ok, _, _ = _run("sqli_insert_vuln",
                    {"sqli_insert_vuln": {"file": "vuln_app.py", "function": "get_user"}})
    assert not ok


def test_sqli_fix_applied():
    ok, _, _ = _run("sqli_fix_applied", {"sqli_fix": {"file": "fixed_app.py", "parameterized": True}})
    assert ok
    ok, _, _ = _run("sqli_fix_applied", {"sqli_fix": {"file": "fixed_app.py", "parameterized": False}})
    assert not ok
    ok, _, _ = _run("sqli_fix_applied", {})
    assert not ok


def test_sqli_injection_blocked():
    ok, _, _ = _run("sqli_injection_blocked", {"sqli_retest": {"blocked": True, "legit_ok": True}})
    assert ok
    ok, msg, _ = _run("sqli_injection_blocked", {"sqli_retest": {"blocked": False, "legit_ok": True}})
    assert not ok and "still returns rows" in msg
    ok, msg, _ = _run("sqli_injection_blocked", {"sqli_retest": {"blocked": True, "legit_ok": False}})
    assert not ok and "legit" in msg
    ok, _, _ = _run("sqli_injection_blocked", {})
    assert not ok


# ---- py-semgrep-001 ----

def test_semgrep_scanned():
    ok, _, ev = _run("semgrep_scanned", {"semgrep_scan": {"findings": 6}})
    assert ok and ev["findings"] == 6
    ok, _, _ = _run("semgrep_scanned", {"semgrep_scan": {"findings": 2}})
    assert not ok
    ok, _, _ = _run("semgrep_scanned", {})
    assert not ok


def test_semgrep_triaged():
    triage = {"error": ["tools.subprocess-shell-true", "tools.hardcoded-secret"],
              "warning": ["tools.weak-md5", "tools.unsafe-yaml-load"]}
    ok, _, _ = _run("semgrep_triaged", {"semgrep_triage": triage})
    assert ok
    ok, _, _ = _run("semgrep_triaged",
                    {"semgrep_triage": {"error": ["tools.hardcoded-secret"], "warning": []}})
    assert not ok
    ok, _, _ = _run("semgrep_triaged", {})
    assert not ok


def test_semgrep_fixes():
    ok, _, _ = _run("semgrep_secret_fixed", {"semgrep_fixes": {"hardcoded_secret": True}})
    assert ok
    ok, _, _ = _run("semgrep_secret_fixed", {"semgrep_fixes": {"hardcoded_secret": False}})
    assert not ok
    ok, _, _ = _run("semgrep_shell_fixed", {"semgrep_fixes": {"shell_true": True}})
    assert ok
    ok, _, _ = _run("semgrep_shell_fixed", {})
    assert not ok


def test_semgrep_clean():
    ok, _, ev = _run("semgrep_clean", {"semgrep_rerun": {"findings": 0}})
    assert ok and ev["findings"] == 0
    ok, msg, _ = _run("semgrep_clean", {"semgrep_rerun": {"findings": 2}})
    assert not ok and "2 finding(s)" in msg
    ok, _, _ = _run("semgrep_clean", {})
    assert not ok


def test_seed_log_answers_match_validators():
    # The committed auth.log must produce exactly the answers the validators expect.
    import re
    from collections import Counter
    log = Path(__file__).resolve().parents[1] / "labs" / "images" / "seeds" / "py-loganalysis-001" / "auth.log"
    lines = log.read_text().splitlines()
    failed = [l for l in lines if "Login failed" in l]
    assert len(failed) == 73
    ips = Counter(re.search(r"from (\S+)", l).group(1) for l in failed)
    assert ips.most_common(1)[0] == ("203.0.113.66", 61)
    users = Counter(re.search(r"user '([^']+)'", l).group(1) for l in failed)
    assert users.most_common(1)[0] == ("admin", 37)
    scans = [l for l in lines if "closed port" in l]
    assert len(scans) == 24 and all("192.0.2.77" in l for l in scans)
