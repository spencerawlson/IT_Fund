import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import MissionSocScene, { SOC_DEVICES, socPositions, CYPHER_SPAWN } from './MissionSocScene';

describe('socPositions', () => {
  it('places all four lab devices at distinct points', () => {
    const pos = socPositions();
    expect(Object.keys(pos).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    const coords = Object.values(pos).map((p) => `${p.x},${p.z}`);
    expect(new Set(coords).size).toBe(4);
  });

  it('covers exactly the four lab devices', () => {
    expect(SOC_DEVICES.map((d) => d.id).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    expect(SOC_DEVICES.find((d) => d.id === 'R1').role).toMatch(/router/i);
    expect(SOC_DEVICES.find((d) => d.id === 'SRV').role).toMatch(/server/i);
  });
});

describe('MissionSocScene', () => {
  it('renders without throwing (WebGL effect does not run under SSR)', () => {
    const html = renderToString(
      <MissionSocScene devices={SOC_DEVICES} incidentActive contained={false} />,
    );
    expect(typeof html).toBe('string');
    // Presenter-only: fixed camera, no drag/zoom/click, no hint bar.
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('CYPHER_SPAWN', () => {
  it('places Cypher inside the SOC, facing the room centre', () => {
    // The SOC floor is 18 x 12 (x ±9, z ±6); (5.5, -5.5) is inside it,
    // beside the east wall. Scale 2.2 lifts the real-scale 1.70 m model so
    // he reads beside the 5-unit devices; rotation -PI/4 faces the centre.
    expect(CYPHER_SPAWN.x).toBe(5.5);
    expect(CYPHER_SPAWN.z).toBe(-5.5);
    expect(CYPHER_SPAWN.x).toBeGreaterThan(0);
    expect(CYPHER_SPAWN.x).toBeLessThan(9);
    expect(CYPHER_SPAWN.z).toBeGreaterThan(-6);
    expect(CYPHER_SPAWN.z).toBeLessThan(6);
    expect(CYPHER_SPAWN.scale).toBe(2.2);
    expect(CYPHER_SPAWN.rotationY).toBeCloseTo(-Math.PI / 4);
  });
});
