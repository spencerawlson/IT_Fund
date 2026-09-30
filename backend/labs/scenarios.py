"""Simulated lab shell: canned command output for a *provided* target.

This is what makes the mock provider feel like a real lab without running anything. Each scenario is
the fixed "truth" of an authorized, isolated training target (host, ports, services, versions). The
interpreter matches a learner's command string (it NEVER executes it) and returns realistic tool
output plus the outcome `findings` the command established. Those findings flow through the same
outcome-based validators (labs/validators.py) that a real environment would satisfy, so the terminal
and the manual recorder are interchangeable, and a real DockerLabProvider can later fill the same
CommandResult from genuine stdout.

Design notes:
- Findings are always keyed on the scenario's canonical hostname (e.g. ``target.lab``), even when
  the learner scans it by IP, because the validators reference the hostname from the lab definition.
- A default TCP scan only reveals ``top1000`` ports; ``-p-`` / rustscan reveal everything, which is
  what rewards a thorough learner with the hidden service.
- Only ``-sV`` / ``-A`` attach version strings, matching how Nmap actually behaves.
"""
from __future__ import annotations

import shlex
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

from labs.models import LabDefinition
from labs.providers.base import CommandResult

MAX_COMMAND_LEN = 512


@dataclass(frozen=True)
class SimPort:
    port: int
    service: str          # nmap-services name shown in the SERVICE column of a default scan
    version: str          # shown only with service/version detection (-sV / -A)
    top1000: bool = True  # False => only a full scan (-p-) or rustscan reveals it


@dataclass(frozen=True)
class SimTarget:
    hostname: str
    ip: str
    latency: str
    os_hint: str
    ports: tuple[SimPort, ...]

    @property
    def aliases(self) -> tuple[str, ...]:
        return (self.hostname, self.ip)


# One authorized, intentionally vulnerable Linux target shared by the enumeration labs.
_DEFAULT_TARGET = SimTarget(
    hostname="target.lab",
    ip="10.10.10.5",
    latency="0.00042s",
    os_hint="Linux 5.15",
    ports=(
        SimPort(22, "ssh", "OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)"),
        SimPort(80, "http", "Apache httpd 2.4.52 ((Ubuntu))"),
        SimPort(139, "netbios-ssn", "Samba smbd 4.6.2"),
        SimPort(445, "microsoft-ds", "Samba smbd 4.6.2"),
        SimPort(3306, "mysql", "MySQL 5.7.40"),
        SimPort(8080, "http-proxy", "Apache Tomcat 9.0.65"),
        SimPort(33060, "mysqlx", "MySQL X protocol listener", top1000=False),
    ),
)

# lab id -> target. Unknown ids fall back to the default target so any cyber lab gets a shell.
SCENARIOS: dict[str, SimTarget] = {
    "cyber-nmap-001": _DEFAULT_TARGET,
    "cyber-portblast-001": _DEFAULT_TARGET,
}


def scenario_for(lab: LabDefinition) -> SimTarget:
    return SCENARIOS.get(lab.id, _DEFAULT_TARGET)


def has_scenario(lab: LabDefinition) -> bool:
    """Whether this lab's category is served by the simulated shell (vs. the config recorder)."""
    return lab.category in ("cybersecurity", "portblast")


# ---------------------------------------------------------------------------
# parsing helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M %Z")


def _resolve_target(target: SimTarget, args: list[str]) -> tuple[str | None, bool]:
    """Return (host_token, is_known). Only dotted tokens count as hosts, so flag values like the
    ``22`` in ``-p 22`` are never mistaken for a target."""
    hostish = [a for a in args if not a.startswith("-") and "." in a]
    for tok in hostish:
        if tok in target.aliases:
            return tok, True
    return (hostish[0], False) if hostish else (None, False)


def _scan_ports(target: SimTarget, all_ports: bool) -> list[SimPort]:
    return sorted((p for p in target.ports if all_ports or p.top1000), key=lambda p: p.port)


def _port_findings(target: SimTarget, ports: list[SimPort], versions: bool) -> list[dict[str, Any]]:
    out = []
    for p in ports:
        rec: dict[str, Any] = {"target": target.hostname, "port": p.port, "service": p.service}
        if versions:
            rec["version"] = p.version
        out.append(rec)
    return out


# ---------------------------------------------------------------------------
# command handlers  (target, args, lab, findings) -> CommandResult
# ---------------------------------------------------------------------------

Handler = Callable[[SimTarget, list[str], LabDefinition, dict[str, Any]], CommandResult]

_NMAP_USAGE = (
    "Nmap 7.94 ( https://nmap.org )\n"
    "Usage: nmap [Scan Type(s)] [Options] {target specification}\n"
    "WARNING: No targets were specified, so 0 hosts scanned."
)


def _host_down(target: SimTarget, host: str) -> str:
    return (
        f"Starting Nmap 7.94 ( https://nmap.org ) at {_now()}\n"
        f"Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn\n"
        f"Nmap done: 1 IP address (0 hosts up) scanned in 3.11 seconds"
    )


def _nmap_table(target: SimTarget, ports: list[SimPort], versions: bool, all_ports: bool,
                os_detect: bool) -> str:
    scanned = 65535 if all_ports else 1000
    lines = [
        f"Starting Nmap 7.94 ( https://nmap.org ) at {_now()}",
        f"Nmap scan report for {target.hostname} ({target.ip})",
        f"Host is up ({target.latency} latency).",
        f"Not shown: {scanned - len(ports)} closed tcp ports (reset)",
    ]
    if versions:
        lines.append("PORT      STATE SERVICE      VERSION")
        for p in ports:
            lines.append(f"{f'{p.port}/tcp':<9} open  {p.service:<12} {p.version}")
    else:
        lines.append("PORT      STATE SERVICE")
        for p in ports:
            lines.append(f"{f'{p.port}/tcp':<9} open  {p.service}")
    if os_detect:
        lines.append(f"Device type: general purpose\nRunning: Linux 5.X\nOS details: {target.os_hint}")
    if versions:
        lines.append("Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel")
    elapsed = "6.42" if all_ports else "1.83"
    lines += ["", f"Nmap done: 1 IP address (1 host up) scanned in {elapsed} seconds"]
    return "\n".join(lines)


def _cmd_nmap(target, args, lab, findings):
    flags = [a for a in args if a.startswith("-")]
    joined = " ".join(args)
    host, known = _resolve_target(target, args)
    if host is None:
        return CommandResult(output=_NMAP_USAGE, exit_code=1)
    if not known:
        return CommandResult(output=_host_down(target, host))

    ping_only = "-sn" in flags or "-sP" in flags
    if ping_only:
        out = (
            f"Starting Nmap 7.94 ( https://nmap.org ) at {_now()}\n"
            f"Nmap scan report for {target.hostname} ({target.ip})\n"
            f"Host is up ({target.latency} latency).\n"
            f"Nmap done: 1 IP address (1 host up) scanned in 0.28 seconds"
        )
        return CommandResult(output=out, findings={"hosts": {target.hostname: {"up": True}}})

    all_ports = "-p-" in args or "1-65535" in joined.replace(" ", "")
    versions = "-sv" in [f.lower() for f in flags] or "-a" in [f.lower() for f in flags]
    os_detect = "-o" in [f.lower() for f in flags] or "-a" in [f.lower() for f in flags]
    ports = _scan_ports(target, all_ports)
    out = _nmap_table(target, ports, versions, all_ports, os_detect)
    found = {
        "hosts": {target.hostname: {"up": True}},
        "ports": _port_findings(target, ports, versions),
    }
    return CommandResult(output=out, findings=found)


def _cmd_rustscan(target, args, lab, findings):
    host, known = _resolve_target(target, args)
    if host is None:
        return CommandResult(output="rustscan: the following required arguments were not provided:\n  -a <addresses>", exit_code=1)
    if not known:
        return CommandResult(output=f"[!] Looks like {host} is down or unreachable.", exit_code=0)
    versions = "-sv" in " ".join(args).lower()
    ports = _scan_ports(target, all_ports=True)  # rustscan sweeps every port, fast
    banner = [
        ".----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.",
        "| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \\ |  `| |",
        "| .-. \\| {_} |.-._} } | |  .-._} }\\     }/  /\\  \\| |\\  |",
        "`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'",
        "The Modern Day Port Scanner.",
        "",
        f"[~] Scanning {target.hostname} ({target.ip})",
    ]
    banner += [f"Open {target.ip}:{p.port}" for p in ports]
    banner += ["", "[~] Starting Nmap on the open ports", ""]
    banner.append(_nmap_table(target, ports, versions, all_ports=True, os_detect=False))
    found = {
        "hosts": {target.hostname: {"up": True}},
        "ports": _port_findings(target, ports, versions),
    }
    return CommandResult(output="\n".join(banner), findings=found)


def _cmd_ping(target, args, lab, findings):
    host, known = _resolve_target(target, args)
    if host is None:
        return CommandResult(output="ping: usage error: Destination address required", exit_code=1)
    if not known:
        return CommandResult(output=f"ping: {host}: Name or service not known", exit_code=2)
    lines = [f"PING {target.hostname} ({target.ip}) 56(84) bytes of data."]
    for seq in range(1, 5):
        lines.append(f"64 bytes from {target.ip}: icmp_seq={seq} ttl=64 time=0.4{seq} ms")
    lines += [
        "",
        f"--- {target.hostname} ping statistics ---",
        "4 packets transmitted, 4 received, 0% packet loss, time 3005ms",
        "rtt min/avg/max/mdev = 0.312/0.398/0.421/0.041 ms",
    ]
    return CommandResult(output="\n".join(lines), findings={"hosts": {target.hostname: {"up": True}}})


def _cmd_searchsploit(target, args, lab, findings):
    term = " ".join(a for a in args if not a.startswith("-")).strip()
    if not term:
        return CommandResult(output="Usage: searchsploit [term]  e.g. searchsploit tomcat", exit_code=2)
    sep = "-" * 30
    out = (
        f"{'Exploit Title':<40} | Path\n"
        f"{sep} | {sep}\n"
        f"{term[:36] + ' - Remote Code Execution':<40} | multiple/webapps/49039.py\n"
        f"{term[:36] + ' - Directory Traversal':<40} | linux/remote/50158.txt\n"
        f"{sep} | {sep}\n"
        f"Shellcodes: No Results"
    )
    return CommandResult(output=out, findings={"research": [{"note": f"searchsploit {term}", "term": term}]})


def _cmd_portblast(target, args, lab, findings):
    ports = _scan_ports(target, all_ports=True)
    recs = _port_findings(target, ports, versions=True)
    body = ",\n    ".join(
        f'{{"port": {r["port"]}, "service": "{r["service"]}", "version": "{r["version"]}"}}' for r in recs
    )
    out = (
        "PortBlast v0.4 - orchestrated recon (simulated)\n"
        f"[+] Target: {target.hostname} ({target.ip})\n"
        "[+] Phase 1: host discovery ......... up\n"
        f"[+] Phase 2: port sweep ............. {len(ports)} open\n"
        "[+] Phase 3: service/version ........ done\n"
        "{\n"
        f'  "target": "{target.hostname}",\n'
        "  \"open_ports\": [\n    " + body + "\n  ]\n"
        "}\n"
        f"[+] Report written to ./portblast-{target.hostname}.json"
    )
    return CommandResult(output=out, findings={
        "hosts": {target.hostname: {"up": True}},
        "portblast": {"simulated": True, "ports": recs},
    })


def _cmd_compare(target, args, lab, findings):
    manual = findings.get("ports") or []
    pb = (findings.get("portblast") or {}).get("ports") or []
    if not manual:
        return CommandResult(output="No manual findings yet. Run `nmap -sV target.lab` first.", exit_code=1)
    if not pb:
        return CommandResult(output="No PortBlast result yet. Run `portblast target.lab` first.", exit_code=1)
    manual_ports = {p["port"] for p in manual}
    pb_ports = {p["port"] for p in pb}
    only_pb = sorted(pb_ports - manual_ports)
    both = sorted(pb_ports & manual_ports)
    lines = [
        "Manual vs PortBlast",
        f"  ports you found manually : {len(manual_ports)}  ({', '.join(map(str, sorted(manual_ports)))})",
        f"  ports PortBlast found    : {len(pb_ports)}  ({', '.join(map(str, sorted(pb_ports)))})",
        f"  in both                  : {', '.join(map(str, both)) or 'none'}",
        f"  only PortBlast           : {', '.join(map(str, only_pb)) or 'none'}",
        "",
        ("PortBlast surfaced a port your default scan missed - a full scan (-p-) closes the gap."
         if only_pb else "Your manual enumeration matched PortBlast. Automation confirms, it does not replace, the native tools."),
    ]
    return CommandResult(output="\n".join(lines), findings={
        "comparison": {"done": True, "manual_count": len(manual_ports), "portblast_count": len(pb_ports)},
    })


def _cmd_cat(target, args, lab, findings):
    name = (args[0] if args else "").split("/")[-1]
    if name in ("targets.txt", "scope.txt"):
        return CommandResult(output=f"# Authorized scope for this lab\n{target.hostname}\t{target.ip}")
    if name in ("readme", "readme.txt", "notes.txt"):
        return CommandResult(output="Enumerate the authorized target, then validate your findings.")
    if not name:
        return CommandResult(output="cat: missing file operand", exit_code=1)
    return CommandResult(output=f"cat: {name}: No such file or directory", exit_code=1)


def _help_text(lab: LabDefinition) -> str:
    target = scenario_for(lab)
    common = [
        "Available commands (simulated - nothing really runs):",
        f"  nmap [opts] {target.hostname}   port/service scan   (-sV versions, -p- all ports, -sn ping)",
        f"  rustscan -a {target.hostname}   fast full-port sweep",
        f"  ping {target.hostname}          host discovery",
    ]
    if lab.category == "portblast":
        common += [
            "  searchsploit <term>       search Exploit-DB for a product",
            f"  portblast {target.hostname}     run the orchestrated scanner",
            "  compare                   diff your manual findings against PortBlast",
        ]
    common += [
        "  cat targets.txt           show the authorized scope",
        "  whoami | id | pwd | ls    shell basics",
        "  clear                     clear the screen",
        "  help                      this message",
    ]
    return "\n".join(common)


_HANDLERS: dict[str, Handler] = {
    "nmap": _cmd_nmap,
    "rustscan": _cmd_rustscan,
    "ping": _cmd_ping,
    "searchsploit": _cmd_searchsploit,
    "portblast": _cmd_portblast,
    "compare": _cmd_compare,
    "cat": _cmd_cat,
    "whoami": lambda t, a, l, f: CommandResult(output="student"),
    "id": lambda t, a, l, f: CommandResult(output="uid=1000(student) gid=1000(student) groups=1000(student)"),
    "pwd": lambda t, a, l, f: CommandResult(output="/home/student"),
    "ls": lambda t, a, l, f: CommandResult(output="notes.txt  targets.txt"),
    "help": lambda t, a, l, f: CommandResult(output=_help_text(l)),
    "clear": lambda t, a, l, f: CommandResult(output="", clear=True),
    "cls": lambda t, a, l, f: CommandResult(output="", clear=True),
}


def simulate_command(lab: LabDefinition, command: str, findings: dict[str, Any]) -> CommandResult:
    """Interpret one command against the lab's scenario. Never executes anything."""
    raw = (command or "").strip()
    if not raw:
        return CommandResult(output="")
    if len(raw) > MAX_COMMAND_LEN:
        return CommandResult(output="Command too long.", exit_code=1)
    try:
        parts = shlex.split(raw)
    except ValueError:
        parts = raw.split()
    if not parts:
        return CommandResult(output="")
    name = parts[0].split("/")[-1].lower()
    # allow "sudo nmap ..." and "./portblast ..."
    if name == "sudo" and len(parts) > 1:
        parts = parts[1:]
        name = parts[0].split("/")[-1].lower()
    handler = _HANDLERS.get(name)
    if handler is None:
        return CommandResult(output=f"{name}: command not found", exit_code=127)
    return handler(scenario_for(lab), parts[1:], lab, findings or {})


def banner_for(lab: LabDefinition) -> list[str]:
    """Lines the client shows when the shell opens, so the learner knows the target is provided."""
    target = scenario_for(lab)
    return [
        "Road to CISSP - simulated lab shell   (safe: nothing is really executed)",
        f"Authorized target: {target.hostname} ({target.ip})  - isolated, provided for you",
        'Type "help" for commands. Findings are recorded automatically as you work.',
    ]


# Re-exported so tests can assert against the canonical target without importing internals.
DEFAULT_TARGET = _DEFAULT_TARGET
