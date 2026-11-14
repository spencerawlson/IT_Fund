import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CYPHER_NAME_TAG_TEXT,
  NAME_TAG_WIDTH,
  NAME_TAG_HEIGHT,
  drawNameTag,
  makeNameTag,
  faceTagToCamera,
  attachCypherNameTag,
} from './nameTag';

// A fake 2d context that records what is drawn (jsdom has no canvas, and
// the repo has no jsdom dependency — the tag helper takes an injectable
// canvas factory instead, so these tests run in plain node).
function fakeCtx() {
  const calls = { fillText: [] };
  return {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    fillText: (text, x, y) => { calls.fillText.push([text, x, y]); },
    measureText: () => ({ width: 400 }),
  };
}

function fakeCanvasFactory() {
  return () => {
    const ctx = fakeCtx();
    return {
      width: 0,
      height: 0,
      _ctx: ctx,
      getContext: () => ctx,
    };
  };
}

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

describe('CYPHER_NAME_TAG_TEXT', () => {
  it('reads "Hi, I\'m Cypher" — the robot\'s name, not the tutor spelling', () => {
    expect(CYPHER_NAME_TAG_TEXT).toBe("Hi, I'm Cypher");
  });
});

describe('drawNameTag', () => {
  it('draws a Hello-my-name-is tag reading "Hi, I\'m Cypher"', () => {
    const ctx = fakeCtx();
    drawNameTag(ctx, 1024, 592);
    const drawn = ctx.calls.fillText.map(([t]) => t);
    expect(drawn).toContain('HELLO');
    expect(drawn).toContain('my name is');
    // The greeting itself, split across the tag's two lines.
    expect(drawn).toContain("Hi, I'm");
    expect(drawn).toContain('Cypher');
    expect(drawn.join(' ')).toContain("Hi, I'm Cypher");
  });
});

describe('makeNameTag', () => {
  it('returns a plane mesh with the tag texture, sized for the chest', () => {
    const factory = fakeCanvasFactory();
    const tag = makeNameTag({ createCanvas: factory });
    expect(tag).toBeTruthy();
    expect(tag.isMesh).toBe(true);
    expect(tag.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(tag.geometry.parameters.width).toBe(NAME_TAG_WIDTH);
    expect(tag.geometry.parameters.height).toBe(NAME_TAG_HEIGHT);
    // A printed tag: unlit so the text stays crisp, transparent corners.
    expect(tag.material.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(tag.material.transparent).toBe(true);
    expect(tag.material.toneMapped).toBe(false);
    expect(tag.userData.isCypherNameTag).toBe(true);
  });

  it('returns null (never throws) when no canvas is available', () => {
    // No factory and no document in node: the SOC must never break on this.
    expect(makeNameTag()).toBeNull();
    expect(makeNameTag({ createCanvas: () => null })).toBeNull();
    expect(makeNameTag({ createCanvas: () => { throw new Error('no canvas'); } })).toBeNull();
  });
});

describe('attachCypherNameTag (real cypher.glb)', () => {
  it('pins the tag to the chest bone, in front of the torso, facing the camera', async () => {
    const gltf = await parseGlb();
    const group = gltf.scene;
    // Mirror the SOC: real scale 1.70 m scaled 2.2x, standing at his spot,
    // facing the room centre; camera fixed at [16, 12, 18].
    group.scale.setScalar(2.2);
    group.rotation.y = -Math.PI / 4;
    group.position.set(5.5, 0, -5.5);
    const cameraPos = [16, 12, 18];

    const tag = attachCypherNameTag(group, cameraPos, { createCanvas: fakeCanvasFactory() });
    expect(tag).toBeTruthy();

    // It rides the chest bone — not the scene, not a floating panel.
    let parent = tag.parent;
    let onChestBone = false;
    while (parent) {
      if (parent.isBone && parent.name === 'chest') onChestBone = true;
      parent = parent.parent;
    }
    expect(onChestBone).toBe(true);

    group.updateMatrixWorld(true);
    const tagPos = new THREE.Vector3();
    tag.getWorldPosition(tagPos);
    // Chest height in the SOC (chest bone ~1.10 m x 2.2 scale).
    expect(tagPos.y).toBeGreaterThan(2.2);
    expect(tagPos.y).toBeLessThan(2.8);
    // In front of the torso (chest front is z 0.255 in model units): the
    // tag sits proud of the chest along the direction Cypher faces
    // (group +Z rotated -PI/4 toward the room centre), not inside the body.
    // It does NOT point at the camera — the camera sits ~67° off his facing
    // axis, which is why the tag yaws to face it instead.
    const chestBone = (() => {
      let found = null;
      group.traverse((o) => { if (!found && o.isBone && o.name === 'chest') found = o; });
      return found;
    })();
    const chestPos = new THREE.Vector3();
    chestBone.getWorldPosition(chestPos);
    const facingDir = new THREE.Vector3(Math.sin(-Math.PI / 4), 0, Math.cos(-Math.PI / 4));
    const proud = tagPos.clone().sub(chestPos).dot(facingDir);
    expect(proud).toBeGreaterThan(0.5); // 0.27 model units x 2.2 scale = 0.594
    const toCamera = new THREE.Vector3(...cameraPos).sub(tagPos).normalize();

    // Facing the camera (world +Z of the tag points at it).
    const worldQuat = new THREE.Quaternion();
    tag.getWorldQuaternion(worldQuat);
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat);
    expect(facing.dot(toCamera)).toBeGreaterThan(0.9);
  });

  it('returns null when the character has no chest bone', () => {
    const group = new THREE.Group();
    const tag = attachCypherNameTag(group, [16, 12, 18], { createCanvas: fakeCanvasFactory() });
    expect(tag).toBeNull();
  });
});

describe('faceTagToCamera', () => {
  it('yaws the tag to face the camera without tilting it', () => {
    const parent = new THREE.Group();
    parent.rotation.y = -Math.PI / 4;
    parent.position.set(5.5, 0, -5.5);
    const tag = makeNameTag({ createCanvas: fakeCanvasFactory() });
    tag.position.set(0, 0.05, 0.27);
    parent.add(tag);
    parent.updateMatrixWorld(true);

    faceTagToCamera(tag, [16, 12, 18]);
    parent.updateMatrixWorld(true);
    const worldQuat = new THREE.Quaternion();
    tag.getWorldQuaternion(worldQuat);
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat);
    const tagPos = new THREE.Vector3();
    tag.getWorldPosition(tagPos);
    const toCamera = new THREE.Vector3(16, tagPos.y, 18).sub(tagPos).normalize();
    expect(facing.dot(toCamera)).toBeGreaterThan(0.99);
    // No pitch: the tag stays vertical.
    expect(Math.abs(facing.y)).toBeLessThan(0.01);
  });
});
