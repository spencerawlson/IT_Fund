"""A simulated Linux shell for the log-triage (brute-force investigation) lab.

`cat`, `tail`, `head`, `wc` and especially `grep` run for real against a fixed in-memory auth.log —
`grep "Failed password" auth.log` genuinely filters the lines — so the learner practices real log
analysis. Executes nothing on the host. Findings are recorded from what the learner discovers (which
patterns they search), so working the investigation is what completes the objectives.
"""
from __future__ import annotations

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
COMPROMISED_USER = 'admin'

# A fixed auth.log: a credential brute-force from one IP that eventually succeeds against `admin`,
# plus some benign activity so the filtering actually matters.
AUTH_LOG = [
    'Sep 30 01:02:11 web01 sshd[1900]: Accepted password for deploy from 10.0.0.5 port 44122 ssh2',
    'Sep 30 01:30:44 web01 CRON[1955]: pam_unix(cron:session): session opened for user root',
    'Sep 30 02:14:01 web01 sshd[2041]: Failed password for invalid user oracle from 203.0.113.66 port 50122 ssh2',
    'Sep 30 02:14:03 web01 sshd[2043]: Failed password for invalid user postgres from 203.0.113.66 port 50130 ssh2',
    'Sep 30 02:14:05 web01 sshd[2045]: Failed password for invalid user test from 203.0.113.66 port 50138 ssh2',
    'Sep 30 02:14:07 web01 sshd[2047]: Failed password for root from 203.0.113.66 port 50146 ssh2',
    'Sep 30 02:14:09 web01 sshd[2049]: Failed password for root from 203.0.113.66 port 50152 ssh2',
    'Sep 30 02:14:12 web01 sshd[2051]: Failed password for admin from 203.0.113.66 port 50160 ssh2',
    'Sep 30 02:14:15 web01 sshd[2053]: Failed password for admin from 203.0.113.66 port 50166 ssh2',
    'Sep 30 02:14:18 web01 sshd[2055]: Failed password for admin from 203.0.113.66 port 50172 ssh2',
    'Sep 30 02:14:21 web01 sshd[2057]: Accepted password for admin from 203.0.113.66 port 50180 ssh2',
    'Sep 30 02:14:21 web01 sshd[2057]: pam_unix(sshd:session): session opened for user admin by (uid=0)',
    'Sep 30 02:15:02 web01 sudo:    admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash',
    'Sep 30 02:16:40 web01 sshd[2101]: Failed password for admin from 203.0.113.66 port 50240 ssh2',
    'Sep 30 03:05:19 web01 sshd[2200]: Accepted publickey for deploy from 10.0.0.5 port 44990 ssh2',
]


def initial_prompt(lab) -> str:
    return f'analyst@web01:~$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Linux shell   (safe: nothing is really executed)',
        f'Incident: possible SSH brute-force on web01. Investigate {LOGFILE} and find who got in.',
        'Try: cat auth.log · grep "Failed password" auth.log · wc -l auth.log · tail -n 20 auth.log',
    ]


def _is_logfile(name: str) -> bool:
    return name in ('auth.log', LOGFILE, '/var/log/auth', 'auth', 'syslog') or name.endswith('/auth.log')


def _findings_for(pattern: str) -> dict[str, Any]:
    p = pattern.strip().lower()
    found: dict[str, Any] = {}
    if 'fail' in p:
        found['failed_found'] = {'pattern': pattern}
    if pattern.strip() == ATTACKER_IP:
        found['attacker_ip'] = {'ip': ATTACKER_IP}
    if 'accept' in p:
        found['breach_found'] = {'pattern': pattern}
    if p == COMPROMISED_USER:
        found['account_identified'] = {'user': COMPROMISED_USER}
    return found


def _grep(args: list[str]) -> CommandResult:
    flags = [a for a in args if a.startswith('-')]
    operands = [a for a in args if not a.startswith('-')]
    ci = any('i' in f for f in flags)
    count_only = any('c' in f for f in flags)
    invert = any('v' in f for f in flags)
    number = any('n' in f for f in flags)
    if not operands:
        return CommandResult(output='usage: grep [-icvn] PATTERN [FILE]', exit_code=2)
    pattern = operands[0]
    file = operands[1] if len(operands) > 1 else 'auth.log'
    if not _is_logfile(file):
        return CommandResult(output=f'grep: {file}: No such file or directory', exit_code=2)
    needle = pattern.lower() if ci else pattern
    matched = []
    for idx, line in enumerate(AUTH_LOG, start=1):
        hay = line.lower() if ci else line
        hit = needle in hay
        if hit != invert:
            matched.append(f'{idx}:{line}' if number else line)
    if count_only:
        return CommandResult(output=str(len(matched)), findings=_findings_for(pattern) if matched else {})
    if not matched:
        return CommandResult(output='', exit_code=1)
    return CommandResult(output='\n'.join(matched), findings=_findings_for(pattern))


def _count_arg(args: list[str], default: int) -> tuple[int, str | None]:
    n, file = default, None
    i = 0
    while i < len(args):
        a = args[i]
        if a in ('-n', '-c') and i + 1 < len(args) and args[i + 1].isdigit():
            n = int(args[i + 1]); i += 2; continue
        if a.startswith('-') and a[1:].isdigit():
            n = int(a[1:]); i += 1; continue
        if not a.startswith('-'):
            file = a
        i += 1
    return n, file


def _cat(args: list[str]) -> CommandResult:
    file = next((a for a in args if not a.startswith('-')), 'auth.log')
    if not _is_logfile(file):
        return CommandResult(output=f'cat: {file}: No such file or directory', exit_code=1)
    return CommandResult(output='\n'.join(AUTH_LOG), findings={'log_viewed': True})


def _tail(args: list[str], head=False) -> CommandResult:
    n, file = _count_arg(args, 10)
    if file and not _is_logfile(file):
        return CommandResult(output=f'tail: cannot open \'{file}\'', exit_code=1)
    lines = AUTH_LOG[:n] if head else AUTH_LOG[-n:]
    return CommandResult(output='\n'.join(lines), findings={'log_viewed': True})


def _wc(args: list[str]) -> CommandResult:
    file = next((a for a in args if not a.startswith('-')), 'auth.log')
    if not _is_logfile(file):
        return CommandResult(output=f'wc: {file}: No such file or directory', exit_code=1)
    return CommandResult(output=f'{len(AUTH_LOG)} {file}', findings={'log_viewed': True})


def _help() -> CommandResult:
    return CommandResult(output=(
        'Available commands (simulated - nothing really runs):\n'
        f'  cat auth.log                 show the whole log ({LOGFILE})\n'
        '  tail -n 20 auth.log          show the last N lines (head for the first)\n'
        '  grep [-i] [-c] PATTERN FILE  search the log (real filtering) — e.g. grep "Failed password" auth.log\n'
        '  wc -l auth.log               count the lines\n'
        '  ls | pwd | whoami | clear | help\n'
        'Goal: find the attacker IP, the failed attempts, the successful login, and the compromised account.'
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 512:
        return CommandResult(output='Command too long.', exit_code=1)
    # A single pipe into grep is common in triage; honour `... | grep X`.
    if '|' in raw:
        left, _, right = raw.partition('|')
        rparts = _tokenize(right.strip())
        if rparts and rparts[0] == 'grep':
            # Resolve the left side's content, then grep it.
            base = run(lab, left.strip(), findings)
            # Re-grep over the already-produced lines isn't modelled; fall back to grepping the log.
            return _grep(rparts[1:]) if base.exit_code == 0 else base
    parts = _tokenize(raw)
    cmd = parts[0].split('/')[-1].lower()
    if cmd == 'sudo' and len(parts) > 1:
        parts = parts[1:]
        cmd = parts[0].split('/')[-1].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _help()
    if cmd == 'grep':
        return _grep(args)
    if cmd in ('cat', 'less', 'more', 'bat'):
        return _cat(args)
    if cmd == 'tail':
        return _tail(args)
    if cmd == 'head':
        return _tail(args, head=True)
    if cmd == 'wc':
        return _wc(args)
    if cmd == 'ls':
        return CommandResult(output='auth.log  syslog')
    if cmd == 'pwd':
        return CommandResult(output='/var/log')
    if cmd == 'whoami':
        return CommandResult(output='analyst')
    if cmd == 'last':
        return CommandResult(output='admin    pts/0        203.0.113.66     Tue Sep 30 02:14   still logged in\ndeploy   pts/1        10.0.0.5         Tue Sep 30 01:02 - 01:40  (00:38)')
    return CommandResult(output=f'{cmd}: command not found', exit_code=127)
