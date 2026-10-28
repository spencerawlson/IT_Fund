import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import NetworkScene3D, { layoutPositions, radiusFor } from './NetworkScene3D';
import { modelKeyFor, fallbackBuilderFor, modelUrl } from '@/components/three/deviceModels';

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
    expect(radiusFor(3)).toBeLessThan(radiusFor(7));
    expect(radiusFor(2)).toBeGreaterThanOrEqual(14);
    const small = layoutPositions(['a', 'b', 'c']).a;
    const big = layoutPositions(['a', 'b', 'c', 'd', 'e', 'f', 'g']).a;
    expect(Math.hypot(big.x, big.z)).toBeGreaterThan(Math.hypot(small.x, small.z));
  });
});

describe('device model mapping', () => {
  it('maps each role to the right GLB asset key', () => {
    expect(modelKeyFor('Access switch')).toBe('switch');
    expect(modelKeyFor('Gateway router')).toBe('router');
    expect(modelKeyFor('DMZ web server')).toBe('server');
    expect(modelKeyFor('Perimeter firewall')).toBe('firewall');
    expect(modelKeyFor('Internet / upstream cloud')).toBe('cloud');
    expect(modelKeyFor('Workstation')).toBe('pc');
  });

  it('serves assets from /models', () => {
    expect(modelUrl('router')).toMatch(/models\/router\.glb$/);
  });

  it('has a procedural fallback builder for every role', () => {
    for (const role of ['switch', 'router', 'server', 'firewall', 'cloud', 'host']) {
      expect(typeof fallbackBuilderFor(role)).toBe('function');
    }
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
