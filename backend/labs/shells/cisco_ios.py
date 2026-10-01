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


def _help(lab, state) -> str:
    dev = _dev(state)
    if dev['kind'] == 'pc':
        return 'PC commands: ping <ip>, ipconfig, connect <device>, clear'
    return (
        'Walkthrough (switch SW1): enable | configure terminal | vlan 10 | name SALES | exit | '
        'interface gi0/1 | switchport mode access | switchport access vlan 10 | exit | '
        'interface gi0/24 | switchport mode trunk | end | show vlan brief\n'
        'Router R1 (router-on-a-stick): interface gi0/0 | no shutdown | exit | interface gi0/0.10 | '
        'encapsulation dot1q 10 | ip address 192.168.10.1 255.255.255.0 | exit ...\n'
        'Verify: connect PC1 | ping 192.168.20.10.   Switch devices with connect <name>.'
    )


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
    if cmd == 'exit':
        state['mode'] = 'priv'
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
