import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import * as THREE from 'three';
import MissionSocScene, {
  SOC_DEVICES, SOC_CAMERA_POS,
} from './MissionSocScene';
import { deviceShot } from './socLayout';

// The tick is the only thing under test here: the scene's GLB loads never
// resolve (no assets in jsdom), and labels need a real 2D canvas.
const captured = {};
vi.mock('@/components/three/ModelViewer', () => ({
  default: (props) => {
    captured.buildScene = props.buildScene;
    captured.cameraRef = props.cameraRef;
    return null;
  },
}));

vi.mock('@/components/three/labels', () => ({
  makeLabel: () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
    sprite.scale.set(1.5, 1.1, 1);
    return sprite;
  },
}));

vi.mock('@/components/three/deviceModels', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadDeviceModel: () => new Promise(() => {}) };
});

vi.mock('@/components/three/RobotCharacter', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadRobotCharacter: () => new Promise(() => {}) };
});

async function mountTick() {
  const speakerRef = { current: 'wide' };
  const showcaseRef = { current: null };
  let root;
  await act(async () => {
    root = TestRenderer.create(
      <MissionSocScene
        devices={SOC_DEVICES}
        incidentActive
        contained={false}
        speakerRef={speakerRef}
        showcaseRef={showcaseRef}
      />,
    );
  });
  const { buildScene, cameraRef } = captured;
  const { tick } = buildScene(new THREE.Scene());
  const camera = new THREE.PerspectiveCamera(42, 1.6, 0.1, 200);
  camera.position.set(...SOC_CAMERA_POS);
  cameraRef.current = camera;
  return { root, tick, camera, speakerRef, showcaseRef };
}

function shotDistance(camera, device) {
  const shot = deviceShot(device);
  return Math.hypot(
    camera.position.x - shot.pos[0],
    camera.position.y - shot.pos[1],
    camera.position.z - shot.pos[2],
  );
}

describe('MissionSocScene tick — showcase settle time', () => {
  it('at 1 fps the camera is on the device from the first frame of its dwell', async () => {
    // The showcase CUTS onto each device shot (a snap, not a glide):
    // the opening plays like a video, and a cut reads the instant its
    // dwell starts at ANY frame rate. Damping could not do that — dt is
    // clamped to 0.1 s, so at 1 fps a 4 s dwell was four 33%-of-the-way
    // frames and the camera never arrived (the two live checks saw a
    // slow orbit, never a dwell). The cut lands even on the first
    // frame, where dt is 0 and damping moves nothing.
    const { tick, camera, showcaseRef } = await mountTick();
    showcaseRef.current = 'PC1';
    let t = 0;
    tick(t);
    expect(shotDistance(camera, 'PC1')).toBe(0);
    for (let i = 0; i < 4; i += 1) {
      t += 1.0;
      tick(t);
    }
    expect(shotDistance(camera, 'PC1')).toBe(0);
  });

  it('switching devices cuts straight to the next shot', async () => {
    const { tick, camera, showcaseRef } = await mountTick();
    showcaseRef.current = 'PC1';
    let t = 0;
    tick(t);
    expect(shotDistance(camera, 'PC1')).toBe(0);
    t += 1.0;
    tick(t);
    showcaseRef.current = 'GUEST';
    t += 1.0;
    tick(t);
    expect(shotDistance(camera, 'GUEST')).toBe(0);
  });

  it('leaving the showcase glides back to wide — the cut is showcase-only', async () => {
    const { tick, camera, showcaseRef } = await mountTick();
    showcaseRef.current = 'SRV';
    let t = 0;
    tick(t);
    expect(shotDistance(camera, 'SRV')).toBe(0);
    showcaseRef.current = null;
    t += 1.0;
    tick(t);
    // One damped frame at 1 fps moves the camera only partway back:
    // the return to wide is a glide (it lasts indefinitely, so it has
    // time to settle), never a snap.
    const wide = { pos: [0, 19.5, 26] };
    const back = Math.hypot(
      camera.position.x - wide.pos[0],
      camera.position.y - wide.pos[1],
      camera.position.z - wide.pos[2],
    );
    expect(back).toBeGreaterThan(1);
  });

  it('at 60 fps the camera holds every device shot across its dwell', async () => {
    // The full tour at a normal frame rate: each device change cuts
    // onto that device's actual shot and the camera stays on it for
    // the whole dwell.
    const { tick, camera, showcaseRef } = await mountTick();
    let t = 0;
    for (const device of ['PC1', 'GUEST', 'R1', 'SRV']) {
      showcaseRef.current = device;
      tick(t);
      expect(shotDistance(camera, device)).toBe(0);
      for (let i = 0; i < 60; i += 1) {
        t += 1 / 60;
        tick(t);
      }
      expect(shotDistance(camera, device)).toBeLessThan(0.1);
    }
  });
});
