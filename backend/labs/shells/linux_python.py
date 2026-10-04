"""A simulated Linux shell for the Python automation lab.

`cat`/`grep` work for real against a fixed in-memory auth.log, and `python3 -c "..."` runs a
deterministic simulation that recognises exactly the one-liner shapes this lab's objectives
need (counting failures, extracting IPs, querying the fake alerts API, socket port-scanning).
Anything else gets a helpful nudge toward the hinted shapes. Nothing is really executed.
"""
from __future__ import annotations

import json
import shlex
from typing import Any

from labs.providers.base import CommandResult


def _tokenize(s: str) -> list[str]:
    try:
        return shlex.split(s)
    except ValueError:
        return s.split()


HOST = 'analyst'
LOGFILE = '/var/log/auth.log'
ATTACKER_IP = '203.0.113.66'
BENIGN_IP = '10.0.0.5'
SCAN_TARGET = '10.0.0.8'
OPEN_PORTS = [22, 80, 443]
API_URL = 'http://localhost:8080/api/alerts'

# 14 failed SSH logins from the attacker, plus benign noise so filtering matters.
AUTH_LOG = [
    'Oct  3 22:01:12 auto01 sshd[3110]: Accepted password for deploy from 10.0.0.5 port 51220 ssh2',
    'Oct  3 22:14:02 auto01 sshd[3201]: Failed password for invalid user oracle from 203.0.113.66 port 52110 ssh2',
    'Oct  3 22:14:05 auto01 sshd[3203]: Failed password for invalid user postgres from 203.0.113.66 port 52118 ssh2',
    'Oct  3 22:14:08 auto01 sshd[3205]: Failed password for invalid user test from 203.0.113.66 port 52126 ssh2',
    'Oct  3 22:14:11 auto01 sshd[3207]: Failed password for root from 203.0.113.66 port 52134 ssh2',
    'Oct  3 22:14:14 auto01 sshd[3209]: Failed password for root from 203.0.113.66 port 52142 ssh2',
    'Oct  3 22:14:17 auto01 sshd[3211]: Failed password for admin from 203.0.113.66 port 52150 ssh2',
    'Oct  3 22:14:20 auto01 sshd[3213]: Failed password for admin from 203.0.113.66 port 52158 ssh2',
    'Oct  3 22:14:23 auto01 sshd[3215]: Failed password for admin from 203.0.113.66 port 52166 ssh2',
    'Oct  3 22:14:26 auto01 sshd[3217]: Failed password for admin from 203.0.113.66 port 52174 ssh2',
    'Oct  3 22:14:29 auto01 sshd[3219]: Failed password for admin from 203.0.113.66 port 52182 ssh2',
    'Oct  3 22:14:32 auto01 sshd[3221]: Failed password for admin from 203.0.113.66 port 52190 ssh2',
    'Oct  3 22:14:35 auto01 sshd[3223]: Failed password for admin from 203.0.113.66 port 52198 ssh2',
    'Oct  3 22:14:38 auto01 sshd[3225]: Failed password for admin from 203.0.113.66 port 52206 ssh2',
    'Oct  3 22:14:41 auto01 sshd[3227]: Failed password for admin from 203.0.113.66 port 52214 ssh2',
    'Oct  3 22:15:02 auto01 CRON[3300]: pam_unix(cron:session): session opened for user root',
]

FAILED_COUNT = sum(1 for ln in AUTH_LOG if 'Failed password' in ln)
UNIQUE_IPS = sorted({ATTACKER_IP, BENIGN_IP})

API_RESPONSE = {'alerts': 3, 'top_source': ATTACKER_IP, 'severity': 'high', 'sensor': 'ids01'}

# A small sample file for the scripting-basics lab: the learner's script counts these lines.
NOTES_TXT = [
    'todo: rotate ssh keys',
    'todo: patch web01',
    'note: backup ran at 02:00',
    'todo: review firewall rules',
    'note: incident drill on friday',
]
NOTES_NAME = 'notes.txt'
NOTES_COUNT = len(NOTES_TXT)


def _files(findings: dict[str, Any]) -> dict[str, str]:
    """In-memory files the learner 'wrote' with echo (persisted in the session findings)."""
    return findings.setdefault('_pyfiles', {})


def initial_prompt(lab) -> str:
    return 'analyst@auto01:~$ '


def banner(lab) -> list[str]:
    lab_id = getattr(lab, 'id', '')
    if lab_id == 'py-basics-001':
        return [
            'Road to CISSP - simulated Linux shell   (safe: nothing is really executed)',
            'Task: learn Python by doing. notes.txt is in this directory — count its lines.',
            'Try: python3 --version · cat notes.txt · then python3 -c "..." (see help).',
        ]
    if lab_id == 'py-netauto-001':
        return [
            'Road to CISSP - simulated Linux shell   (safe: nothing is really executed)',
            'Task: automate network chores with Python. switch.cfg is in this directory.',
            'Try: cat switch.cfg · then python3 -c "..." (see help).',
        ]
    return [
        'Road to CISSP - simulated Linux shell   (safe: nothing is really executed)',
        'Task: automate the triage with Python one-liners. auth.log is in this directory.',
        'Try: python3 --version · cat auth.log · then python3 -c "..." (see help).',
    ]


def _is_logfile(name: str) -> bool:
    return name in ('auth.log', LOGFILE, '/var/log/auth', 'auth') or name.endswith('/auth.log')


def _grep(args: list[str]) -> CommandResult:
    flags = [a for a in args if a.startswith('-')]
    operands = [a for a in args if not a.startswith('-')]
    ci = any('i' in f for f in flags)
    count_only = any('c' in f for f in flags)
    if not operands:
        return CommandResult(output='usage: grep [-ic] PATTERN [FILE]', exit_code=2)
    pattern = operands[0]
    file = operands[1] if len(operands) > 1 else 'auth.log'
    if not _is_logfile(file):
        return CommandResult(output=f'grep: {file}: No such file or directory', exit_code=2)
    needle = pattern.lower() if ci else pattern
    matched = [ln for ln in AUTH_LOG if needle in (ln.lower() if ci else ln)]
    if count_only:
        return CommandResult(output=str(len(matched)))
    if not matched:
        return CommandResult(output='', exit_code=1)
    return CommandResult(output='\n'.join(matched))


def _cat(args: list[str], findings: dict[str, Any]) -> CommandResult:
    file = next((a for a in args if not a.startswith('-')), 'auth.log')
    if file == NOTES_NAME or file.endswith('/' + NOTES_NAME):
        return CommandResult(output='\n'.join(NOTES_TXT))
    files = _files(findings)
    if file in files:
        return CommandResult(output=files[file])
    if not _is_logfile(file):
        return CommandResult(output=f'cat: {file}: No such file or directory', exit_code=1)
    return CommandResult(output='\n'.join(AUTH_LOG))


def _echo(raw: str, findings: dict[str, Any]) -> CommandResult:
    # Minimal honest `echo ... > file` / `>> file`: stores text in the session's in-memory files.
    # Only single/double-quoted or bare text is accepted — no expansion, no execution.
    text = raw
    if text.lower().startswith('sudo '):
        text = text[5:].lstrip()
    body = text[4:] if text.lower().startswith('echo') else text
    redir = None
    idx = None
    for marker in ('>>', '>'):
        i = body.find(marker)
        if i != -1 and (idx is None or i < idx):
            idx, redir = i, marker
    if idx is None:
        # Plain `echo text` — just print it back.
        return CommandResult(output=_strip_quotes(body.strip()))
    content = _strip_quotes(body[:idx].strip())
    name = body[idx + len(redir):].strip().split()[0] if body[idx + len(redir):].strip() else ''
    if not name or '/' in name or name.startswith('.'):
        return CommandResult(output='simulated shell: redirect target must be a plain filename', exit_code=1)
    files = _files(findings)
    if redir == '>>' and name in files:
        files[name] = files[name] + '\n' + content
    else:
        files[name] = content
    if _script_complete(files[name]):
        return CommandResult(output='', findings={'py_script_written': {'file': name}})
    return CommandResult(output='')


def _strip_quotes(text: str) -> str:
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ('"', "'"):
        return text[1:-1]
    return text


def _script_complete(content: str) -> bool:
    """The taught count-lines script shape: reads notes.txt, prints len() of its lines."""
    c = content.lower()
    return 'notes.txt' in c and 'print(' in c and 'len(' in c


def _python3(args: list[str], raw: str, findings: dict[str, Any]) -> CommandResult:
    if not args or args[0] in ('--version', '-V'):
        return CommandResult(
            output='Python 3.12.3 (simulated)',
            findings={'py_version': {'version': '3.12.3'}},
        )
    if args[0] == '-c' and len(args) >= 2:
        return _oneliner(args[1])
    if args[0].endswith('.py'):
        return _run_script(args[0], findings)
    return CommandResult(
        output='simulated python3: interactive mode is not available here — use python3 -c "..."',
        exit_code=1,
    )


def _run_script(name: str, findings: dict[str, Any]) -> CommandResult:
    files = _files(findings)
    if name not in files:
        return CommandResult(
            output=f"python3: can't open file '{name}': [Errno 2] No such file or directory",
            exit_code=2,
        )
    if _script_complete(files[name]):
        return CommandResult(
            output=str(NOTES_COUNT),
            findings={'py_script_run': {'file': name, 'lines': NOTES_COUNT}},
        )
    return CommandResult(
        output=('simulated python3: this lab only runs the taught count-lines script shape.\n'
                'Write it with echo (see help), then run it again.'),
        exit_code=1,
    )


def _oneliner(code: str) -> CommandResult:
    c = code.lower()
    has_log = 'auth.log' in c
    # 1) Count the failed logins.
    if has_log and 'failed' in c and ('sum(' in c or 'len(' in c or '.count(' in c):
        return CommandResult(
            output=str(FAILED_COUNT),
            findings={'py_failed_count': {'count': FAILED_COUNT}},
        )
    # 2) Extract unique source IPs.
    if has_log and ('findall' in c or 're.' in c) and ('set(' in c or 'unique' in c or 'sorted(' in c):
        return CommandResult(
            output=json.dumps(UNIQUE_IPS) + f'\n{len(UNIQUE_IPS)} unique IPs',
            findings={'py_ips_extracted': {'ips': UNIQUE_IPS}},
        )
    # 3) Query the alerts API.
    if ('urllib' in c or 'requests' in c or 'http.client' in c) and ('alert' in c or '8080' in c or '/api' in c):
        return CommandResult(
            output=json.dumps(API_RESPONSE, indent=2),
            findings={'py_api_called': {'url': API_URL}},
        )
    # 4) Port-scan the target with sockets.
    if 'socket' in c and 'connect_ex' in c:
        lines = [f'{p}/tcp open' for p in OPEN_PORTS]
        return CommandResult(
            output='\n'.join(lines),
            findings={'py_scan_done': {'target': SCAN_TARGET, 'open': OPEN_PORTS}},
        )
    # 5) Scripting basics: print a greeting built from a variable.
    if 'print(' in c and 'hello' in c and '+' in c:
        return CommandResult(
            output='hello, ada',
            findings={'py_basics_print': {'output': 'hello, ada'}},
        )
    # 6) Scripting basics: a for loop over range().
    if 'print(' in c and 'for ' in c and 'range(' in c:
        return CommandResult(
            output='port 0\nport 1\nport 2',
            findings={'py_basics_loop': {'output': ['port 0', 'port 1', 'port 2']}},
        )
    return CommandResult(
        output=('simulated python3: that snippet is outside this lab\'s scope.\n'
                'Try the hinted one-liners — type "help" for the exact shapes.'),
        exit_code=0,
    )


def _help(lab=None) -> CommandResult:
    lab_id = getattr(lab, 'id', '') if lab else ''
    if lab_id == 'py-basics-001':
        return CommandResult(output=(
            'Available commands (simulated - nothing really runs):\n'
            '  python3 --version              verify the interpreter\n'
            '  python3 -c "name=\'ada\'; print(\'hello, \' + name)"\n'
            '                               print a greeting built from a variable\n'
            '  python3 -c "for i in range(3): print(\'port\', i)"\n'
            '                               loop with for and range()\n'
            '  echo "lines = open(\'notes.txt\').read().splitlines()" > count.py\n'
            '  echo "print(\'lines:\', len(lines))" >> count.py\n'
            '                               write a script file (use >> to append)\n'
            '  python3 count.py                 run your script — it prints the line count\n'
            '  cat notes.txt | cat count.py | ls | pwd | whoami | clear | help\n'
            'Goal: print, loop, write a script, run it.'
        ))
    if lab_id == 'py-netauto-001':
        return CommandResult(output=(
            'Available commands (simulated - nothing really runs):\n'
            '  python3 --version              verify the interpreter\n'
            '  python3 -c "print([l for l in open(\'switch.cfg\') if \'vlan 10\' in l.lower()])"\n'
            '                               list config lines mentioning VLAN 10\n'
            '  python3 -c "for d in [\'sw1\',\'sw2\']: print(f\'hostname {d}\')"\n'
            '                               generate configs in a loop\n'
            '  echo "hostname sw1" > day0.txt   (>> appends)\n'
            '                               write generated configs to a file\n'
            '  cat switch.cfg | cat day0.txt | ls | pwd | whoami | clear | help\n'
            'Goal: parse the switch config, generate device configs, save them.'
        ))
    return CommandResult(output=(
        'Available commands (simulated - nothing really runs):\n'
        '  python3 --version              verify the interpreter\n'
        '  python3 -c "print(sum(1 for l in open(\'auth.log\') if \'Failed\' in l))"\n'
        '                               count failed SSH logins\n'
        '  python3 -c "import re; print(set(re.findall(r\'\\\\d+\\\\.\\\\d+\\\\.\\\\d+\\\\.\\\\d+\', open(\'auth.log\').read())))"\n'
        '                               extract unique source IPs\n'
        '  python3 -c "import urllib.request, json; print(json.load(urllib.request.urlopen(\'http://localhost:8080/api/alerts\')))"\n'
        '                               query the alerts API\n'
        '  python3 -c "import socket; [print(p) for p in [22,80,443,3306,8080] if socket.socket().connect_ex((\'10.0.0.8\', p)) == 0]"\n'
        '                               port-scan 10.0.0.8 with sockets\n'
        '  cat auth.log | grep PATTERN auth.log | ls | pwd | whoami | clear | help\n'
        'Goal: automate the triage — count, extract, query, scan.'
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 1024:
        return CommandResult(output='Command too long.', exit_code=1)
    parts = _tokenize(raw)
    cmd = parts[0].split('/')[-1].lower()
    if cmd == 'sudo' and len(parts) > 1:
        parts = parts[1:]
        cmd = parts[0].split('/')[-1].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _help(lab)
    if cmd in ('python3', 'python'):
        return _python3(args, raw, findings)
    if cmd == 'grep':
        return _grep(args)
    if cmd in ('cat', 'less', 'more'):
        return _cat(args, findings)
    if cmd == 'echo':
        return _echo(raw, findings)
    if cmd == 'ls':
        names = ['auth.log', NOTES_NAME] + sorted(_files(findings))
        return CommandResult(output='  '.join(names))
    if cmd == 'pwd':
        return CommandResult(output='/home/analyst')
    if cmd == 'whoami':
        return CommandResult(output='analyst')
    if cmd == 'curl':
        return CommandResult(output=json.dumps(API_RESPONSE, indent=2))
    return CommandResult(output=f'{cmd}: command not found', exit_code=127)
