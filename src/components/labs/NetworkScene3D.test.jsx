import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import NetworkScene3D, { layoutPositions, styleFor, radiusFor } from './NetworkScene3D';

describe('layoutPositions', () => {
  it('places every device at a distinct point', () => {
    const pos = layoutPositions(['a', 'b', 'c', 'd']);
    expect(Object.keys(pos)).toHaveLength(4);
    const coords = Object.values(pos).map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    expect(new Set(coords).size).toBe(4); // no two devices overlap
  });

  it('centres a single device', () => {
    expect(layoutPositions(['solo'])).toEqual({ solo: { x: 0, y: 1, z: 0 } });
  });

  it('spaces larger topologies on a wider ring', () => {
    expect(radiusFor(3)).toBeLessThan(radiusFor(7)); // more devices => bigger ring
    expect(radiusFor(2)).toBeGreaterThanOrEqual(9);   // a floor so tiny nets aren't cramped
    // nodes on the wider ring really are farther from centre
    const small = layoutPositions(['a', 'b', 'c']).a;
    const big = layoutPositions(['a', 'b', 'c', 'd', 'e', 'f', 'g']).a;
    expect(Math.hypot(big.x, big.z)).toBeGreaterThan(Math.hypot(small.x, small.z));
  });
});

describe('styleFor', () => {
  it('maps roles to the right shape', () => {
    expect(styleFor('Gateway router').shape).toBe('box');
    expect(styleFor('Internet / upstream cloud').shape).toBe('sphere');
    expect(styleFor('Perimeter firewall').color).toBe(0xdc2626);
  });
});

describe('NetworkScene3D', () => {
  it('renders without throwing (WebGL effect does not run under SSR)', () => {
    const html = renderToString(
      <NetworkScene3D
        devices={['pc1', 'sw1', 'r1']}
        links={[['pc1', 'sw1'], ['sw1', 'r1']]}
        roleById={{ pc1: 'Workstation', sw1: 'Access switch', r1: 'Router' }}
      />,
    );
    expect(typeof html).toBe('string');
  });
});
