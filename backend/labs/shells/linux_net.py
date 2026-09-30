"""A simulated Linux networking shell for the DNS & connectivity troubleshooting lab.

Stateless like the recon shell: each recognised command prints realistic output and records a
top-level finding (kept as independent keys so they accumulate cleanly across commands). Executes
nothing. The scenario is a workstation diagnosing why it cannot reach an internal web app.
"""
from __future__ import annotations

from typing import Any

from labs.providers.base import CommandResult

HOST = 'workstation'
LOCAL_IP = '10.0.5.20'
NETMASK = '24'
GATEWAY = '10.0.5.1'
RESOLVER = '10.0.5.53'
APP = 'app.corp.example'
APP_IP = '93.184.216.34'
HOPS = [('10.0.5.1', '0.4 ms'), ('100.64.0.1', '3.1 ms'), ('203.0.113.9', '8.7 ms'), (APP_IP, '9.2 ms')]
KNOWN_HOSTS = {APP: APP_IP, APP_IP: APP_IP, GATEWAY: GATEWAY, LOCAL_IP: LOCAL_IP, 'localhost': '127.0.0.1'}


def initial_prompt(lab) -> str:
    return f'student@{HOST}:~$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Linux shell   (safe: nothing is really executed)',
        f'Workstation {HOST} ({LOCAL_IP}) cannot reach the internal web app "{APP}". Diagnose it.',
        'Try: ip addr · cat /etc/resolv.conf · dig ' + APP + ' · ping ' + GATEWAY + ' · traceroute ' + APP + ' · curl -I http://' + APP,
    ]


def _first_host(args: list[str]) -> str | None:
    for a in args:
        if not a.startswith('-') and not a.isdigit():
            return a
    return None


def _ip_addr() -> CommandResult:
    out = (
        '1: lo: <LOOPBACK,UP> mtu 65536\n'
        '    inet 127.0.0.1/8 scope host lo\n'
        '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n'
        f'    inet {LOCAL_IP}/{NETMASK} brd 10.0.5.255 scope global eth0'
    )
    return CommandResult(output=out, findings={'local_ip': {'ip': LOCAL_IP, 'iface': 'eth0'}})


def _ip_route() -> CommandResult:
    out = (
        f'default via {GATEWAY} dev eth0 proto dhcp metric 100\n'
        f'10.0.5.0/24 dev eth0 proto kernel scope link src {LOCAL_IP}'
    )
    return CommandResult(output=out, findings={'route': {'gateway': GATEWAY}})


def _resolv() -> CommandResult:
    out = f'# managed by netplan\nsearch corp.example\nnameserver {RESOLVER}'
    return CommandResult(output=out, findings={'resolver': RESOLVER})


def _dig(args: list[str]) -> CommandResult:
    host = _first_host([a for a in args if a.lower() not in ('a', 'aaaa', 'any', 'mx', 'ns', '+short', '+noall', '+answer')])
    if host is None:
        return CommandResult(output='usage: dig [@server] name [type]', exit_code=1)
    ip = KNOWN_HOSTS.get(host)
    if ip is None:
        return CommandResult(output=f';; connection timed out; no servers could be reached\n; (queried {RESOLVER})', exit_code=9)
    if '+short' in [a.lower() for a in args]:
        return CommandResult(output=ip, findings={'dns': {'name': host, 'ip': ip}})
    out = (
        f'; <<>> DiG 9.18 <<>> {host}\n'
        ';; global options: +cmd\n'
        ';; Got answer:\n'
        ';; ->>HEADER<<- opcode: QUERY, status: NOERROR\n\n'
        ';; QUESTION SECTION:\n'
        f';{host}.\t\t\tIN\tA\n\n'
        ';; ANSWER SECTION:\n'
        f'{host}.\t\t300\tIN\tA\t{ip}\n\n'
        f';; Query time: 4 msec\n;; SERVER: {RESOLVER}#53({RESOLVER})'
    )
    return CommandResult(output=out, findings={'dns': {'name': host, 'ip': ip}})


def _nslookup(args: list[str]) -> CommandResult:
    host = _first_host(args)
    if host is None:
        return CommandResult(output='usage: nslookup host', exit_code=1)
    ip = KNOWN_HOSTS.get(host)
    if ip is None:
        return CommandResult(output=f'Server:\t\t{RESOLVER}\n\n** server can\'t find {host}: NXDOMAIN', exit_code=1)
    out = f'Server:\t\t{RESOLVER}\nAddress:\t{RESOLVER}#53\n\nName:\t{host}\nAddress: {ip}'
    return CommandResult(output=out, findings={'dns': {'name': host, 'ip': ip}})


def _ping(args: list[str]) -> CommandResult:
    host = _first_host(args)
    if host is None:
        return CommandResult(output='ping: usage error: Destination address required', exit_code=1)
    ip = KNOWN_HOSTS.get(host)
    if ip is None:
        return CommandResult(output=f'ping: {host}: Name or service not known', exit_code=2)
    lines = [f'PING {host} ({ip}) 56(84) bytes of data.']
    for i in range(1, 5):
        lines.append(f'64 bytes from {ip}: icmp_seq={i} ttl=63 time=0.{i}9 ms')
    lines += ['', f'--- {host} ping statistics ---', '4 packets transmitted, 4 received, 0% packet loss, time 3004ms']
    finding = {'gateway': {'ip': ip}} if ip == GATEWAY else {'reached': {'host': host, 'ip': ip}}
    return CommandResult(output='\n'.join(lines), findings=finding)


def _traceroute(args: list[str]) -> CommandResult:
    host = _first_host(args)
    if host is None:
        return CommandResult(output='Usage: traceroute host', exit_code=1)
    ip = KNOWN_HOSTS.get(host)
    if ip is None:
        return CommandResult(output=f'{host}: Temporary failure in name resolution', exit_code=2)
    lines = [f'traceroute to {host} ({ip}), 30 hops max, 60 byte packets']
    for i, (hop, rtt) in enumerate(HOPS, start=1):
        lines.append(f' {i}  {hop}  {rtt}  {rtt}  {rtt}')
        if hop == ip:
            break
    return CommandResult(output='\n'.join(lines), findings={'trace': {'host': host, 'hops': len(lines) - 1}})


def _curl(args: list[str]) -> CommandResult:
    url = _first_host(args) or ''
    host = url.replace('https://', '').replace('http://', '').split('/')[0]
    if host not in KNOWN_HOSTS:
        return CommandResult(output=f"curl: (6) Could not resolve host: {host}", exit_code=6)
    head_only = '-i' in [a.lower() for a in args] or '-i'.upper() in args or '-I' in args
    headers = (
        'HTTP/1.1 200 OK\n'
        'Server: nginx/1.25.3\n'
        'Content-Type: text/html; charset=utf-8\n'
        'Content-Length: 1274'
    )
    body = '' if head_only else '\n\n<!doctype html>\n<title>Corp App</title>\n<h1>It works.</h1>'
    return CommandResult(output=headers + body, findings={'service': {'host': host, 'status': 200}})


def _cat(args: list[str]) -> CommandResult:
    path = (args[0] if args else '')
    if path.endswith('resolv.conf'):
        return _resolv()
    if path.endswith('hosts'):
        return CommandResult(output=f'127.0.0.1 localhost\n{LOCAL_IP} {HOST}')
    return CommandResult(output=f'cat: {path or "(no file)"}: No such file or directory', exit_code=1)


def _help() -> CommandResult:
    return CommandResult(output=(
        'Available commands (simulated - nothing really runs):\n'
        '  ip addr | ip route          inspect local addressing and routes\n'
        '  cat /etc/resolv.conf        see which DNS resolver is configured\n'
        f'  dig {APP} | nslookup {APP}   resolve the app name to an address\n'
        f'  ping {GATEWAY} | ping {APP}     test reachability\n'
        f'  traceroute {APP}             see the path packets take\n'
        f'  curl -I http://{APP}         check the web service responds\n'
        '  whoami | pwd | ls | clear | help'
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 512:
        return CommandResult(output='Command too long.', exit_code=1)
    parts = raw.split()
    cmd = parts[0].split('/')[-1].lower()
    if cmd == 'sudo' and len(parts) > 1:
        parts = parts[1:]
        cmd = parts[0].split('/')[-1].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _help()
    if cmd == 'ip':
        if args and args[0].startswith('a'):
            return _ip_addr()
        if args and args[0].startswith('r'):
            return _ip_route()
        return CommandResult(output='Usage: ip addr | ip route', exit_code=1)
    if cmd in ('ifconfig',):
        return _ip_addr()
    if cmd in ('route', 'netstat'):
        return _ip_route()
    if cmd == 'dig':
        return _dig(args)
    if cmd in ('nslookup', 'host'):
        return _nslookup(args)
    if cmd == 'ping':
        return _ping(args)
    if cmd in ('traceroute', 'tracepath', 'tracert'):
        return _traceroute(args)
    if cmd in ('curl', 'wget'):
        return _curl(args)
    if cmd == 'cat':
        return _cat(args)
    if cmd == 'whoami':
        return CommandResult(output='student')
    if cmd == 'pwd':
        return CommandResult(output='/home/student')
    if cmd == 'ls':
        return CommandResult(output='notes.txt')
    return CommandResult(output=f'{cmd}: command not found', exit_code=127)
