import * as THREE from 'three';
import { describe, it, expect, vi } from 'vitest';
import { makeGltfBuildScene } from './GltfSubject';
import { addLabel } from './labels';

// The GLB load is async and browser-only in production (it runs inside
// ModelViewer's effect), but the builder itself must be SSR-safe: calling
// buildScene must not touch the DOM or throw in a DOM-less run — the load
// starts, the empty parts array is returned, and the part registers when
// the model lands. This file runs in vitest's node environment (no
// document), which proves exactly that.
//
// The loader is faked: a 2×1×1 box stands in for a device model, and any
// URL containing "missing" fails the load.
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(url, onLoad, _onProgress, onError) {
      if (url.includes('missing')) {
        onError(new Error('404 Not Found'));
        return;
      }
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      const scene = new THREE.Scene();
      scene.add(mesh);
      onLoad({ scene });
    }
  },
}));

// makeLabel draws on a canvas — mock the label helper and assert the
// placement calls instead of exercising the canvas.
vi.mock('./labels', () => ({ addLabel: vi.fn() }));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('makeGltfBuildScene', () => {
  it('returns an empty parts array immediately (SSR-safe), then registers the whole model as one clickable part', async () => {
    const scene = new THREE.Scene();
    const buildScene = makeGltfBuildScene({
      url: '/models/lab-test.glb',
      label: 'Test Device',
      desc: 'A test device.',
    });
    const parts = buildScene(scene);
    expect(parts).toEqual([]);
    await flush();
    expect(parts).toHaveLength(1);
    expect(parts[0].label).toBe('Test Device');
    expect(parts[0].desc).toBe('A test device.');
    expect(parts[0].mesh).toBeInstanceOf(THREE.Group);
  });

  it('fits the model to the footprint and stands it on the floor', async () => {
    const scene = new THREE.Scene();
    const parts = makeGltfBuildScene({
      url: '/models/lab-fit.glb',
      label: 'Fit Device',
      desc: 'Fitted.',
    })(scene);
    await flush();
    const box = new THREE.Box3().setFromObject(parts[0].mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    // The fake 2×1×1 box is the longest dimension: fitted to 16 wide.
    expect(size.x).toBeCloseTo(16, 5);
    expect(size.y).toBeCloseTo(8, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
  });

  it('places floating labels from the fitted bounding box', async () => {
    const scene = new THREE.Scene();
    vi.mocked(addLabel).mockClear();
    makeGltfBuildScene({
      url: '/models/lab-labels.glb',
      label: 'Labelled Device',
      desc: 'Labelled.',
      annotations: [{ text: 'Test Part', at: [0.5, 1.08, 0.5] }],
    })(scene);
    await flush();
    // Fitted box: x [-8, 8], y [0, 8], z [-4, 4] — the label sits at the
    // centre of the top face, just above it.
    expect(addLabel).toHaveBeenCalledTimes(1);
    expect(addLabel).toHaveBeenCalledWith(scene, 'Test Part', 0, 8.64, 0);
  });

  it('a failed load leaves the stage empty instead of throwing', async () => {
    const scene = new THREE.Scene();
    const parts = makeGltfBuildScene({
      url: '/models/lab-missing.glb',
      label: 'Missing Device',
      desc: 'Never loads.',
    })(scene);
    await flush();
    expect(parts).toEqual([]);
  });
});
