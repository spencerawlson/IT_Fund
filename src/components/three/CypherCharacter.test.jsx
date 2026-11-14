import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CypherViewer, { CYPHER_CLIPS } from './CypherCharacter';

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

    // Rigid bone parenting (not vertex skinning): meshes are parented to
    // bones, and the clips animate the bones. So assert the bone hierarchy
    // is there, not a SkinnedMesh.
    let bones = 0;
    let meshesParentedToBones = 0;
    let headBone = null;
    gltf.scene.traverse((obj) => {
      if (obj.isBone) bones += 1;
      if (obj.isBone && obj.name === 'head') headBone = obj;
      if (obj.isMesh && obj.parent?.isBone) meshesParentedToBones += 1;
    });
    expect(bones).toBe(26);
    expect(meshesParentedToBones).toBeGreaterThan(0);
    expect(headBone).toBeTruthy();
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
});
