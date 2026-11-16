import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import Switch3D from './Switch3D';
import ServerRack3D from './ServerRack3D';
import Motherboard3D from './Motherboard3D';
import Vpc3D from './Vpc3D';
import LoadBalancer3D from './LoadBalancer3D';
import Osi3D from './Osi3D';
import Router3D from './Router3D';
import Firewall3D from './Firewall3D';
import AccessPoint3D from './AccessPoint3D';
import Nas3D from './Nas3D';
import Ups3D from './Ups3D';
import RackServer3D from './RackServer3D';
import Cloud3D from './Cloud3D';
import PatchPanel3D from './PatchPanel3D';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The 3D scenes are thin wrappers around ModelViewer: mock the viewer and
// assert what each subject passes it. buildScene is never invoked — the
// WebGL scene itself is not what this test exercises.
const mockModelViewer = vi.fn(() => null);
vi.mock('./ModelViewer', () => ({ default: (...args) => mockModelViewer(...args) }));

function viewerPropsFor(Component) {
  mockModelViewer.mockClear();
  act(() => {
    TestRenderer.create(<Component />);
  });
  expect(mockModelViewer).toHaveBeenCalledTimes(1);
  return mockModelViewer.mock.calls[0][0];
}

describe('Visual Lab equipment subjects and OSI show their blueprint sheet, not a 3D model', () => {
  const cases = [
    [Switch3D, '/blueprint-network-switch-48-port.jpg'],
    [ServerRack3D, '/blueprint-network-rack-42u.jpg'],
    [RackServer3D, '/blueprint-rack-server-2u.jpg'],
    [Ups3D, '/blueprint-ups-rackmount-2u.jpg'],
    [PatchPanel3D, '/blueprint-patch-panel-48-port.jpg'],
    [Router3D, '/blueprint-network-router.jpg'],
    [AccessPoint3D, '/blueprint-wireless-access-point.jpg'],
    [Cloud3D, '/blueprint-cloud-architecture.jpg'],
    [Firewall3D, '/blueprint-firewall-ngfw.jpg'],
    [Nas3D, '/blueprint-nas-storage.jpg'],
    [Osi3D, '/blueprint-osi-model.jpg'],
  ];

  it.each(cases)('%o renders its sheet with a full-size link and no ModelViewer', (Component, sheet) => {
    mockModelViewer.mockClear();
    let root;
    act(() => {
      root = TestRenderer.create(<Component />);
    });
    expect(mockModelViewer).not.toHaveBeenCalled();
    const img = root.root.findByType('img');
    expect(img.props.src).toBe(sheet);
    expect(img.props.alt).toMatch(/blueprint/i);
    const link = root.root.findByType('a');
    expect(link.props.href).toBe(sheet);
    expect(link.props.target).toBe('_blank');
    expect(link.props.rel).toContain('noopener');
  });
});

describe('the procedural 3D subjects stay 3D (no blueprint sheet exists)', () => {
  it('they render ModelViewer with no fallback image', () => {
    for (const Component of [Motherboard3D, Vpc3D, LoadBalancer3D]) {
      expect(viewerPropsFor(Component).fallbackImage, Component.name).toBeUndefined();
    }
  });
});
