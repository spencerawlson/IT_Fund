"""Tests for the Python scripting basics lab (simulated python3 shell + echo file writes)."""
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


def test_basics_lab_completes_with_hinted_commands():
    s, _ = _run("py-basics-001", [
        "python3 --version",
        "cat notes.txt",
        "python3 -c \"name='ada'; print('hello, ' + name)\"",
        "python3 -c \"for i in range(3): print('port', i)\"",
        "echo \"lines = open('notes.txt').read().splitlines()\" > count.py",
        "echo \"print('lines:', len(lines))\" >> count.py",
        "cat count.py",
        "python3 count.py",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_lab_definition_is_registered():
    lab = get_lab("py-basics-001")
    assert lab.shell == "linux_python"
    assert lab.category == "python"
    assert len(lab.objectives) == 5


def test_greeting_oneliner():
    lab = get_lab("py-basics-001")
    r = linux_python.run(lab, "python3 -c \"name='ada'; print('hello, ' + name)\"", {})
    assert r.output.strip() == "hello, ada"
    assert r.findings.get("py_basics_print")


def test_loop_oneliner():
    lab = get_lab("py-basics-001")
    r = linux_python.run(lab, "python3 -c \"for i in range(3): print('port', i)\"", {})
    assert r.output.strip() == "port 0\nport 1\nport 2"
    assert r.findings.get("py_basics_loop")


def test_echo_writes_and_appends_files():
    lab = get_lab("py-basics-001")
    findings = {}
    r = linux_python.run(lab, "echo \"lines = open('notes.txt').read().splitlines()\" > count.py", findings)
    assert r.exit_code == 0 and not r.findings.get("py_script_written")
    r = linux_python.run(lab, "echo \"print('lines:', len(lines))\" >> count.py", findings)
    assert r.findings["py_script_written"]["file"] == "count.py"
    r = linux_python.run(lab, "cat count.py", findings)
    assert "notes.txt" in r.output and "len(lines)" in r.output


def test_script_runs_and_counts_notes_lines():
    lab = get_lab("py-basics-001")
    findings = {}
    linux_python.run(lab, "echo \"lines = open('notes.txt').read().splitlines()\" > count.py", findings)
    linux_python.run(lab, "echo \"print('lines:', len(lines))\" >> count.py", findings)
    r = linux_python.run(lab, "python3 count.py", findings)
    assert r.output.strip() == "5"
    assert r.findings["py_script_run"]["lines"] == 5


def test_missing_script_still_errors_like_real_python():
    lab = get_lab("py-basics-001")
    r = linux_python.run(lab, "python3 nope.py", {})
    assert r.exit_code == 2
    assert "No such file" in r.output


def test_notes_file_is_listed_and_readable():
    lab = get_lab("py-basics-001")
    r = linux_python.run(lab, "ls", {})
    assert "notes.txt" in r.output and "auth.log" in r.output
    r = linux_python.run(lab, "cat notes.txt", {})
    assert len(r.output.strip().split("\n")) == 5


def test_automation_lab_shapes_still_work():
    # The shared shell must not regress the automation lab's recognizers.
    lab = get_lab("py-automation-001")
    r = linux_python.run(lab, "python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\"", {})
    assert r.output.strip() == "14" and r.findings.get("py_failed_count")
    r = linux_python.run(lab, "python3 -c \"import os; os.system('x')\"", {})
    assert r.findings == {} and "help" in r.output
