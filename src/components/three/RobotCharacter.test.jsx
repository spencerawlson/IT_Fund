import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Same node polyfills as CypherCharacter.test.jsx: the Meshy GLBs embed
// textures, and Three's GLTFLoader needs a browser image pipeline to
// decode them. The texture pixels are never inspected — only the scene,
// skin and clips.
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
}

const MODELS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../public/models',
);

function parseGlb(key) {
  const buf = fs.readFileSync(path.join(MODELS_DIR, `${key}.glb`));
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
}

const ROBOT_CLIPS = ['idle', 'walk', 'talk', 'point', 'greeting', 'thinking'];

describe('sentinel.glb and patch.glb', () => {
  it.each(['sentinel', 'patch'])('%s exists, parses, and carries the six robot clips', async (key) => {
    const glbPath = path.join(MODELS_DIR, `${key}.glb`);
    const buf = fs.readFileSync(glbPath);
    expect(buf.length).toBeGreaterThan(1_000_000);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(buf.readUInt32LE(4)).toBe(2);

    const gltf = await parseGlb(key);
    const names = gltf.animations.map((clip) => clip.name);
    for (const clip of ROBOT_CLIPS) expect(names).toContain(clip);
    expect(names).toHaveLength(ROBOT_CLIPS.length);

    let bones = 0;
    let skinnedMeshes = 0;
    let chestBone = null;
    let headBone = null;
    let triangles = 0;
    gltf.scene.traverse((obj) => {
      if (obj.isBone) bones += 1;
      if (obj.isBone && obj.name === 'chest') chestBone = obj;
      if (obj.isBone && obj.name === 'head') headBone = obj;
      if (obj.isSkinnedMesh) {
        skinnedMeshes += 1;
        expect(obj.skeleton.bones.length).toBe(24);
      }
      if (obj.isMesh && obj.geometry?.index) triangles += obj.geometry.index.count / 3;
      else if (obj.isMesh && obj.geometry?.attributes?.position) {
        triangles += obj.geometry.attributes.position.count / 3;
      }
    });
    expect(bones).toBe(24);
    expect(skinnedMeshes).toBe(1);
    expect(chestBone).toBeTruthy();
    expect(headBone).toBeTruthy();
    expect(triangles).toBeGreaterThan(5_000);
    expect(triangles).toBeLessThan(50_000);
    expect(fs.statSync(glbPath).size).toBeLessThan(2_000_000);
  });

  it('sentinel is 1.70 m with his chest bone at 0.97 m', async () => {
    const gltf = await parseGlb('sentinel');
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.y).toBeCloseTo(1.70, 1);
    let chest = null;
    gltf.scene.traverse((obj) => {
      if (!chest && obj.isBone && obj.name === 'chest') chest = obj;
    });
    gltf.scene.updateMatrixWorld(true);
    const chestPos = new THREE.Vector3();
    chest.getWorldPosition(chestPos);
    expect(chestPos.y).toBeCloseTo(0.97, 1);
  });

  it('patch is 1.70 m, 1.40 m wide (treads), with his chest bone at 0.90 m', async () => {
    const gltf = await parseGlb('patch');
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.y).toBeCloseTo(1.70, 1);
    expect(size.x).toBeCloseTo(1.40, 1);
    let chest = null;
    gltf.scene.traverse((obj) => {
      if (!chest && obj.isBone && obj.name === 'chest') chest = obj;
    });
    gltf.scene.updateMatrixWorld(true);
    const chestPos = new THREE.Vector3();
    chest.getWorldPosition(chestPos);
    expect(chestPos.y).toBeCloseTo(0.90, 1);
  });

  it('each robot plays every clip on an AnimationMixer without throwing', async () => {
    for (const key of ['sentinel', 'patch']) {
      const gltf = await parseGlb(key);
      const mixer = new THREE.AnimationMixer(gltf.scene);
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        action.play();
        mixer.update(0.5);
        expect(action.isRunning()).toBe(true);
        action.stop();
      }
      mixer.stopAllAction();
    }
  });
});

describe('datacenter.glb', () => {
  it('exists, parses, and is a static 4.85 x 2.70 x 5.21 m room with no clips', async () => {
    const glbPath = path.join(MODELS_DIR, 'datacenter.glb');
    const buf = fs.readFileSync(glbPath);
    expect(buf.length).toBeGreaterThan(1_000_000);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(buf.readUInt32LE(4)).toBe(2);
    expect(fs.statSync(glbPath).size).toBeLessThan(3_000_000);

    const gltf = await parseGlb('datacenter');
    expect(gltf.animations).toHaveLength(0);
    let meshes = 0;
    let triangles = 0;
    let bones = 0;
    gltf.scene.traverse((obj) => {
      if (obj.isBone) bones += 1;
      if (obj.isMesh) {
        meshes += 1;
        const g = obj.geometry;
        triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    expect(bones).toBe(0);
    expect(meshes).toBe(1);
    expect(triangles).toBeGreaterThan(50_000);
    expect(triangles).toBeLessThan(70_000);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    expect(size.x).toBeCloseTo(4.85, 1);
    expect(size.y).toBeCloseTo(2.70, 1);
    expect(size.z).toBeCloseTo(5.21, 1);
  });
});

describe('createRobotController', () => {
  it('drives any of the three robots by the same six clip names', async () => {
    const { createRobotController } = await import('./RobotCharacter');
    for (const key of ['cypher', 'sentinel', 'patch']) {
      const gltf = await parseGlb(key);
      const controller = createRobotController(gltf);
      expect(controller.clipNames.sort()).toEqual([...ROBOT_CLIPS].sort());
      expect(controller.play('idle')).toBe(true);
      expect(controller.play('walk')).toBe(true);
      expect(controller.play('talk')).toBe(true);
      expect(controller.play('point')).toBe(true);
      expect(controller.play('greeting')).toBe(true);
      expect(controller.play('thinking')).toBe(true);
      expect(controller.play('nope')).toBe(false);
      controller.setTalking(true);
      expect(controller.isTalking()).toBe(true);
      controller.update(0.1);
      controller.setTalking(false);
      expect(controller.isTalking()).toBe(false);
      controller.update(0.1);
      controller.dispose();
    }
  });

  it('Patch is driven as-is: his walk clip plays without any humanoid forcing', async () => {
    const { createRobotController } = await import('./RobotCharacter');
    const gltf = await parseGlb('patch');
    const controller = createRobotController(gltf);
    expect(controller.play('walk')).toBe(true);
    controller.update(0.5);
    // Treads stay planted: no leg bones swing a walk cycle — the clip is a
    // bob/rock, and the controller never rewrites bone transforms.
    controller.dispose();
  });
});

describe('preloadMissionRobots', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetches all four mission GLBs once each, and never rejects', async () => {
    const mod = await import('./RobotCharacter');
    const urls = [];
    const fetchImpl = (url) => {
      urls.push(url);
      return Promise.resolve({ ok: true });
    };
    await expect(mod.preloadMissionRobots(fetchImpl)).resolves.toBeUndefined();
    expect(urls).toHaveLength(4);
    for (const key of ['cypher', 'sentinel', 'patch', 'datacenter']) {
      expect(urls.some((u) => u.includes(`models/${key}.glb`))).toBe(true);
    }
    // A second call reuses the in-flight/completed fetches — no new requests.
    await mod.preloadMissionRobots(fetchImpl);
    expect(urls).toHaveLength(4);
  });

  it('swallows a failed fetch — the SOC still loads on demand', async () => {
    const mod = await import('./RobotCharacter');
    const fetchImpl = () => Promise.reject(new Error('offline'));
    await expect(mod.preloadMissionRobots(fetchImpl)).resolves.toBeUndefined();
  });

  it('preloadRobotCharacter fetches one robot GLB once', async () => {
    const mod = await import('./RobotCharacter');
    const urls = [];
    const fetchImpl = (url) => {
      urls.push(url);
      return Promise.resolve({ ok: true });
    };
    await mod.preloadRobotCharacter('sentinel', fetchImpl);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('models/sentinel.glb');
    await mod.preloadRobotCharacter('sentinel', fetchImpl);
    expect(urls).toHaveLength(1);
  });
});
