"""A simulated Cisco IOS shell for the switching/routing labs.

Stateful and mode-aware (user -> privileged -> global config -> vlan/interface/subinterface), and
multi-device: the learner consoles between devices with `connect <name>`. It EXECUTES NOTHING — it is
a deterministic model of IOS. Configuration accumulates in the session findings under `_ios`; after
each command the lab's topology derives the outcome `config` flags the validators read, so building
the network correctly is what completes the objectives. `ping` and `show` reflect that live state, so
verification is real.
"""
from __future__ import annotations

import copy
import re
from typing import Any

from labs.providers.base import CommandResult
from labs.topologies import fresh_state, topology_for

INVALID = "% Invalid input detected"
INCOMPLETE = "% Incomplete command"

#: This shell lets the learner `connect` between devices, so the workspace shows console tabs.
multi_device = True


def _dev(state: dict[str, Any]) -> dict[str, Any]:
    return state['dev'][state['current']]


def _prompt(state: dict[str, Any]) -> str:
    dev = _dev(state)
    host = dev['host']
    if dev['kind'] == 'pc':
        return f'{host}$ '
    return {
        'user': f'{host}> ', 'priv': f'{host}# ', 'config': f'{host}(config)# ',
        'vlan': f'{host}(config-vlan)# ', 'if': f'{host}(config-if)# ', 'subif': f'{host}(config-subif)# ',
        'router': f'{host}(config-router)# ',
    }.get(state['mode'], f'{host}> ')


def _norm_if(name: str) -> str | None:
    m = re.match(r'^([a-zA-Z]*)(\d+(?:/\d+)*(?:\.\d+)?)$', name)
    if not m:
        return None
    letters, num = m.group(1).lower(), m.group(2)
    if letters.startswith('f'):
        pfx = 'Fa'          # fa, fast, fastethernet
    elif letters.startswith('et'):
        pfx = 'Et'          # et, ethernet
    else:
        pfx = 'Gi'          # default and any gigabit spelling (g, gi, gig, gigabitethernet)
    return f'{pfx}{num}'


def _parse_acl_rule(action: str, rest: list[str]) -> dict[str, Any] | None:
    """Parse a standard-ACL matcher: `any`, `host <ip>`, `<ip>`, or `<net> <wildcard>`."""
    if not rest:
        return None
    head = rest[0].lower()
    if head == 'any':
        return {'action': action, 'kind': 'any'}
    if head == 'host' and len(rest) >= 2:
        return {'action': action, 'kind': 'host', 'ip': rest[1]}
    if len(rest) >= 2:
        return {'action': action, 'kind': 'net', 'net': rest[0], 'wc': rest[1]}
    return {'action': action, 'kind': 'host', 'ip': rest[0]}


def initial_prompt(lab) -> str:
    return _prompt(fresh_state(lab.id))


def banner(lab) -> list[str]:
    topo = topology_for(lab.id)
    devices = ', '.join(topo['devices'].keys()) if topo else ''
    return [
        'Road to CISSP - simulated Cisco IOS console   (safe: nothing is really executed)',
        (topo or {}).get('summary', ''),
        f'Devices: {devices}. Switch console with e.g. "connect R1". Type "?" for commands, "help" for a walkthrough.',
    ]


# --------------------------------------------------------------------------------------------------
# command handling
# --------------------------------------------------------------------------------------------------

def _emit(lab, state, output, clear=False) -> CommandResult:
    derived = topology_for(lab.id)['derive'](state)
    return CommandResult(output=output, findings={'_ios': state, 'config': derived},
                         prompt=_prompt(state), clear=clear)


def _match(tokens, *prefixes) -> bool:
    """Cisco-style abbreviation match: each given full word may be shortened by the learner."""
    if len(tokens) < len(prefixes):
        return False
    return all(full.startswith(tok.lower()) and len(tok) >= 1 for tok, full in zip(tokens, prefixes))


def _connect(lab, state, tokens) -> CommandResult:
    if len(tokens) < 2:
        return _emit(lab, state, 'Usage: connect <device>   e.g. connect R1')
    want = tokens[1].lower()
    target = next((k for k, d in state['dev'].items() if k.lower() == want or d['host'].lower() == want), None)
    if target is None:
        return _emit(lab, state, f'% Unknown device "{tokens[1]}". Devices: {", ".join(state["dev"])}')
    state['current'] = target
    state['mode'] = 'user'
    state['ctx'] = {}
    dev = state['dev'][target]
    note = 'PC command line.' if dev['kind'] == 'pc' else 'Press enter, then `enable` for privileged mode.'
    return _emit(lab, state, f'[Connected to {dev["host"]} console] {note}')


# Per-lab walkthroughs for the `help` command. The shell is shared by six labs, so the
# help text must follow the lab being run, not a single hardcoded scenario.
_HELP_WALKTHROUGHS = {
    'net-vlan-001': (
        'Walkthrough (switch SW1): enable | configure terminal | vlan 10 | name SALES | exit | '
        'interface gi0/1 | switchport mode access | switchport access vlan 10 | exit | '
        'interface gi0/24 | switchport mode trunk | end | show vlan brief\n'
        'Router R1 (router-on-a-stick): interface gi0/0 | no shutdown | exit | interface gi0/0.10 | '
        'encapsulation dot1q 10 | ip address 192.168.10.1 255.255.255.0 | exit ...\n'
        'Verify: connect PC1 | ping 192.168.20.10.   Switch devices with connect <name>.'
    ),
    'net-static-routing-001': (
        'Walkthrough (router R1): enable | configure terminal | interface gi0/0 | '
        'ip address 192.168.1.1 255.255.255.0 | no shutdown | exit | interface gi0/1 | '
        'ip address 10.0.0.1 255.255.255.252 | no shutdown | exit | '
        'ip route 192.168.2.0 255.255.255.0 10.0.0.2 | end\n'
        'Router R2: interface gi0/0 | ip address 192.168.2.1 255.255.255.0 | no shutdown | exit | '
        'interface gi0/1 | ip address 10.0.0.2 255.255.255.252 | no shutdown | exit | '
        'ip route 192.168.1.0 255.255.255.0 10.0.0.1 | end\n'
        'Verify: show ip route on each router, then connect PC1 | ping 192.168.2.10.'
    ),
    'net-acl-001': (
        'Walkthrough (router R1): enable | configure terminal | access-list 10 deny host 192.168.1.20 | '
        'access-list 10 permit any | exit | interface gi0/1 | ip access-group 10 out | end\n'
        'Remember: an ACL ends with an implicit deny, so "permit any" is required or nobody gets through. '
        'Standard ACLs go near the destination.\n'
        'Verify: connect GUEST | ping 192.168.2.10 (should fail); connect PC1 | ping 192.168.2.10 (should work).'
    ),
    'net-ospf-001': (
        'Walkthrough (router R1): enable | configure terminal | router ospf 1 | '
        'network 192.168.1.0 0.0.0.255 area 0 | network 10.0.12.0 0.0.0.255 area 0 | end\n'
        'Router R2: router ospf 1 | advertise 10.0.12.0 and 10.0.23.0 in area 0.\n'
        'Router R3: router ospf 1 | advertise 10.0.23.0 and the server LAN 192.168.3.0 in area 0.\n'
        'Verify: show ip ospf neighbor — R1-R2 and R2-R3 should reach FULL. Then connect PC-A | ping 192.168.3.10.'
    ),
    'net-ospf-tshoot-001': (
        'Troubleshooting walkthrough: OSPF is configured but PC-A cannot reach Server-A. '
        'An adjacency never forms, so hunt it down: on each router run show ip ospf neighbor, '
        'show ip protocols and show running-config.\n'
        'The fault is on R2: the 10.0.23.0 link network was advertised in the wrong area. '
        'Fix it with: configure terminal | router ospf 1 | no network <old entry> | '
        'network 10.0.23.0 0.0.0.255 area 0 | end\n'
        'Verify: show ip ospf neighbor on R2 lists both R1 and R3 as FULL; connect PC-A | ping 192.168.3.10.'
    ),
    'net-bgp-001': (
        'Walkthrough (router R1, AS 65001): enable | configure terminal | router bgp 65001 | '
        'neighbor 192.0.2.2 remote-as 65002 | network 10.1.1.0 mask 255.255.255.0 | end\n'
        'Router R2 (AS 65002): router bgp 65002 | neighbor 192.0.2.1 remote-as 65001 | '
        'network 10.2.2.0 mask 255.255.255.0 | end\n'
        'Verify: show ip bgp summary — the neighbor should be Established. Then connect PC1 | ping 10.2.2.10.'
    ),
}

_GENERIC_IOS_HELP = (
    'IOS basics: enable | configure terminal | interface <name> | ip address <ip> <mask> | '
    'no shutdown | exit | end. Useful show commands: show ip interface brief, show ip route, '
    'show running-config. Switch devices with connect <name>.'
)


def _help(lab, state) -> str:
    dev = _dev(state)
    if dev['kind'] == 'pc':
        return 'PC commands: ping <ip>, ipconfig, connect <device>, clear'
    return _HELP_WALKTHROUGHS.get(getattr(lab, 'id', ''), _GENERIC_IOS_HELP)


def _pc_command(lab, state, tokens) -> CommandResult:
    dev = _dev(state)
    cmd = tokens[0].lower()
    if cmd == 'ping' and len(tokens) >= 2:
        return _ping(lab, state, tokens[1], pc=True)
    if cmd in ('ipconfig', 'ifconfig', 'ip'):
        return _emit(lab, state, f'{dev["host"]}\n  IPv4 Address. . . : {dev["ip"]}\n  Subnet Mask . . . : {dev["mask"]}\n  Default Gateway. . : {dev["gw"]}')
    if cmd == 'ping':
        return _emit(lab, state, 'Usage: ping <ip>')
    return _emit(lab, state, f'{cmd}: command not found (this is a PC — try `ping <ip>` or `ipconfig`)')


def _ping(lab, state, ip, pc=False) -> CommandResult:
    known, ok, name = topology_for(lab.id)['ping'](state, state['current'], ip)
    if pc:
        if not known:
            body = f'Pinging {ip} ...\n' + '\n'.join(['Request timed out.'] * 4)
        elif ok:
            body = f'Pinging {ip} [{name}] with 32 bytes of data:\n' + '\n'.join([f'Reply from {ip}: bytes=32 time<1ms TTL=128'] * 4) + '\n\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)'
        else:
            body = f'Pinging {ip} ...\n' + '\n'.join(['Request timed out.'] * 4) + '\n\n    Packets: Sent = 4, Received = 4, Lost = 4 (100% loss)'
        return _emit(lab, state, body)
    # IOS-style
    head = f'Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to {ip}, timeout is 2 seconds:'
    if ok:
        body = f'{head}\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/1/4 ms'
    else:
        body = f'{head}\n.....\nSuccess rate is 0 percent (0/5)'
    return _emit(lab, state, body)


def _show(lab, state, tokens) -> CommandResult:
    dev = _dev(state)
    rest = ' '.join(t.lower() for t in tokens[1:])
    # The topology may answer dynamic-routing shows (ospf/eigrp/bgp neighbors, ip protocols) and even
    # override `ip route` with learned routes, since adjacency state lives in its derive logic.
    topo = topology_for(lab.id)
    if topo and topo.get('show'):
        out = topo['show'](state, state['current'], rest)
        if out is not None:
            return _emit(lab, state, out)
    if rest.startswith('vlan'):
        if dev['kind'] != 'switch':
            return _emit(lab, state, INVALID)
        lines = ['VLAN Name                             Status    Ports',
                 '---- -------------------------------- --------- -------------------------------']
        vlans = dev['vlans']
        # default VLAN 1 plus any created.
        allv = {1: {'name': 'default'}, **vlans}
        for vid in sorted(allv):
            ports = [n for n, i in dev['if'].items() if i.get('mode') == 'access' and i.get('vlan') == vid]
            name = allv[vid].get('name') or f'VLAN{vid:04d}'
            lines.append(f'{vid:<4} {name:<32} active    {", ".join(ports)}')
        return _emit(lab, state, '\n'.join(lines))
    if rest.startswith('ip route') or rest.startswith('ip rou'):
        if dev['kind'] != 'router':
            return _emit(lab, state, INVALID)
        lines = ['Codes: C - connected, S - static', '']
        for n, i in dev['if'].items():
            if i.get('ip') and i.get('up'):
                lines.append(f'C    {i["ip"]} is directly connected, {n}')
        for net, mask, nh in dev['routes']:
            lines.append(f'S    {net} [1/0] via {nh}')
        return _emit(lab, state, '\n'.join(lines))
    if rest.startswith('ip int') or rest.startswith('ip interface'):
        lines = ['Interface              IP-Address      OK? Method Status                Protocol']
        allif = {**dev.get('if', {}), **dev.get('subif', {})}
        for n in sorted(allif):
            i = allif[n]
            ipaddr = i.get('ip', 'unassigned')
            status = 'up' if i.get('up', dev['kind'] == 'switch') else 'administratively down'
            proto = 'up' if i.get('up', dev['kind'] == 'switch') else 'down'
            lines.append(f'{n:<22} {ipaddr:<15} YES manual {status:<21} {proto}')
        return _emit(lab, state, '\n'.join(lines))
    if rest.startswith('access-list'):
        acls = dev.get('acls', {})
        if not acls:
            return _emit(lab, state, '')
        lines = []
        for num in sorted(acls):
            lines.append(f'Standard IP access list {num}')
            for r in acls[num]:
                matcher = 'any' if r['kind'] == 'any' else (f'host {r["ip"]}' if r['kind'] == 'host' else f'{r["net"]} {r["wc"]}')
                lines.append(f'    {r["action"]} {matcher}')
        return _emit(lab, state, '\n'.join(lines))
    if rest.startswith('run') or rest.startswith('running'):
        return _emit(lab, state, _running_config(dev))
    return _emit(lab, state, INVALID)


def _running_config(dev) -> str:
    lines = [f'hostname {dev["host"]}', '!']
    if dev['kind'] == 'switch':
        for vid in sorted(dev['vlans']):
            lines += [f'vlan {vid}', f' name {dev["vlans"][vid].get("name", "")}'.rstrip(), '!']
        for n in sorted(dev['if']):
            i = dev['if'][n]
            lines.append(f'interface {n}')
            if i.get('mode') == 'access':
                lines += [' switchport mode access', f' switchport access vlan {i.get("vlan", 1)}']
            elif i.get('mode') == 'trunk':
                lines.append(' switchport mode trunk')
            lines.append('!')
    else:
        for n in sorted({**dev['if'], **dev['subif']}):
            i = {**dev['if'], **dev['subif']}[n]
            lines.append(f'interface {n}')
            if i.get('dot1q'):
                lines.append(f' encapsulation dot1Q {i["dot1q"]}')
            if i.get('ip'):
                lines.append(f' ip address {i["ip"]} {i.get("mask", "255.255.255.0")}')
            if not i.get('up', True):
                lines.append(' shutdown')
            lines.append('!')
        for net, mask, nh in dev['routes']:
            lines.append(f'ip route {net} {mask} {nh}')
    lines.append('end')
    return '\n'.join(lines)


def _ios_command(lab, state, tokens) -> CommandResult:
    mode = state['mode']
    dev = _dev(state)
    cmd = tokens[0].lower()
    low = [t.lower() for t in tokens]

    # Available from most modes.
    if cmd in ('ping',) and len(tokens) >= 2:
        return _ping(lab, state, tokens[1])
    if _match(low, 'show') or cmd == 'sh':
        return _show(lab, state, tokens)
    if low[0] == 'do' and len(tokens) >= 2:  # run exec commands from config modes
        sub = tokens[1:]
        if sub[0].lower() == 'ping' and len(sub) >= 2:
            return _ping(lab, state, sub[1])
        if sub[0].lower() in ('show', 'sh'):
            return _show(lab, state, sub)
        return _emit(lab, state, INVALID)
    if cmd == 'end':
        state['mode'] = 'priv' if mode != 'user' else 'user'
        state['ctx'] = {}
        return _emit(lab, state, '')

    if mode == 'user':
        if _match(low, 'enable'):
            state['mode'] = 'priv'
            return _emit(lab, state, '')
        if cmd in ('exit', 'logout', 'quit'):
            return _emit(lab, state, '')
        return _emit(lab, state, INVALID)

    if mode == 'priv':
        if _match(low, 'configure', 'terminal') or _match(low, 'configure') or cmd == 'config':
            state['mode'] = 'config'
            return _emit(lab, state, 'Enter configuration commands, one per line. End with CNTL/Z.')
        if _match(low, 'disable') or cmd == 'exit':
            state['mode'] = 'user'
            return _emit(lab, state, '')
        if _match(low, 'write') or _match(low, 'copy', 'running-config'):
            return _emit(lab, state, 'Building configuration...\n[OK]')
        return _emit(lab, state, INVALID)

    if mode == 'config':
        return _config_command(lab, state, dev, tokens, low)

    if mode == 'vlan':
        if _match(low, 'name') and len(tokens) >= 2:
            dev['vlans'][state['ctx']['vlan']]['name'] = tokens[1]
            return _emit(lab, state, '')
        if cmd == 'exit':
            state['mode'] = 'config'
            return _emit(lab, state, '')
        return _emit(lab, state, INVALID)

    if mode in ('if', 'subif'):
        return _if_command(lab, state, dev, tokens, low)

    if mode == 'router':
        return _router_command(lab, state, dev, tokens, low)

    return _emit(lab, state, INVALID)


def _config_command(lab, state, dev, tokens, low) -> CommandResult:
    cmd = low[0]
    if _match(low, 'hostname') and len(tokens) >= 2:
        dev['host'] = tokens[1]
        return _emit(lab, state, '')
    if cmd == 'vlan' and len(tokens) >= 2 and tokens[1].isdigit():
        if dev['kind'] != 'switch':
            return _emit(lab, state, INVALID)
        vid = int(tokens[1])
        dev['vlans'].setdefault(vid, {'name': None})
        state['mode'] = 'vlan'
        state['ctx'] = {'vlan': vid}
        return _emit(lab, state, '')
    if low[:2] == ['no', 'vlan'] and len(tokens) >= 3 and tokens[2].isdigit():
        dev['vlans'].pop(int(tokens[2]), None)
        return _emit(lab, state, '')
    if _match(low, 'interface') and len(tokens) >= 2:
        name = _norm_if(tokens[1])
        if not name:
            return _emit(lab, state, INVALID)
        if '.' in name:
            dev.setdefault('subif', {}).setdefault(name, {'up': True})
            state['mode'] = 'subif'
        else:
            dev.setdefault('if', {}).setdefault(name, {})
            state['mode'] = 'if'
        state['ctx'] = {'if': name}
        return _emit(lab, state, '')
    if low[:2] == ['ip', 'route'] and len(tokens) >= 5:
        if dev['kind'] != 'router':
            return _emit(lab, state, INVALID)
        dev['routes'].append((tokens[2], tokens[3], tokens[4]))
        return _emit(lab, state, '')
    if cmd == 'access-list' and len(tokens) >= 3 and tokens[1].isdigit():
        if dev['kind'] != 'router':
            return _emit(lab, state, INVALID)
        if low[2] not in ('permit', 'deny'):
            return _emit(lab, state, INVALID)
        rule = _parse_acl_rule(low[2], tokens[3:])
        if rule is None:
            return _emit(lab, state, INVALID)
        dev.setdefault('acls', {}).setdefault(int(tokens[1]), []).append(rule)
        return _emit(lab, state, '')
    if cmd == 'router' and len(tokens) >= 3 and tokens[2].isdigit():
        if dev['kind'] != 'router':
            return _emit(lab, state, INVALID)
        proto, num = low[1], int(tokens[2])
        if proto == 'ospf':
            dev.setdefault('ospf', {'pid': num, 'networks': [], 'passive': []})
        elif proto == 'eigrp':
            dev.setdefault('eigrp', {'asn': num, 'networks': [], 'passive': []})
        elif proto == 'bgp':
            dev.setdefault('bgp', {'asn': num, 'neighbors': [], 'networks': []})
        else:
            return _emit(lab, state, INVALID)
        state['mode'] = 'router'
        state['ctx'] = {'proto': proto}
        return _emit(lab, state, '')
    if cmd == 'exit':
        state['mode'] = 'priv'
        return _emit(lab, state, '')
    return _emit(lab, state, INVALID)


def _router_command(lab, state, dev, tokens, low) -> CommandResult:
    proto = state['ctx'].get('proto')
    cmd = low[0]
    if cmd == 'network' and len(tokens) >= 2:
        if proto == 'ospf':
            if len(tokens) >= 5 and low[3] == 'area':
                dev['ospf']['networks'].append((tokens[1], tokens[2], tokens[4]))
                return _emit(lab, state, '')
            return _emit(lab, state, INCOMPLETE)
        if proto == 'eigrp':
            wc = tokens[2] if len(tokens) >= 3 and not tokens[2].startswith('a') else None
            dev['eigrp']['networks'].append((tokens[1], wc))
            return _emit(lab, state, '')
        if proto == 'bgp':
            mask = tokens[3] if len(tokens) >= 4 and low[2] == 'mask' else None
            dev['bgp']['networks'].append((tokens[1], mask))
            return _emit(lab, state, '')
    if proto == 'bgp' and cmd == 'neighbor' and len(tokens) >= 4 and low[2] == 'remote-as' and tokens[3].isdigit():
        dev['bgp']['neighbors'].append({'ip': tokens[1], 'remote_as': int(tokens[3])})
        return _emit(lab, state, '')
    if proto == 'ospf' and _match(low, 'router-id') and len(tokens) >= 2:
        dev['ospf']['router_id'] = tokens[1]
        return _emit(lab, state, '')
    if _match(low, 'passive-interface') and len(tokens) >= 2 and proto in ('ospf', 'eigrp'):
        nm = _norm_if(tokens[1])
        if nm:
            dev[proto].setdefault('passive', []).append(nm)
        return _emit(lab, state, '')
    if low[:2] == ['no', 'auto-summary'] or _match(low, 'auto-summary'):
        return _emit(lab, state, '')
    if cmd == 'exit':
        state['mode'] = 'config'
        state['ctx'] = {}
        return _emit(lab, state, '')
    return _emit(lab, state, INVALID)


def _if_command(lab, state, dev, tokens, low) -> CommandResult:
    name = state['ctx'].get('if')
    store = dev['subif'] if state['mode'] == 'subif' else dev['if']
    iface = store.setdefault(name, {} if state['mode'] != 'subif' else {'up': True})
    cmd = low[0]

    if cmd in ('switchport', 'sw'):
        if dev['kind'] != 'switch':
            return _emit(lab, state, INVALID)
        if _match(low[1:], 'mode', 'access'):
            iface['mode'] = 'access'
        elif _match(low[1:], 'mode', 'trunk'):
            iface['mode'] = 'trunk'
        elif _match(low[1:], 'access', 'vlan') and len(tokens) >= 4 and tokens[3].isdigit():
            iface['mode'] = iface.get('mode', 'access')
            iface['vlan'] = int(tokens[3])
        elif low[1:2] == ['trunk']:
            iface['mode'] = 'trunk'  # accept `switchport trunk encapsulation dot1q` / `allowed vlan ...`
        else:
            return _emit(lab, state, INVALID)
        return _emit(lab, state, '')

    if low[:2] == ['ip', 'access-group'] and len(tokens) >= 4 and tokens[2].isdigit() and low[3] in ('in', 'out'):
        iface[f'acl_{low[3]}'] = int(tokens[2])
        return _emit(lab, state, '')
    if _match(low, 'encapsulation') and len(tokens) >= 3 and tokens[2].isdigit():
        iface['dot1q'] = int(tokens[2])
        return _emit(lab, state, '')
    if low[:2] == ['ip', 'address'] and len(tokens) >= 4:
        iface['ip'] = tokens[2]
        iface['mask'] = tokens[3]
        return _emit(lab, state, '')
    if low[:2] == ['no', 'shutdown'] or (low[0] == 'no' and low[1:2] == ['shut']):
        iface['up'] = True
        return _emit(lab, state, '')
    if cmd in ('shutdown', 'shut'):
        iface['up'] = False
        return _emit(lab, state, '')
    if cmd == 'exit':
        state['mode'] = 'config'
        state['ctx'] = {}
        return _emit(lab, state, '')
    return _emit(lab, state, INVALID)


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    topo = topology_for(lab.id)
    if topo is None:
        return CommandResult(output='This lab has no device console.', exit_code=127)
    state = copy.deepcopy(findings.get('_ios')) if findings.get('_ios') else fresh_state(lab.id)
    raw = (command or '').strip()
    if not raw:
        return _emit(lab, state, '')
    if len(raw) > 512:
        return _emit(lab, state, '% Command too long')
    tokens = raw.split()
    cmd = tokens[0].lower()
    if cmd in ('clear', 'cls'):
        return _emit(lab, state, '', clear=True)
    if cmd in ('connect', 'console', 'open'):
        return _connect(lab, state, tokens)
    if cmd in ('?', 'help'):
        return _emit(lab, state, _help(lab, state))
    if _dev(state)['kind'] == 'pc':
        return _pc_command(lab, state, tokens)
    return _ios_command(lab, state, tokens)
