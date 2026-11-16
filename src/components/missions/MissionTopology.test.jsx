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

  it('puts the LAN labels under their cards, never on a link', () => {
    // Live report (2026-11-16): the mid-link labels had a connecting line
    // crossing straight through the text. One label per LAN now, under its
    // cards — User LAN under the left cluster's lowest card (GUEST, box
    // bottom 258 → label at 278), Server LAN under the SRV card (box
    // bottom 178 → label at 198). The path state stays on its link
    // (GUEST–R1 BLOCKED at midY + 18 = 208).
    const html = renderToString(<MissionTopology guestBlocked onInspect={() => {}} />);
    const labelYs = (text) => {
      const re = new RegExp(`<text x="\\d+" y="(\\d+)"[^>]*>${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</text>`, 'g');
      return [...html.matchAll(re)].map((m) => Number(m[1]));
    };
    expect(labelYs('User LAN · 192.168.1.0/24')).toEqual([278]);
    expect(labelYs('Server LAN · 192.168.2.0/24')).toEqual([198]);
    expect(labelYs('BLOCKED')).toEqual([208]);
  });

  it('renders R1’s two gateway IPs on two lines, inside the card', () => {
    // Live report (2026-11-16): "192.168.1.1 / 192.168.2.1" on one line
    // ran to the very edge of the 104-wide card and was unreadable. Each
    // address is its own <text> now, both inside the box (y 10 and 22,
    // box spans -28..28). The list below the diagram still shows the
    // combined string, so the smoke test above still finds it there.
    const html = renderToString(<MissionTopology />);
    const svg = html.slice(0, html.indexOf('</svg>'));
    expect(svg).toContain('>192.168.1.1</text>');
    expect(svg).toContain('>192.168.2.1</text>');
    expect(svg).not.toContain('192.168.1.1 / 192.168.2.1');
  });
});
