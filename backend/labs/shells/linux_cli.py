"""A simulated Linux terminal shell for the Linux Terminal Essentials lab.

A stateful, deterministic Ubuntu-style model: a pre-seeded in-memory filesystem,
processes, systemd services, users, and network state. Supports the core Linux+
(XK0-005) command set: navigation, file operations, permissions, text processing,
process management, service troubleshooting (a broken nginx to diagnose via
journalctl), networking inspection, and user management. Nothing executes; all
state lives in the session findings under `_linux_cli`, so validators check
outcomes (files, modes, service state), not keystrokes.

Determinism: fixed PIDs, fixed timestamps, fixed log content — the same command
sequence always produces the same output.
"""
from __future__ import annotations

import copy
import re
import shlex
from typing import Any

from labs.providers.base import CommandResult

PROMPT = 'student@linux-lab:~$ '
ROOT_PROMPT = 'student@linux-lab:~$ '

# ---- pre-seeded content ----

NOTES_TXT = """Linux+ study notes - week 1
===========================
- ls -l shows permissions, owner, size, mtime
- chmod 600 = owner read/write only (private keys, notes)
- chmod 644 = owner rw, everyone else read (config files)
- chmod 755 = owner rwx, everyone else rx (scripts, dirs)
- grep -i ignores case, grep -n shows line numbers
- journalctl -u <service> shows that unit's logs
- systemctl is-active <service> for a quick yes/no
"""

TODO_TXT = """TODO
----
[ ] harden ~/notes.txt permissions
[ ] extract ERROR lines from /var/log/syslog
[ ] figure out why nginx will not start
[ ] find which port sshd listens on
"""

APP_PY = '''#!/usr/bin/env python3
"""Tiny status app used by the projects deck."""
print("app ok")
'''

README_MD = """# projects

Small practice area. Try: ls -la, cat, cp, mv, mkdir, rm, tar.
"""

SYSLOG = """Oct 11 08:12:01 linux-lab systemd[1]: Started Daily apt upgrade.
Oct 11 08:15:44 linux-lab kernel: [  123.456] ERROR: disk I/O error on /dev/sda2, sector 883421
Oct 11 08:16:02 linux-lab sshd[812]: Accepted publickey for student from 10.0.2.15
Oct 11 08:20:31 linux-lab cron[901]: (root) CMD (  /usr/local/bin/backup-agent --full)
Oct 11 08:31:10 linux-lab kernel: [  987.112] ERROR: ata2.00: failed command: READ FPDMA QUEUED
Oct 11 08:45:00 linux-lab nginx[1024]: nginx: [emerg] unknown directive "servre_name" in /etc/nginx/nginx.conf:12
Oct 11 08:45:00 linux-lab systemd[1]: nginx.service: Failed with result 'exit-code'.
Oct 11 09:02:17 linux-lab sshd[1102]: Failed password for invalid user admin from 10.0.2.99
Oct 11 09:02:19 linux-lab sshd[1102]: ERROR: authentication failure; logname= uid=0 euid=0
Oct 11 09:15:00 linux-lab systemd[1]: Started Session 3 of User student.
"""

NGINX_CONF_BROKEN = """user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    include /etc/nginx/mime.types;
    servre_name example.local;
    server {
        listen 80;
        location / {
            root /var/www/html;
        }
    }
}
"""

NGINX_CONF_GOOD = NGINX_CONF_BROKEN.replace('servre_name', 'server_name')

JOURNAL_NGINX = """-- Logs begin at Fri 2026-10-09 13:58:01 UTC --
Oct 11 08:45:00 linux-lab nginx[1024]: nginx: [emerg] unknown directive "servre_name" in /etc/nginx/nginx.conf:12
Oct 11 08:45:00 linux-lab nginx[1024]: nginx: configuration file /etc/nginx/nginx.conf test failed
Oct 11 08:45:00 linux-lab systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE
Oct 11 08:45:00 linux-lab systemd[1]: nginx.service: Failed with result 'exit-code'.
Oct 11 08:45:00 linux-lab systemd[1]: Failed to start nginx.service - A high performance web server and reverse proxy server.
"""

ERROR_LINES = [ln for ln in SYSLOG.splitlines() if 'ERROR' in ln]


def _fresh() -> dict[str, Any]:
    files = {
        '/home/student/notes.txt': {'content': NOTES_TXT, 'mode': 0o644, 'owner': 'student', 'group': 'student'},
        '/home/student/todo.txt': {'content': TODO_TXT, 'mode': 0o644, 'owner': 'student', 'group': 'student'},
        '/home/student/projects/app.py': {'content': APP_PY, 'mode': 0o755, 'owner': 'student', 'group': 'student'},
        '/home/student/projects/README.md': {'content': README_MD, 'mode': 0o644, 'owner': 'student', 'group': 'student'},
        '/home/student/.hidden_config': {'content': 'theme=solarized\n', 'mode': 0o600, 'owner': 'student', 'group': 'student'},
        '/var/log/syslog': {'content': SYSLOG, 'mode': 0o640, 'owner': 'root', 'group': 'adm'},
        '/etc/nginx/nginx.conf': {'content': NGINX_CONF_BROKEN, 'mode': 0o644, 'owner': 'root', 'group': 'root'},
        '/etc/nginx/nginx.conf.bak': {'content': NGINX_CONF_GOOD, 'mode': 0o644, 'owner': 'root', 'group': 'root'},
    }
    dirs = {
        '/': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/home': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/home/student': {'mode': 0o755, 'owner': 'student', 'group': 'student'},
        '/home/student/projects': {'mode': 0o755, 'owner': 'student', 'group': 'student'},
        '/var': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/var/log': {'mode': 0o755, 'owner': 'root', 'group': 'syslog'},
        '/var/www': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/var/www/html': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/etc': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/etc/nginx': {'mode': 0o755, 'owner': 'root', 'group': 'root'},
        '/tmp': {'mode': 0o777, 'owner': 'root', 'group': 'root'},
    }
    return {
        'cwd': '/home/student',
        'user': 'student',
        'files': files,
        'dirs': dirs,
        'processes': [
            {'pid': 1, 'user': 'root', 'cpu': '0.1', 'mem': '0.4', 'cmd': '/sbin/init'},
            {'pid': 412, 'user': 'root', 'cpu': '0.0', 'mem': '0.2', 'cmd': '/usr/sbin/sshd -D'},
            {'pid': 901, 'user': 'root', 'cpu': '98.7', 'mem': '1.1', 'cmd': '/usr/local/bin/backup-agent --full'},
            {'pid': 1450, 'user': 'student', 'cpu': '0.3', 'mem': '0.8', 'cmd': '-bash'},
        ],
        'services': {
            'nginx': {'status': 'failed', 'desc': 'A high performance web server and reverse proxy server'},
            'sshd': {'status': 'active', 'desc': 'OpenBSD Secure Shell server'},
            'cron': {'status': 'active', 'desc': 'Regular background program processing daemon'},
        },
        'users': {
            'root': {'uid': 0, 'gid': 0, 'home': '/root', 'shell': '/bin/bash', 'passwd_set': True},
            'student': {'uid': 1000, 'gid': 1000, 'home': '/home/student', 'shell': '/bin/bash', 'passwd_set': True},
        },
        'next_uid': 1001,
        'visited': ['/home/student'],
    }


def initial_prompt(lab) -> str:
    return PROMPT


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Linux terminal   (safe: nothing is really executed)',
        'Ubuntu 24.04 workstation. Learn by doing: navigate, manage files, fix permissions,',
        'search logs, manage processes, troubleshoot the nginx service, inspect the network,',
        'and manage users. Your todo list is in ~/todo.txt - start there.',
        'Try: pwd · ls -la · cat ~/todo.txt · help',
    ]


# ---- path helpers ----

def _resolve(st: dict[str, Any], path: str) -> str:
    """Resolve a user path (absolute, ~, relative, with . and ..) to an absolute path."""
    if not path:
        return st['cwd']
    if path.startswith('~'):
        path = '/home/student' + path[1:]
    if not path.startswith('/'):
        path = st['cwd'].rstrip('/') + '/' + path
    parts: list[str] = []
    for piece in path.split('/'):
        if piece in ('', '.'):
            continue
        if piece == '..':
            if parts:
                parts.pop()
        else:
            parts.append(piece)
    return '/' + '/'.join(parts)


def _is_dir(st: dict[str, Any], path: str) -> bool:
    return path in st['dirs']


def _is_file(st: dict[str, Any], path: str) -> bool:
    return path in st['files']


def _exists(st: dict[str, Any], path: str) -> bool:
    return _is_dir(st, path) or _is_file(st, path)


def _children(st: dict[str, Any], path: str) -> list[tuple[str, str]]:
    """(name, kind) of direct children of a directory, sorted dirs-first."""
    if not _is_dir(st, path):
        return []
    prefix = path if path.endswith('/') else path + '/'
    seen: dict[str, str] = {}
    for fpath in st['files']:
        if fpath.startswith(prefix):
            rest = fpath[len(prefix):]
            if '/' not in rest:
                seen[rest] = 'file'
    for dpath in st['dirs']:
        if dpath.startswith(prefix) and dpath != path:
            rest = dpath[len(prefix):]
            if '/' not in rest:
                seen[rest] = 'dir'
    return sorted(seen.items(), key=lambda kv: (kv[1] != 'dir', kv[0]))


def _mode_str(mode: int, is_dir: bool) -> str:
    chars = ['d' if is_dir else '-']
    for shift in (6, 3, 0):
        bits = (mode >> shift) & 0o7
        chars.append('r' if bits & 4 else '-')
        chars.append('w' if bits & 2 else '-')
        chars.append('x' if bits & 1 else '-')
    return ''.join(chars)


def _parse_mode(text: str) -> int | None:
    """Parse an octal mode string like '600' or '0755'."""
    if re.fullmatch(r'[0-7]{3,4}', text):
        return int(text, 8)
    return None


def _apply_symbolic(mode: int, spec: str) -> int | None:
    """Apply a simple symbolic mode like u+x, g-w, o=r, a+x. Returns new mode or None."""
    m = re.fullmatch(r'([ugoa]*)([+=-])([rwx]+)', spec)
    if not m:
        return None
    who, op, perms = m.groups()
    if not who:
        who = 'a'
    if 'a' in who:
        who = 'ugo'
    bit = {'r': 4, 'w': 2, 'x': 1}
    mask = 0
    for p in perms:
        mask |= bit[p]
    new = mode
    for w in set(who):
        shift = {'u': 6, 'g': 3, 'o': 0}[w]
        if op == '+':
            new |= mask << shift
        elif op == '-':
            new &= ~(mask << shift)
        else:  # =
            new = (new & ~(0o7 << shift)) | (mask << shift)
    return new


# ---- derived findings for validators ----

def _derive(st: dict[str, Any]) -> dict[str, Any]:
    notes = st['files'].get('/home/student/notes.txt')
    backup = st['files'].get('/home/student/projects/backup/notes.txt')
    errors = st['files'].get('/home/student/errors.txt')
    ssh_port = st['files'].get('/home/student/ssh_port.txt')
    nginx_conf = st['files'].get('/etc/nginx/nginx.conf')
    procs = st['processes']
    deploy = st['users'].get('deploy')
    return {
        'lt_navigated': '/var/log' in st['visited'],
        'lt_backup_created': bool(backup and notes and backup['content'] == notes['content']),
        'lt_permissions_hardened': bool(notes and notes['mode'] == 0o600),
        'lt_errors_extracted': bool(
            errors and ERROR_LINES and
            all(ln in errors['content'] for ln in ERROR_LINES) and
            all('ERROR' in ln for ln in errors['content'].splitlines() if ln.strip())
        ),
        'lt_runaway_killed': not any('backup-agent' in p['cmd'] for p in procs),
        'lt_nginx_fixed': (
            st['services']['nginx']['status'] == 'active'
            and bool(nginx_conf and nginx_conf['content'] == NGINX_CONF_GOOD)
        ),
        'lt_ssh_port_found': bool(ssh_port and ssh_port['content'].strip() == '22'),
        'lt_user_created': bool(deploy and deploy.get('passwd_set')),
    }


def _emit(st, output, clear=False, exit_code=0) -> CommandResult:
    return CommandResult(output=output, findings={'_linux_cli': st, **_derive(st)},
                         prompt=PROMPT, clear=clear, exit_code=exit_code)


# ---- output redirection ----

def _split_redirect(tokens: list[str]) -> tuple[list[str], str | None, bool]:
    """Split off a trailing `> file` / `>> file`. Returns (tokens, path, append)."""
    if '>' in tokens:
        i = tokens.index('>')
        return tokens[:i], (tokens[i + 1] if i + 1 < len(tokens) else None), False
    if '>>' in tokens:
        i = tokens.index('>>')
        return tokens[:i], (tokens[i + 1] if i + 1 < len(tokens) else None), True
    return tokens, None, False


# ---- command implementations (each returns (output, exit_code)) ----

def _cmd_pwd(st, args) -> tuple[str, int]:
    return st['cwd'], 0


def _cmd_ls(st, args) -> tuple[str, int]:
    long = any(a.startswith('-') and 'l' in a for a in args)
    show_all = any(a.startswith('-') and 'a' in a for a in args)
    paths = [a for a in args if not a.startswith('-')]
    target = _resolve(st, paths[0]) if paths else st['cwd']
    if _is_file(st, target):
        name = target.rsplit('/', 1)[1]
        if long:
            f = st['files'][target]
            return (f"{_mode_str(f['mode'], False)} 1 {f['owner']} {f['group']} "
                    f"{len(f['content']):>6} Oct 11 09:00 {name}", 0)
        return name, 0
    if not _is_dir(st, target):
        return f"ls: cannot access '{paths[0] if paths else ''}': No such file or directory", 2
    kids = _children(st, target)
    if not long:
        names = [n for n, _ in kids if show_all or not n.startswith('.')]
        return '  '.join(names), 0
    rows = []
    for name, kind in kids:
        if not show_all and name.startswith('.'):
            continue
        full = (target.rstrip('/') + '/' + name)
        if kind == 'dir':
            d = st['dirs'][full]
            rows.append(f"{_mode_str(d['mode'], True)} 2 {d['owner']} {d['group']} "
                        f"{4096:>6} Oct 11 09:00 {name}")
        else:
            f = st['files'][full]
            rows.append(f"{_mode_str(f['mode'], False)} 1 {f['owner']} {f['group']} "
                        f"{len(f['content']):>6} Oct 11 09:00 {name}")
    return '\n'.join(rows), 0


def _cmd_cd(st, args) -> tuple[str, int]:
    dest = args[0] if args else '/home/student'
    target = _resolve(st, dest)
    if _is_file(st, target):
        return f"bash: cd: {dest}: Not a directory", 1
    if not _is_dir(st, target):
        return f"bash: cd: {dest}: No such file or directory", 1
    st['cwd'] = target
    if target not in st['visited']:
        st['visited'].append(target)
    return '', 0


def _cmd_cat(st, args) -> tuple[str, int]:
    if not args:
        return 'cat: missing operand', 1
    out, code = [], 0
    for a in args:
        p = _resolve(st, a)
        if _is_dir(st, p):
            out.append(f'cat: {a}: Is a directory'); code = 1
        elif p in st['files']:
            out.append(st['files'][p]['content'].rstrip('\n'))
        else:
            out.append(f'cat: {a}: No such file or directory'); code = 1
    return '\n'.join(out), code


def _cmd_mkdir(st, args) -> tuple[str, int]:
    paths = [a for a in args if not a.startswith('-')]
    if not paths:
        return 'mkdir: missing operand', 1
    for a in paths:
        p = _resolve(st, a)
        if _exists(st, p):
            return f"mkdir: cannot create directory '{a}': File exists", 1
        parent = p.rsplit('/', 1)[0] or '/'
        if not _is_dir(st, parent):
            return f"mkdir: cannot create directory '{a}': No such file or directory (try -p)", 1
        st['dirs'][p] = {'mode': 0o755, 'owner': 'student', 'group': 'student'}
    return '', 0


def _rm_path(st, p: str, recursive: bool) -> tuple[str | None, int]:
    if _is_file(st, p):
        del st['files'][p]
        return None, 0
    if _is_dir(st, p):
        if _children(st, p) and not recursive:
            return f"rm: cannot remove '{p}': Is a directory", 1
        for f in [f for f in st['files'] if f == p or f.startswith(p + '/')]:
            del st['files'][f]
        for d in [d for d in st['dirs'] if d == p or d.startswith(p + '/')]:
            del st['dirs'][d]
        return None, 0
    return None, 0  # placeholder, caller checks existence


def _cmd_rm(st, args) -> tuple[str, int]:
    recursive = any(a.startswith('-') and 'r' in a for a in args)
    force = any(a.startswith('-') and 'f' in a for a in args)
    paths = [a for a in args if not a.startswith('-')]
    if not paths:
        return 'rm: missing operand', 1
    for a in paths:
        p = _resolve(st, a)
        if not _exists(st, p):
            if force:
                continue
            return f"rm: cannot remove '{a}': No such file or directory", 1
        err, code = _rm_path(st, p, recursive)
        if err:
            return err, code
    return '', 0


def _cmd_cp(st, args) -> tuple[str, int]:
    recursive = any(a.startswith('-') and 'r' in a for a in args)
    paths = [a for a in args if not a.startswith('-')]
    if len(paths) < 2:
        return 'cp: missing destination file operand', 1
    srcs, dst_arg = paths[:-1], paths[-1]
    dst = _resolve(st, dst_arg)
    for s in srcs:
        sp = _resolve(st, s)
        if _is_file(st, sp):
            target = dst
            if _is_dir(st, dst):
                target = dst.rstrip('/') + '/' + sp.rsplit('/', 1)[1]
            else:
                parent = target.rsplit('/', 1)[0] or '/'
                if not _is_dir(st, parent):
                    return f"cp: cannot create regular file '{dst_arg}': No such file or directory", 1
            src = st['files'][sp]
            st['files'][target] = {'content': src['content'], 'mode': src['mode'],
                                   'owner': 'student', 'group': 'student'}
        elif _is_dir(st, sp):
            if not recursive:
                return f"cp: -r not specified; omitting directory '{s}'", 1
            base = sp.rsplit('/', 1)[1]
            dest_base = dst.rstrip('/') + '/' + base if _is_dir(st, dst) else dst
            for d in [d for d in st['dirs'] if d == sp or d.startswith(sp + '/')]:
                nd = dest_base + d[len(sp):]
                st['dirs'][nd] = {'mode': 0o755, 'owner': 'student', 'group': 'student'}
            for f in [f for f in st['files'] if f.startswith(sp + '/')]:
                nf = dest_base + f[len(sp):]
                src = st['files'][f]
                st['files'][nf] = {'content': src['content'], 'mode': src['mode'],
                                   'owner': 'student', 'group': 'student'}
        else:
            return f"cp: cannot stat '{s}': No such file or directory", 1
    return '', 0


def _cmd_mv(st, args) -> tuple[str, int]:
    paths = [a for a in args if not a.startswith('-')]
    if len(paths) < 2:
        return 'mv: missing destination file operand', 1
    sp = _resolve(st, paths[0])
    dst = _resolve(st, paths[1])
    if not _exists(st, sp):
        return f"mv: cannot stat '{paths[0]}': No such file or directory", 1
    if _is_file(st, sp):
        target = dst.rstrip('/') + '/' + sp.rsplit('/', 1)[1] if _is_dir(st, dst) else dst
        parent = target.rsplit('/', 1)[0] or '/'
        if not _is_dir(st, parent):
            return f"mv: cannot move to '{paths[1]}': No such file or directory", 1
        st['files'][target] = st['files'].pop(sp)
    else:
        if _is_dir(st, dst):
            target = dst.rstrip('/') + '/' + sp.rsplit('/', 1)[1]
        else:
            target = dst
        for f in [f for f in st['files'] if f.startswith(sp + '/')]:
            st['files'][target + f[len(sp):]] = st['files'].pop(f)
        for d in sorted([d for d in st['dirs'] if d == sp or d.startswith(sp + '/')], reverse=True):
            st['dirs'][target + d[len(sp):]] = st['dirs'].pop(d)
    return '', 0


def _cmd_chmod(st, args) -> tuple[str, int]:
    paths = [a for a in args if not a.startswith('-')]
    if len(paths) < 2:
        return 'chmod: missing operand', 1
    spec, targets = paths[0], paths[1:]
    new_mode = _parse_mode(spec)
    symbolic = new_mode is None
    for t in targets:
        p = _resolve(st, t)
        node = st['files'].get(p) or st['dirs'].get(p)
        if node is None:
            return f"chmod: cannot access '{t}': No such file or directory", 1
        if symbolic:
            updated = _apply_symbolic(node['mode'], spec)
            if updated is None:
                return f"chmod: invalid mode: '{spec}'", 1
            node['mode'] = updated
        else:
            node['mode'] = new_mode
    return '', 0


def _cmd_chown(st, args) -> tuple[str, int]:
    paths = [a for a in args if not a.startswith('-')]
    if len(paths) < 2:
        return 'chown: missing operand', 1
    spec, targets = paths[0], paths[1:]
    user, _, group = spec.partition(':')
    for t in targets:
        p = _resolve(st, t)
        node = st['files'].get(p) or st['dirs'].get(p)
        if node is None:
            return f"chown: cannot access '{t}': No such file or directory", 1
        if user not in st['users']:
            return f"chown: invalid user: '{user}'", 1
        node['owner'] = user
        if group:
            node['group'] = group
    return '', 0


def _cmd_grep(st, args) -> tuple[str, int]:
    flags = {a for a in args if a.startswith('-') and not a[1:].isdigit()}
    ignore_case = any('i' in f for f in flags)
    line_no = any('n' in f for f in flags)
    count_only = any('c' in f for f in flags)
    invert = any('v' in f for f in flags)
    operands = [a for a in args if not a.startswith('-')]
    if not operands:
        return 'grep: missing pattern', 2
    pattern, files = operands[0], operands[1:]
    try:
        rx = re.compile(pattern, re.IGNORECASE if ignore_case else 0)
    except re.error:
        return f'grep: invalid pattern: {pattern}', 2
    if not files:
        return 'grep: reading from stdin is not simulated - give it a file', 2
    out, code, total = [], 1, 0
    for f_ in files:
        p = _resolve(st, f_)
        if _is_dir(st, p):
            out.append(f'grep: {f_}: Is a directory'); code = 2; continue
        if p not in st['files']:
            out.append(f'grep: {f_}: No such file or directory'); code = 2; continue
        hits = []
        for i, line in enumerate(st['files'][p]['content'].splitlines(), 1):
            matched = bool(rx.search(line))
            if invert:
                matched = not matched
            if matched:
                total += 1
                hits.append((i, line))
        if count_only:
            out.append(str(len(hits)))
        else:
            for i, line in hits:
                out.append(f'{i}:{line}' if line_no else line)
        if hits:
            code = 0
    if count_only:
        code = 0
    return '\n'.join(out), code


def _cmd_find(st, args) -> tuple[str, int]:
    paths = [a for a in args if not a.startswith('-')]
    start = _resolve(st, paths[0]) if paths else st['cwd']
    name_pat = None
    if '-name' in args:
        name_pat = args[args.index('-name') + 1]
    if not _is_dir(st, start):
        return f"find: '{paths[0] if paths else ''}': No such file or directory", 1
    rx = None
    if name_pat:
        rx = re.compile('^' + re.escape(name_pat).replace(r'\*', '.*').replace(r'\?', '.') + '$')
    hits = []
    for p in sorted(set(st['files']) | set(st['dirs'])):
        if p == start or p.startswith(start + '/'):
            base = p.rsplit('/', 1)[1]
            if rx is None or rx.match(base):
                hits.append(p)
    return '\n'.join(hits), 0


def _cmd_ps(st, args) -> tuple[str, int]:
    rows = ['  PID USER     %CPU %MEM COMMAND']
    for p in st['processes']:
        rows.append(f"{p['pid']:>5} {p['user']:<8} {p['cpu']:>4} {p['mem']:>4} {p['cmd']}")
    return '\n'.join(rows), 0


def _cmd_kill(st, args) -> tuple[str, int]:
    targets = [a for a in args if not a.startswith('-')]
    if not targets:
        return 'kill: usage: kill <pid>', 1
    for t in targets:
        if not t.isdigit():
            return f'kill: {t}: arguments must be process IDs', 1
        pid = int(t)
        proc = next((p for p in st['processes'] if p['pid'] == pid), None)
        if proc is None:
            return f'kill: ({pid}) - No such process', 1
        if proc['cmd'] == '-bash':
            return f'kill: ({pid}) - refusing to kill your own shell (simulation guard)', 1
        st['processes'].remove(proc)
    return '', 0


def _systemctl_status(st, svc: str | None) -> tuple[str, int]:
    if svc is None:
        rows = ['  UNIT            LOAD   ACTIVE   DESCRIPTION']
        for name, s in st['services'].items():
            active = 'active' if s['status'] == 'active' else 'failed'
            rows.append(f'  {name}.service   loaded {active:<8} {s["desc"]}')
        return '\n'.join(rows), 0
    s = st['services'].get(svc)
    if s is None:
        return f'Unit {svc}.service could not be found.', 4
    if s['status'] == 'active':
        return (f'● {svc}.service - {s["desc"]}\n'
                f'   Loaded: loaded (/lib/systemd/system/{svc}.service; enabled)\n'
                f'   Active: active (running) since Sat 2026-10-11 08:00:01 UTC', 0)
    return (f'● {svc}.service - {s["desc"]}\n'
            f'   Loaded: loaded (/lib/systemd/system/{svc}.service; enabled)\n'
            f'   Active: failed (Result: exit-code) since Sat 2026-10-11 08:45:00 UTC\n'
            f'  Process: 1024 ExecStart=/usr/sbin/nginx (code=exited, status=1/FAILURE)\n'
            f'\nHint: the unit failed to start - check its logs with: journalctl -u {svc}', 3)


def _cmd_systemctl(st, args) -> tuple[str, int]:
    if not args:
        return 'systemctl: missing command (try: systemctl status [unit])', 1
    sub = args[0]
    rest = [a for a in args[1:] if not a.startswith('-')]
    if sub == 'status':
        return _systemctl_status(st, rest[0] if rest else None)
    if sub in ('start', 'stop', 'restart'):
        if not rest:
            return f'systemctl: {sub} requires a unit name', 1
        svc = rest[0]
        s = st['services'].get(svc)
        if s is None:
            return f'Failed to {sub} {svc}.service: Unit {svc}.service not found.', 5
        if sub == 'stop':
            s['status'] = 'inactive'
            return '', 0
        # start / restart
        if svc == 'nginx' and st['files']['/etc/nginx/nginx.conf']['content'] != NGINX_CONF_GOOD:
            return (f'Job for nginx.service failed because the control process exited with error code.\n'
                    f'See "systemctl status nginx.service" and "journalctl -u nginx" for details.', 1)
        s['status'] = 'active'
        return '', 0
    if sub == 'is-active':
        if not rest:
            return 'systemctl: is-active requires a unit name', 1
        s = st['services'].get(rest[0])
        if s is None:
            return 'unknown', 3
        return ('active' if s['status'] == 'active' else 'failed'), 0 if s['status'] == 'active' else 3
    if sub in ('enable', 'disable'):
        return '', 0
    return f'systemctl: unknown command: {sub} (try: status, start, stop, restart, is-active)', 1


def _cmd_journalctl(st, args) -> tuple[str, int]:
    unit = None
    lines_n = None
    i = 0
    while i < len(args):
        if args[i] == '-u' and i + 1 < len(args):
            unit = args[i + 1]; i += 2; continue
        if args[i] == '-n' and i + 1 < len(args):
            try:
                lines_n = int(args[i + 1])
            except ValueError:
                return 'journalctl: invalid line count', 1
            i += 2; continue
        if args[i].startswith('-n') and len(args[i]) > 2:
            try:
                lines_n = int(args[i][2:])
            except ValueError:
                return 'journalctl: invalid line count', 1
        i += 1
    if unit == 'nginx':
        out = JOURNAL_NGINX
    elif unit in (None,):
        out = SYSLOG
    elif unit in st['services']:
        out = (f'-- Logs begin at Fri 2026-10-09 13:58:01 UTC --\n'
               f'Oct 11 08:00:01 linux-lab systemd[1]: Started {st["services"][unit]["desc"]}.\n'
               f'Oct 11 09:15:00 linux-lab systemd[1]: {unit}.service: running normally, no errors logged.')
    else:
        return f'-- No entries for unit {unit} --', 0
    lines = out.rstrip('\n').split('\n')
    if lines_n is not None:
        lines = lines[-lines_n:]
    return '\n'.join(lines), 0


def _cmd_ip(st, args) -> tuple[str, int]:
    if args and args[0] == 'addr':
        return ('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n'
                '    inet 127.0.0.1/8 scope host lo\n'
                '    inet6 ::1/128 scope host\n'
                '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP\n'
                '    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic eth0\n'
                '    inet6 fe80::a00:27ff:fe4a:1c2/64 scope link', 0)
    if args and args[0] == 'route':
        return ('default via 10.0.2.2 dev eth0 proto dhcp metric 100\n'
                '10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15 metric 100', 0)
    return 'Usage: ip addr | ip route', 1


def _cmd_ss(st, args) -> tuple[str, int]:
    return ('Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port  Process\n'
            'tcp   LISTEN 0      128    0.0.0.0:22         0.0.0.0:*          \n'
            'tcp   LISTEN 0      128    [::]:22            [::]:*             \n'
            'tcp   LISTEN 0      4096   127.0.0.1:631      0.0.0.0:*          ', 0)


def _cmd_df(st, args) -> tuple[str, int]:
    return ('Filesystem      Size  Used Avail Use% Mounted on\n'
            '/dev/sda2        20G  8.1G   11G  44% /\n'
            'tmpfs           2.0G     0  2.0G   0% /dev/shm', 0)


def _cmd_top(st, args) -> tuple[str, int]:
    return ('top - 09:30:00 up 1:28,  1 user,  load average: 2.14, 1.02, 0.44\n'
            'Tasks:  87 total,   2 running,  85 sleeping,   0 stopped,   0 zombie\n'
            '%Cpu(s): 99.1 us,  0.4 sy,  0.0 ni,  0.5 id\n'
            'MiB Mem :   3936.0 total,   2871.4 free,    512.2 used\n'
            '\n'
            '  PID USER      %CPU %MEM COMMAND\n'
            '  901 root      98.7  1.1 /usr/local/bin/backup-agent --full\n'
            '  412 root       0.0  0.2 /usr/sbin/sshd -D\n'
            '    1 root       0.1  0.4 /sbin/init\n'
            ' 1450 student    0.3  0.8 -bash', 0)


def _cmd_useradd(st, args) -> tuple[str, int]:
    operands = [a for a in args if not a.startswith('-')]
    make_home = any(a.startswith('-') and 'm' in a for a in args)
    if not operands:
        return 'useradd: missing username', 2
    name = operands[-1]
    if not re.fullmatch(r'[a-z_][a-z0-9_-]*', name):
        return f'useradd: invalid user name {name!r}', 3
    if name in st['users']:
        return f'useradd: user {name!r} already exists', 9
    uid = st['next_uid']
    st['next_uid'] += 1
    st['users'][name] = {'uid': uid, 'gid': uid, 'home': f'/home/{name}',
                         'shell': '/bin/bash', 'passwd_set': False}
    if make_home:
        st['dirs'][f'/home/{name}'] = {'mode': 0o755, 'owner': name, 'group': name}
    return '', 0


def _cmd_passwd(st, args) -> tuple[str, int]:
    operands = [a for a in args if not a.startswith('-')]
    name = operands[0] if operands else st['user']
    if name not in st['users']:
        return f'passwd: user {name!r} does not exist', 6
    st['users'][name]['passwd_set'] = True
    return (f'New password for {name} (simulated - no real password is set or stored):\n'
            f'passwd: password updated successfully', 0)


def _cmd_tar(st, args) -> tuple[str, int]:
    flags = ''.join(a[1:] for a in args if a.startswith('-'))
    operands = [a for a in args if not a.startswith('-')]
    if 'c' in flags:  # create
        if not operands:
            return 'tar: missing archive name', 2
        archive = _resolve(st, operands[0])
        members = operands[1:]
        listed = []
        for m_ in members:
            p = _resolve(st, m_)
            if _is_file(st, p):
                listed.append(p.rsplit('/', 1)[1])
            elif _is_dir(st, p):
                for f in sorted(st['files']):
                    if f.startswith(p + '/'):
                        listed.append(f[len(st['cwd'].rstrip('/')) + 1:])
            else:
                return f'tar: {m_}: Cannot stat: No such file or directory', 2
        st['files'][archive] = {'content': 'TAR:' + ','.join(listed) + '\n',
                                'mode': 0o644, 'owner': 'student', 'group': 'student'}
        return '', 0
    if 't' in flags:  # list
        if not operands:
            return 'tar: missing archive name', 2
        archive = _resolve(st, operands[0])
        f = st['files'].get(archive)
        if not f or not f['content'].startswith('TAR:'):
            return f'tar: {operands[0]}: not a simulated archive', 2
        return '\n'.join(x for x in f['content'][4:].strip().split(',') if x), 0
    if 'x' in flags:  # extract (simulated: recreate listed member names in cwd)
        if not operands:
            return 'tar: missing archive name', 2
        archive = _resolve(st, operands[0])
        f = st['files'].get(archive)
        if not f or not f['content'].startswith('TAR:'):
            return f'tar: {operands[0]}: not a simulated archive', 2
        for name in f['content'][4:].strip().split(','):
            if name:
                st['files'][st['cwd'].rstrip('/') + '/' + name] = {
                    'content': '(restored from archive)\n', 'mode': 0o644,
                    'owner': 'student', 'group': 'student'}
        return '', 0
    return 'tar: need one of -c, -x, -t (try: tar -czf backup.tar.gz <files>)', 2


def _cmd_echo(st, args) -> tuple[str, int]:
    # -n supported minimally; redirection is handled by the caller
    words = [a for a in args if a != '-n']
    return ' '.join(words), 0


def _help() -> str:
    return (
        'Simulated Linux terminal - safe: nothing is really executed.\n'
        '\n'
        '  Navigation & files\n'
        '    pwd · ls [-la] [path] · cd <dir> · cat <file> · find <path> -name <pat>\n'
        '    mkdir [-p] <dir> · rm [-rf] <path> · cp [-r] <src> <dst> · mv <src> <dst>\n'
        '    tar -czf <archive> <files> · tar -tzf <archive> · tar -xzf <archive>\n'
        '  Permissions & ownership\n'
        '    chmod 600 <file> · chmod u+x <file> · chown <user>[:<group>] <file>\n'
        '  Text processing\n'
        '    grep [-invc] <pattern> <file> · echo <text> > <file>  (>> appends)\n'
        '  Processes & services\n'
        '    ps aux · kill <pid> · top\n'
        '    systemctl status [unit] · systemctl start|stop|restart|is-active <unit>\n'
        '    journalctl [-u <unit>] [-n <lines>]\n'
        '  Networking & system\n'
        '    ip addr · ip route · ss -tuln · df -h · whoami · id · uname · hostname\n'
        '  Users\n'
        '    sudo <cmd> · useradd [-m] <user> · passwd [user]\n'
        '\n'
        '  help | clear'
    )


# ---- dispatcher ----

def _dispatch(st: dict[str, Any], cmd: str, args: list[str]) -> tuple[str, int]:
    table = {
        'pwd': _cmd_pwd, 'ls': _cmd_ls, 'cd': _cmd_cd, 'cat': _cmd_cat,
        'mkdir': _cmd_mkdir, 'rm': _cmd_rm, 'cp': _cmd_cp, 'mv': _cmd_mv,
        'chmod': _cmd_chmod, 'chown': _cmd_chown, 'grep': _cmd_grep,
        'find': _cmd_find, 'ps': _cmd_ps, 'kill': _cmd_kill,
        'systemctl': _cmd_systemctl, 'journalctl': _cmd_journalctl,
        'ip': _cmd_ip, 'ss': _cmd_ss, 'df': _cmd_df, 'top': _cmd_top,
        'useradd': _cmd_useradd, 'passwd': _cmd_passwd, 'tar': _cmd_tar,
        'echo': _cmd_echo,
    }
    if cmd in table:
        return table[cmd](st, args)
    if cmd == 'whoami':
        return st['user'], 0
    if cmd == 'id':
        return 'uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)', 0
    if cmd == 'uname':
        return 'Linux linux-lab 6.8.0-52-generic x86_64', 0
    if cmd == 'hostname':
        return 'linux-lab', 0
    if cmd == 'date':
        return 'Sat Oct 11 09:30:00 UTC 2026', 0
    if cmd == 'env':
        return 'USER=student\nHOME=/home/student\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 0
    return f'{cmd}: command not found (try `help`)', 127


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get('_linux_cli')) if findings.get('_linux_cli') else _fresh()
    raw = (command or '').strip()
    if not raw:
        return _emit(st, '')
    if len(raw) > 1024:
        return _emit(st, 'Command too long.', exit_code=1)
    try:
        tokens = shlex.split(raw)
    except ValueError:
        tokens = raw.split()
    if not tokens:
        return _emit(st, '')

    cmd = tokens[0].lower()
    args = tokens[1:]

    if cmd in ('clear', 'cls'):
        return _emit(st, '', clear=True)
    if cmd in ('help', '?'):
        return _emit(st, _help())
    if cmd == 'exit':
        return _emit(st, 'logout (simulation - the session stays open)', exit_code=0)
    if cmd == 'sudo':
        if not args:
            return _emit(st, 'sudo: no command given', exit_code=1)
        cmd, args = args[0].lower(), args[1:]

    args, redir_path, append = _split_redirect(args)
    out, code = _dispatch(st, cmd, args)

    if redir_path is not None:
        target = _resolve(st, redir_path)
        if _is_dir(st, target):
            return _emit(st, f'bash: {redir_path}: Is a directory', exit_code=1)
        parent = target.rsplit('/', 1)[0] or '/'
        if not _is_dir(st, parent):
            return _emit(st, f'bash: {redir_path}: No such file or directory', exit_code=1)
        existing = st['files'].get(target)
        content = (existing['content'] if (append and existing) else '') + (out + '\n' if out else '')
        st['files'][target] = {'content': content, 'mode': 0o644, 'owner': 'student', 'group': 'student'}
        return _emit(st, '', exit_code=code)
    return _emit(st, out, exit_code=code)
