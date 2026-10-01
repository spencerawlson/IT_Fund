"""Device topologies for the Cisco IOS labs.

Each topology describes the devices a learner can console into, the fresh (unconfigured) state the
shell starts from, and two pure functions:

- ``derive(state)`` -> the ``config`` booleans the outcome validators check (labs/validators.py),
  computed from the current device configuration. This is where "is this actually configured
  correctly" lives, so the IOS engine stays generic and the validators stay trivial.
- ``ping(state, from_dev, ip)`` -> (known, ok, hostname): whether the address is part of the lab,
  whether it is reachable given the current config, and the friendly name — so `ping` teaches.

Nothing here executes anything; it is a deterministic model of what a correct lab looks like.
"""
from __future__ import annotations

import copy
from typing import Any


# --------------------------------------------------------------------------------------------------
# VLANs & Inter-VLAN Routing (router-on-a-stick): PC1 & PC2 on SW1, SW1 trunks to R1, R1 routes.
# --------------------------------------------------------------------------------------------------

_VLAN_DEVICES = {
    'SW1': {'kind': 'switch', 'host': 'SW1', 'vlans': {}, 'if': {}},
    'R1': {'kind': 'router', 'host': 'R1', 'if': {}, 'subif': {}, 'routes': []},
    'PC1': {'kind': 'pc', 'host': 'PC1', 'ip': '192.168.10.10', 'mask': '255.255.255.0', 'gw': '192.168.10.1', 'vlan': 10},
    'PC2': {'kind': 'pc', 'host': 'PC2', 'ip': '192.168.20.10', 'mask': '255.255.255.0', 'gw': '192.168.20.1', 'vlan': 20},
}

_VLAN_IPS = {'192.168.10.1': 'R1 (VLAN10 gateway)', '192.168.20.1': 'R1 (VLAN20 gateway)',
             '192.168.10.10': 'PC1', '192.168.20.10': 'PC2'}


def _vlan_ready(state: dict[str, Any], vid: int) -> bool:
    """Whether a whole VLAN path is up: VLAN exists, its access port is set, the trunk is up, and
    the router subinterface for it is addressed on an enabled physical interface."""
    sw = state['dev']['SW1']
    r = state['dev']['R1']
    ifs = sw['if']
    access_port = 'Gi0/1' if vid == 10 else 'Gi0/2'
    subif = 'Gi0/0.10' if vid == 10 else 'Gi0/0.20'
    gw = '192.168.10.1' if vid == 10 else '192.168.20.1'
    vlan_ok = vid in sw['vlans']
    access_ok = ifs.get(access_port, {}).get('mode') == 'access' and ifs.get(access_port, {}).get('vlan') == vid
    trunk_ok = ifs.get('Gi0/24', {}).get('mode') == 'trunk'
    g0_up = r['if'].get('Gi0/0', {}).get('up', False)
    s = r['subif'].get(subif, {})
    subif_ok = s.get('dot1q') == vid and s.get('ip') == gw
    return vlan_ok and access_ok and trunk_ok and g0_up and subif_ok


def derive_vlan(state: dict[str, Any]) -> dict[str, bool]:
    sw = state['dev']['SW1']
    ifs = sw['if']
    r = state['dev']['R1']
    vlans_created = 10 in sw['vlans'] and 20 in sw['vlans']
    access_ok = (ifs.get('Gi0/1', {}).get('mode') == 'access' and ifs.get('Gi0/1', {}).get('vlan') == 10
                 and ifs.get('Gi0/2', {}).get('mode') == 'access' and ifs.get('Gi0/2', {}).get('vlan') == 20)
    trunk_ok = ifs.get('Gi0/24', {}).get('mode') == 'trunk'
    g0_up = r['if'].get('Gi0/0', {}).get('up', False)
    s10, s20 = r['subif'].get('Gi0/0.10', {}), r['subif'].get('Gi0/0.20', {})
    router_ok = (g0_up and s10.get('dot1q') == 10 and s10.get('ip') == '192.168.10.1'
                 and s20.get('dot1q') == 20 and s20.get('ip') == '192.168.20.1')
    connectivity = _vlan_ready(state, 10) and _vlan_ready(state, 20)
    return {
        'vlans_created': vlans_created,
        'access_ports_configured': access_ok,
        'trunk_configured': trunk_ok,
        'router_subinterfaces_configured': router_ok,
        'intervlan_connectivity': connectivity,
    }


def ping_vlan(state: dict[str, Any], from_dev: str, ip: str) -> tuple[bool, bool, str]:
    if ip not in _VLAN_IPS:
        return (False, False, ip)
    name = _VLAN_IPS[ip]
    v10, v20 = _vlan_ready(state, 10), _vlan_ready(state, 20)
    target_vlan = 10 if ip in ('192.168.10.1', '192.168.10.10') else 20
    if from_dev == 'R1':
        ok = v10 if target_vlan == 10 else v20
    elif from_dev in ('PC1', 'PC2'):
        src_vlan = state['dev'][from_dev]['vlan']
        ok = (v10 if src_vlan == 10 else v20) if target_vlan == src_vlan else (v10 and v20)
    else:
        ok = v10 if target_vlan == 10 else v20
    return (True, ok, name)


# --------------------------------------------------------------------------------------------------
# Static Routing: two LANs joined by a point-to-point link between R1 and R2.
# --------------------------------------------------------------------------------------------------

_SR_DEVICES = {
    'R1': {'kind': 'router', 'host': 'R1', 'if': {}, 'subif': {}, 'routes': []},
    'R2': {'kind': 'router', 'host': 'R2', 'if': {}, 'subif': {}, 'routes': []},
    'PC1': {'kind': 'pc', 'host': 'PC1', 'ip': '192.168.1.10', 'mask': '255.255.255.0', 'gw': '192.168.1.1', 'vlan': 0},
    'PC2': {'kind': 'pc', 'host': 'PC2', 'ip': '192.168.2.10', 'mask': '255.255.255.0', 'gw': '192.168.2.1', 'vlan': 0},
}

_SR_IPS = {'192.168.1.1': 'R1 (LAN1 gateway)', '192.168.2.1': 'R2 (LAN2 gateway)',
           '10.0.0.1': 'R1 (WAN link)', '10.0.0.2': 'R2 (WAN link)',
           '192.168.1.10': 'PC1', '192.168.2.10': 'PC2'}


def _if_up(dev: dict[str, Any], name: str, ip: str) -> bool:
    s = dev['if'].get(name, {})
    return s.get('up', False) and s.get('ip') == ip


def _has_route(dev: dict[str, Any], net: str, mask: str, nh: str) -> bool:
    return any(r == (net, mask, nh) for r in dev['routes'])


def derive_static(state: dict[str, Any]) -> dict[str, bool]:
    r1, r2 = state['dev']['R1'], state['dev']['R2']
    r1_if = _if_up(r1, 'Gi0/0', '192.168.1.1') and _if_up(r1, 'Gi0/1', '10.0.0.1')
    r2_if = _if_up(r2, 'Gi0/0', '192.168.2.1') and _if_up(r2, 'Gi0/1', '10.0.0.2')
    r1_route = _has_route(r1, '192.168.2.0', '255.255.255.0', '10.0.0.2')
    r2_route = _has_route(r2, '192.168.1.0', '255.255.255.0', '10.0.0.1')
    connectivity = r1_if and r2_if and r1_route and r2_route
    return {
        'r1_interfaces_configured': r1_if,
        'r2_interfaces_configured': r2_if,
        'r1_static_route': r1_route,
        'r2_static_route': r2_route,
        'end_to_end_connectivity': connectivity,
    }


def ping_static(state: dict[str, Any], from_dev: str, ip: str) -> tuple[bool, bool, str]:
    if ip not in _SR_IPS:
        return (False, False, ip)
    d = derive_static(state)
    r1, r2 = state['dev']['R1'], state['dev']['R2']
    local1 = ip in ('192.168.1.1', '192.168.1.10', '10.0.0.1')
    if from_dev == 'PC1':
        ok = d['end_to_end_connectivity'] if not local1 else _if_up(r1, 'Gi0/0', '192.168.1.1')
    elif from_dev == 'PC2':
        ok = d['end_to_end_connectivity'] if local1 else _if_up(r2, 'Gi0/0', '192.168.2.1')
    elif from_dev == 'R1':
        ok = (d['r1_interfaces_configured'] and d['r2_interfaces_configured']) if not local1 else d['r1_interfaces_configured']
        if ip in ('192.168.2.10',):
            ok = d['end_to_end_connectivity']
    else:  # R2
        ok = (d['r1_interfaces_configured'] and d['r2_interfaces_configured']) if local1 else d['r2_interfaces_configured']
        if ip in ('192.168.1.10',):
            ok = d['end_to_end_connectivity']
    return (True, ok, _SR_IPS[ip])


# --------------------------------------------------------------------------------------------------
# Access Control Lists: one router, two LANs, already connected. Filter one host with a standard ACL.
# --------------------------------------------------------------------------------------------------

_ACL_DEVICES = {
    'R1': {'kind': 'router', 'host': 'R1', 'acls': {}, 'subif': {}, 'routes': [], 'if': {
        'Gi0/0': {'ip': '192.168.1.1', 'mask': '255.255.255.0', 'up': True},
        'Gi0/1': {'ip': '192.168.2.1', 'mask': '255.255.255.0', 'up': True},
    }},
    'PC1': {'kind': 'pc', 'host': 'PC1', 'ip': '192.168.1.10', 'mask': '255.255.255.0', 'gw': '192.168.1.1', 'vlan': 0},
    'GUEST': {'kind': 'pc', 'host': 'GUEST', 'ip': '192.168.1.20', 'mask': '255.255.255.0', 'gw': '192.168.1.1', 'vlan': 0},
    'SRV': {'kind': 'pc', 'host': 'SRV', 'ip': '192.168.2.10', 'mask': '255.255.255.0', 'gw': '192.168.2.1', 'vlan': 0},
}

_ACL_IPS = {'192.168.1.1': 'R1 (LAN1 gateway)', '192.168.2.1': 'R1 (Server-LAN gateway)',
            '192.168.1.10': 'PC1 (trusted)', '192.168.1.20': 'GUEST', '192.168.2.10': 'SRV (server)'}


def _wc_match(ip: str, net: str, wc: str) -> bool:
    try:
        for i, n, w in zip(ip.split('.'), net.split('.'), wc.split('.')):
            mask = 255 - int(w)
            if (int(i) & mask) != (int(n) & mask):
                return False
        return True
    except (ValueError, AttributeError):
        return False


def _rule_matches(rule: dict[str, Any], src: str) -> bool:
    if rule['kind'] == 'any':
        return True
    if rule['kind'] == 'host':
        return rule.get('ip') == src
    if rule['kind'] == 'net':
        return _wc_match(src, rule['net'], rule['wc'])
    return False


def _applied_acls(r1: dict[str, Any]) -> list[list[dict]]:
    """ACL rule-lists filtering the host->server path (out on Gi0/1, or in on Gi0/0)."""
    acls = r1.get('acls', {})
    nums = [r1['if'].get('Gi0/1', {}).get('acl_out'), r1['if'].get('Gi0/0', {}).get('acl_in')]
    return [acls[n] for n in nums if n and n in acls]


def _acl_permits(r1: dict[str, Any], src: str) -> bool:
    applied = _applied_acls(r1)
    if not applied:
        return True
    for rules in applied:
        decision = next((r['action'] for r in rules if _rule_matches(r, src)), 'deny')  # implicit deny
        if decision == 'deny':
            return False
    return True


def derive_acl(state: dict[str, Any]) -> dict[str, bool]:
    r1 = state['dev']['R1']
    any_rules = [r for lst in r1.get('acls', {}).values() for r in lst]
    denies_guest = any(r['action'] == 'deny' and r.get('ip') == '192.168.1.20' for r in any_rules)
    permits_others = any(r['action'] == 'permit' and r['kind'] == 'any' for r in any_rules)
    applied = any(any(r['action'] == 'deny' and r.get('ip') == '192.168.1.20' for r in rules) for rules in _applied_acls(r1))
    return {
        'acl_denies_guest': denies_guest,
        'acl_permits_others': permits_others,
        'acl_applied': applied,
        'guest_blocked': not _acl_permits(r1, '192.168.1.20'),
        'trusted_allowed': _acl_permits(r1, '192.168.1.10'),
    }


def ping_acl(state: dict[str, Any], from_dev: str, ip: str) -> tuple[bool, bool, str]:
    if ip not in _ACL_IPS:
        return (False, False, ip)
    r1 = state['dev']['R1']
    src = state['dev'][from_dev].get('ip')
    # Only the host -> server path is ACL-filtered; everything else is already connected.
    if from_dev in ('PC1', 'GUEST') and ip == '192.168.2.10' and src:
        ok = _acl_permits(r1, src)
    else:
        ok = True
    return (True, ok, _ACL_IPS[ip])


# --------------------------------------------------------------------------------------------------

TOPOLOGIES: dict[str, dict[str, Any]] = {
    'net-vlan-001': {
        'devices': _VLAN_DEVICES,
        'initial': 'SW1',
        'derive': derive_vlan,
        'ping': ping_vlan,
        'summary': 'PC1(VLAN10) & PC2(VLAN20) on SW1 · SW1 Gi0/24 trunks to R1 Gi0/0 (router-on-a-stick).',
    },
    'net-static-routing-001': {
        'devices': _SR_DEVICES,
        'initial': 'R1',
        'derive': derive_static,
        'ping': ping_static,
        'summary': 'LAN1(PC1)-R1 =10.0.0.0/30= R2-LAN2(PC2). Address the links, then route between the LANs.',
    },
    'net-acl-001': {
        'devices': _ACL_DEVICES,
        'initial': 'R1',
        'derive': derive_acl,
        'ping': ping_acl,
        'summary': 'R1 routes LAN1 (PC1 .10, GUEST .20) to the Server LAN (SRV 192.168.2.10). Already connected — now filter the GUEST.',
    },
}


def topology_for(lab_id: str) -> dict[str, Any] | None:
    return TOPOLOGIES.get(lab_id)


def fresh_state(lab_id: str) -> dict[str, Any]:
    topo = TOPOLOGIES[lab_id]
    return {
        'current': topo['initial'],
        'mode': 'user',
        'ctx': {},
        'dev': copy.deepcopy(topo['devices']),
    }
