import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CypherViewer, { CYPHER_CLIPS } from './CypherCharacter';

// The new Meshy GLBs embed textures, and Three's GLTFLoader needs a
// browser image pipeline to decode them (createImageBitmap + self.URL).
// Plain node has neither, so parsing would reject at loadTexture —
// unrelated to the asset. These two stubs let the loader finish: the
// texture pixels are never inspected, only the scene, skin and clips.
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
}

// The real Cypher GLB, parsed straight from the repo (no server, no fetch):
// GLTFLoader.parse reads the bytes, so this proves the shipped asset loads
// in the same loader the SOC and the lesson panel use.
const GLB_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../public/models/cypher.glb',
);

function parseGlb() {
  const buf = fs.readFileSync(GLB_PATH);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
}

describe('cypher.glb', () => {
  it('exists and is a real glTF 2.0 binary', () => {
    const buf = fs.readFileSync(GLB_PATH);
    expect(buf.length).toBeGreaterThan(1_000_000);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(buf.readUInt32LE(4)).toBe(2);
  });

  it('parses in Three.js with the scene, the skin, and all six clips', async () => {
    const gltf = await parseGlb();
    expect(gltf.scene).toBeTruthy();

    const names = gltf.animations.map((clip) => clip.name);
    for (const clip of CYPHER_CLIPS) {
      expect(names).toContain(clip);
    }
    // No stray object-action clips (the blink rides the idle clip).
    expect(names).toHaveLength(CYPHER_CLIPS.length);

    // Vertex skinning (Meshy rig): ONE SkinnedMesh driven by a 24-bone
    // skeleton — not the procedural model's rigid bone parenting.
    let bones = 0;
    let skinnedMeshes = 0;
    let headBone = null;
    let chestBone = null;
    gltf.scene.traverse((obj) => {
      if (obj.isBone) bones += 1;
      if (obj.isBone && obj.name === 'head') headBone = obj;
      if (obj.isBone && obj.name === 'chest') chestBone = obj;
      if (obj.isSkinnedMesh) {
        skinnedMeshes += 1;
        expect(obj.skeleton).toBeTruthy();
        expect(obj.skeleton.bones.length).toBe(24);
      }
    });
    expect(bones).toBe(24);
    expect(skinnedMeshes).toBe(1);
    expect(headBone).toBeTruthy();
    expect(chestBone).toBeTruthy();
  });

  it('plays each clip on an AnimationMixer without throwing', async () => {
    const gltf = await parseGlb();
    const mixer = new THREE.AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.play();
      mixer.update(0.5);
      expect(action.isRunning()).toBe(true);
      action.stop();
    }
    mixer.stopAllAction();
  });

  it('is a reasonable size for the browser (triangles and file size)', async () => {
    const gltf = await parseGlb();
    let triangles = 0;
    gltf.scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry?.index) triangles += obj.geometry.index.count / 3;
      else if (obj.isMesh && obj.geometry?.attributes?.position) {
        triangles += obj.geometry.attributes.position.count / 3;
      }
    });
    expect(triangles).toBeGreaterThan(5_000);
    expect(triangles).toBeLessThan(50_000);
    expect(fs.statSync(GLB_PATH).size).toBeLessThan(2_000_000);
  });

  it('is the real 1.70 m model with the chest bone at 0.88 m', async () => {
    const gltf = await parseGlb();
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.y).toBeCloseTo(1.70, 1);
    let chest = null;
    gltf.scene.traverse((obj) => {
      if (!chest && obj.isBone && obj.name === 'chest') chest = obj;
    });
    expect(chest).toBeTruthy();
    gltf.scene.updateMatrixWorld(true);
    const chestPos = new THREE.Vector3();
    chest.getWorldPosition(chestPos);
    expect(chestPos.y).toBeCloseTo(0.88, 1);
  });
});

describe('CypherViewer', () => {
  it('renders without throwing (WebGL effect does not run under SSR)', () => {
    const html = renderToString(<CypherViewer voiceRef={{ current: { talking: false, level: 0 } }} />);
    expect(typeof html).toBe('string');
    // Presenter-only: fixed camera, no drag/zoom/click, no hint bar.
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });

  it('frames the real 1.70 m Cypher head-to-toe in the panel camera', () => {
    // The panel camera is [0, 1.6, 5.2] -> target [0, 0.85, 0], FOV 42
    // (see CypherViewer). At 5.2 m the vertical coverage is
    // 2 * 5.2 * tan(21°) ~= 3.99 units, so the 1.70 m model fills ~43% of
    // the frame height — a full-body presenter, not a cropped torso.
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    cam.position.set(0, 1.6, 5.2);
    cam.lookAt(0, 0.85, 0);
    cam.updateMatrixWorld(true);
    const projectPx = (v) => {
      const p = v.clone().project(cam);
      return { x: (p.x + 1) / 2 * 224, y: (1 - p.y) / 2 * 224, behind: p.z > 1 };
    };
    const feet = projectPx(new THREE.Vector3(0, 0, 0));
    const head = projectPx(new THREE.Vector3(0, 1.704, 0));
    expect(feet.behind).toBe(false);
    expect(head.behind).toBe(false);
    for (const px of [feet, head]) {
      expect(px.x).toBeGreaterThanOrEqual(0);
      expect(px.x).toBeLessThanOrEqual(224);
      expect(px.y).toBeGreaterThanOrEqual(0);
      expect(px.y).toBeLessThanOrEqual(224);
    }
    expect(feet.y - head.y).toBeGreaterThanOrEqual(80);
  });
});

describe('preloadCypherCharacter', () => {
  // preloadCypherCharacter warms the browser cache for cypher.glb so the
  // SOC scene's load resolves fast on direct entry, not only on the handoff
  // path (whose lesson panel already warmed the cache by loading the same
  // GLB). The module caches the fetch, so each test gets a fresh instance.
  beforeEach(() => {
    vi.resetModules();
  });

  async function freshPreload() {
    const mod = await import('./CypherCharacter');
    return mod.preloadCypherCharacter;
  }

  it('fetches the Cypher GLB URL once, and never rejects', async () => {
    const preload = await freshPreload();
    const urls = [];
    const fetchImpl = (url) => {
      urls.push(url);
      return Promise.resolve({ ok: true });
    };
    await expect(preload(fetchImpl)).resolves.toBeUndefined();
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('models/cypher.glb');
    // A second call reuses the in-flight/completed fetch — no second request.
    await preload(fetchImpl);
    expect(urls).toHaveLength(1);
  });

  it('is a no-op without a fetch implementation (SSR / node) and never throws', async () => {
    const preload = await freshPreload();
    await expect(preload(null)).resolves.toBeUndefined();
    await expect(preload(undefined)).resolves.toBeUndefined();
  });

  it('swallows a failed fetch — the SOC still loads on demand', async () => {
    const preload = await freshPreload();
    const fetchImpl = () => Promise.reject(new Error('offline'));
    await expect(preload(fetchImpl)).resolves.toBeUndefined();
  });
});
