"""A simulated Docker + SIEM shell for the container security monitoring lab.

Two halves, one deterministic shell (executes nothing):
  - a stateful Docker engine model (`docker run/ps/logs/inspect/network/volume/compose`, plus
    `journalctl`, `ss`, `curl`) so the learner practises the container lifecycle; and
  - a `siem` query engine over a fixed incident (labs/telemetry.py) so they centralize, search,
    see detection alerts, and investigate a simulated container attack.

Objective flags are derived from the accumulated state, so building the environment and working the
investigation is what completes the modules.
"""
from __future__ import annotations

import copy
import shlex
from typing import Any

from labs.providers.base import CommandResult
from labs.telemetry import DetectionRule, Incident, InvestigationQuestion, TelemetryEvent

ATTACKER = '203.0.113.77'

# ---- the fixed incident the SIEM centralizes (Module 10-12) ----
_EVENTS = [
    TelemetryEvent('e01', '19:02:10', ATTACKER, 'docker-host', 'docker-host', 'port_scan', 'medium', 'nmap SYN scan detected across 1000 ports'),
    TelemetryEvent('e02', '19:02:12', ATTACKER, 'docker-host:8080', 'docker-host', 'port_scan', 'medium', 'port 8080/tcp (lab-nginx) found open'),
    TelemetryEvent('e03', '19:05:01', ATTACKER, 'api:8000', 'lab-api', 'auth_failure', 'high', 'POST /login failed for user admin', 'admin'),
    TelemetryEvent('e04', '19:05:18', ATTACKER, 'api:8000', 'lab-api', 'auth_failure', 'high', 'POST /login failed for user admin', 'admin'),
    TelemetryEvent('e05', '19:05:33', ATTACKER, 'api:8000', 'lab-api', 'auth_failure', 'high', 'POST /login failed for user admin', 'admin'),
    TelemetryEvent('e06', '19:05:49', ATTACKER, 'api:8000', 'lab-api', 'auth_failure', 'high', 'POST /login failed for user admin', 'admin'),
    TelemetryEvent('e07', '19:06:04', ATTACKER, 'api:8000', 'lab-api', 'auth_failure', 'high', 'POST /login failed for user admin', 'admin'),
    TelemetryEvent('e08', '19:07:20', ATTACKER, 'api:8000', 'lab-api', 'auth_success', 'high', 'POST /login succeeded for user admin', 'admin'),
    TelemetryEvent('e09', '19:09:05', ATTACKER, 'api:8000', 'lab-api', 'http_request', 'medium', 'GET /admin/users (protected endpoint) 200', 'admin'),
    TelemetryEvent('e10', '19:11:40', ATTACKER, 'docker-host', 'docker-host', 'privileged', 'high', 'sudo cat /etc/shadow', 'admin'),
    # benign noise
    TelemetryEvent('n01', '19:00:00', '10.0.0.2', 'api:8000', 'lab-api', 'health_check', 'info', 'GET /health 200'),
    TelemetryEvent('n02', '19:03:30', '10.0.0.50', 'nginx:80', 'lab-nginx', 'http_request', 'info', 'GET / 200'),
    TelemetryEvent('n03', '19:04:10', '172.18.0.3', 'postgres:5432', 'lab-postgres', 'db_connect', 'info', 'connection from lab-api accepted'),
    TelemetryEvent('n04', '19:08:00', '10.0.0.2', 'api:8000', 'lab-api', 'health_check', 'info', 'GET /health 200'),
]
_RULES = [
    DetectionRule('r1', 'SSH/App Brute Force', 'auth_failure >= 5 from same source within 2 minutes', 'high', 'auth_failure', 5, '2 minutes'),
    DetectionRule('r2', 'Reconnaissance', 'port_scan from an external source', 'medium', 'port_scan', 1),
    DetectionRule('r3', 'Privileged Command', 'a privileged command was observed', 'high', 'privileged', 1),
]
_QUESTIONS = [
    InvestigationQuestion('q1', 'What was the source IP of the attack?', ATTACKER, 'It appears on every malicious event.'),
    InvestigationQuestion('q2', 'Was authentication eventually successful?', 'yes', 'Search event_type=auth_success.'),
]
INCIDENT = Incident(events=_EVENTS, rules=_RULES, questions=_QUESTIONS)

_IMAGES_PULLABLE = {'hello-world', 'nginx', 'postgres', 'python', 'redis', 'ubuntu'}


def _fresh() -> dict[str, Any]:
    return {
        'containers': {}, 'images': [], 'networks': ['bridge', 'host', 'none'], 'volumes': [],
        'compose_up': False, 'verified': False, 'investigated': False,
        'siem_searched': False, 'bruteforce_seen': False, 'attacker_found': False,
    }


def initial_prompt(lab) -> str:
    return 'student@docker-host:~$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Docker host + SIEM   (safe: nothing is really executed)',
        'Build the container environment, centralize its logs, then investigate a simulated attack.',
        'Try: docker info · docker run -d --name lab-nginx -p 8080:80 nginx · docker ps · siem alerts · help',
    ]


# ---- objective flags derived from state ----

def _derive(st: dict[str, Any]) -> dict[str, Any]:
    c = st['containers']
    nginx = c.get('lab-nginx')
    return {
        'docker_verified': st['verified'],
        'nginx_running': bool(nginx and nginx['status'] == 'running' and '8080' in nginx.get('ports', {})),
        'container_investigated': st['investigated'],
        'network_created': any(n not in ('bridge', 'host', 'none') for n in st['networks']),
        'volume_created': len(st['volumes']) > 0,
        'compose_up': st['compose_up'],
        'siem_searched': st['siem_searched'],
        'bruteforce_found': st['bruteforce_seen'],
        'attacker_identified': st['attacker_found'],
    }


def _emit(st, output, clear=False) -> CommandResult:
    return CommandResult(output=output, findings={'_docker': st, **_derive(st)},
                         prompt='student@docker-host:~$ ', clear=clear)


# ---- docker command helpers ----

def _ps(st, all_=False) -> str:
    rows = ['CONTAINER ID   IMAGE          STATUS      PORTS                    NAMES']
    for name, c in st['containers'].items():
        if all_ or c['status'] == 'running':
            ports = ', '.join(f'0.0.0.0:{h}->{cp}/tcp' for h, cp in c.get('ports', {}).items()) or ''
            rows.append(f'{c["id"]:<14} {c["image"]:<14} {c["status"]:<11} {ports:<24} {name}')
    return '\n'.join(rows)


def _run_container(st, args) -> CommandResult:
    detach = '-d' in args or '--detach' in args
    name, ports, image = None, {}, None
    i = 0
    toks = args[:]
    while i < len(toks):
        t = toks[i]
        if t == '--name' and i + 1 < len(toks):
            name = toks[i + 1]; i += 2; continue
        if t in ('-p', '--publish') and i + 1 < len(toks):
            hp, _, cp = toks[i + 1].partition(':')
            if cp:
                ports[hp] = cp
            i += 2; continue
        if not t.startswith('-'):
            image = t  # last bare token wins as the image
        i += 1
    if image == 'hello-world' or (image is None and 'hello-world' in toks):
        if 'hello-world' not in st['images']:
            st['images'].append('hello-world')
        return _emit(st, 'Unable to find image \'hello-world:latest\' locally\nlatest: Pulling from library/hello-world\n\nHello from Docker!\nThis message shows that your installation appears to be working correctly.')
    if image is None:
        return _emit(st, '"docker run" requires at least 1 argument (an image).')
    short = (image.split(':')[0])
    if short not in st['images']:
        st['images'].append(short)
    name = name or f'{short}-{len(st["containers"]) + 1}'
    cid = f'{abs(hash(name)) % 0xdeadbeef:012x}'[:12]
    st['containers'][name] = {'id': cid, 'image': short, 'status': 'running', 'ports': ports}
    out = f'{cid}' if detach else f'[{name}] started in the foreground (Ctrl-C to stop)'
    return _emit(st, out)


def _inspect(st, name) -> CommandResult:
    c = st['containers'].get(name)
    if not c:
        return _emit(st, f'Error: No such object: {name}')
    st['investigated'] = True
    ports = ', '.join(f'"{cp}/tcp": [{{ "HostPort": "{h}" }}]' for h, cp in c.get('ports', {}).items())
    out = ('[\n  {\n'
           f'    "Id": "{c["id"]}",\n    "Name": "/{name}",\n    "State": {{ "Status": "{c["status"]}", "Running": {str(c["status"] == "running").lower()} }},\n'
           f'    "Config": {{ "Image": "{c["image"]}" }},\n'
           f'    "NetworkSettings": {{ "IPAddress": "172.18.0.{(abs(hash(name)) % 50) + 2}", "Ports": {{ {ports} }} }}\n'
           '  }\n]')
    return _emit(st, out)


def _logs(st, name) -> CommandResult:
    c = st['containers'].get(name)
    if not c:
        return _emit(st, f'Error: No such container: {name}')
    st['investigated'] = True
    if c['image'] == 'nginx':
        out = ('10.0.0.50 - - [19/May:19:03:30] "GET / HTTP/1.1" 200 615 "-" "curl/8.4.0"\n'
               f'{ATTACKER} - - [19/May:19:02:12] "GET / HTTP/1.1" 404 153 "-" "Nmap Scripting Engine"\n'
               '10.0.0.2 - - [19/May:19:08:00] "GET /health HTTP/1.1" 200 2')
    else:
        out = f'{name}: 2026-05-19T19:00:00Z INFO service started'
    return _emit(st, out)


def _network(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'ls':
        rows = ['NETWORK ID     NAME            DRIVER    SCOPE']
        for n in st['networks']:
            rows.append(f'{abs(hash(n)) % 0xffffff:08x}   {n:<15} {"bridge" if n != "host" else "host":<9} local')
        return _emit(st, '\n'.join(rows))
    if sub == 'create' and len(args) > 1:
        name = args[1]
        if name not in st['networks']:
            st['networks'].append(name)
        return _emit(st, f'{abs(hash(name)) % 0xdeadbeef:012x}')
    if sub == 'inspect' and len(args) > 1:
        name = args[1]
        if name not in st['networks']:
            return _emit(st, f'Error: No such network: {name}')
        return _emit(st, f'[\n  {{ "Name": "{name}", "Driver": "bridge", "Scope": "local",\n    "Containers": {{}} }}\n]')
    return _emit(st, 'Usage: docker network ls|create|inspect')


def _volume(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'ls':
        rows = ['DRIVER    VOLUME NAME'] + [f'local     {v}' for v in st['volumes']]
        return _emit(st, '\n'.join(rows))
    if sub == 'create' and len(args) > 1:
        name = args[1]
        if name not in st['volumes']:
            st['volumes'].append(name)
        return _emit(st, name)
    if sub == 'inspect' and len(args) > 1:
        name = args[1]
        if name not in st['volumes']:
            return _emit(st, f'Error: No such volume: {name}')
        return _emit(st, f'[\n  {{ "Name": "{name}", "Driver": "local", "Mountpoint": "/var/lib/docker/volumes/{name}/_data" }}\n]')
    return _emit(st, 'Usage: docker volume ls|create|inspect')


def _compose(st, args) -> CommandResult:
    sub = args[0] if args else ''
    services = ['nginx', 'api', 'postgres', 'log-collector']
    if sub == 'up':
        st['compose_up'] = True
        for s in services:
            st['containers'].setdefault(f'security-lab-{s}', {'id': f'{abs(hash(s)) % 0xdeadbeef:012x}'[:12], 'image': s, 'status': 'running', 'ports': {}})
        return _emit(st, '\n'.join(f'[+] Running container security-lab-{s}  Started' for s in services))
    if sub == 'ps':
        rows = ['NAME                      IMAGE          STATUS']
        for s in services:
            rows.append(f'security-lab-{s:<15} {s:<14} {"running" if st["compose_up"] else "exited"}')
        return _emit(st, '\n'.join(rows))
    if sub == 'logs':
        return _emit(st, 'security-lab-api        | INFO  POST /login 401 (admin)\nsecurity-lab-nginx      | 203.0.113.77 "GET / HTTP/1.1" 404\nsecurity-lab-log-collector | forwarding 142 events to SIEM')
    if sub == 'down':
        st['compose_up'] = False
        return _emit(st, '[+] Running 4/4  Removed')
    return _emit(st, 'Usage: docker compose up -d | ps | logs | down')


# ---- SIEM command ----

def _siem(st, args) -> CommandResult:
    sub = args[0] if args else 'help'
    if sub == 'search':
        filters = {}
        for a in args[1:]:
            if '=' in a:
                k, _, v = a.partition('=')
                filters[k.strip()] = v.strip()
        results = INCIDENT.search(filters)
        st['siem_searched'] = True
        # Attacker identified when a src_ip filter on the attacker surfaces the multi-stage chain.
        if filters.get('src_ip', '').strip() == ATTACKER and len({e.event_type for e in results}) >= 3:
            st['attacker_found'] = True
        if not results:
            return _emit(st, '0 events match.')
        rows = ['TIME      SRC_IP           EVENT_TYPE     SEV     HOST          MESSAGE']
        for e in results[:30]:
            rows.append(f'{e.ts}  {e.src_ip:<15}  {e.event_type:<13}  {e.severity:<6}  {e.host:<12}  {e.message}')
        rows.append(f'\n{len(results)} event(s).')
        return _emit(st, '\n'.join(rows))
    if sub == 'alerts':
        st['siem_searched'] = True
        st['bruteforce_seen'] = True
        lines = ['ALERTS (detection rules that fired):']
        for rule, hits in INCIDENT.alerts():
            srcs = sorted({e.src_ip for e in hits})
            lines.append(f'  [{rule.severity.upper()}] {rule.name} - {len(hits)} event(s) from {", ".join(srcs)}\n        rule: {rule.logic}')
        return _emit(st, '\n'.join(lines))
    if sub == 'rules':
        lines = ['DETECTION RULES:']
        for r in INCIDENT.rules:
            lines.append(f'  {r.id}  [{r.severity.upper()}] {r.name}: {r.logic}')
        return _emit(st, '\n'.join(lines))
    if sub == 'timeline':
        st['siem_searched'] = True
        rows = [f'{e.ts}  {e.src_ip:<15}  {e.event_type:<13}  {e.message}' for e in sorted(INCIDENT.events, key=lambda e: e.ts)]
        return _emit(st, '\n'.join(rows))
    return _emit(st, 'Usage: siem search [field=value ...] | alerts | rules | timeline\n  fields: src_ip, event_type, host, username, severity')


def _help() -> str:
    return (
        'Docker:\n'
        '  docker --version | docker info | systemctl status docker   verify the engine\n'
        '  docker run -d --name lab-nginx -p 8080:80 nginx            run a detached, port-published container\n'
        '  docker ps [-a] | docker images                            list containers / images\n'
        '  docker logs <name> | docker inspect <name> | docker stats  investigate a container\n'
        '  docker stop|start|restart|rm <name> | docker exec <name> <cmd>\n'
        '  docker network ls|create|inspect <name>                   container networking\n'
        '  docker volume ls|create|inspect <name>                    persistent storage\n'
        '  docker compose up -d | ps | logs | down                   the whole stack\n'
        'Host / telemetry:\n'
        '  journalctl -u docker | ss -tlnp | curl http://localhost:8080\n'
        'SIEM:\n'
        '  siem search [field=value ...]   search centralized events (src_ip, event_type, host, username, severity)\n'
        '  siem alerts | siem rules | siem timeline\n'
        '  help | clear'
    )


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get('_docker')) if findings.get('_docker') else _fresh()
    raw = (command or '').strip()
    if not raw:
        return _emit(st, '')
    if len(raw) > 512:
        return _emit(st, 'Command too long.')
    try:
        parts = shlex.split(raw)
    except ValueError:
        parts = raw.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return _emit(st, '', clear=True)
    if cmd in ('help', '?'):
        return _emit(st, _help())
    if cmd == 'sudo' and args:
        parts = args; cmd = parts[0].lower(); args = parts[1:]

    if cmd == 'siem':
        return _siem(st, args)
    if cmd == 'systemctl':
        if args[:2] == ['status', 'docker'] or (args and args[0] == 'status'):
            st['verified'] = True
            return _emit(st, '● docker.service - Docker Application Container Engine\n   Loaded: loaded\n   Active: active (running)')
        return _emit(st, 'Usage: systemctl status docker')
    if cmd == 'journalctl':
        return _emit(st, 'May 19 19:02:10 docker-host dockerd[812]: level=info msg="API listen on /run/docker.sock"\nMay 19 19:05:01 docker-host dockerd[812]: level=warning msg="container lab-api: repeated auth failures"')
    if cmd == 'ss':
        return _emit(st, 'State   Recv-Q  Local Address:Port   Process\nLISTEN  0       0.0.0.0:8080         docker-proxy\nLISTEN  0       0.0.0.0:8000         docker-proxy')
    if cmd == 'curl':
        target = next((a for a in args if a.startswith('http')), '')
        if '8080' in target and any(c['image'] == 'nginx' and c['status'] == 'running' for c in st['containers'].values()):
            return _emit(st, '<!DOCTYPE html>\n<html><head><title>Welcome to nginx!</title></head>\n<body><h1>Welcome to nginx!</h1></body></html>')
        if '8080' in target:
            return _emit(st, 'curl: (7) Failed to connect to localhost port 8080: Connection refused')
        return _emit(st, 'Usage: curl http://localhost:8080')

    if cmd != 'docker':
        return _emit(st, f'{cmd}: command not found (this lab uses docker / siem / journalctl / ss / curl — try `help`)')

    sub = args[0] if args else ''
    rest = args[1:]
    if sub in ('--version', 'version'):
        return _emit(st, 'Docker version 24.0.7, build afdd53b')
    if sub == 'info':
        st['verified'] = True
        return _emit(st, f'Client: Docker Engine - Community\nServer:\n Containers: {len(st["containers"])}\n Images: {len(st["images"])}\n Server Version: 24.0.7\n Storage Driver: overlay2')
    if sub == 'run':
        return _run_container(st, rest)
    if sub == 'ps':
        return _emit(st, _ps(st, all_=('-a' in rest or '--all' in rest)))
    if sub == 'images':
        rows = ['REPOSITORY     TAG       IMAGE ID       SIZE'] + [f'{i:<14} latest    {abs(hash(i)) % 0xffffff:08x}       120MB' for i in st['images']]
        return _emit(st, '\n'.join(rows))
    if sub == 'logs' and rest:
        return _logs(st, rest[-1])
    if sub == 'inspect' and rest:
        return _inspect(st, rest[-1])
    if sub == 'stats':
        rows = ['CONTAINER        CPU %    MEM USAGE / LIMIT    NET I/O']
        for name, c in st['containers'].items():
            if c['status'] == 'running':
                rows.append(f'{name:<16} 0.1%     24MiB / 512MiB       1.2kB / 0B')
        return _emit(st, '\n'.join(rows))
    if sub in ('stop', 'start', 'restart') and rest:
        name = rest[-1]
        if name in st['containers']:
            st['containers'][name]['status'] = 'exited' if sub == 'stop' else 'running'
            return _emit(st, name)
        return _emit(st, f'Error: No such container: {name}')
    if sub == 'rm' and rest:
        name = rest[-1]
        if name in st['containers']:
            if st['containers'][name]['status'] == 'running' and '-f' not in rest and '--force' not in rest:
                return _emit(st, f'Error: cannot remove running container {name} (stop it first, or use -f)')
            st['containers'].pop(name)
            return _emit(st, name)
        return _emit(st, f'Error: No such container: {name}')
    if sub == 'exec' and rest:
        non_flags = [a for a in rest if not a.startswith('-')]
        name = non_flags[0] if non_flags else ''
        if name in st['containers']:
            st['investigated'] = True
            return _emit(st, 'root@container:/# (simulated shell) — type exit to return')
        return _emit(st, f'Error: No such container: {name}')
    if sub == 'network':
        return _network(st, rest)
    if sub == 'volume':
        return _volume(st, rest)
    if sub == 'compose':
        return _compose(st, rest)
    return _emit(st, f'docker: \'{sub}\' is not supported in this lab. Try `help`.')
