import { describe, it, expect } from 'vitest';
import {
  AD,
  FLOATING_STATIC_AD,
  PUBLIC_IP,
  ipToInt,
  intToIp,
  parseCidr,
  isValidCidr,
  isValidIp,
  matchesPrefix,
  ospfCost,
  dijkstra,
  ospfRoutesFor,
  createRoutingTable,
  addStaticRoute,
  removeStaticRoute,
  refreshOspfRoutes,
  selectRoute,
  selectDefaultRoute,
  explainSelection,
  createNatTable,
  needsNat,
  translateOut,
  translateIn,
  createAcl,
  evaluateAcl,
  routerConf,
} from './networkRouter';

describe('network router engine: addresses', () => {
  it('converts IPv4 addresses back and forth', () => {
    expect(ipToInt('10.0.0.1')).toBe(167772161);
    expect(intToIp(167772161)).toBe('10.0.0.1');
    expect(intToIp(ipToInt('203.0.113.2'))).toBe('203.0.113.2');
  });

  it('parses CIDR networks and matches prefixes', () => {
    expect(parseCidr('10.0.0.0/24')).toEqual({ network: ipToInt('10.0.0.0'), prefixLen: 24, mask: 0xffffff00 });
    expect(matchesPrefix('10.0.0.5', '10.0.0.0/24')).toBe(true);
    expect(matchesPrefix('10.0.1.5', '10.0.0.0/24')).toBe(false);
    expect(matchesPrefix('8.8.8.8', '0.0.0.0/0')).toBe(true);
    expect(matchesPrefix('8.8.8.8', 'any')).toBe(true);
    expect(isValidCidr('10.0.0.0/24')).toBe(true);
    expect(isValidCidr('10.0.0.0/33')).toBe(false);
    expect(isValidIp('999.0.0.1')).toBe(false);
    expect(isValidIp('10.0.0.1')).toBe(true);
  });
});

describe('network router engine: OSPF and Dijkstra', () => {
  it('prices a 10 Mbps link at cost 100 and a 100 Mbps link at cost 10', () => {
    expect(ospfCost(10)).toBe(100);
    expect(ospfCost(100)).toBe(10);
    expect(ospfCost(1000)).toBe(1);
  });

  it('routes R1 to R4 via R2 (cost 20) while the direct links are up', () => {
    expect(dijkstra('R1', 'R4', {})).toEqual({ path: ['R1', 'R2', 'R4'], cost: 20 });
    expect(dijkstra('R1', 'R2', {})).toEqual({ path: ['R1', 'R2'], cost: 10 });
  });

  it('reconverges via R3 when the R1–R2 link fails', () => {
    expect(dijkstra('R1', 'R4', { 'r1-r2': false })).toEqual({ path: ['R1', 'R3', 'R4'], cost: 110 });
    expect(dijkstra('R1', 'R2', { 'r1-r2': false })).toEqual({ path: ['R1', 'R3', 'R4', 'R2'], cost: 120 });
  });

  it('learns the remote LANs via OSPF with the Dijkstra cost as metric', () => {
    const routes = ospfRoutesFor({});
    expect(routes.find((r) => r.destination === '172.16.1.0/24')).toMatchObject({
      nextHop: '10.0.10.2', source: 'OSPF', ad: AD.ospf, metric: 20,
    });
    expect(routes.find((r) => r.destination === '172.16.2.0/24')).toMatchObject({
      nextHop: '10.0.10.2', source: 'OSPF', ad: AD.ospf, metric: 30,
    });
    const failed = ospfRoutesFor({ 'r1-r2': false });
    expect(failed.find((r) => r.destination === '172.16.1.0/24')).toMatchObject({
      nextHop: '10.0.10.3', metric: 130,
    });
    expect(failed.find((r) => r.destination === '172.16.2.0/24')).toMatchObject({
      nextHop: '10.0.10.3', metric: 120,
    });
  });
});

describe('network router engine: route selection', () => {
  it('longest-prefix match beats a shorter prefix whatever the AD', () => {
    const routes = createRoutingTable();
    // A /32 host route via the backup ISP beats the /24 and the default.
    const withHost = addStaticRoute(routes, { destination: '8.8.8.8/32', nextHop: '198.51.100.1', interface: 'Gi0/2', ad: FLOATING_STATIC_AD });
    expect(selectRoute(withHost, '8.8.8.8', {}).destination).toBe('8.8.8.8/32');
    expect(selectRoute(withHost, '8.8.8.9', {}).destination).toBe('0.0.0.0/0');
  });

  it('administrative distance decides between sources for the same destination', () => {
    const routes = [
      { destination: '172.16.1.0/24', nextHop: '10.0.10.2', interface: 'Gi0/3', source: 'OSPF', ad: AD.ospf, metric: 20, linkId: null },
      { destination: '172.16.1.0/24', nextHop: '10.0.10.9', interface: 'Gi0/3', source: 'RIP', ad: AD.rip, metric: 3, linkId: null },
    ];
    // RIP's metric is lower, but AD is compared first — OSPF (110) wins over RIP (120).
    expect(selectRoute(routes, '172.16.1.10', {})).toMatchObject({ source: 'OSPF', ad: AD.ospf });
  });

  it('a floating static stays inactive until the primary default is withdrawn', () => {
    const routes = createRoutingTable();
    expect(selectDefaultRoute(routes, {})).toMatchObject({ nextHop: '203.0.113.1', ad: AD.static });
    // Primary WAN down: the AD-200 floating static via the backup takes over.
    expect(selectDefaultRoute(routes, { 'wan-primary': false })).toMatchObject({ nextHop: '198.51.100.1', ad: FLOATING_STATIC_AD });
    expect(selectRoute(routes, '8.8.8.8', { 'wan-primary': false })).toMatchObject({ nextHop: '198.51.100.1' });
    // Both WAN links down: no default route at all.
    expect(selectDefaultRoute(routes, { 'wan-primary': false, 'wan-backup': false })).toBeNull();
    expect(selectRoute(routes, '8.8.8.8', { 'wan-primary': false, 'wan-backup': false })).toBeNull();
  });

  it('a floating static must use an AD above OSPF 110 or it never becomes the backup', () => {
    const routes = createRoutingTable();
    const bad = addStaticRoute(routes, { destination: '172.16.1.0/24', nextHop: '10.0.10.9', interface: 'Gi0/3', ad: 1 });
    // AD 1 static beats OSPF immediately — it is a primary, not a backup.
    expect(selectRoute(bad, '172.16.1.10', {})).toMatchObject({ source: 'static', ad: 1 });
    const good = addStaticRoute(routes, { destination: '172.16.1.0/24', nextHop: '10.0.10.9', interface: 'Gi0/3', ad: FLOATING_STATIC_AD });
    expect(selectRoute(good, '172.16.1.10', {})).toMatchObject({ source: 'OSPF', ad: AD.ospf });
  });

  it('adding and removing a static route changes the table', () => {
    const routes = createRoutingTable();
    const added = addStaticRoute(routes, { destination: '192.0.2.0/24', nextHop: '203.0.113.1', interface: 'Gi0/1', ad: 1 });
    expect(added.length).toBe(routes.length + 1);
    expect(selectRoute(added, '192.0.2.7', {})).toMatchObject({ destination: '192.0.2.0/24' });
    expect(routes.length).toBe(createRoutingTable().length);
    const removed = removeStaticRoute(added, '192.0.2.0/24');
    expect(removed.length).toBe(routes.length);
    expect(selectRoute(removed, '192.0.2.7', {})).toMatchObject({ destination: '0.0.0.0/0' });
    expect(() => addStaticRoute(routes, { destination: 'not-a-network', nextHop: '203.0.113.1' })).toThrow();
    expect(() => addStaticRoute(routes, { destination: '192.0.2.0/24', nextHop: 'not-an-ip' })).toThrow();
  });

  it('refreshing OSPF routes swaps the next hop when a link fails', () => {
    const routes = createRoutingTable();
    const refreshed = refreshOspfRoutes(routes, { 'r1-r2': false });
    expect(refreshed.find((r) => r.destination === '172.16.1.0/24')).toMatchObject({ nextHop: '10.0.10.3', metric: 130 });
    expect(refreshed.filter((r) => r.source === 'OSPF').length).toBe(2);
  });

  it('explains a lookup with the longest-prefix and AD reasoning', () => {
    const routes = addStaticRoute(createRoutingTable(), { destination: '8.8.8.8/32', nextHop: '203.0.113.1', interface: 'Gi0/1', ad: 1 });
    const { route, text } = explainSelection(routes, '8.8.8.8', {});
    expect(route.destination).toBe('8.8.8.8/32');
    expect(text).toContain('Longest-prefix match');
    expect(text).toContain('8.8.8.8/32');
    expect(explainSelection(routes, '203.0.113.5', { 'wan-primary': false, 'wan-backup': false }).route).toBeNull();
  });
});

describe('network router engine: NAT overload', () => {
  it('shares one public address across many private hosts, told apart by port', () => {
    expect(needsNat('10.0.0.5')).toBe(true);
    expect(needsNat('172.16.1.10')).toBe(true);
    expect(needsNat('8.8.8.8')).toBe(false);
    let nat = createNatTable();
    const first = translateOut(nat, '10.0.0.5', 49152, '8.8.8.8', 443);
    nat = first.nat;
    expect(first.entry).toMatchObject({ insideLocal: '10.0.0.5', insideGlobal: PUBLIC_IP, globalPort: 1024 });
    const second = translateOut(nat, '10.0.1.5', 49152, '8.8.8.8', 443);
    nat = second.nat;
    expect(second.entry).toMatchObject({ insideLocal: '10.0.1.5', insideGlobal: PUBLIC_IP, globalPort: 1025 });
    // Same host + port reuses its translation; the reply finds its host by port.
    const repeat = translateOut(nat, '10.0.0.5', 49152, '8.8.8.8', 443);
    expect(repeat.entry.globalPort).toBe(1024);
    expect(repeat.nat.entries.length).toBe(2);
    expect(translateIn(nat, 1025)).toMatchObject({ insideLocal: '10.0.1.5' });
    expect(translateIn(nat, 9999)).toBeNull();
  });
});

describe('network router engine: ACLs', () => {
  it('denies Telnet from the guest VLAN and permits everything else, first match wins', () => {
    const acl = createAcl();
    const telnet = { protocol: 'tcp', srcIp: '10.0.1.5', srcPort: 49152, destIp: '10.0.0.10', destPort: 23 };
    expect(evaluateAcl(acl, telnet, 'inbound')).toMatchObject({ verdict: 'deny', rule: { id: 1 } });
    const web = { ...telnet, destPort: 80 };
    expect(evaluateAcl(acl, web, 'inbound')).toMatchObject({ verdict: 'permit', rule: { id: 2 } });
    // Same Telnet packet from the staff VLAN is not matched by rule 1.
    expect(evaluateAcl(acl, { ...telnet, srcIp: '10.0.0.5' }, 'inbound')).toMatchObject({ verdict: 'permit' });
  });

  it('falls through to the implicit deny when no rule matches', () => {
    const acl = createAcl().slice(0, 1);
    const web = { protocol: 'tcp', srcIp: '10.0.1.5', srcPort: 49152, destIp: '10.0.0.10', destPort: 80 };
    expect(evaluateAcl(acl, web, 'inbound')).toEqual({ verdict: 'deny', rule: null });
  });
});

describe('network router engine: running-config', () => {
  it('renders the default route, the floating static and the ACL', () => {
    const routes = createRoutingTable();
    const conf = routerConf(routes, [], createAcl(), {});
    expect(conf).toContain('hostname R1');
    expect(conf).toContain('ip route 0.0.0.0 0.0.0.0 203.0.113.1');
    expect(conf).toContain('ip route 0.0.0.0 0.0.0.0 198.51.100.1 200');
    expect(conf).toContain('floating static');
    expect(conf).toContain('ip nat inside source list 1 interface Gi0/1 overload');
    expect(conf).toContain('deny tcp 10.0.1.0/24');
    expect(conf).toContain('implicit deny');
    expect(conf).not.toContain('link down');
    expect(routerConf(routes, [], createAcl(), { 'wan-primary': false })).toContain('link down');
  });
});
