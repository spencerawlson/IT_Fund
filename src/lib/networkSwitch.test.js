import { describe, it, expect } from 'vitest';
import {
  CAM_CAPACITY,
  BROADCAST_MAC,
  UNKNOWN_MAC,
  STORM_PEAK_FPS,
  HOSTS,
  hostById,
  createNetwork,
  switchById,
  electRootBridge,
  computeStp,
  setLinkUp,
  setPriority,
  setStpEnabled,
  learnMac,
  lookupMac,
  portCarriesVlan,
  forwardFrame,
  deliverFrame,
  isLoopActive,
  stormFramesPerSecond,
  camSize,
  blockedPortCount,
  showMacTable,
  showSpanningTree,
  switchCli,
} from './networkSwitch';

describe('network switch engine', () => {
  it('learns a source MAC into the CAM table and forwards a known destination to one port', () => {
    const network = createNetwork();
    const sw1 = switchById(network, 'SW1');
    const first = forwardFrame(sw1, { srcMac: '00:1a:2b:00:00:0a', dstMac: '00:1a:2b:00:00:0c', inPort: 'P1', vlan: 10 });
    // PC-C lives on SW2, so SW1 has never learned it: flood inside VLAN 10.
    // SW1 is the root bridge, so both its trunks forward — the loop is
    // broken at SW2's blocked P4, not here.
    expect(first.action).toBe('flood');
    expect(first.outPorts).toEqual(['P3', 'P4']);
    expect(lookupMac(sw1, '00:1a:2b:00:00:0a', 10)?.portId).toBe('P1');
    // Once PC-C answers back across the trunk, SW1 knows where it is.
    forwardFrame(sw1, { srcMac: '00:1a:2b:00:00:0c', dstMac: '00:1a:2b:00:00:0a', inPort: 'P3', vlan: 10 });
    const second = forwardFrame(sw1, { srcMac: '00:1a:2b:00:00:0a', dstMac: '00:1a:2b:00:00:0c', inPort: 'P1', vlan: 10 });
    expect(second).toEqual({ action: 'forward', outPorts: ['P3'], reason: 'known destination — forwarded to one port' });
  });

  it('floods an unknown unicast only to forwarding ports in the same VLAN', () => {
    const network = createNetwork();
    const sw1 = switchById(network, 'SW1');
    const result = forwardFrame(sw1, { srcMac: '00:1a:2b:00:00:0a', dstMac: UNKNOWN_MAC, inPort: 'P1', vlan: 10 });
    expect(result.action).toBe('flood');
    // P2 is VLAN 20 (another broadcast domain). Both trunks forward on
    // the root bridge; SW2's blocked P4 is what stops the loop.
    expect(result.outPorts).toEqual(['P3', 'P4']);
  });

  it('floods a broadcast to every forwarding port in the VLAN, never to another VLAN', () => {
    const network = createNetwork();
    const sw1 = switchById(network, 'SW1');
    const result = forwardFrame(sw1, { srcMac: '00:1a:2b:00:00:0a', dstMac: BROADCAST_MAC, inPort: 'P1', vlan: 10 });
    expect(result.action).toBe('flood');
    expect(result.outPorts).toEqual(['P3', 'P4']);
    expect(result.outPorts).not.toContain('P2');
  });

  it('drops a frame that arrives on a blocked port', () => {
    const network = createNetwork();
    const sw2 = switchById(network, 'SW2');
    const result = forwardFrame(sw2, { srcMac: '00:1a:2b:00:00:0c', dstMac: BROADCAST_MAC, inPort: 'P4', vlan: 10 });
    expect(result.action).toBe('drop');
  });

  it('CAM entries are per-VLAN and the table holds 32,000 entries', () => {
    const network = createNetwork();
    const sw1 = switchById(network, 'SW1');
    expect(CAM_CAPACITY).toBe(32_000);
    learnMac(sw1, '00:1a:2b:00:00:0a', 'P1', 10);
    expect(lookupMac(sw1, '00:1a:2b:00:00:0a', 20)).toBeNull();
    expect(lookupMac(sw1, '00:1a:2b:00:00:0a', 10)?.portId).toBe('P1');
    // Learning the same MAC on another port moves it.
    learnMac(sw1, '00:1a:2b:00:00:0a', 'P3', 10);
    expect(lookupMac(sw1, '00:1a:2b:00:00:0a', 10)?.portId).toBe('P3');
    expect(sw1.cam).toHaveLength(1);
  });

  it('access ports carry one VLAN untagged; trunks carry many, tagged, native untagged', () => {
    const network = createNetwork();
    const sw1 = switchById(network, 'SW1');
    const [p1, , p3] = sw1.ports;
    expect(portCarriesVlan(p1, 10)).toBe(true);
    expect(portCarriesVlan(p1, 20)).toBe(false);
    expect(portCarriesVlan(p3, 10)).toBe(true);
    expect(portCarriesVlan(p3, 20)).toBe(true);
    expect(portCarriesVlan(p3, 1)).toBe(true);
    expect(portCarriesVlan(p3, 30)).toBe(false);
  });

  it('STP elects SW1 root (priority 4096) and blocks SW2 P4', () => {
    const network = createNetwork();
    expect(electRootBridge(network.switches).id).toBe('SW1');
    const sw2 = switchById(network, 'SW2');
    const p3 = sw2.ports.find((p) => p.id === 'P3');
    const p4 = sw2.ports.find((p) => p.id === 'P4');
    expect(p3.role).toBe('root');
    expect(p3.state).toBe('forwarding');
    expect(p4.role).toBe('blocked');
    expect(p4.state).toBe('blocked');
    expect(blockedPortCount(network)).toBe(1);
    const sw1 = switchById(network, 'SW1');
    expect(sw1.ports.filter((p) => p.state === 'forwarding')).toHaveLength(4);
  });

  it('STP tie-breaks on the lowest MAC when priorities match', () => {
    const network = createNetwork();
    setPriority(network, 'SW1', 32768);
    // Both 32768: SW1's MAC (…01:01) is lower than SW2's (…01:02).
    expect(electRootBridge(network.switches).id).toBe('SW1');
    setPriority(network, 'SW2', 4096);
    expect(electRootBridge(network.switches).id).toBe('SW2');
    // SW1 is no longer root: its P3 becomes the root port, P4 blocked.
    const sw1 = switchById(network, 'SW1');
    expect(sw1.ports.find((p) => p.id === 'P3').role).toBe('root');
    expect(sw1.ports.find((p) => p.id === 'P4').role).toBe('blocked');
  });

  it('reconverges when the active trunk fails: the blocked port unblocks', () => {
    const network = createNetwork();
    setLinkUp(network, 'A', false);
    const sw2 = switchById(network, 'SW2');
    expect(sw2.ports.find((p) => p.id === 'P3').state).toBe('down');
    expect(sw2.ports.find((p) => p.id === 'P4').role).toBe('root');
    expect(sw2.ports.find((p) => p.id === 'P4').state).toBe('forwarding');
    expect(blockedPortCount(network)).toBe(0);
    // And the loop-free path still delivers across the surviving trunk.
    const result = deliverFrame(network, 'PC-A', '00:1a:2b:00:00:0c');
    expect(result.outcome).toBe('delivered');
    expect(result.deliveredTo).toBe('PC-C');
  });

  it('delivers a same-VLAN frame across the trunk and learns on both switches', () => {
    const network = createNetwork();
    const result = deliverFrame(network, 'PC-A', '00:1a:2b:00:00:0c');
    expect(result.outcome).toBe('delivered');
    expect(result.deliveredTo).toBe('PC-C');
    expect(result.hops).toHaveLength(2);
    expect(camSize(network)).toBeGreaterThan(0);
    expect(lookupMac(switchById(network, 'SW1'), '00:1a:2b:00:00:0a', 10)?.portId).toBe('P1');
    expect(lookupMac(switchById(network, 'SW2'), '00:1a:2b:00:00:0a', 10)?.portId).toBe('P3');
  });

  it('a frame to another VLAN never leaves the source switch — it needs a router', () => {
    const network = createNetwork();
    const result = deliverFrame(network, 'PC-A', '00:1a:2b:00:00:0d');
    expect(result.outcome).toBe('dropped');
    expect(result.reason).toMatch(/router/);
    expect(result.hops).toHaveLength(1);
  });

  it('an unknown destination floods inside its VLAN and reports no host answered', () => {
    const network = createNetwork();
    const result = deliverFrame(network, 'PC-A', UNKNOWN_MAC);
    expect(result.outcome).toBe('flooded');
    expect(result.hops).toHaveLength(2);
  });

  it('no loop while STP is on, even with both trunks up', () => {
    const network = createNetwork();
    expect(isLoopActive(network)).toBe(false);
    expect(stormFramesPerSecond(network, 5)).toBe(0);
  });

  it('disabling STP with both trunks up starts a loop; the storm ramps to 14,800 frames/s', () => {
    const network = createNetwork();
    setStpEnabled(network, false);
    expect(isLoopActive(network)).toBe(true);
    expect(stormFramesPerSecond(network, 0)).toBe(0);
    expect(stormFramesPerSecond(network, 1)).toBe(7_400);
    expect(stormFramesPerSecond(network, 2)).toBe(STORM_PEAK_FPS);
    expect(stormFramesPerSecond(network, 10)).toBe(STORM_PEAK_FPS);
    // Re-enabling STP breaks the loop at once.
    setStpEnabled(network, true);
    expect(isLoopActive(network)).toBe(false);
    expect(stormFramesPerSecond(network, 10)).toBe(0);
  });

  it('one trunk down means no loop even with STP off', () => {
    const network = createNetwork();
    setStpEnabled(network, false);
    setLinkUp(network, 'B', false);
    expect(isLoopActive(network)).toBe(false);
  });

  it('computeStp is idempotent and the four hosts cover both VLANs on both switches', () => {
    const network = createNetwork();
    expect(computeStp(network)).toBe('SW1');
    expect(computeStp(network)).toBe('SW1');
    expect(HOSTS).toHaveLength(4);
    expect(hostById('PC-A')?.vlan).toBe(10);
    expect(hostById('PC-D')?.vlan).toBe(20);
  });

  it('the CLI text shows the MAC tables and the spanning-tree root', () => {
    const network = createNetwork();
    deliverFrame(network, 'PC-A', '00:1a:2b:00:00:0c');
    const cli = switchCli(network);
    expect(cli).toContain('show mac address-table');
    expect(cli).toContain('00:1a:2b:00:00:0a');
    expect(cli).toContain('Root bridge: SW1');
    expect(cli).toContain('blocked');
    expect(showMacTable(switchById(network, 'SW1'))).toContain('Total Mac Addresses');
    expect(showSpanningTree(network)).toContain('802.1D');
  });
});
