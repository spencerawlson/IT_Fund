"""A simulated SIEM threat-hunting shell for the CySA+ security-operations lab.

A deterministic, in-memory SIEM over a fixed multi-stage incident (executes nothing):
three realistic attack scenarios are pre-seeded in the log store, plus benign noise and
one false-positive alert so triage judgement matters.

  Scenario A: RDP brute-force (203.0.113.99) -> success on ws-finance01 -> lateral
              movement to srv-files02.
  Scenario B: DNS tunneling exfiltration from ws-hr02 (10.0.4.23) to tun.exfil-ops.net.
  Scenario C: Phishing email -> invoice_update.exe on ws-sales03 -> HTTPS C2 beacons
              to 203.0.113.200, with scheduled-task persistence.

Commands: search, alerts, alert <id>, timeline <entity>, hunt ioc <value>,
isolate <host>, stats, report, help, clear.

Objective flags are derived from the accumulated investigation state (tracked IOCs,
built timelines, isolated hosts), so working the investigation is what completes
the objectives — not merely typing commands.
"""
from __future__ import annotations

import copy
import shlex
from typing import Any

from labs.providers.base import CommandResult

# ---- known attacker infrastructure (the ground truth the lab teaches) ----
RDP_ATTACKER = '203.0.113.99'
C2_IP = '203.0.113.200'
DNS_TUNNEL_DOMAIN = 'tun.exfil-ops.net'

RDP_HOST = 'ws-finance01'
RDP_IP = '10.0.1.15'
LATERAL_HOST = 'srv-files02'
LATERAL_IP = '10.0.1.40'
EXFIL_HOST = 'ws-hr02'
EXFIL_IP = '10.0.4.23'
MALWARE_HOST = 'ws-sales03'
MALWARE_IP = '10.0.2.31'

COMPROMISED_HOSTS = (RDP_HOST, LATERAL_HOST, EXFIL_HOST, MALWARE_HOST)
KNOWN_HOSTS = COMPROMISED_HOSTS + ('ws-itadmin01', 'dc01', 'mail01', 'vpn-gw01')

RDP_CHAIN_ENTITIES = {RDP_HOST, RDP_IP, LATERAL_HOST, LATERAL_IP, RDP_ATTACKER}
EXFIL_ENTITIES = {EXFIL_HOST, EXFIL_IP}
MALWARE_ENTITIES = {MALWARE_HOST, MALWARE_IP, C2_IP}


def _ev(eid, ts, src_ip, dst_ip, host, user, event_type, severity, process, message, **extra):
    e = {
        'id': eid, 'ts': ts, 'src_ip': src_ip, 'dst_ip': dst_ip, 'host': host,
        'user': user, 'event_type': event_type, 'severity': severity,
        'process': process, 'message': message,
    }
    e.update(extra)
    return e


def _build_events() -> list[dict[str, Any]]:
    d = '2026-10-11'
    events: list[dict[str, Any]] = []

    # ---- Scenario A: RDP brute-force -> success -> lateral movement ----
    # 12 brute-force attempts against j.chen, then a success.
    for i in range(12):
        events.append(_ev(
            f'a{i + 1:02d}', f'{d} 08:{12 + i // 2:02d}:{3 + (i * 37) % 60:02d}',
            RDP_ATTACKER, RDP_IP, RDP_HOST, 'j.chen', 'rdp_auth_failure', 'medium',
            'svchost.exe-TermService',
            f'RDP logon failed for j.chen from {RDP_ATTACKER} (attempt {i + 1}, bad password)',
        ))
    events.append(_ev(
        'a13', f'{d} 08:19:02', RDP_ATTACKER, RDP_IP, RDP_HOST, 'j.chen',
        'rdp_auth_success', 'high', 'svchost.exe-TermService',
        f'RDP logon SUCCEEDED for j.chen from {RDP_ATTACKER} after 12 failures',
    ))
    events.append(_ev(
        'a14', f'{d} 08:24:15', RDP_IP, RDP_IP, RDP_HOST, 'j.chen',
        'process_create', 'high', 'procdump64.exe',
        'Suspicious process: procdump64.exe -ma lsass.exe (credential dumping)',
    ))
    events.append(_ev(
        'a15', f'{d} 08:31:44', RDP_IP, LATERAL_IP, RDP_HOST, 'j.chen',
        'smb_session', 'high', 'System',
        f'SMB session from {RDP_HOST} ({RDP_IP}) to {LATERAL_HOST} ({LATERAL_IP})',
    ))
    events.append(_ev(
        'a16', f'{d} 08:32:10', RDP_IP, LATERAL_IP, LATERAL_HOST, 'j.chen',
        'rdp_auth_success', 'critical', 'svchost.exe-TermService',
        f'RDP logon to {LATERAL_HOST} from {RDP_HOST} as j.chen (lateral movement)',
    ))
    events.append(_ev(
        'a17', f'{d} 08:35:02', LATERAL_IP, LATERAL_IP, LATERAL_HOST, 'j.chen',
        'process_create', 'critical', 'powershell.exe',
        'powershell.exe -enc SQBmACgAbgBlAHcALQBPAGIAagBlAGMAdAAgAE4AZQB0AC4AVwBlAGIAQwBsAGkAZQBuAHQAKQA= (encoded payload)',
    ))

    # ---- Scenario B: DNS tunneling exfiltration ----
    # 24 representative TXT-query events stand in for the full burst (see alert A-102).
    for i in range(24):
        label = f'{(i * 2654435761) % 16**12:012x}{(i * 40503 + 7) % 16**8:08x}'
        events.append(_ev(
            f'b{i + 1:02d}', f'{d} 09:{2 + i // 2:02d}:{(i * 29) % 60:02d}',
            EXFIL_IP, '10.0.0.53', EXFIL_HOST, '-', 'dns_query', 'medium',
            'svchost.exe-Dnscache',
            f'DNS TXT query for {label}.{DNS_TUNNEL_DOMAIN} (20-byte encoded label)',
            query_type='TXT', domain=DNS_TUNNEL_DOMAIN,
        ))
    events.append(_ev(
        'b25', f'{d} 09:14:40', EXFIL_IP, '10.0.0.53', EXFIL_HOST, '-',
        'dns_anomaly', 'high', 'svchost.exe-Dnscache',
        f'2,143 TXT queries to *.{DNS_TUNNEL_DOMAIN} in 12 minutes from {EXFIL_HOST} — possible tunneling',
        query_type='TXT', domain=DNS_TUNNEL_DOMAIN,
    ))

    # ---- Scenario C: phishing -> malware -> C2 beacons ----
    events.append(_ev(
        'c01', f'{d} 10:05:22', '198.51.100.44', '10.0.0.25', 'mail01', 'm.diallo',
        'email_delivered', 'medium', '-',
        'Email to m.diallo: subject "Invoice #4471 - payment overdue", attachment invoice_update.exe',
    ))
    events.append(_ev(
        'c02', f'{d} 10:11:47', MALWARE_IP, MALWARE_IP, MALWARE_HOST, 'm.diallo',
        'process_create', 'high', 'invoice_update.exe',
        'invoice_update.exe spawned by outlook.exe (unsigned binary, first seen in environment)',
    ))
    events.append(_ev(
        'c03', f'{d} 10:12:03', MALWARE_IP, MALWARE_IP, MALWARE_HOST, 'm.diallo',
        'persistence', 'high', 'schtasks.exe',
        'Scheduled task created: \\Microsoft\\Windows\\WindowsUpdateCheck -> invoice_update.exe',
    ))
    for i in range(6):
        events.append(_ev(
            f'c{i + 4:02d}', f'{d} 10:{12 + i * 5:02d}:30',
            MALWARE_IP, C2_IP, MALWARE_HOST, 'm.diallo',
            'https_beacon', 'high', 'invoice_update.exe',
            f'HTTPS POST to {C2_IP}:443 /api/v2/sync every ~5 min, UA "InvoiceUpdater/1.0" (beacon {i + 1}/6)',
            user_agent='InvoiceUpdater/1.0',
        ))

    # ---- benign noise ----
    events.append(_ev('n01', f'{d} 08:05:11', '10.0.1.5', LATERAL_IP, LATERAL_HOST, 'admin-kosei',
                      'rdp_auth_success', 'info', 'svchost.exe-TermService',
                      'RDP logon to srv-files02 from IT admin workstation (scheduled patching)'))
    events.append(_ev('n02', f'{d} 09:40:00', '10.0.2.12', '10.0.0.53', 'ws-dev04', '-',
                      'dns_query', 'info', 'svchost.exe-Dnscache',
                      'DNS A query for intranet.corp.local', query_type='A'))
    events.append(_ev('n03', f'{d} 10:20:15', '198.51.100.44', '10.0.0.25', 'mail01', 'a.laurent',
                      'email_delivered', 'info', '-',
                      'Email to a.laurent: subject "Q4 all-hands slides", no attachment'))
    events.append(_ev('n04', f'{d} 11:02:44', '10.0.3.9', '10.0.0.53', 'ws-mktg01', '-',
                      'dns_query', 'info', 'svchost.exe-Dnscache',
                      'DNS A query for cdn.vendor.com', query_type='A'))
    events.append(_ev('n05', f'{d} 08:55:00', '10.0.1.5', '10.0.0.10', 'dc01', 'admin-kosei',
                      'auth_success', 'info', 'lsass.exe',
                      'Interactive logon to dc01 by admin-kosei (morning admin work)'))
    # false-positive fodder: CTO on VPN looks like impossible travel
    events.append(_ev('n06', f'{d} 07:58:12', '192.0.2.10', '10.0.0.10', 'vpn-gw01', 'cto',
                      'vpn_login', 'info', '-',
                      'VPN login for cto from 192.0.2.10 (Toronto egress)'))
    events.append(_ev('n07', f'{d} 08:21:33', '192.0.2.10', '10.0.0.10', 'vpn-gw01', 'cto',
                      'auth_success', 'info', 'lsass.exe',
                      'SSO login for cto via London POP 23 minutes after Toronto (corporate VPN backhaul)'))

    events.sort(key=lambda e: e['ts'])
    return events


EVENTS: list[dict[str, Any]] = _build_events()

ALERTS = [
    {'id': 'A-101', 'severity': 'high', 'name': 'RDP Brute Force',
     'entity': RDP_ATTACKER,
     'logic': '>= 10 rdp_auth_failure from one src_ip in 10 minutes',
     'summary': f'12 RDP failures from {RDP_ATTACKER} against {RDP_HOST}, then a success'},
    {'id': 'A-102', 'severity': 'high', 'name': 'Suspected DNS Tunneling',
     'entity': EXFIL_HOST,
     'logic': '> 1000 TXT queries to one domain from one host in 15 minutes',
     'summary': f'2,143 TXT queries to *.{DNS_TUNNEL_DOMAIN} from {EXFIL_HOST} ({EXFIL_IP})'},
    {'id': 'A-103', 'severity': 'critical', 'name': 'Malware C2 Beaconing',
     'entity': C2_IP,
     'logic': 'periodic HTTPS POSTs to rare external IP with non-browser UA',
     'summary': f'{MALWARE_HOST} beaconing to {C2_IP}:443 every ~5 min (UA InvoiceUpdater/1.0)'},
    {'id': 'A-104', 'severity': 'high', 'name': 'Lateral Movement',
     'entity': RDP_HOST,
     'logic': 'SMB + RDP from a freshly compromised host to a second host',
     'summary': f'{RDP_HOST} -> {LATERAL_HOST}: SMB session then RDP logon as j.chen'},
    {'id': 'A-105', 'severity': 'medium', 'name': 'Impossible Travel Login',
     'entity': 'cto',
     'logic': 'logons from distant geos within 30 minutes',
     'summary': 'cto: Toronto then London in 23 min — likely corporate VPN backhaul (verify before acting)'},
]


def _fresh() -> dict[str, Any]:
    return {
        'alerts_reviewed': False,
        'tracked_iocs': [],
        'timelines_built': [],
        'isolated_hosts': [],
        'lateral_movement_seen': False,
        'dns_tunnel_scoped': False,
        'malware_chain_seen': False,
        'report_generated': False,
        'searches': 0,
    }


def initial_prompt(lab) -> str:
    return 'analyst@siem:~$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated SIEM workbench   (safe: nothing is really executed)',
        'Five detection alerts are waiting. Triage them, hunt the attacker infrastructure,',
        'scope each compromise, contain the hosts, and write up the incident.',
        'Try: alerts · alert A-101 · search event_type=rdp_auth_failure · timeline ws-finance01 · help',
    ]


# ---- objective flags derived from investigation state ----

def _derive(st: dict[str, Any]) -> dict[str, Any]:
    iocs = st['tracked_iocs']
    isolated = set(st['isolated_hosts'])
    return {
        'siem_alerts_triaged': st['alerts_reviewed'],
        'siem_rdp_attacker': RDP_ATTACKER in iocs,
        'siem_rdp_timeline': st['lateral_movement_seen'],
        'siem_dns_tunnel': any(DNS_TUNNEL_DOMAIN in i for i in iocs),
        'siem_exfil_host': st['dns_tunnel_scoped'],
        'siem_malware_c2': C2_IP in iocs,
        'siem_hosts_isolated': all(h in isolated for h in COMPROMISED_HOSTS),
        'siem_report_done': st['report_generated'],
    }


def _emit(st, output, clear=False) -> CommandResult:
    return CommandResult(output=output, findings={'_siem': st, **_derive(st)},
                         prompt='analyst@siem:~$ ', clear=clear)


# ---- search ----

def _search(events: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    try:
        tokens = shlex.split(query)
    except ValueError:
        tokens = query.split()
    filters: dict[str, str] = {}
    freetext: list[str] = []
    for t in tokens:
        if '=' in t:
            k, _, v = t.partition('=')
            filters[k.strip().lower()] = v.strip()
        else:
            freetext.append(t.lower())
    results = []
    for e in events:
        ok = True
        for k, v in filters.items():
            if k == 'entity':
                blob = f"{e['host']} {e['src_ip']} {e['dst_ip']} {e['user']}".lower()
                if v.lower() not in blob:
                    ok = False
                    break
            else:
                actual = str(e.get(k, ''))
                if v.lower() not in actual.lower():
                    ok = False
                    break
        if ok and freetext:
            blob = ' '.join(str(x) for x in e.values()).lower()
            if not all(w in blob for w in freetext):
                ok = False
        if ok:
            results.append(e)
    return results


def _row(e: dict[str, Any]) -> str:
    msg = e['message']
    if len(msg) > 88:
        msg = msg[:85] + '...'
    return (f"{e['ts'][11:]}  {e['src_ip']:<15} -> {e['dst_ip']:<15}  {e['host']:<13}  "
            f"{e['event_type']:<16}  {e['severity']:<8}  {msg}")


def _do_search(st, query: str) -> CommandResult:
    st['searches'] += 1
    results = _search(EVENTS, query)
    if not results:
        return _emit(st, f'0 events match "{query}".')
    rows = ['TIME      SRC_IP           -> DST_IP           HOST           EVENT_TYPE        SEVERITY  MESSAGE']
    for e in results[:40]:
        rows.append(_row(e))
    if len(results) > 40:
        rows.append(f'... and {len(results) - 40} more (refine your query)')
    rows.append(f'\n{len(results)} event(s) match.')
    return _emit(st, '\n'.join(rows))


def _do_alerts(st) -> CommandResult:
    st['alerts_reviewed'] = True
    lines = ['FIRED ALERTS — triage each one before acting:']
    for a in ALERTS:
        lines.append(f"  {a['id']}  [{a['severity'].upper():<8}] {a['name']}")
        lines.append(f"         {a['summary']}")
    lines.append('\nDrill into one: alert <id>   (e.g. alert A-101)')
    return _emit(st, '\n'.join(lines))


def _do_alert(st, aid: str) -> CommandResult:
    st['alerts_reviewed'] = True
    a = next((x for x in ALERTS if x['id'].lower() == aid.lower()), None)
    if not a:
        return _emit(st, f'No alert {aid}. Use `alerts` to list fired alerts.')
    ent = a['entity']
    related = [e for e in EVENTS
               if ent.lower() in (e['host'] + ' ' + e['src_ip'] + ' ' + e['dst_ip'] + ' ' + e['user']).lower()]
    lines = [
        f"{a['id']}  [{a['severity'].upper()}] {a['name']}",
        f'  rule: {a["logic"]}',
        f'  summary: {a["summary"]}',
        '',
        f'  related events ({len(related)}):',
    ]
    for e in related[:8]:
        lines.append('    ' + _row(e))
    if len(related) > 8:
        lines.append(f'    ... and {len(related) - 8} more — pivot with: search entity={ent}')
    return _emit(st, '\n'.join(lines))


def _do_timeline(st, entity: str) -> CommandResult:
    ent = entity.strip()
    if not ent:
        return _emit(st, 'Usage: timeline <host|ip|user>   (e.g. timeline ws-finance01)')
    evs = [e for e in EVENTS
           if ent.lower() in (e['host'] + ' ' + e['src_ip'] + ' ' + e['dst_ip'] + ' ' + e['user']).lower()]
    if not evs:
        return _emit(st, f'No events found for "{ent}".')
    if ent not in st['timelines_built']:
        st['timelines_built'].append(ent)
    low = ent.lower()
    if low in {x.lower() for x in RDP_CHAIN_ENTITIES}:
        st['lateral_movement_seen'] = True
    if low in {x.lower() for x in EXFIL_ENTITIES}:
        st['dns_tunnel_scoped'] = True
    if low in {x.lower() for x in MALWARE_ENTITIES}:
        st['malware_chain_seen'] = True
    lines = [f'TIMELINE for {ent} ({len(evs)} events, oldest first):']
    for e in evs[:40]:
        lines.append(_row(e))
    if len(evs) > 40:
        lines.append(f'... and {len(evs) - 40} more')
    return _emit(st, '\n'.join(lines))


def _do_hunt(st, value: str) -> CommandResult:
    value = value.strip()
    if not value:
        return _emit(st, 'Usage: hunt ioc <ip|domain|hash>   (e.g. hunt ioc 203.0.113.99)')
    if value not in st['tracked_iocs']:
        st['tracked_iocs'].append(value)
    hits = [e for e in EVENTS if value.lower() in ' '.join(str(x) for x in e.values()).lower()]
    lines = [f'Hunting "{value}" across {len(EVENTS)} events: {len(hits)} hit(s).']
    for e in hits[:10]:
        lines.append('  ' + _row(e))
    if len(hits) > 10:
        lines.append(f'  ... and {len(hits) - 10} more')
    if hits:
        lines.append(f'\nRecorded "{value}" as a tracked IOC.')
    else:
        lines.append(f'\nNo evidence for "{value}" in the logs — weak basis for an IOC. Keep hunting.')
    return _emit(st, '\n'.join(lines))


def _do_isolate(st, host: str) -> CommandResult:
    host = host.strip()
    if not host:
        return _emit(st, 'Usage: isolate <hostname>   (e.g. isolate ws-finance01)')
    if host not in KNOWN_HOSTS:
        return _emit(st, f'Unknown host "{host}". Known hosts: {", ".join(KNOWN_HOSTS)}')
    if host in st['isolated_hosts']:
        return _emit(st, f'{host} is already isolated.')
    st['isolated_hosts'].append(host)
    done = len(st['isolated_hosts'])
    return _emit(st, f'{host}: network isolation applied (simulated EDR action).\n'
                     f'Isolated hosts ({done}): {", ".join(st["isolated_hosts"])}')


def _do_stats(st) -> CommandResult:
    by_type: dict[str, int] = {}
    by_src: dict[str, int] = {}
    for e in EVENTS:
        by_type[e['event_type']] = by_type.get(e['event_type'], 0) + 1
        by_src[e['src_ip']] = by_src.get(e['src_ip'], 0) + 1
    lines = [f'Log store: {len(EVENTS)} events · {len(ALERTS)} fired alerts · {st["searches"]} searches run',
             '', 'Events by type:']
    for t, n in sorted(by_type.items(), key=lambda kv: -kv[1]):
        lines.append(f'  {t:<18} {n}')
    lines.append('')
    lines.append('Top sources:')
    for s, n in sorted(by_src.items(), key=lambda kv: -kv[1])[:6]:
        lines.append(f'  {s:<15} {n} events')
    return _emit(st, '\n'.join(lines))


def _report_prereqs(st) -> list[str]:
    missing = []
    iocs = st['tracked_iocs']
    have = sum([RDP_ATTACKER in iocs, C2_IP in iocs,
                any(DNS_TUNNEL_DOMAIN in i for i in iocs)])
    if have < 3:
        missing.append(f'attacker IOCs tracked ({have}/3: RDP source, C2 IP, tunneling domain)')
    iso = set(st['isolated_hosts'])
    not_iso = [h for h in COMPROMISED_HOSTS if h not in iso]
    if not_iso:
        missing.append(f'hosts still unisolated: {", ".join(not_iso)}')
    return missing


def _do_report(st) -> CommandResult:
    missing = _report_prereqs(st)
    if missing:
        return _emit(st, 'Report blocked — the investigation is incomplete:\n'
                         + '\n'.join(f'  - {m}' for m in missing)
                         + '\n\nFinish scoping and containment first, then run `report`.')
    st['report_generated'] = True
    lines = [
        'INCIDENT REPORT — IR-2026-1011 (simulated)',
        '=' * 60,
        'Scope: 3 intrusion chains investigated; 4 hosts compromised; all contained.',
        '',
        'Chain 1 — RDP brute-force + lateral movement',
        f'  Attacker IP : {RDP_ATTACKER}',
        f'  Entry       : {RDP_HOST} ({RDP_IP}) via RDP as j.chen (12 failures, then success)',
        f'  Escalation  : credential dumping (procdump64.exe -ma lsass.exe)',
        f'  Lateral     : SMB + RDP to {LATERAL_HOST} ({LATERAL_IP}), encoded PowerShell payload',
        '',
        'Chain 2 — DNS tunneling exfiltration',
        f'  Host        : {EXFIL_HOST} ({EXFIL_IP})',
        f'  Domain      : *.{DNS_TUNNEL_DOMAIN} (2,143 TXT queries in 12 min)',
        '',
        'Chain 3 — Phishing -> malware -> C2',
        f'  Host        : {MALWARE_HOST} ({MALWARE_IP}), user m.diallo',
        '  Vector      : invoice_update.exe via phishing email, scheduled-task persistence',
        f'  C2          : {C2_IP}:443, ~5 min beacons (UA InvoiceUpdater/1.0)',
        '',
        f'Containment : {", ".join(COMPROMISED_HOSTS)} isolated.',
        'Next steps  : credential reset for j.chen, reimage hosts, block IOCs at perimeter,',
        '              user awareness follow-up for m.diallo.',
    ]
    return _emit(st, '\n'.join(lines))


def _help() -> str:
    return (
        'SIEM workbench:\n'
        '  alerts                    list fired detection alerts (start here)\n'
        '  alert <id>                alert detail + related events (e.g. alert A-101)\n'
        '  search <query>            KQL-like search: field=value pairs and/or free text\n'
        '                            fields: src_ip, dst_ip, host, user, event_type, severity,\n'
        '                            process, domain, message — or entity=<host|ip|user>\n'
        '                            e.g. search event_type=rdp_auth_failure\n'
        '                                 search entity=ws-finance01 lateral\n'
        '  timeline <entity>         chronological view for a host, IP, or user\n'
        '  hunt ioc <value>          track an IP/domain as an attacker IOC\n'
        '  isolate <host>            simulated EDR network isolation of a host\n'
        '  stats                     log-store summary\n'
        '  report                    generate the incident report (needs findings + containment)\n'
        '  help | clear'
    )


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get('_siem')) if findings.get('_siem') else _fresh()
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

    if cmd == 'alerts':
        return _do_alerts(st)
    if cmd == 'alert':
        return _do_alert(st, args[0] if args else '')
    if cmd == 'search':
        if not args:
            return _emit(st, 'Usage: search <query>   (e.g. search event_type=dns_query TXT)')
        return _do_search(st, ' '.join(args))
    if cmd == 'timeline':
        return _do_timeline(st, args[0] if args else '')
    if cmd == 'hunt':
        if len(args) >= 2 and args[0].lower() == 'ioc':
            return _do_hunt(st, ' '.join(args[1:]))
        return _emit(st, 'Usage: hunt ioc <ip|domain|hash>')
    if cmd == 'isolate':
        return _do_isolate(st, args[0] if args else '')
    if cmd == 'stats':
        return _do_stats(st)
    if cmd == 'report':
        return _do_report(st)
    return _emit(st, f'{cmd}: command not found (try: alerts, search, timeline, hunt ioc, isolate, report, help)')
