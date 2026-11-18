// Network switch simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Switch" (src/components/viz) drives this engine
// for its interactive simulator.
//
// Model (from the net-switch-route lesson):
// - A switch learns source MAC -> port into its CAM table (32,000 entries).
// - Known destination MAC: forward out that one port. Unknown unicast or
//   broadcast (ff:ff:ff:ff:ff:ff): flood every port in the same VLAN.
// - A VLAN is a separate broadcast domain: frames never cross VLANs on a
//   switch alone — that takes a router.
// - An access port carries one VLAN, untagged. A trunk carries many VLANs
//   with an 802.1Q tag; the native VLAN crosses untagged.
// - STP (802.1D; RSTP is 802.1w) elects a root bridge and blocks just
//   enough ports to leave one loop-free path. Ethernet has no TTL, so a
//   loop turns one broadcast into a broadcast storm.

export const CAM_CAPACITY = 32_000;
export const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';
export const UNKNOWN_MAC = '00:1a:2b:00:00:ff';
export const STORM_PEAK_FPS = 14_800;
export const TRUNK_COST = 4;

/** The four hosts wired to the two switches. */
export const HOSTS = [
  { id: 'PC-A', mac: '00:1a:2b:00:00:0a', switchId: 'SW1', portId: 'P1', vlan: 10 },
  { id: 'PC-B', mac: '00:1a:2b:00:00:0b', switchId: 'SW1', portId: 'P2', vlan: 20 },
  { id: 'PC-C', mac: '00:1a:2b:00:00:0c', switchId: 'SW2', portId: 'P1', vlan: 10 },
  { id: 'PC-D', mac: '00:1a:2b:00:00:0d', switchId: 'SW2', portId: 'P2', vlan: 20 },
];

export function hostById(id) {
  return HOSTS.find((h) => h.id === id) || null;
}

export function hostByMac(mac) {
  return HOSTS.find((h) => h.mac.toLowerCase() === String(mac).toLowerCase()) || null;
}

function createPort(id, spec) {
  return {
    id,
    mode: spec.mode,
    // Access port: the one VLAN it carries, untagged.
    vlan: spec.vlan ?? null,
    // Trunk port: the VLANs it carries (802.1Q-tagged) + the native VLAN,
    // which crosses the trunk untagged.
    vlans: spec.vlans ? [...spec.vlans] : null,
    nativeVlan: spec.nativeVlan ?? null,
    // The peer port at the far end of the link, or null (host-facing).
    peer: spec.peer ? { ...spec.peer } : null,
    linkId: spec.linkId ?? null,
    linkUp: spec.linkUp ?? true,
    /** STP role: 'designated' | 'root' | 'blocked'. */
    role: 'designated',
    /** 'forwarding' | 'blocked' | 'down'. */
    state: 'forwarding',
  };
}

/** A fresh managed 48-port switch: 4 modelled ports + the front-panel facts. */
export function createSwitch({ id, name, priority, mac }) {
  const other = id === 'SW1' ? 'SW2' : 'SW1';
  return {
    id,
    name,
    priority,
    mac,
    ports: [
      createPort('P1', { mode: 'access', vlan: 10 }),
      createPort('P2', { mode: 'access', vlan: 20 }),
      createPort('P3', { mode: 'trunk', vlans: [10, 20], nativeVlan: 1, peer: { switchId: other, portId: 'P3' }, linkId: 'A' }),
      createPort('P4', { mode: 'trunk', vlans: [10, 20], nativeVlan: 1, peer: { switchId: other, portId: 'P4' }, linkId: 'B' }),
    ],
    /** CAM table: [{ mac, portId, vlan }] in learn order (oldest first). */
    cam: [],
  };
}

/** The two-switch topology: SW1 + SW2 joined by two 802.1Q trunks (link A
 * active, link B the redundant path STP blocks). SW1 starts as root
 * bridge (priority 4096 beats SW2's 32768). */
export function createNetwork() {
  const network = {
    stpEnabled: true,
    switches: [
      createSwitch({ id: 'SW1', name: 'SW1', priority: 4096, mac: '00:1a:2b:00:01:01' }),
      createSwitch({ id: 'SW2', name: 'SW2', priority: 32768, mac: '00:1a:2b:00:01:02' }),
    ],
  };
  computeStp(network);
  return network;
}

export function switchById(network, id) {
  return network.switches.find((s) => s.id === id) || null;
}

function portById(sw, portId) {
  return sw.ports.find((p) => p.id === portId) || null;
}

/** Lowest bridge id wins: lowest priority, then lowest MAC. */
export function electRootBridge(switches) {
  return [...switches].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.mac < b.mac ? -1 : a.mac > b.mac ? 1 : 0;
  })[0];
}

function compareBridge(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.mac < b.mac ? -1 : a.mac > b.mac ? 1 : 0;
}

/**
 * Recompute every port's STP role and forwarding state. Root bridge: all
 * trunk ports designated/forwarding. Any other switch: its best trunk
 * toward the root (lowest cost, then lowest neighbour bridge id, then
 * lowest port id) is the root port; the remaining up trunks are blocked.
 * Access ports always forward (edge). A down link is down. With STP off,
 * every up trunk forwards — which is how a loop forms.
 * Returns the root bridge id.
 */
export function computeStp(network) {
  const root = electRootBridge(network.switches);
  for (const sw of network.switches) {
    const isRoot = sw.id === root.id;
    // The non-root switch's root port: best up trunk toward the root.
    let rootPortId = null;
    if (!isRoot && network.stpEnabled) {
      const candidates = sw.ports
        .filter((p) => p.mode === 'trunk' && p.linkUp && p.peer)
        .map((p) => ({ port: p, neighbour: switchById(network, p.peer.switchId) }))
        .filter(({ neighbour }) => neighbour)
        .sort((a, b) => {
          // Both trunks cost the same (TRUNK_COST), so the tie-break is
          // the lowest neighbour bridge id, then the lowest port id.
          const byBridge = compareBridge(a.neighbour, b.neighbour);
          if (byBridge !== 0) return byBridge;
          return a.port.id < b.port.id ? -1 : 1;
        });
      if (candidates.length > 0) rootPortId = candidates[0].port.id;
    }
    for (const port of sw.ports) {
      if (!port.linkUp) {
        port.role = 'designated';
        port.state = 'down';
      } else if (port.mode === 'access') {
        port.role = 'designated';
        port.state = 'forwarding';
      } else if (!network.stpEnabled || isRoot) {
        port.role = 'designated';
        port.state = 'forwarding';
      } else if (port.id === rootPortId) {
        port.role = 'root';
        port.state = 'forwarding';
      } else {
        port.role = 'blocked';
        port.state = 'blocked';
      }
    }
  }
  return root.id;
}

/** Bring a trunk link (A = P3↔P3, B = P4↔P4) up or down, then reconverge. */
export function setLinkUp(network, linkId, up) {
  for (const sw of network.switches) {
    for (const port of sw.ports) {
      if (port.linkId === linkId) port.linkUp = up;
    }
  }
  return computeStp(network);
}

/** Change a switch's STP priority, then re-elect the root bridge. */
export function setPriority(network, switchId, priority) {
  const sw = switchById(network, switchId);
  if (sw) sw.priority = priority;
  return computeStp(network);
}

/** Enable or disable STP on the whole topology, then reconverge. */
export function setStpEnabled(network, enabled) {
  network.stpEnabled = enabled;
  return computeStp(network);
}

/** Learn (or refresh) a source MAC -> port mapping. At capacity the
 * oldest entry ages out first. Returns the entry. */
export function learnMac(sw, mac, portId, vlan) {
  const key = String(mac).toLowerCase();
  const existing = sw.cam.find((e) => e.mac === key && e.vlan === vlan);
  if (existing) {
    existing.portId = portId;
    return existing;
  }
  const entry = { mac: key, portId, vlan };
  sw.cam.push(entry);
  while (sw.cam.length > CAM_CAPACITY) sw.cam.shift();
  return entry;
}

/** The CAM entry for a MAC in a VLAN, or null when the switch has never
 * learned it there. */
export function lookupMac(sw, mac, vlan) {
  return sw.cam.find((e) => e.mac === String(mac).toLowerCase() && e.vlan === vlan) || null;
}

/** Does this port carry this VLAN? Access: its one VLAN. Trunk: any of its
 * tagged VLANs, or the native VLAN (untagged). */
export function portCarriesVlan(port, vlan) {
  if (port.mode === 'access') return port.vlan === vlan;
  return port.vlans.includes(vlan) || port.nativeVlan === vlan;
}

function floodPorts(sw, vlan, inPortId) {
  return sw.ports
    .filter((p) => p.id !== inPortId && p.state === 'forwarding' && portCarriesVlan(p, vlan))
    .map((p) => p.id);
}

/**
 * Forward one frame through one switch. Learns the source MAC first, then:
 * known destination -> that one port; unknown unicast or broadcast ->
 * flood every forwarding port in the VLAN; a blocked/down ingress port,
 * a destination on a blocked port, or a destination in another VLAN ->
 * drop. Returns { action: 'forward' | 'flood' | 'drop', outPorts, reason }.
 */
export function forwardFrame(sw, { srcMac, dstMac, inPort, vlan }) {
  learnMac(sw, srcMac, inPort, vlan);
  const ingress = portById(sw, inPort);
  if (!ingress || ingress.state !== 'forwarding') {
    return { action: 'drop', outPorts: [], reason: 'ingress port is not forwarding' };
  }
  const dst = String(dstMac).toLowerCase();
  if (dst === BROADCAST_MAC) {
    return { action: 'flood', outPorts: floodPorts(sw, vlan, inPort), reason: 'broadcast — flooded in VLAN' };
  }
  const entry = lookupMac(sw, dst, vlan);
  if (!entry) {
    return { action: 'flood', outPorts: floodPorts(sw, vlan, inPort), reason: 'unknown unicast — flooded in VLAN' };
  }
  const out = portById(sw, entry.portId);
  if (!out || out.state !== 'forwarding' || !portCarriesVlan(out, vlan)) {
    return { action: 'drop', outPorts: [], reason: 'destination port is not forwarding' };
  }
  if (out.id === inPort) {
    return { action: 'drop', outPorts: [], reason: 'destination is on the ingress port' };
  }
  return { action: 'forward', outPorts: [out.id], reason: 'known destination — forwarded to one port' };
}

/**
 * Send one frame end-to-end: from a host, through its switch, across a
 * trunk when the destination lives on the other switch. Returns the hops
 * plus the outcome: 'delivered' (a host received it), 'flooded' (flooded
 * but no host in this VLAN has that MAC), or 'dropped' (with the reason).
 * A destination in another VLAN never leaves the source switch — the
 * frame is flooded inside its own VLAN and dies there, because a VLAN is
 * a separate broadcast domain and only a router joins them.
 */
export function deliverFrame(network, srcHostId, dstMac) {
  const src = hostById(srcHostId);
  if (!src) return { hops: [], outcome: 'dropped', reason: 'unknown source host' };
  const dstHost = hostByMac(dstMac);
  const hops = [];
  const srcSw = switchById(network, src.switchId);
  const first = forwardFrame(srcSw, { srcMac: src.mac, dstMac, inPort: src.portId, vlan: src.vlan });
  hops.push({ switchId: srcSw.id, ...first });
  if (first.action === 'drop') {
    return { hops, outcome: 'dropped', reason: first.reason };
  }
  if (dstHost && dstHost.switchId === src.switchId && dstHost.vlan === src.vlan) {
    if (first.outPorts.includes(dstHost.portId)) {
      return { hops, outcome: 'delivered', reason: 'delivered to host', deliveredTo: dstHost.id };
    }
    return { hops, outcome: 'flooded', reason: 'flooded in VLAN — no host answered' };
  }
  if (dstHost && dstHost.vlan !== src.vlan) {
    return { hops, outcome: 'dropped', reason: 'different VLAN — needs a router' };
  }
  // Cross-switch: the frame leaves on a trunk, the peer switch learns it
  // on the far trunk port and forwards/floods from there.
  const trunkOut = first.outPorts.find((portId) => portById(srcSw, portId)?.mode === 'trunk');
  if (!trunkOut) {
    return { hops, outcome: 'flooded', reason: 'flooded in VLAN — no host answered' };
  }
  const trunkPort = portById(srcSw, trunkOut);
  const dstSw = switchById(network, trunkPort.peer.switchId);
  const second = forwardFrame(dstSw, { srcMac: src.mac, dstMac, inPort: trunkPort.peer.portId, vlan: src.vlan });
  hops.push({ switchId: dstSw.id, ...second });
  if (second.action === 'drop') {
    return { hops, outcome: 'dropped', reason: second.reason };
  }
  if (dstHost && second.outPorts.includes(dstHost.portId)) {
    return { hops, outcome: 'delivered', reason: 'delivered to host', deliveredTo: dstHost.id };
  }
  return { hops, outcome: 'flooded', reason: 'flooded in VLAN — no host answered' };
}

/**
 * A loop is live when STP is off and both trunk links are up: every
 * trunk forwards, so a broadcast circles forever. Ethernet has no TTL,
 * so the frame count multiplies instead of dying.
 */
export function isLoopActive(network) {
  if (network.stpEnabled) return false;
  const linksUp = { A: false, B: false };
  for (const sw of network.switches) {
    for (const port of sw.ports) {
      if (port.linkId && port.linkUp && port.state === 'forwarding') linksUp[port.linkId] = true;
    }
  }
  return linksUp.A && linksUp.B;
}

/**
 * Broadcast-storm rate in frames/s. With no loop there is no storm. Once
 * a loop starts the rate ramps linearly to 14,800 frames/s over 2 s and
 * stays there until the loop is broken. Deterministic in
 * secondsSinceLoopStart, so tests can pin the ramp.
 */
export function stormFramesPerSecond(network, secondsSinceLoopStart) {
  if (!isLoopActive(network)) return 0;
  return Math.min(STORM_PEAK_FPS, Math.round(Math.max(0, secondsSinceLoopStart) * (STORM_PEAK_FPS / 2)));
}

/** Total CAM entries learned across both switches. */
export function camSize(network) {
  return network.switches.reduce((sum, sw) => sum + sw.cam.length, 0);
}

/** Trunk ports STP is currently holding blocked. */
export function blockedPortCount(network) {
  return network.switches.reduce(
    (sum, sw) => sum + sw.ports.filter((p) => p.state === 'blocked').length,
    0,
  );
}

/** `show mac address-table` for one switch, as the CLI prints it. */
export function showMacTable(sw) {
  const lines = [`${sw.id}# show mac address-table`, 'Mac Address Table', '-------------------------------------------', 'Vlan    Mac Address       Type        Ports', '----    -----------       ----        -----'];
  if (sw.cam.length === 0) lines.push('(empty — nothing learned yet)');
  for (const entry of sw.cam) {
    lines.push(`${String(entry.vlan).padEnd(8)}${entry.mac.padEnd(20)}DYNAMIC     ${entry.portId}`);
  }
  lines.push(`Total Mac Addresses for this switch: ${sw.cam.length} (capacity ${CAM_CAPACITY.toLocaleString('en-US')})`);
  return lines.join('\n');
}

/** `show spanning-tree` for the whole topology, as the CLI prints it. */
export function showSpanningTree(network) {
  const root = electRootBridge(network.switches);
  const lines = ['SW1# show spanning-tree', '', `Root bridge: ${root.id} (priority ${root.priority}, ${root.mac})`, `STP: ${network.stpEnabled ? 'enabled (802.1D / RSTP 802.1w)' : 'DISABLED — loops are not blocked'}`, ''];
  for (const sw of network.switches) {
    lines.push(`${sw.id}  (priority ${sw.priority})`);
    for (const port of sw.ports) {
      const what = port.mode === 'access' ? `access vlan ${port.vlan}` : `trunk vlans ${port.vlans.join(',')} native ${port.nativeVlan}`;
      lines.push(`  ${port.id}  ${what.padEnd(28)} ${port.role.padEnd(11)} ${port.state}`);
    }
  }
  if (isLoopActive(network)) lines.push('', 'WARNING: loop detected — broadcast storm in progress.');
  return lines.join('\n');
}

/** The live CLI panel: MAC tables + spanning tree for both switches. */
export function switchCli(network) {
  return [
    showMacTable(network.switches[0]),
    '',
    showMacTable(network.switches[1]),
    '',
    showSpanningTree(network),
  ].join('\n');
}
