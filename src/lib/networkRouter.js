// Network router simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Router" (src/components/viz) drives this engine
// for its interactive simulator.
//
// Model (from lessons net-switch-route + rt-fundamentals):
// - A router forwards packets between networks by destination IP. The
//   control plane builds the RIB; the data plane forwards via the FIB.
// - Longest-prefix match wins: a /32 host route beats a /24, which beats
//   a /16, which beats the 0.0.0.0/0 default route.
// - Administrative distance decides between sources for the SAME
//   destination: connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110,
//   RIP 120. Metric only compares within one protocol.
// - A floating static is a static route with an AD above the dynamic
//   protocol's (e.g. 200, above OSPF's 110) so it stays inactive until
//   the better route is withdrawn — then it takes over.
// - OSPF is link-state (Dijkstra); cost = reference bandwidth / link
//   bandwidth (reference 1000 Mbps here, so 100 Mbps costs 10 and
//   10 Mbps costs 100). A failed link makes OSPF reconverge on a new path.
// - NAT overload (PAT): many private inside-local addresses share one
//   public inside-global address, told apart by source port.
// - ACLs are evaluated top-down, first match wins, with an implicit deny
//   at the end. Extended ACLs match protocol + source + destination + port.

export const AD = {
  connected: 0,
  static: 1,
  ebgp: 20,
  eigrp: 90,
  ospf: 110,
  rip: 120,
};

/** AD a floating static must beat to sit behind OSPF (110): 200. */
export const FLOATING_STATIC_AD = 200;

/** OSPF reference bandwidth in Mbps: cost = 1000 / link bandwidth. */
export const OSPF_REFERENCE_BW_MBPS = 1000;

/** The router's single public address, shared by PAT overload. */
export const PUBLIC_IP = '203.0.113.2';

/** Simulated OSPF reconvergence time, seconds (shown in the log). */
export const SIMULATED_CONVERGENCE_S = 1.9;

// ---------------------------------------------------------------- IPv4 ---

export function ipToInt(ip) {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function intToIp(n) {
  return [24, 16, 8, 0].map((shift) => (n >>> shift) & 0xff).join('.');
}

export function parseCidr(cidr) {
  const [ip, prefix] = String(cidr).split('/');
  const prefixLen = Number(prefix);
  if (!ip || !Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 32) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  const addr = ipToInt(ip);
  const mask = prefixLen === 0 ? 0 : (0xffffffff << (32 - prefixLen)) >>> 0;
  return { network: (addr & mask) >>> 0, prefixLen, mask };
}

export function isValidCidr(cidr) {
  try {
    parseCidr(cidr);
    return true;
  } catch {
    return false;
  }
}

export function isValidIp(ip) {
  try {
    ipToInt(ip);
    return true;
  } catch {
    return false;
  }
}

/** True when `ip` falls inside `cidr` ('any' matches everything). */
export function matchesPrefix(ip, cidr) {
  if (cidr === 'any') return true;
  const { network, mask } = parseCidr(cidr);
  return ((ipToInt(ip) & mask) >>> 0) === network;
}

/** Prefix length of a CIDR string; 0 for 'any' / the default route. */
export function prefixLength(cidr) {
  if (cidr === 'any') return 0;
  return parseCidr(cidr).prefixLen;
}

// ------------------------------------------------------------- topology ---

/** R1's interfaces: 2 WAN + LAN trunk (router-on-a-stick) + management. */
export const INTERFACES = [
  { id: 'Gi0/0.10', label: 'Gi0/0.10 · VLAN 10', network: '10.0.0.0/24', address: '10.0.0.1', vlan: 10 },
  { id: 'Gi0/0.20', label: 'Gi0/0.20 · VLAN 20 (guest)', network: '10.0.1.0/24', address: '10.0.1.1', vlan: 20 },
  { id: 'Gi0/1', label: 'Gi0/1 · WAN primary (ISP 1)', network: '203.0.113.0/30', address: PUBLIC_IP, linkId: 'wan-primary' },
  { id: 'Gi0/2', label: 'Gi0/2 · WAN backup (ISP 2)', network: '198.51.100.0/30', address: '198.51.100.2', linkId: 'wan-backup' },
];

/** OSPF area: R1 peers with R2 and R3; R2 and R4 hold the remote LANs. */
export const OSPF_NODES = ['R1', 'R2', 'R3', 'R4'];
export const OSPF_LINKS = [
  { id: 'r1-r2', a: 'R1', b: 'R2', bandwidthMbps: 100 },
  { id: 'r1-r3', a: 'R1', b: 'R3', bandwidthMbps: 10 },
  { id: 'r2-r4', a: 'R2', b: 'R4', bandwidthMbps: 100 },
  { id: 'r3-r4', a: 'R3', b: 'R4', bandwidthMbps: 100 },
];
/** Network attached to a router, and the cost from that router to it. */
export const OSPF_NETWORKS = [
  { destination: '172.16.1.0/24', attachedTo: 'R2', attachCost: 10 },
  { destination: '172.16.2.0/24', attachedTo: 'R4', attachCost: 10 },
];
/** Next-hop address R1 uses toward each OSPF neighbour. */
export const OSPF_NEXT_HOPS = { R2: '10.0.10.2', R3: '10.0.10.3' };

/** OSPF cost of one link: reference bandwidth / link bandwidth, min 1. */
export function ospfCost(bandwidthMbps) {
  return Math.max(1, Math.round(OSPF_REFERENCE_BW_MBPS / bandwidthMbps));
}

/**
 * Dijkstra over the OSPF links. `linksUp` maps link id -> boolean (a link
 * absent from the map is up). Returns { path, cost } or null when the
 * destination is unreachable.
 */
export function dijkstra(from, to, linksUp = {}) {
  const dist = { [from]: 0 };
  const prev = {};
  const done = new Set();
  const nodes = [...OSPF_NODES];
  for (;;) {
    let current = null;
    for (const node of nodes) {
      if (done.has(node) || dist[node] === undefined) continue;
      if (current === null || dist[node] < dist[current]) current = node;
    }
    if (current === null) return null;
    if (current === to) break;
    done.add(current);
    for (const link of OSPF_LINKS) {
      if (linksUp[link.id] === false) continue;
      const other = link.a === current ? link.b : link.b === current ? link.a : null;
      if (other === null || done.has(other)) continue;
      const next = dist[current] + ospfCost(link.bandwidthMbps);
      if (dist[other] === undefined || next < dist[other]) {
        dist[other] = next;
        prev[other] = current;
      }
    }
  }
  if (dist[to] === undefined) return null;
  const path = [to];
  for (let node = to; prev[node] !== undefined; node = prev[node]) path.unshift(prev[node]);
  return { path, cost: dist[to] };
}

/**
 * The OSPF routes R1 currently learns, given which links are up. A network
 * whose router is unreachable drops out of the table (it reconverges away).
 */
export function ospfRoutesFor(linksUp = {}) {
  const routes = [];
  for (const net of OSPF_NETWORKS) {
    const result = dijkstra('R1', net.attachedTo, linksUp);
    if (!result || result.path.length < 2) continue;
    routes.push({
      destination: net.destination,
      nextHop: OSPF_NEXT_HOPS[result.path[1]],
      interface: 'Gi0/3',
      source: 'OSPF',
      ad: AD.ospf,
      metric: result.cost + net.attachCost,
      linkId: null,
      via: result.path.join(' → '),
    });
  }
  return routes;
}

// --------------------------------------------------------- routing table ---

function connectedRoutes() {
  return [
    { destination: '10.0.0.0/24', nextHop: 'directly connected', interface: 'Gi0/0.10', source: 'connected', ad: AD.connected, metric: 0, linkId: null },
    { destination: '10.0.1.0/24', nextHop: 'directly connected', interface: 'Gi0/0.20', source: 'connected', ad: AD.connected, metric: 0, linkId: null },
    { destination: '203.0.113.0/30', nextHop: 'directly connected', interface: 'Gi0/1', source: 'connected', ad: AD.connected, metric: 0, linkId: 'wan-primary' },
    { destination: '198.51.100.0/30', nextHop: 'directly connected', interface: 'Gi0/2', source: 'connected', ad: AD.connected, metric: 0, linkId: 'wan-backup' },
  ];
}

/** A fresh routing table: connected + OSPF + default + floating static. */
export function createRoutingTable(linksUp = {}) {
  return [
    ...connectedRoutes(),
    ...ospfRoutesFor(linksUp),
    { destination: '0.0.0.0/0', nextHop: '203.0.113.1', interface: 'Gi0/1', source: 'static', ad: AD.static, metric: 0, linkId: 'wan-primary' },
    { destination: '0.0.0.0/0', nextHop: '198.51.100.1', interface: 'Gi0/2', source: 'static', ad: FLOATING_STATIC_AD, metric: 0, linkId: 'wan-backup', floating: true },
  ];
}

/** Add a static route; returns a new table (the input is untouched). */
export function addStaticRoute(routes, { destination, nextHop, interface: iface = 'Gi0/1', ad = AD.static }) {
  if (!isValidCidr(destination)) throw new Error(`Invalid destination network: ${destination}`);
  if (!isValidIp(nextHop)) throw new Error(`Invalid next hop: ${nextHop}`);
  return [
    ...routes,
    { destination, nextHop, interface: iface, source: 'static', ad, metric: 0, linkId: null, floating: ad >= FLOATING_STATIC_AD },
  ];
}

/** Remove static routes to `destination`; returns a new table. */
export function removeStaticRoute(routes, destination) {
  return routes.filter((r) => !(r.source === 'static' && r.destination === destination));
}

/** Replace the OSPF-sourced routes with a fresh computation for `linksUp`. */
export function refreshOspfRoutes(routes, linksUp = {}) {
  return [...routes.filter((r) => r.source !== 'OSPF'), ...ospfRoutesFor(linksUp)];
}

function isUp(route, linksUp) {
  return !(route.linkId && linksUp[route.linkId] === false);
}

/**
 * Best route for `destIp`: longest prefix wins; among equal prefixes the
 * lowest AD wins; among equal AD the lowest metric wins. Routes on a down
 * link are skipped. Returns the route or null (no route to host).
 */
export function selectRoute(routes, destIp, linksUp = {}) {
  const candidates = routes.filter((r) => isUp(r, linksUp) && matchesPrefix(destIp, r.destination));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const prefix = prefixLength(b.destination) - prefixLength(a.destination);
    if (prefix !== 0) return prefix;
    if (a.ad !== b.ad) return a.ad - b.ad;
    return a.metric - b.metric;
  });
  return candidates[0];
}

/** The currently active default (0.0.0.0/0) route, or null. */
export function selectDefaultRoute(routes, linksUp = {}) {
  const candidates = routes.filter((r) => r.destination === '0.0.0.0/0' && isUp(r, linksUp));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.ad - b.ad || a.metric - b.metric);
  return candidates[0];
}

/**
 * Plain-language explanation of why `selectRoute` picked what it picked —
 * the longest-prefix and AD reasoning the learner should be able to repeat.
 */
export function explainSelection(routes, destIp, linksUp = {}) {
  const route = selectRoute(routes, destIp, linksUp);
  if (!route) return { route: null, text: `No route to ${destIp} — the packet is dropped.` };
  const prefix = prefixLength(route.destination);
  const beaten = routes.filter(
    (r) => r !== route && isUp(r, linksUp) && matchesPrefix(destIp, r.destination),
  );
  let text = `Longest-prefix match: ${route.destination} (/${prefix}) via ${route.nextHop} on ${route.interface} — ${route.source}, AD ${route.ad}, metric ${route.metric}.`;
  if (beaten.length > 0) {
    const beatenText = beaten
      .map((r) => `${r.destination} (${r.source}, AD ${r.ad})`)
      .join(', ');
    text += ` Beats ${beatenText}.`;
  }
  return { route, text };
}

// ------------------------------------------------------------------ NAT ---

/** A fresh (empty) NAT table; ports are allocated from 1024 upward. */
export function createNatTable() {
  return { entries: [], nextPort: 1024 };
}

/** True when `ip` is a private inside address that needs translating. */
export function needsNat(ip) {
  return matchesPrefix(ip, '10.0.0.0/8') || matchesPrefix(ip, '172.16.0.0/12');
}

/**
 * Translate an outbound packet (PAT overload). An existing translation for
 * the same inside host + port is reused; otherwise the next free global
 * port is allocated. Returns { nat, entry } with a new table object.
 */
export function translateOut(nat, insideLocal, insidePort, destIp, destPort) {
  const existing = nat.entries.find((e) => e.insideLocal === insideLocal && e.insidePort === insidePort);
  if (existing) return { nat, entry: existing };
  if (nat.nextPort > 65535) throw new Error('PAT port pool exhausted');
  const entry = {
    insideLocal,
    insidePort,
    insideGlobal: PUBLIC_IP,
    globalPort: nat.nextPort,
    destIp,
    destPort,
    protocol: 'TCP',
  };
  return { nat: { entries: [...nat.entries, entry], nextPort: nat.nextPort + 1 }, entry };
}

/** Find the inside host for a returning packet by its global port. */
export function translateIn(nat, globalPort) {
  return nat.entries.find((e) => e.globalPort === globalPort) || null;
}

// ------------------------------------------------------------------ ACL ---

/** The lab ACL: deny Telnet from the guest VLAN, permit everything else. */
export function createAcl() {
  return [
    { id: 1, action: 'deny', protocol: 'tcp', src: '10.0.1.0/24', srcPort: 'any', dest: 'any', destPort: 23, direction: 'inbound', description: 'Deny Telnet from Guest VLAN 20' },
    { id: 2, action: 'permit', protocol: 'ip', src: 'any', srcPort: 'any', dest: 'any', destPort: 'any', direction: 'inbound', description: 'Permit everything else' },
  ];
}

function ruleMatches(rule, packet) {
  if (rule.protocol !== 'ip' && rule.protocol !== packet.protocol) return false;
  if (!matchesPrefix(packet.srcIp, rule.src)) return false;
  if (!matchesPrefix(packet.destIp, rule.dest)) return false;
  if (rule.srcPort !== 'any' && rule.srcPort !== packet.srcPort) return false;
  if (rule.destPort !== 'any' && rule.destPort !== packet.destPort) return false;
  return true;
}

/**
 * Evaluate a packet against the ACL, top-down, first match wins. A rule
 * with a `direction` only applies to that direction. No matching rule
 * means the implicit deny: 'deny'.
 * Returns { verdict: 'permit' | 'deny', rule } — rule is null on implicit deny.
 */
export function evaluateAcl(rules, packet, direction = 'inbound') {
  for (const rule of rules) {
    if (rule.direction && rule.direction !== direction) continue;
    if (ruleMatches(rule, packet)) return { verdict: rule.action, rule };
  }
  return { verdict: 'deny', rule: null };
}

// ------------------------------------------------------------ running-config ---

/** The live running-config for the current table / NAT / ACL state. */
export function routerConf(routes, natEntries, aclRules, linksUp = {}) {
  const lines = [
    'hostname R1',
    '!',
    'interface Gi0/0.10',
    ' description LAN VLAN 10',
    ' encapsulation dot1Q 10',
    ' ip address 10.0.0.1 255.255.255.0',
    ' ip nat inside',
    '!',
    'interface Gi0/0.20',
    ' description LAN VLAN 20 guest',
    ' encapsulation dot1Q 20',
    ' ip address 10.0.1.1 255.255.255.0',
    ' ip nat inside',
    ' ip access-group GUEST-IN in',
    '!',
    'interface Gi0/1',
    ` description WAN primary${linksUp['wan-primary'] === false ? ' (DOWN)' : ''}`,
    ' ip address 203.0.113.2 255.255.255.252',
    ' ip nat outside',
    '!',
    'interface Gi0/2',
    ` description WAN backup${linksUp['wan-backup'] === false ? ' (DOWN)' : ''}`,
    ' ip address 198.51.100.2 255.255.255.252',
    ' ip nat outside',
    '!',
    'router ospf 1',
    ' network 10.0.0.0 0.0.0.255 area 0',
    ' network 10.0.1.0 0.0.0.255 area 0',
    '!',
  ];
  for (const route of routes) {
    if (route.source === 'connected') continue;
    const down = !isUp(route, linksUp);
    const adPart = route.ad === AD.static ? '' : ` ${route.ad}`;
    const { network, mask } = parseCidr(route.destination);
    lines.push(`ip route ${intToIp(network)} ${intToIp(mask)} ${route.nextHop}${adPart}${down ? '  ! link down — inactive' : ''}${route.floating ? '  ! floating static' : ''}`);
  }
  lines.push('!');
  lines.push(`ip nat inside source list 1 interface Gi0/1 overload`);
  lines.push(`! ${natEntries.length} NAT translation${natEntries.length === 1 ? '' : 's'} active`);
  for (const entry of natEntries) {
    lines.push(`! tcp ${PUBLIC_IP}:${entry.globalPort} <-> ${entry.insideLocal}:${entry.insidePort} -> ${entry.destIp}:${entry.destPort}`);
  }
  lines.push('!');
  lines.push('ip access-list extended GUEST-IN');
  for (const rule of aclRules) {
    const dest = rule.dest === 'any' ? 'any' : `host ${rule.dest}`;
    lines.push(` ${rule.action} ${rule.protocol} ${rule.src} ${dest} eq ${rule.destPort === 'any' ? 'any' : rule.destPort}  ! ${rule.description}`);
  }
  lines.push(' deny ip any any  ! implicit deny');
  return lines.join('\n');
}
