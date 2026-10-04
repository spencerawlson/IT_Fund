"""Tests for the Python automation lab (simulated python3 shell)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from labs.registry import get_lab
from labs.sessions import SessionService
from labs.shells import linux_python


def _run(cmds):
    svc = SessionService()
    s = asyncio.run(svc.start("py-automation-001", "u1"))
    for c in cmds:
        s, _ = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s


def test_python_lab_completes_with_hinted_oneliners():
    s = _run([
        "python3 --version",
        "python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\"",
        "python3 -c \"import re; print(set(re.findall(r'\\d+\\.\\d+\\.\\d+\\.\\d+', open('auth.log').read())))\"",
        "python3 -c \"import urllib.request, json; print(json.load(urllib.request.urlopen('http://localhost:8080/api/alerts')))\"",
        "python3 -c \"import socket; [print(p) for p in [22,80,443,3306,8080] if socket.socket().connect_ex(('10.0.0.8', p)) == 0]\"",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_lab_definition_is_registered():
    lab = get_lab("py-automation-001")
    assert lab.shell == "linux_python"
    assert lab.category == "python"
    assert len(lab.objectives) == 5


def test_version_reports_simulated_interpreter():
    lab = get_lab("py-automation-001")
    r = linux_python.run(lab, "python3 --version", {})
    assert "3.12" in r.output
    assert r.findings.get("py_version")


def test_failed_count_oneliner():
    lab = get_lab("py-automation-001")
    r = linux_python.run(lab, "python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\"", {})
    assert r.output.strip() == "14"
    assert r.findings["py_failed_count"]["count"] == 14


def test_ip_extraction_oneliner():
    lab = get_lab("py-automation-001")
    r = linux_python.run(
        lab,
        "python3 -c \"import re; print(sorted(set(re.findall(r'\\d+\\.\\d+\\.\\d+\\.\\d+', open('auth.log').read()))))\"",
        {},
    )
    assert "203.0.113.66" in r.output
    assert r.findings["py_ips_extracted"]["ips"] == ["10.0.0.5", "203.0.113.66"]


def test_api_query_oneliner():
    lab = get_lab("py-automation-001")
    r = linux_python.run(
        lab,
        "python3 -c \"import urllib.request, json; print(json.load(urllib.request.urlopen('http://localhost:8080/api/alerts')))\"",
        {},
    )
    assert "203.0.113.66" in r.output
    assert r.findings.get("py_api_called")


def test_port_scan_oneliner():
    lab = get_lab("py-automation-001")
    r = linux_python.run(
        lab,
        "python3 -c \"import socket; [print(p) for p in [22,80,443,3306,8080] if socket.socket().connect_ex(('10.0.0.8', p)) == 0]\"",
        {},
    )
    assert "22/tcp open" in r.output
    assert "3306" not in r.output
    assert r.findings["py_scan_done"]["open"] == [22, 80, 443]


def test_unknown_snippet_gets_guidance_not_execution():
    lab = get_lab("py-automation-001")
    r = linux_python.run(lab, "python3 -c \"import os; os.system('rm -rf /')\"", {})
    assert r.findings == {}
    assert "help" in r.output


def test_missing_script_file_errors_like_real_python():
    lab = get_lab("py-automation-001")
    r = linux_python.run(lab, "python3 scan.py", {})
    assert r.exit_code == 2
    assert "No such file" in r.output
