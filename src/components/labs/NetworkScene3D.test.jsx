import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import NetworkScene3D, { layoutPositions, builderFor, radiusFor } from './NetworkScene3D';

describe('layoutPositions', () => {
  it('places every device at a distinct point', () => {
    const pos = layoutPositions(['a', 'b', 'c', 'd']);
    expect(Object.keys(pos)).toHaveLength(4);
    const coords = Object.values(pos).map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    expect(new Set(coords).size).toBe(4); // no two devices overlap
  });

  it('centres a single device', () => {
    expect(layoutPositions(['solo'])).toEqual({ solo: { x: 0, y: 0, z: 0 } });
  });

  it('spaces larger topologies on a wider ring', () => {
    expect(radiusFor(3)).toBeLessThan(radiusFor(7)); // more devices => bigger ring
    expect(radiusFor(2)).toBeGreaterThanOrEqual(14);  // a floor so tiny nets aren't cramped
    const small = layoutPositions(['a', 'b', 'c']).a;
    const big = layoutPositions(['a', 'b', 'c', 'd', 'e', 'f', 'g']).a;
    expect(Math.hypot(big.x, big.z)).toBeGreaterThan(Math.hypot(small.x, small.z));
  });
});

describe('builderFor', () => {
  it('maps each role to the right Visual-Lab model builder', () => {
    expect(builderFor('Access switch').name).toBe('buildSwitch');
    expect(builderFor('Gateway router').name).toBe('buildSwitch');
    expect(builderFor('DMZ web server').name).toBe('buildRack');
    expect(builderFor('Perimeter firewall').name).toBe('buildLoadBalancer');
    expect(builderFor('Internet / upstream cloud').name).toBe('buildVpc');
    expect(builderFor('Workstation').name).toBe('buildMotherboard');
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
