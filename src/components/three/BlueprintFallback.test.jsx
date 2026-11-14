import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import Switch3D from './Switch3D';
import ServerRack3D from './ServerRack3D';
import Motherboard3D from './Motherboard3D';
import Vpc3D from './Vpc3D';
import LoadBalancer3D from './LoadBalancer3D';
import Osi3D from './Osi3D';

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

describe('3D subjects pass a blueprint fallback only where one fits', () => {
  it('Switch3D falls back to the switch sheet', () => {
    expect(viewerPropsFor(Switch3D).fallbackImage).toBe('/blueprint-network-switch-48-port.jpg');
  });

  it('ServerRack3D falls back to the 42U rack sheet', () => {
    expect(viewerPropsFor(ServerRack3D).fallbackImage).toBe('/blueprint-network-rack-42u.jpg');
  });

  it('the other 3D subjects have no fallback image', () => {
    for (const Component of [Motherboard3D, Vpc3D, LoadBalancer3D, Osi3D]) {
      expect(viewerPropsFor(Component).fallbackImage, Component.name).toBeUndefined();
    }
  });
});
