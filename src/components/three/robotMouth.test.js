import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ROBOT_MOUTHS, mouthShape, attachMouth } from './robotMouth';

if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
}
const MODELS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/models');
function parseGlb(key) {
  const buf = fs.readFileSync(path.join(MODELS_DIR, `${key}.glb`));
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });
}
// A canvas stand-in: records nothing, accepts every 2D call the mouth makes.
function fakeCanvas() {
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: 0, height: 0, getContext: () => ctx };
}
const bands = (from, to) => { const b = new Float32Array(24); for (let i = from; i <= to; i += 1) b[i] = 0.8; return b; };

describe('mouthShape', () => {
  it('is the closed smile when silent and opens with the voice level', () => {
    expect(mouthShape(0, null).open).toBe(0);
    expect(mouthShape(0.02, null).open).toBe(0);
    expect(mouthShape(0.3, null).open).toBeGreaterThan(0.3);
    expect(mouthShape(0.9, null).open).toBe(1);
  });

  it('rounds low-pitched sounds ("oh") and widens high-pitched ones ("ee")', () => {
    const oh = mouthShape(0.5, bands(0, 4));
    const ee = mouthShape(0.5, bands(7, 16));
    expect(oh.width).toBeLessThan(ee.width); // narrower
    expect(oh.height).toBeGreaterThan(ee.height); // taller
  });
});

describe('attachMouth', () => {
  it.each(Object.keys(ROBOT_MOUTHS))('puts %s’s mouth on his painted smile, attached to the head', async (key) => {
    const gltf = await parseGlb(key);
    gltf.scene.updateMatrixWorld(true);
    let head = null;
    gltf.scene.traverse((o) => { if (o.isBone && o.name === 'head') head = o; });
    const mouth = attachMouth(key, head, { createCanvas: fakeCanvas });
    expect(mouth).toBeTruthy();
    expect(mouth.mesh.parent).toBe(head); // follows the head through every clip
    gltf.scene.updateMatrixWorld(true);
    const at = mouth.mesh.getWorldPosition(new THREE.Vector3());
    const [x, y, z] = ROBOT_MOUTHS[key].center;
    expect(Math.abs(at.x - x)).toBeLessThan(0.005);
    expect(Math.abs(at.y - y)).toBeLessThan(0.02);
    expect(at.z).toBeGreaterThan(z); // just in front of the visor
    expect(at.z - z).toBeLessThan(0.01);
    mouth.update(0.5, bands(2, 9), 1 / 30);
    mouth.dispose();
    expect(mouth.mesh.parent).toBeNull();
  });

  it('builds nothing without a canvas (node) or for an unknown robot', () => {
    const bone = new THREE.Bone();
    expect(attachMouth('cypher', bone)).toBeNull();
    expect(attachMouth('nobody', bone, { createCanvas: fakeCanvas })).toBeNull();
  });
});
