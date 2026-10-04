"""Tests for the Python network automation lab (simulated python3 shell)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from labs.registry import get_lab
from labs.sessions import SessionService
from labs.shells import linux_python


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


def test_netauto_lab_completes_with_hinted_commands():
    s, _ = _run("py-netauto-001", [
        "python3 --version",
        "cat switch.cfg",
        "python3 -c \"print([l for l in open('switch.cfg') if 'vlan 10' in l])\"",
        "python3 -c \"for sw in ['sw1','sw2','sw3']: print('hostname ' + sw)\"",
        "python3 -c \"open('day0.txt','w').write('\\n'.join('hostname '+sw for sw in ['sw1','sw2','sw3']))\"",
        "cat day0.txt",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_lab_definition_is_registered():
    lab = get_lab("py-netauto-001")
    assert lab.shell == "linux_python"
    assert lab.category == "python"
    assert len(lab.objectives) == 5


def test_parse_oneliner_lists_vlan10_ports():
    lab = get_lab("py-netauto-001")
    r = linux_python.run(lab, "python3 -c \"print([l for l in open('switch.cfg') if 'vlan 10' in l])\"", {})
    assert "Gi0/1" in r.output and "Gi0/2" in r.output and "Gi0/3" not in r.output
    assert r.findings["py_netauto_parse"]["ports"] == ["Gi0/1", "Gi0/2"]


def test_generate_oneliner_produces_three_hostnames():
    lab = get_lab("py-netauto-001")
    r = linux_python.run(lab, "python3 -c \"for sw in ['sw1','sw2','sw3']: print('hostname ' + sw)\"", {})
    assert r.output.strip() == "hostname sw1\nhostname sw2\nhostname sw3"
    assert r.findings["py_netauto_generate"]["devices"] == ["sw1", "sw2", "sw3"]


def test_write_shape_creates_file_and_cat_verifies():
    lab = get_lab("py-netauto-001")
    findings = {}
    r = linux_python.run(
        lab,
        "python3 -c \"open('day0.txt','w').write('\\n'.join('hostname '+sw for sw in ['sw1','sw2','sw3']))\"",
        findings,
    )
    assert r.findings["py_netauto_saved"]["file"] == "day0.txt"
    r = linux_python.run(lab, "cat day0.txt", findings)
    assert r.output.strip() == "hostname sw1\nhostname sw2\nhostname sw3"
    assert r.findings["py_netauto_verified"]["file"] == "day0.txt"


def test_switch_cfg_is_listed_and_readable():
    lab = get_lab("py-netauto-001")
    r = linux_python.run(lab, "ls", {})
    assert "switch.cfg" in r.output
    r = linux_python.run(lab, "cat switch.cfg", {})
    assert "SW-ACCESS-01" in r.output and "switchport access vlan 10" in r.output


def test_basics_and_automation_shapes_still_work():
    # The shared shell must not regress the other two labs' recognizers.
    basics = get_lab("py-basics-001")
    r = linux_python.run(basics, "python3 -c \"for i in range(3): print('port', i)\"", {})
    assert "port 2" in r.output and r.findings.get("py_basics_loop")
    auto = get_lab("py-automation-001")
    r = linux_python.run(auto, "python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\"", {})
    assert r.output.strip() == "14" and r.findings.get("py_failed_count")
