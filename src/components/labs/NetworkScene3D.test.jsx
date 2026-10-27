import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import NetworkScene3D, { layoutPositions, styleFor } from './NetworkScene3D';

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
