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
  NAME_TAG_CANVAS_HEIGHT,
  NAME_TAG_NAME_FONT_PX,
  NAME_CAP_HEIGHT_RATIO,
  drawNameTag,
  fitNameFont,
  makeNameTag,
  faceTagToCamera,
  attachCypherNameTag,
} from './nameTag';
import { CYPHER_SPAWN, SOC_CAMERA_POS } from './MissionSocScene';

// A fake 2d context that records what is drawn (jsdom has no canvas, and
// the repo has no jsdom dependency — the tag helper takes an injectable
// canvas factory instead, so these tests run in plain node). Each fillText
// records the font in force at the time, so the name-size tests can read
// the exact font the draw code chose.
function fakeCtx() {
  const calls = { fillText: [] };
  const ctx = {
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
    fillText: (text, x, y) => { calls.fillText.push([text, x, y, ctx.font]); },
    measureText: () => ({ width: 400 }),
  };
  return ctx;
}

/** The font px of a recorded fillText call. */
function fontPxOf(call) {
  const m = /(\d+)px/.exec(call[3] || '');
  return m ? Number(m[1]) : 0;
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

  it('draws the NAME as big as the tag allows — the readable part at room distance', () => {
    // The live check (PR #60) could not read the name at all: "Cypher" was
    // 168px on the canvas, ~5px on screen. The name must dominate the tag
    // now: its cap height is at least 30% of the tag height, so at the SOC
    // camera (tag ~54px tall on the 706x400 frame) it renders ~19px.
    const ctx = fakeCtx();
    drawNameTag(ctx, 1024, 592);
    const nameCall = ctx.calls.fillText.find(([t]) => t === 'Cypher');
    expect(nameCall).toBeTruthy();
    const namePx = fontPxOf(nameCall);
    expect(namePx).toBeGreaterThanOrEqual(280);
    expect(namePx).toBeLessThanOrEqual(NAME_TAG_NAME_FONT_PX);
    const capFraction = (namePx * NAME_CAP_HEIGHT_RATIO) / NAME_TAG_CANVAS_HEIGHT;
    expect(capFraction).toBeGreaterThan(0.3);
    // And the name is bigger than the greeting line above it.
    const greetingCall = ctx.calls.fillText.find(([t]) => t === "Hi, I'm");
    expect(namePx).toBeGreaterThan(fontPxOf(greetingCall));
  });
});

describe('fitNameFont', () => {
  it('returns the start size when the name fits the tag width', () => {
    const ctx = fakeCtx(); // measureText returns 400, well under 950
    expect(fitNameFont(ctx, 'Cypher', 300, 950)).toBe(300);
  });

  it('shrinks proportionally when the name is too wide for the tag', () => {
    const ctx = fakeCtx();
    ctx.measureText = () => ({ width: 2000 }); // a very wide font
    const fitted = fitNameFont(ctx, 'Cypher', 300, 950);
    expect(fitted).toBeLessThan(300);
    expect(fitted).toBeGreaterThanOrEqual(140); // 300 * 950 / 2000 = 142
  });

  it('never returns 0 or a negative size on a broken measureText', () => {
    const ctx = fakeCtx();
    ctx.measureText = () => ({ width: 0 });
    expect(fitNameFont(ctx, 'Cypher', 300, 950)).toBe(300);
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
    // Mirror the SOC: real scale 1.70 m scaled 3.0x, standing at his spot,
    // facing the camera (the learner); camera fixed at SOC_CAMERA_POS.
    group.scale.setScalar(CYPHER_SPAWN.scale);
    group.rotation.y = CYPHER_SPAWN.rotationY;
    group.position.set(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z);
    const cameraPos = SOC_CAMERA_POS;

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
    // Chest height in the SOC (chest bone ~1.10 m x 3.0 scale, plus the
    // 0.05 local tag offset): ~3.45.
    expect(tagPos.y).toBeGreaterThan(3.1);
    expect(tagPos.y).toBeLessThan(3.8);
    // In front of the torso (chest front is z 0.255 in model units): the
    // tag sits proud of the chest along the direction Cypher faces
    // (group +Z rotated to face the camera), not inside the body.
    const chestBone = (() => {
      let found = null;
      group.traverse((o) => { if (!found && o.isBone && o.name === 'chest') found = o; });
      return found;
    })();
    const chestPos = new THREE.Vector3();
    chestBone.getWorldPosition(chestPos);
    const facingDir = new THREE.Vector3(
      Math.sin(CYPHER_SPAWN.rotationY), 0, Math.cos(CYPHER_SPAWN.rotationY),
    );
    const proud = tagPos.clone().sub(chestPos).dot(facingDir);
    expect(proud).toBeGreaterThan(0.7); // 0.27 model units x 3.0 scale = 0.81
    const toCamera = new THREE.Vector3(...cameraPos).sub(tagPos).normalize();

    // Facing the camera (world +Z of the tag points at it). He faces the
    // camera now, so the yaw is small — the tag still yaws every tick, so
    // it keeps facing the camera through the walk-in and idle.
    const worldQuat = new THREE.Quaternion();
    tag.getWorldQuaternion(worldQuat);
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat);
    expect(facing.dot(toCamera)).toBeGreaterThan(0.9);
  });

  it('returns null when the character has no chest bone', () => {
    const group = new THREE.Group();
    const tag = attachCypherNameTag(group, SOC_CAMERA_POS, { createCanvas: fakeCanvasFactory() });
    expect(tag).toBeNull();
  });
});

describe('faceTagToCamera', () => {
  it('yaws the tag to face the camera without tilting it', () => {
    const parent = new THREE.Group();
    parent.rotation.y = CYPHER_SPAWN.rotationY;
    parent.position.set(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z);
    const tag = makeNameTag({ createCanvas: fakeCanvasFactory() });
    tag.position.set(0, 0.05, 0.27);
    parent.add(tag);
    parent.updateMatrixWorld(true);

    faceTagToCamera(tag, SOC_CAMERA_POS);
    parent.updateMatrixWorld(true);
    const worldQuat = new THREE.Quaternion();
    tag.getWorldQuaternion(worldQuat);
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat);
    const tagPos = new THREE.Vector3();
    tag.getWorldPosition(tagPos);
    const toCamera = new THREE.Vector3(SOC_CAMERA_POS[0], tagPos.y, SOC_CAMERA_POS[2]).sub(tagPos).normalize();
    expect(facing.dot(toCamera)).toBeGreaterThan(0.99);
    // No pitch: the tag stays vertical.
    expect(Math.abs(facing.y)).toBeLessThan(0.01);
  });
});
