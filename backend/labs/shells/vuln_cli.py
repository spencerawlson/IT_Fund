"""A simulated vulnerability scanner shell for the vulnerability assessment lab.

A deterministic, fictional vulnerability management workflow: run a scan, inspect
findings (CVE, CVSS vector, EPSS, KEV status, asset criticality), prioritize by
RISK (not CVSS alone), remediate or mitigate, rescan to verify, and generate an
executive report. Nothing executes; state lives in session findings under
`_vuln_cli`, so progress is derived from outcomes, not keystrokes.

The pedagogical trap: VULN-003 (Apache path traversal, CVSS 7.5) outranks
VULN-004 (Spring4Shell, CVSS 9.8) once EPSS, KEV catalog membership, and asset
criticality are factored in. Sorting by CVSS alone is the wrong answer.
"""
from __future__ import annotations

import copy
import shlex
from typing import Any

from labs.providers.base import CommandResult

# Asset criticality weights for the risk model.
ASSET_WEIGHT = {"critical": 10, "high": 7, "medium": 4, "low": 1}

HOSTS = {
    "web01": {"ip": "10.0.1.10", "role": "Public web server", "criticality": "critical"},
    "db01": {"ip": "10.0.1.20", "role": "Customer database", "criticality": "critical"},
    "mail01": {"ip": "10.0.1.30", "role": "Mail gateway", "criticality": "high"},
    "ws042": {"ip": "10.0.2.42", "role": "Finance workstation", "criticality": "medium"},
    "iot-cam03": {"ip": "10.0.3.15", "role": "Lobby IoT camera", "criticality": "low"},
}

# Pre-seeded findings. KEV membership and EPSS are a fixed fictional snapshot.
VULNS = [
    {
        "id": "VULN-001", "cve": "CVE-2021-44228", "title": "Log4j remote code execution (Log4Shell)",
        "host": "web01", "cvss": 10.0,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
        "epss": 0.97, "kev": True,
        "service": "Apache Log4j 2.14.1",
        "desc": "Unauthenticated RCE via JNDI lookup in log messages. Wormable.",
        "fix": "Upgrade Log4j to 2.17.1+ or set log4j2.formatMsgNoLookups=true.",
    },
    {
        "id": "VULN-002", "cve": "CVE-2023-4966", "title": "Citrix NetScaler buffer overflow (Citrix Bleed)",
        "host": "mail01", "cvss": 9.4,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        "epss": 0.91, "kev": False,
        "service": "Citrix NetScaler 13.1-48.47",
        "desc": "Session hijacking via crafted Host header; steals active sessions.",
        "fix": "Upgrade NetScaler and terminate all active sessions (stolen tokens persist).",
    },
    {
        "id": "VULN-003", "cve": "CVE-2021-41773", "title": "Apache HTTP Server path traversal",
        "host": "web01", "cvss": 7.5,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
        "epss": 0.78, "kev": True,
        "service": "Apache httpd 2.4.49",
        "desc": "Unauthenticated file disclosure / RCE when CGI enabled. Actively exploited in the wild.",
        "fix": "Upgrade Apache to 2.4.51+.",
    },
    {
        "id": "VULN-004", "cve": "CVE-2022-22965", "title": "Spring Framework RCE (Spring4Shell)",
        "host": "iot-cam03", "cvss": 9.8,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "epss": 0.22, "kev": False,
        "service": "Spring Framework 5.3.17 (embedded)",
        "desc": "RCE via data binding on JDK 9+. Embedded in camera firmware; vendor patch pending.",
        "fix": "No vendor patch yet — mitigate via network segmentation until firmware ships.",
    },
    {
        "id": "VULN-005", "cve": "CVE-2020-1472", "title": "Netlogon elevation of privilege (Zerologon)",
        "host": "db01", "cvss": 10.0,
        "vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:H",
        "epss": 0.35, "kev": False,
        "service": "Windows Server 2019 (unpatched Aug 2020 rollup)",
        "desc": "Cryptographic bypass in Netlogon allows domain controller compromise.",
        "fix": "Apply the August 2020 security update and enforce secure Netlogon channel.",
    },
    {
        "id": "VULN-006", "cve": "CVE-2023-23397", "title": "Outlook elevation of privilege",
        "host": "ws042", "cvss": 9.8,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "epss": 0.31, "kev": False,
        "service": "Microsoft Outlook (pre-Apr 2023 patch)",
        "desc": "Credential theft via crafted calendar invite; no user interaction needed.",
        "fix": "Apply the April 2023 Office security update.",
    },
    {
        "id": "VULN-007", "cve": "CVE-2021-26855", "title": "Exchange SSRF (ProxyLogon)",
        "host": "mail01", "cvss": 9.1,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:C/C:H/I:H/A:H",
        "epss": 0.48, "kev": False,
        "service": "Exchange Server 2019 CU8",
        "desc": "Pre-auth SSRF chaining to RCE; requires low-priv creds for full chain.",
        "fix": "Apply Exchange security update and hunt for webshells.",
    },
    {
        "id": "VULN-008", "cve": "CVE-2022-30190", "title": "MSDT remote code execution (Follina)",
        "host": "ws042", "cvss": 7.8,
        "vector": "CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
        "epss": 0.52, "kev": False,
        "service": "Windows MSDT (pre-May 2022 patch)",
        "desc": "RCE via malicious Office document invoking ms-msdt: URI.",
        "fix": "Apply the May 2022 update or disable the MSDT URL protocol.",
    },
    {
        "id": "VULN-009", "cve": "CVE-2021-41379", "title": "Windows Installer elevation of privilege",
        "host": "ws042", "cvss": 5.5,
        "vector": "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
        "epss": 0.15, "kev": False,
        "service": "Windows 10 21H1",
        "desc": "Local EoP via installer race condition; requires existing foothold.",
        "fix": "Apply the November 2021 security update.",
    },
    {
        "id": "VULN-010", "cve": "CVE-2021-34527", "title": "Print Spooler RCE (PrintNightmare)",
        "host": "db01", "cvss": 8.8,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H",
        "epss": 0.44, "kev": False,
        "service": "Windows Print Spooler (enabled)",
        "desc": "RCE/EoP via print spooler; low-priv creds suffice.",
        "fix": "Apply update or disable the Print Spooler service if unneeded.",
    },
    {
        "id": "VULN-011", "cve": "CVE-2023-20198", "title": "Cisco IOS XE privilege escalation",
        "host": "iot-cam03", "cvss": 10.0,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
        "epss": 0.28, "kev": False,
        "service": "IOS XE 17.9.3 (camera gateway)",
        "desc": "Unauthenticated web UI implant; device on isolated IoT VLAN.",
        "fix": "Upgrade IOS XE and audit for implants; device is VLAN-isolated.",
    },
    {
        "id": "VULN-012", "cve": "CVE-2021-1722", "title": "Windows Fax Service RCE",
        "host": "mail01", "cvss": 6.4,
        "vector": "CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:H/I:H/A:H",
        "epss": 0.09, "kev": False,
        "service": "Windows Fax Service (rarely used)",
        "desc": "RCE in a legacy service; complex preconditions, rarely reachable.",
        "fix": "Disable the Fax Service if unused, else patch.",
    },
]


def risk_score(v: dict[str, Any]) -> float:
    """Transparent 0-100 risk model: CVSS (40) + EPSS (30) + KEV (20) + asset (10)."""
    return round(
        v["cvss"] * 4
        + v["epss"] * 30
        + (20 if v["kev"] else 0)
        + ASSET_WEIGHT[HOSTS[v["host"]]["criticality"]],
        1,
    )


def _fresh() -> dict[str, Any]:
    return {
        "scanned": False,
        "kev_checked": False,
        "cvss_viewed": [],
        "priority_submission": [],
        "remediated": [],
        "mitigated": [],
        "rescanned": False,
        "report_generated": False,
    }


def _derive(st: dict[str, Any]) -> dict[str, Any]:
    return {
        "vuln_scan_complete": st["scanned"],
        "vuln_kev_checked": st["kev_checked"],
        "vuln_cvss_interpreted": len(st["cvss_viewed"]) >= 2,
        "vuln_priority_submission": st["priority_submission"],
        "vuln_remediated": st["remediated"],
        "vuln_mitigated": st["mitigated"],
        "vuln_rescanned": st["rescanned"],
        "vuln_report_generated": st["report_generated"],
    }


def _emit(st, output, exit_code=0, clear=False) -> CommandResult:
    return CommandResult(
        output=output,
        findings={"_vuln_cli": st, **_derive(st)},
        prompt="analyst@vuln-lab:~$ ",
        exit_code=exit_code,
        clear=clear,
    )


def _ranked() -> list[dict[str, Any]]:
    return sorted(VULNS, key=lambda v: risk_score(v), reverse=True)


def _by_cvss() -> list[dict[str, Any]]:
    return sorted(VULNS, key=lambda v: v["cvss"], reverse=True)


def _find(vuln_id: str) -> dict[str, Any] | None:
    vid = vuln_id.upper()
    return next((v for v in VULNS if v["id"] == vid), None)


# ---- commands ----

def _help() -> str:
    return (
        "Vulnerability assessment workflow:\n"
        "  scan <target>              Run a vulnerability scan (e.g. scan 10.0.1.0/24)\n"
        "  vulns                      List all findings from the last scan\n"
        "  vuln <id>                  Finding detail: CVE, CVSS vector, EPSS, KEV, host\n"
        "  kev                        Show the CISA KEV catalog snapshot\n"
        "  prioritize <id> <id> <id>  Submit YOUR top-3 by risk (not CVSS alone)\n"
        "  prioritize --by cvss       Show what CVSS-only ordering would give you\n"
        "  remediate <id>             Apply the vendor patch (full fix)\n"
        "  mitigate <id>              Apply a workaround when no patch exists\n"
        "  rescan                     Verify fixes with a follow-up scan\n"
        "  report                     Generate the executive summary\n"
        "  help                       This text"
    )


def _do_scan(st, args) -> str:
    target = args[0] if args else "10.0.0.0/16"
    st["scanned"] = True
    lines = [
        f"[*] Starting vulnerability scan of {target}",
        "[*] Host discovery: 5 hosts up (web01, db01, mail01, ws042, iot-cam03)",
        "[*] Service enumeration: 14 services fingerprinted",
        "[*] CVE correlation against NVD snapshot 2026-10-01 ...",
        "[*] EPSS enrichment: 12 findings scored",
        "[*] KEV cross-check: 2 findings match the CISA catalog",
        "",
        f"[+] Scan complete: 12 vulnerabilities across 5 hosts.",
        "    Run `vulns` to list findings, `vuln <id>` for detail.",
    ]
    return "\n".join(lines)


def _do_vulns(st) -> str:
    if not st["scanned"]:
        return "No scan results yet — run `scan <target>` first."
    lines = [f"{'ID':<10}{'CVE':<16}{'CVSS':<7}{'HOST':<10}{'STATUS':<12}TITLE",
             "-" * 100]
    for v in VULNS:
        if v["id"] in st["remediated"]:
            status = "REMEDIATED"
        elif v["id"] in st["mitigated"]:
            status = "MITIGATED"
        else:
            status = "OPEN"
        lines.append(f"{v['id']:<10}{v['cve']:<16}{v['cvss']:<7}{v['host']:<10}{status:<12}{v['title'][:38]}")
    return "\n".join(lines)


def _do_vuln(st, args) -> str:
    if not args:
        return "Usage: vuln <id>   (e.g. vuln VULN-003)"
    v = _find(args[0])
    if not v:
        return f"Unknown finding: {args[0]} — run `vulns` to list IDs."
    if v["id"] not in st["cvss_viewed"]:
        st["cvss_viewed"].append(v["id"])
    host = HOSTS[v["host"]]
    return "\n".join([
        f"{v['id']}: {v['title']}",
        f"  CVE:        {v['cve']}",
        f"  CVSS:       {v['cvss']}  {v['vector']}",
        f"  EPSS:       {v['epss']}  (probability of exploitation in the next 30 days)",
        f"  CISA KEV:   {'YES — known exploited' if v['kev'] else 'no'}",
        f"  Host:       {v['host']} ({host['ip']}) — {host['role']} [{host['criticality'].upper()}]",
        f"  Service:    {v['service']}",
        f"  Detail:     {v['desc']}",
        f"  Fix:        {v['fix']}",
        f"  Risk score: {risk_score(v)} / 100  (CVSS×4 + EPSS×30 + KEV 20 + asset weight)",
    ])


def _do_kev(st) -> str:
    st["kev_checked"] = True
    kev = [v for v in VULNS if v["kev"]]
    lines = [
        "CISA Known Exploited Vulnerabilities — snapshot 2026-10-01 (2 matches in this environment):",
        "",
    ]
    for v in kev:
        host = HOSTS[v["host"]]
        lines.append(f"  {v['cve']}  {v['title']}")
        lines.append(f"    {v['id']} on {v['host']} [{host['criticality']}] — CVSS {v['cvss']}, EPSS {v['epss']}")
    lines += [
        "",
        "KEV-listed vulns have confirmed in-the-wild exploitation: they jump the queue",
        "regardless of CVSS. Check `prioritize --by cvss` to see what you'd miss.",
    ]
    return "\n".join(lines)


def _do_prioritize(st, args) -> str:
    if args and args[0] == "--by":
        lines = ["CVSS-only ordering (what a naive scanner sort gives you):", ""]
        for i, v in enumerate(_by_cvss()[:6], 1):
            lines.append(f"  {i}. {v['id']}  CVSS {v['cvss']}  {v['title'][:44]}")
        lines += [
            "",
            "Compare with `prioritize` (risk-based). Notice VULN-003 vs VULN-004.",
        ]
        return "\n".join(lines)
    if len(args) < 3:
        lines = ["Risk-based ranking  (CVSS×4 + EPSS×30 + KEV 20 + asset weight):", ""]
        for i, v in enumerate(_ranked(), 1):
            host = HOSTS[v["host"]]
            kev = " KEV" if v["kev"] else ""
            lines.append(
                f"  {i:>2}. {v['id']}  risk {risk_score(v):>5}  "
                f"(CVSS {v['cvss']}, EPSS {v['epss']}{kev}, {host['criticality']})  {v['title'][:36]}"
            )
        lines += [
            "",
            "Submit YOUR top-3 by risk:  prioritize VULN-001 VULN-003 VULN-002",
            "(Order matters. CVSS alone will mislead you — check `--by cvss`.)",
        ]
        return "\n".join(lines)
    # submission
    ids = [a.upper() for a in args[:3]]
    if any(_find(i) is None for i in ids):
        return "Unknown ID in submission — run `vulns` to list IDs."
    if len(set(ids)) < 3:
        return "Submit three DISTINCT finding IDs."
    st["priority_submission"] = ids
    return (
        f"Top-3 submitted: {', '.join(ids)}\n"
        "Use `Check my work` on the 'Prioritize by risk' objective to validate."
    )


def _do_remediate(st, args) -> str:
    if not args:
        return "Usage: remediate <id>   (applies the vendor patch)"
    v = _find(args[0])
    if not v:
        return f"Unknown finding: {args[0]}"
    if v["id"] in st["remediated"]:
        return f"{v['id']} is already remediated."
    # VULN-004 has no vendor patch yet — remediate is the wrong action
    if v["id"] == "VULN-004":
        return (
            "Cannot remediate VULN-004: no vendor patch exists for the embedded\n"
            "Spring build in the camera firmware. Use `mitigate VULN-004` instead\n"
            "(network segmentation until the firmware ships)."
        )
    st["remediated"].append(v["id"])
    return f"[+] {v['id']} remediated: {v['fix']}"


def _do_mitigate(st, args) -> str:
    if not args:
        return "Usage: mitigate <id>   (workaround when patching is not possible)"
    v = _find(args[0])
    if not v:
        return f"Unknown finding: {args[0]}"
    if v["id"] in st["mitigated"]:
        return f"{v['id']} is already mitigated."
    if v["id"] in st["remediated"]:
        return f"{v['id']} is already remediated — no mitigation needed."
    st["mitigated"].append(v["id"])
    note = (
        " (compensating control: IoT VLAN ACL blocks inbound 8080/8443 pending firmware)"
        if v["id"] == "VULN-004" else " (compensating control recorded)"
    )
    return f"[+] {v['id']} mitigated{note}\n[!] Mitigation reduces risk but the vuln REMAINS — track it for the patch window."


def _do_rescan(st) -> str:
    if not st["scanned"]:
        return "Run `scan <target>` first."
    st["rescanned"] = True
    remaining = [v for v in VULNS if v["id"] not in st["remediated"]]
    lines = [
        "[*] Follow-up scan complete.",
        f"    Remediated: {len(st['remediated'])} findings no longer detected.",
        f"    Mitigated:  {len(st['mitigated'])} findings still present (workaround in place).",
        f"    Open:       {len([v for v in remaining if v['id'] not in st['mitigated']])} findings untreated.",
    ]
    if st["mitigated"]:
        lines.append("    Mitigated IDs: " + ", ".join(st["mitigated"]) + " — verify at next patch window.")
    return "\n".join(lines)


def _do_report(st) -> str:
    if not st["scanned"]:
        return "Run `scan <target>` first."
    ranked = _ranked()
    top = ranked[0]
    lines = [
        "=" * 64,
        "VULNERABILITY ASSESSMENT — EXECUTIVE SUMMARY",
        "Scope: 10.0.0.0/16 (5 hosts)   Snapshot: 2026-10-01",
        "=" * 64,
        f"Findings: {len(VULNS)} total — {len(st['remediated'])} remediated, "
        f"{len(st['mitigated'])} mitigated, "
        f"{len(VULNS) - len(st['remediated']) - len(st['mitigated'])} open.",
        "",
        "Top risks (risk score blends CVSS, EPSS, KEV, asset criticality):",
    ]
    for i, v in enumerate(ranked[:5], 1):
        host = HOSTS[v["host"]]
        lines.append(
            f"  {i}. {v['id']} {v['cve']} — {v['title'][:40]} "
            f"(risk {risk_score(v)}, {v['host']} [{host['criticality']}])"
        )
    lines += [
        "",
        f"Immediate action: {top['id']} ({top['cve']}) on {top['host']} — "
        "KEV-listed, EPSS 0.97, internet-facing.",
        "Key lesson: CVSS alone misorders the queue — VULN-003 (CVSS 7.5) outranks",
        "VULN-004 (CVSS 9.8) once exploitability and asset context are weighed.",
        "=" * 64,
    ]
    st["report_generated"] = True
    return "\n".join(lines)


def initial_prompt(lab) -> str:
    return "analyst@vuln-lab:~$ "


def banner(lab) -> list[str]:
    return [
        "Road to CISSP - simulated vulnerability assessment lab (fictional findings, nothing is real)",
        "Workflow: scan -> inspect (vuln <id>) -> kev -> prioritize -> remediate/mitigate -> rescan -> report",
        'Type "help" for commands. Risk = CVSS + EPSS + KEV + asset criticality.',
    ]


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get("_vuln_cli")) if findings.get("_vuln_cli") else _fresh()
    raw = (command or "").strip()
    if not raw:
        return _emit(st, "")
    if len(raw) > 512:
        return _emit(st, "Command too long.", exit_code=1)
    try:
        parts = shlex.split(raw)
    except ValueError:
        parts = raw.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ("clear", "cls"):
        return _emit(st, "", clear=True)
    if cmd in ("help", "?"):
        return _emit(st, _help())
    if cmd == "scan":
        return _emit(st, _do_scan(st, args))
    if cmd == "vulns":
        return _emit(st, _do_vulns(st))
    if cmd == "vuln":
        return _emit(st, _do_vuln(st, args))
    if cmd == "kev":
        return _emit(st, _do_kev(st))
    if cmd in ("prioritize", "rank"):
        return _emit(st, _do_prioritize(st, args))
    if cmd == "remediate":
        return _emit(st, _do_remediate(st, args))
    if cmd == "mitigate":
        return _emit(st, _do_mitigate(st, args))
    if cmd == "rescan":
        return _emit(st, _do_rescan(st))
    if cmd == "report":
        return _emit(st, _do_report(st))
    return _emit(st, f"{cmd}: command not found — try `help`", exit_code=127)
