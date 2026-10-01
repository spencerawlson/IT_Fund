"""A generic, data-driven Linux log-analysis shell for the blue-team labs.

Reusable across log labs: the per-lab dataset and detection rules live in labs/logsets.py, so a new
log lab is just data. cat/tail/head/grep/wc run for real over the fixed in-memory files; `grep`
records a finding when its pattern matches one of the lab's detections. Executes nothing.
"""
from __future__ import annotations

import shlex
from typing import Any

from labs.logsets import logset_for
from labs.providers.base import CommandResult


def _tok(s: str) -> list[str]:
    try:
        return shlex.split(s)
    except ValueError:
        return s.split()


def initial_prompt(lab) -> str:
    ls = logset_for(lab.id)
    return ls.prompt if ls else 'analyst@soc:~$ '


def banner(lab) -> list[str]:
    ls = logset_for(lab.id)
    return ls.banner if ls else []


def _resolve_file(ls, name: str | None) -> str | None:
    if name is None:
        return ls.default_file
    base = name.split('/')[-1]
    return base if base in ls.files else None


def _grep(ls, args: list[str]) -> CommandResult:
    flags = [a for a in args if a.startswith('-')]
    operands = [a for a in args if not a.startswith('-')]
    ci = any('i' in f for f in flags)
    count_only = any('c' in f for f in flags)
    invert = any('v' in f for f in flags)
    number = any('n' in f for f in flags)
    if not operands:
        return CommandResult(output='usage: grep [-icvn] PATTERN [FILE]', exit_code=2)
    pattern = operands[0]
    fname = _resolve_file(ls, operands[1] if len(operands) > 1 else None)
    if fname is None:
        return CommandResult(output=f'grep: {operands[1]}: No such file or directory', exit_code=2)
    needle = pattern.lower() if ci else pattern
    matched = []
    for idx, line in enumerate(ls.files[fname], start=1):
        hay = line.lower() if ci else line
        if (needle in hay) != invert:
            matched.append(f'{idx}:{line}' if number else line)

    findings: dict[str, Any] = {}
    if matched or count_only:
        plow = pattern.lower()
        for det in ls.detections:
            if any(t in plow for t in det.triggers) and (matched or count_only):
                findings[det.key] = {'pattern': pattern}
    if count_only:
        return CommandResult(output=str(len(matched)), findings=findings)
    if not matched:
        return CommandResult(output='', exit_code=1)
    return CommandResult(output='\n'.join(matched), findings=findings)


def _count_arg(args: list[str], default: int) -> tuple[int, str | None]:
    n, fname = default, None
    i = 0
    while i < len(args):
        a = args[i]
        if a in ('-n', '-c') and i + 1 < len(args) and args[i + 1].isdigit():
            n = int(args[i + 1]); i += 2; continue
        if a.startswith('-') and a[1:].isdigit():
            n = int(a[1:]); i += 1; continue
        if not a.startswith('-'):
            fname = a
        i += 1
    return n, fname


def _cat(ls, args, head=None) -> CommandResult:
    fname = _resolve_file(ls, next((a for a in args if not a.startswith('-')), None))
    if fname is None:
        return CommandResult(output='cat: No such file or directory', exit_code=1)
    lines = ls.files[fname]
    if head is not None:
        n, f2 = _count_arg(args, 10)
        lines = lines[:n] if head else lines[-n:]
    return CommandResult(output='\n'.join(lines), findings={'log_viewed': True})


def _wc(ls, args) -> CommandResult:
    fname = _resolve_file(ls, next((a for a in args if not a.startswith('-')), None))
    if fname is None:
        return CommandResult(output='wc: No such file or directory', exit_code=1)
    return CommandResult(output=f'{len(ls.files[fname])} {fname}', findings={'log_viewed': True})


def _help(ls) -> CommandResult:
    files = ' | '.join(ls.files)
    return CommandResult(output=(
        'Available commands (simulated - nothing really runs):\n'
        f'  cat <file>                 show a whole log   (files: {files})\n'
        '  tail -n N <file>           last N lines (head for the first)\n'
        '  grep [-i] [-c] PATTERN <file>   search a log for real\n'
        '  wc -l <file>               count lines\n'
        '  ls | pwd | whoami | clear | help\n'
        'Work the investigation: find the suspicious indicators and pivot on them.'
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    ls = logset_for(lab.id)
    if ls is None:
        return CommandResult(output='This lab has no log dataset.', exit_code=127)
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 512:
        return CommandResult(output='Command too long.', exit_code=1)
    # Honour a single pipe into grep or wc.
    if '|' in raw:
        left, _, right = raw.partition('|')
        rparts = _tok(right.strip())
        if rparts and rparts[0] == 'grep':
            base = run(lab, left.strip(), findings)
            return _grep(ls, rparts[1:]) if base.exit_code == 0 else base
        if rparts and rparts[0] == 'wc':
            base = run(lab, left.strip(), findings)
            if base.exit_code == 0:
                return CommandResult(output=str(len(base.output.splitlines())))
            return base
    parts = _tok(raw)
    cmd = parts[0].split('/')[-1].lower()
    if cmd == 'sudo' and len(parts) > 1:
        parts = parts[1:]; cmd = parts[0].split('/')[-1].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _help(ls)
    if cmd == 'grep':
        return _grep(ls, args)
    if cmd in ('cat', 'less', 'more', 'bat'):
        return _cat(ls, args)
    if cmd == 'tail':
        return _cat(ls, args, head=False)
    if cmd == 'head':
        return _cat(ls, args, head=True)
    if cmd == 'wc':
        return _wc(ls, args)
    if cmd == 'ls':
        return CommandResult(output='  '.join(ls.files))
    if cmd == 'pwd':
        return CommandResult(output='/var/log')
    if cmd == 'whoami':
        return CommandResult(output='analyst')
    return CommandResult(output=f'{cmd}: command not found', exit_code=127)
