"""Tests for the expanded PortBlast assessment workflow (scan/vuln/creds/crack/exploit + scope gating)."""
from labs.registry import get_lab
from labs.scenarios import simulate_command
from labs.validators import VALIDATORS

PORTBLAST_LAB = get_lab("cyber-portblast-001")


def sim(cmd, findings=None):
    return simulate_command(PORTBLAST_LAB, cmd, findings or {})


# ---- scan (legacy + explicit) ----

def test_portblast_bare_target_still_scans():
    r = sim("portblast target.lab")
    assert r.exit_code == 0
    assert "Phase 2: port sweep" in r.output
    assert r.findings["portblast"]["ports"]


def test_portblast_scan_subcommand():
    r = sim("portblast scan target.lab")
    assert r.exit_code == 0
    assert r.findings["portblast"]["ports"]


def test_portblast_scan_refuses_out_of_scope():
    r = sim("portblast scan evil.example.com")
    assert r.exit_code == 1
    assert "NOT in scope" in r.output
    assert r.findings["portblast_scope_refused"]["host"] == "evil.example.com"


# ---- vuln ----

def test_portblast_vuln_finds_apache_records():
    r = sim("portblast vuln apache 2.4.52")
    assert r.exit_code == 0
    assert "CVE-2021-41773" in r.output
    assert r.findings["portblast_vulns"][0]["records"] == 2


def test_portblast_vuln_no_results_for_unknown():
    r = sim("portblast vuln somethingobscure")
    assert r.exit_code == 0
    assert "No Results" in r.output
    assert r.findings["portblast_vulns"][0]["records"] == 0


def test_portblast_vuln_requires_product():
    r = sim("portblast vuln")
    assert r.exit_code == 2


def test_portblast_vuln_validator():
    v = VALIDATORS["portblast_vulns_found"]
    ok, _, _ = v({}, {"portblast_vulns": [{"product": "apache", "records": 2}]})
    assert ok is True
    ok, _, _ = v({}, {})
    assert ok is False


# ---- creds ----

def test_portblast_creds_finds_weak_ssh():
    r = sim("portblast creds target.lab --service ssh")
    assert r.exit_code == 0
    assert "login: admin" in r.output
    assert "password: password123" in r.output
    creds = r.findings["portblast_creds"]
    assert creds and creds[0]["login"] == "admin"


def test_portblast_creds_refuses_out_of_scope():
    r = sim("portblast creds evil.example.com --service ssh")
    assert r.exit_code == 1
    assert "NOT in scope" in r.output


def test_portblast_creds_requires_target():
    r = sim("portblast creds")
    assert r.exit_code == 2


def test_portblast_creds_validator():
    v = VALIDATORS["portblast_creds_found"]
    ok, _, _ = v({}, {"portblast_creds": [{"login": "admin"}]})
    assert ok is True
    ok, _, _ = v({}, {"portblast_creds": []})
    assert ok is False


# ---- crack ----

def test_portblast_crack_hash():
    r = sim("portblast crack hashes.txt")
    assert r.exit_code == 0
    assert "password123" in r.output
    cracked = r.findings["portblast_cracked"]
    assert cracked and cracked[0]["plaintext"] == "password123"


def test_portblast_crack_requires_file():
    r = sim("portblast crack")
    assert r.exit_code == 2


def test_portblast_crack_validator():
    v = VALIDATORS["portblast_crack_done"]
    ok, _, _ = v({}, {"portblast_cracked": [{"plaintext": "x"}]})
    assert ok is True
    ok, _, _ = v({}, {})
    assert ok is False


# ---- exploit ----

def test_portblast_exploit_runs_module():
    r = sim("portblast exploit --module exploit/linux/samba/is_known_pipename --target target.lab")
    assert r.exit_code == 0
    assert "Meterpreter session 1 opened" in r.output
    assert "SIMULATED" in r.output
    exp = r.findings["portblast_exploit"]
    assert exp and exp[0]["module"] == "exploit/linux/samba/is_known_pipename"


def test_portblast_exploit_refuses_out_of_scope():
    r = sim("portblast exploit --module exploit/linux/samba/is_known_pipename --target evil.example.com")
    assert r.exit_code == 1
    assert "NOT in scope" in r.output


def test_portblast_exploit_requires_args():
    r = sim("portblast exploit --module x")
    assert r.exit_code == 2


def test_portblast_exploit_validator():
    v = VALIDATORS["portblast_exploit_done"]
    ok, _, _ = v({}, {"portblast_exploit": [{"module": "m", "session": 1}]})
    assert ok is True
    ok, _, _ = v({}, {})
    assert ok is False


# ---- scope validator ----

def test_portblast_scope_validator():
    v = VALIDATORS["portblast_scope_understood"]
    ok, _, _ = v({}, {"portblast_scope_refused": {"host": "evil.example.com"}})
    assert ok is True
    ok, _, _ = v({}, {})
    assert ok is False


# ---- unknown subcommand ----

def test_portblast_unknown_subcommand():
    r = sim("portblast frobnicate target.lab")
    assert r.exit_code == 2
    assert "unknown subcommand" in r.output


# ---- full workflow end-to-end ----

def test_full_portblast_workflow():
    f = {}
    f.update(sim("portblast scan target.lab", f).findings)
    f.update(sim("portblast vuln samba 4.6.2", f).findings)
    f.update(sim("portblast creds target.lab --service ssh", f).findings)
    f.update(sim("portblast crack hashes.txt", f).findings)
    f.update(sim("portblast exploit --module exploit/linux/samba/is_known_pipename --target target.lab", f).findings)
    for name in ["portblast_vulns_found", "portblast_creds_found", "portblast_crack_done", "portblast_exploit_done"]:
        ok, _, _ = VALIDATORS[name]({}, f)
        assert ok is True, name


# ---- lab definition ----

def test_lab_has_ten_objectives_with_valid_validators():
    lab = PORTBLAST_LAB
    assert len(lab.objectives) == 10
    for obj in lab.objectives:
        assert obj.validator in VALIDATORS, f"unknown validator: {obj.validator}"
