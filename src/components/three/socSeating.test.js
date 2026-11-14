import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Node polyfills: the Meshy cypher.glb embeds
// textures, and Three's GLTFLoader needs a browser image pipeline to
// decode them. The texture pixels are never inspected — only the seat.
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
}
import { createRobotController } from './RobotCharacter';
import { seatRobot } from './socSeating';

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

describe('seatRobot', () => {
  it('returns false with nothing to seat', () => {
    expect(seatRobot(null)).toBe(false);
    expect(seatRobot(undefined)).toBe(false);
    expect(seatRobot({})).toBe(false); // no sit()
    expect(seatRobot({ group: new THREE.Group() })).toBe(false);
  });

  it('seats the real Cypher on his chair: no clip can start, the pose survives frames', async () => {
    const gltf = await parseGlb();
    const controller = createRobotController(gltf);
    expect(controller.isSeated()).toBe(false);
    expect(seatRobot(controller)).toBe(true);
    expect(controller.isSeated()).toBe(true);

    // Seated geometry, in three.js metres (model faces +Z/south):
    // head at ~1.35 m (not the 1.70 m standing height), knees forward
    // of the hips, feet dangling above the floor — the seat the SOC
    // and the lesson panel share (one pose table, RobotCharacter).
    const bones = {};
    gltf.scene.traverse((obj) => { if (obj.isBone) bones[obj.name] = obj; });
    gltf.scene.updateMatrixWorld(true);
    const worldPos = (name) => {
      const v = new THREE.Vector3();
      bones[name].getWorldPosition(v);
      return v;
    };
    const head = worldPos('head');
    const knee = worldPos('kneeL');
    const foot = worldPos('footL');
    const hips = worldPos('hips');
    expect(head.y).toBeGreaterThan(1.2);
    expect(head.y).toBeLessThan(1.5);
    expect(knee.z).toBeGreaterThan(0.1);
    expect(knee.y).toBeLessThan(hips.y);
    expect(foot.y).toBeGreaterThan(0.15);
    expect(foot.y).toBeLessThan(0.4);

    // No clip can start while seated — not play(), not setTalking().
    expect(controller.play('walk')).toBe(false);
    expect(controller.play('idle')).toBe(false);
    controller.setTalking(true);
    expect(controller.isTalking()).toBe(true);
    controller.update(0.5);
    const talkAction = controller.mixer.existingAction(controller.clips.talk);
    expect(talkAction === null || !talkAction.isRunning()).toBe(true);
    // The pose survives frames: update() re-applies it after the mixer.
    gltf.scene.updateMatrixWorld(true);
    expect(worldPos('head').y).toBeCloseTo(head.y, 2);
    expect(worldPos('kneeL').y).toBeCloseTo(knee.y, 2);
    controller.dispose();
  });
});
