"""Tests for the simulated lab shell: the interpreter (pure) and the /exec API + auto-validation."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import main
from labs import sessions as sessions_mod
from labs.registry import get_lab
from labs.scenarios import DEFAULT_TARGET, banner_for, simulate_command

client = TestClient(main.app)

NMAP_LAB = get_lab("cyber-nmap-001")
PORTBLAST_LAB = get_lab("cyber-portblast-001")


def setup_function():
    main.USERS.clear()
    main.TOKENS.clear()
    client.cookies.clear()
    sessions_mod.service._sessions.clear()
    sessions_mod.service._providers["mock"]._envs.clear()


def _user(uid: str):
    main.USERS[uid] = {"id": uid, "email": f"{uid}@example.com", "role": "user"}
    return {"Authorization": f"Bearer {main._issue_token(uid)}"}


def sim(command, findings=None):
    return simulate_command(NMAP_LAB, command, findings or {})


# ---- interpreter: nothing executes, output is realistic, findings match validators ----

def test_default_scan_finds_top_ports_and_service_names_but_no_versions():
    r = sim("nmap target.lab")
    assert "Nmap scan report for target.lab" in r.output
    assert "22/tcp" in r.output and "open" in r.output
    assert r.findings["hosts"]["target.lab"]["up"] is True
    ports = r.findings["ports"]
    assert {p["port"] for p in ports} == {22, 80, 139, 445, 3306, 8080}  # top-1000 only, not 33060
    assert all(p.get("service") for p in ports)
    assert all("version" not in p for p in ports)  # -sV was not requested


def test_service_version_scan_attaches_versions():
    r = sim("nmap -sV target.lab")
    assert "VERSION" in r.output and "OpenSSH" in r.output
    assert all(p.get("version") for p in r.findings["ports"])


def test_full_port_scan_reveals_the_hidden_service():
    r = sim("nmap -p- target.lab")
    assert 33060 in {p["port"] for p in r.findings["ports"]}


def test_rustscan_sweeps_all_ports():
    r = sim("rustscan -a target.lab")
    assert "The Modern Day Port Scanner." in r.output
    assert 33060 in {p["port"] for p in r.findings["ports"]}


def test_ping_confirms_host_only():
    r = sim("ping -c 4 target.lab")
    assert "icmp_seq=1" in r.output
    assert r.findings == {"hosts": {"target.lab": {"up": True}}}


def test_scan_by_ip_records_findings_under_the_hostname():
    r = sim(f"nmap {DEFAULT_TARGET.ip}")
    # Validators key on the hostname, so an IP scan must still record target.lab.
    assert "target.lab" in r.findings["hosts"]
    assert all(p["target"] == "target.lab" for p in r.findings["ports"])


def test_unknown_target_reports_host_down_with_no_findings():
    r = sim("nmap example.com")
    assert "Host seems down" in r.output
    assert r.findings == {}


def test_unknown_command_is_not_found_and_records_nothing():
    r = sim("rm -rf /")
    assert r.exit_code == 127 and "command not found" in r.output
    assert r.findings == {}


def test_nmap_without_a_target_prints_usage():
    r = sim("nmap")
    assert r.exit_code == 1 and "Usage" in r.output and r.findings == {}


def test_sudo_prefix_is_accepted():
    r = sim("sudo nmap -sV target.lab")
    assert r.findings["ports"] and r.findings["ports"][0].get("version")


def test_clear_asks_the_client_to_wipe_the_screen():
    r = sim("clear")
    assert r.clear is True and r.findings == {}


def test_help_lists_commands_and_the_banner_names_the_target():
    assert "nmap" in sim("help").output
    assert any("target.lab" in line for line in banner_for(NMAP_LAB))


def test_portblast_and_compare_flow():
    manual = simulate_command(PORTBLAST_LAB, "nmap -sV target.lab", {}).findings
    pb = simulate_command(PORTBLAST_LAB, "portblast target.lab", manual).findings
    assert pb["portblast"]["ports"]
    merged = {**manual, **pb}
    cmp = simulate_command(PORTBLAST_LAB, "compare", merged)
    assert cmp.findings["comparison"]["done"] is True


def test_compare_refuses_without_both_inputs():
    r = simulate_command(PORTBLAST_LAB, "compare", {})
    assert r.exit_code == 1 and r.findings == {}


# ---- API: /exec runs the shell, merges findings, and auto-validates ----

def test_exec_endpoint_completes_the_nmap_lab():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "nmap -sV -p- target.lab"}, headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "OpenSSH" in body["output"]
    assert body["session"]["status"] == "COMPLETED"
    assert all(body["session"]["progress"].values())


def test_exec_accumulates_findings_across_commands():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "nmap target.lab"}, headers=h)
    r = client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "nmap -sV target.lab"}, headers=h)
    ports = r.json()["session"]["findings"]["ports"]
    # The later -sV upgrades the earlier entries in place rather than duplicating them.
    assert all(p.get("version") for p in ports)
    assert len([p for p in ports if p["port"] == 22]) == 1


def test_exec_is_open_to_guests():
    sid = client.post("/api/labs/cyber-nmap-001/start").json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "ping target.lab"})
    assert r.status_code == 200
    assert r.json()["session"]["findings"]["hosts"]["target.lab"]["up"] is True


def test_exec_on_another_users_session_is_404():
    a, b = _user("alice"), _user("bob")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=a).json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/exec", json={"command": "nmap target.lab"}, headers=b)
    assert r.status_code == 404


def test_exec_rejects_non_string_command():
    h = _user("u1")
    sid = client.post("/api/labs/cyber-nmap-001/start", headers=h).json()["id"]
    r = client.post(f"/api/labs/sessions/{sid}/exec", json={"command": 123}, headers=h)
    assert r.status_code == 400
