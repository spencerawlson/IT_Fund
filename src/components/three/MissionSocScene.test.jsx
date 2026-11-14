import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import MissionSocScene, {
  SOC_DEVICES, socPositions, CYPHER_SPAWN, SOC_CAMERA_POS, SOC_CAMERA_TARGET,
} from './MissionSocScene';
import {
  NAME_TAG_HEIGHT, NAME_TAG_CANVAS_HEIGHT, NAME_CAP_HEIGHT_RATIO, drawNameTag,
} from './nameTag';

describe('socPositions', () => {
  it('places all four lab devices at distinct points', () => {
    const pos = socPositions();
    expect(Object.keys(pos).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    const coords = Object.values(pos).map((p) => `${p.x},${p.z}`);
    expect(new Set(coords).size).toBe(4);
  });

  it('covers exactly the four lab devices', () => {
    expect(SOC_DEVICES.map((d) => d.id).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    expect(SOC_DEVICES.find((d) => d.id === 'R1').role).toMatch(/router/i);
    expect(SOC_DEVICES.find((d) => d.id === 'SRV').role).toMatch(/server/i);
  });
});

describe('MissionSocScene', () => {
  it('renders without throwing (WebGL effect does not run under SSR)', () => {
    const html = renderToString(
      <MissionSocScene devices={SOC_DEVICES} incidentActive contained={false} />,
    );
    expect(typeof html).toBe('string');
    // Presenter-only: fixed camera, no drag/zoom/click, no hint bar.
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });

  it('frames the SOC as a video card — a 16:9 frame, not a tall box', () => {
    const html = renderToString(
      <MissionSocScene devices={SOC_DEVICES} incidentActive contained={false} />,
    );
    // The Cypher presentation renders like a video player card.
    expect(html).toContain('aspect-video');
    expect(html).not.toContain('h-[26rem]');
    expect(html).not.toContain('sm:h-[30rem]');
  });
});

describe('CYPHER_SPAWN', () => {
  it('places Cypher inside the SOC, facing the camera (the learner)', () => {
    // The SOC floor is 26 x 18 (x ±13, z ±9); (6, 2) is open floor on the
    // camera side of the room, clear of every device. Scale 3.0 lifts the
    // real-scale 1.70 m model so he reads beside the 5-unit devices;
    // rotation atan2(7, 13) faces him from (6, 2) at the camera's ground
    // position (13, 15) — a presenter facing his audience, the room
    // behind him. The old spot (5.5, -5.5) put the 5-unit SRV rack
    // between him and the camera, hiding his chest and tag.
    expect(CYPHER_SPAWN.x).toBe(6);
    expect(CYPHER_SPAWN.z).toBe(2);
    expect(CYPHER_SPAWN.x).toBeGreaterThan(0);
    expect(CYPHER_SPAWN.x).toBeLessThan(9);
    expect(CYPHER_SPAWN.z).toBeGreaterThan(-6);
    expect(CYPHER_SPAWN.z).toBeLessThan(6);
    expect(CYPHER_SPAWN.scale).toBe(3.0);
    expect(CYPHER_SPAWN.rotationY).toBeCloseTo(Math.atan2(13 - 6, 15 - 2), 3);
  });
});

// The SOC camera, the tag and the sightlines — the legibility + visibility
// bar for the fix, measured against the real cypher.glb + the real camera.
// These are pure geometry (no WebGL, no entry-path state): they hold on
// direct entry and on reload exactly as on the handoff path, because the
// scene mounts Cypher unconditionally whenever the 3D view mounts — there
// is no handoff gate in the code. The live failures they guard:
//  - PR #60 live check: the name was ~5px tall and unreadable; Cypher
//    himself ~45px tall; his chest and tag were hidden behind the SRV rack.
//  - Direct entry showed no Cypher at all: cold GLB cache (the handoff
//    path pre-warms it via the lesson panel) + the occlusion + the size.
//    The cache gap is closed by preloadCypherCharacter (called on
//    MissionWorkspace mount); the occlusion and size are closed here.

const FRAME_W = 706; // live-measured SOC frame on a 1920x1000 desktop
const FRAME_H = 400;
const CHEST_BONE_Y = 1.10; // chest bone height in cypher.glb, model units
const CYPHER_HEIGHT = 1.747; // full model height in cypher.glb, model units

function socCamera() {
  const cam = new THREE.PerspectiveCamera(42, FRAME_W / FRAME_H, 0.1, 1000);
  cam.position.set(...SOC_CAMERA_POS);
  cam.lookAt(...SOC_CAMERA_TARGET);
  cam.updateMatrixWorld(true);
  return cam;
}

function projectPx(cam, v) {
  const p = v.clone().project(cam);
  return { x: (p.x + 1) / 2 * FRAME_W, y: (1 - p.y) / 2 * FRAME_H, behind: p.z > 1 };
}

/** Segment (p0 -> p1) vs an axis-aligned box: true when it passes through. */
function segmentHitsBox(p0, p1, min, max) {
  let tmin = 0;
  let tmax = 1;
  for (let i = 0; i < 3; i++) {
    const d = p1.getComponent(i) - p0.getComponent(i);
    if (Math.abs(d) < 1e-9) {
      if (p0.getComponent(i) < min.getComponent(i) || p0.getComponent(i) > max.getComponent(i)) return false;
    } else {
      let t1 = (min.getComponent(i) - p0.getComponent(i)) / d;
      let t2 = (max.getComponent(i) - p0.getComponent(i)) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

// Device boxes: each device is fitAndPlace'd to a 5-unit footprint centred
// on its socPositions() point, standing on y=0 — the conservative box
// (the real server.glb is smaller: ~3.3 x 5.0 x 1.7). Clearing the
// conservative box clears the real device too.
function deviceBoxes() {
  const pos = socPositions();
  return Object.entries(pos).map(([id, p]) => ({
    id,
    min: new THREE.Vector3(p.x - 2.5, 0, p.z - 2.5),
    max: new THREE.Vector3(p.x + 2.5, 5, p.z + 2.5),
  }));
}

/** Tag centre in world space: chest bone + the chest offset, rotated to his facing. */
function tagCentre() {
  const rot = CYPHER_SPAWN.rotationY;
  const s = CYPHER_SPAWN.scale;
  return new THREE.Vector3(
    CYPHER_SPAWN.x + s * 0.27 * Math.sin(rot),
    CHEST_BONE_Y * s + s * 0.05,
    CYPHER_SPAWN.z + s * 0.27 * Math.cos(rot),
  );
}

/** Minimal fake 2d context: enough for drawNameTag to record its fonts. */
function drawCtx() {
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

describe('Cypher legibility at the SOC camera', () => {
  it('renders the name "Cypher" at least 16px tall on the 706x400 frame', () => {
    const cam = socCamera();
    // The name font the draw code actually chose, from a real draw.
    const ctx = drawCtx();
    drawNameTag(ctx, 1024, 592);
    const nameCall = ctx.calls.fillText.find(([t]) => t === 'Cypher');
    expect(nameCall).toBeTruthy();
    const nameFontPx = Number(/(\d+)px/.exec(nameCall[3])[1]);
    const nameCapFraction = (nameFontPx * NAME_CAP_HEIGHT_RATIO) / NAME_TAG_CANVAS_HEIGHT;

    // The tag's projected height at his chest, through the real camera.
    const centre = tagCentre();
    const halfH = (NAME_TAG_HEIGHT * CYPHER_SPAWN.scale) / 2;
    const top = projectPx(cam, new THREE.Vector3(centre.x, centre.y + halfH, centre.z));
    const bottom = projectPx(cam, new THREE.Vector3(centre.x, centre.y - halfH, centre.z));
    const tagPxH = Math.abs(bottom.y - top.y);
    const nameCapPx = tagPxH * nameCapFraction;
    // Was ~5px at the old spot/camera (unreadable); the bar is 16px.
    expect(tagPxH).toBeGreaterThan(40);
    expect(nameCapPx).toBeGreaterThanOrEqual(16);
  });

  it('renders Cypher himself at least 120px tall — a presenter, not a speck', () => {
    const cam = socCamera();
    const feet = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z));
    const head = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, CYPHER_HEIGHT * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    // Was ~70px full height at the old spot (only ~45px visible above the rack).
    expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
  });
});

describe('Cypher visibility from the SOC camera', () => {
  it('has a clear sightline from the camera to his chest and his head', () => {
    const camPos = new THREE.Vector3(...SOC_CAMERA_POS);
    const centre = tagCentre();
    const head = new THREE.Vector3(CYPHER_SPAWN.x, CYPHER_HEIGHT * CYPHER_SPAWN.scale, CYPHER_SPAWN.z);
    const boxes = deviceBoxes();
    for (const b of boxes) {
      expect(segmentHitsBox(camPos, centre, b.min, b.max)).toBe(false);
      expect(segmentHitsBox(camPos, head, b.min, b.max)).toBe(false);
    }
  });

  it('walks in from the east-wall door without crossing any device', () => {
    const from = new THREE.Vector3(11.5, 0.5, 4);
    const to = new THREE.Vector3(CYPHER_SPAWN.x, 0.5, CYPHER_SPAWN.z);
    for (const b of deviceBoxes()) {
      expect(segmentHitsBox(from, to, b.min, b.max)).toBe(false);
    }
  });

  it('is in frame at the SOC camera — door, spot and head, on any entry', () => {
    const cam = socCamera();
    const points = [
      new THREE.Vector3(11.5, 0, 4), // walk-in start, east-wall door
      new THREE.Vector3(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z), // his feet
      new THREE.Vector3(CYPHER_SPAWN.x, CYPHER_HEIGHT * CYPHER_SPAWN.scale, CYPHER_SPAWN.z), // his head
    ];
    for (const p of points) {
      const px = projectPx(cam, p);
      expect(px.behind).toBe(false);
      expect(px.x).toBeGreaterThanOrEqual(0);
      expect(px.x).toBeLessThanOrEqual(FRAME_W);
      expect(px.y).toBeGreaterThanOrEqual(0);
      expect(px.y).toBeLessThanOrEqual(FRAME_H);
    }
  });
});
