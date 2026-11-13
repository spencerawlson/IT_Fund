import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import MissionTopology, {
  MISSION_TOPOLOGY_DEVICES,
  MISSION_TOPOLOGY_LINKS,
  topologyPositions,
} from './MissionTopology';

describe('topologyPositions', () => {
  it('places all four mission devices at distinct points', () => {
    const pos = topologyPositions();
    expect(Object.keys(pos).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    const coords = Object.values(pos).map((p) => `${p.x},${p.y}`);
    expect(new Set(coords).size).toBe(4);
  });

  it('puts R1 between the LAN hosts and the server', () => {
    const pos = topologyPositions();
    expect(pos.R1.x).toBeGreaterThan(pos.PC1.x);
    expect(pos.R1.x).toBeLessThan(pos.SRV.x);
  });
});

describe('mission topology data', () => {
  it('links PC1–R1, GUEST–R1 and R1–SRV', () => {
    expect(MISSION_TOPOLOGY_LINKS).toEqual([['PC1', 'R1'], ['GUEST', 'R1'], ['R1', 'SRV']]);
    expect(MISSION_TOPOLOGY_DEVICES.map((d) => d.id).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
  });
});

describe('MissionTopology', () => {
  it('renders the SVG diagram with every device (SSR smoke)', () => {
    const html = renderToString(<MissionTopology />);
    expect(html).toContain('<svg');
    for (const d of MISSION_TOPOLOGY_DEVICES) {
      expect(html).toContain(d.label);
      expect(html).toContain(d.ip);
    }
    expect(html).toContain('192.168.1.0/24');
    expect(html).toContain('192.168.2.0/24');
  });

  it('marks inspected devices and shows the blocked path', () => {
    const html = renderToString(
      <MissionTopology inspected={['R1', 'PC1']} guestBlocked onInspect={() => {}} />,
    );
    expect(html).toContain('inspected ✓');
    expect(html).toContain('BLOCKED');
  });

  it('shows ALLOWED on the trusted path once confirmed', () => {
    const html = renderToString(<MissionTopology trustedAllowed onInspect={() => {}} />);
    expect(html).toContain('ALLOWED');
  });
});
