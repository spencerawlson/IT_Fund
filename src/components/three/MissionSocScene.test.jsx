import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import MissionSocScene, {
  SOC_DEVICES, socPositions, CYPHER_SPAWN, SENTINEL_SPAWN, PATCH_SPAWN,
  SOC_CAMERA_POS, SOC_CAMERA_TARGET,
} from './MissionSocScene';
import {
  NAME_TAG_HEIGHT, NAME_TAG_CANVAS_HEIGHT, NAME_TAG_CHEST_OFFSET,
  NAME_CAP_HEIGHT_RATIO, drawNameTag,
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

  it('maps the devices into the data-center room, clear of the robots', () => {
    // The room is 4.85 x 5.21 m at 5.0x scale (x ±12.1, z ±13.0 units);
    // every device sits on its free floor, at least 0.95 m (4.75 units)
    // from every robot, so no device crowds a presenter.
    const pos = socPositions();
    const spawns = [CYPHER_SPAWN, SENTINEL_SPAWN, PATCH_SPAWN];
    for (const [id, p] of Object.entries(pos)) {
      expect(p.x).toBeGreaterThan(-12);
      expect(p.x).toBeLessThan(12);
      expect(p.z).toBeGreaterThan(-13);
      expect(p.z).toBeLessThan(13);
      for (const s of spawns) {
        const distM = Math.hypot(p.x - s.x, p.z - s.z) / 5.0;
        expect(distM).toBeGreaterThanOrEqual(0.95);
      }
    }
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

describe('robot spawns', () => {
  it('places Cypher centre-front in the data-center room, facing the camera', () => {
    // The room is 4.85 x 5.21 m at 5.0x scale; (0, 7) is open floor on
    // the camera side of the room, clear of every device. Scale 5.0 lifts
    // the real-scale 1.70 m model so he reads beside the 4-unit devices;
    // rotation atan2(-10, 10.5) faces him from (0, 7) at the camera's
    // ground position (-10, 17.5) — a presenter facing his audience, the
    // room behind him.
    expect(CYPHER_SPAWN.x).toBe(0);
    expect(CYPHER_SPAWN.z).toBe(7);
    expect(CYPHER_SPAWN.scale).toBe(5.0);
    expect(CYPHER_SPAWN.rotationY).toBeCloseTo(Math.atan2(-10 - 0, 17.5 - 7), 3);
  });

  it('places Sentinel and Patch flanking Cypher, facing the camera too', () => {
    expect(SENTINEL_SPAWN.x).toBe(-2);
    expect(SENTINEL_SPAWN.z).toBe(2);
    expect(SENTINEL_SPAWN.scale).toBe(5.0);
    expect(SENTINEL_SPAWN.rotationY).toBeCloseTo(Math.atan2(-10 - -2, 17.5 - 2), 3);
    expect(PATCH_SPAWN.x).toBe(8);
    expect(PATCH_SPAWN.z).toBe(5);
    expect(PATCH_SPAWN.scale).toBe(5.0);
    expect(PATCH_SPAWN.rotationY).toBeCloseTo(Math.atan2(-10 - 8, 17.5 - 5), 3);
  });

  it('keeps the three robots at least 1.0 m apart, so none hides behind another', () => {
    const spawns = [CYPHER_SPAWN, SENTINEL_SPAWN, PATCH_SPAWN];
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        const distM = Math.hypot(spawns[i].x - spawns[j].x, spawns[i].z - spawns[j].z) / 5.0;
        expect(distM).toBeGreaterThanOrEqual(1.0);
      }
    }
  });
});

// The SOC camera, the tag and the sightlines — the legibility + visibility
// bar, measured against the real Meshy cypher.glb + the real camera + the
// real data-center room. These are pure geometry (no WebGL, no entry-path
// state): they hold on direct entry and on reload exactly as on the
// handoff path, because the scene mounts the robots unconditionally
// whenever the 3D view mounts — there is no handoff gate in the code.
// The layout itself was found by a joint optimizer over the real room mesh
// (ray-triangle sightlines, projected-rect framing): the camera sits
// south-west of the room, high (3.2 m), looking down over the south wall
// into the open-topped data center. A low camera north of the room is
// blocked by the solid north wall, and a south-east camera grazes a
// wall-top edge at Cypher's chest — both were rejected by the render check.

const FRAME_W = 706; // live-measured SOC frame on a 1920x1000 desktop
const FRAME_H = 400;
const CHEST_BONE_Y = 0.88; // chest bone height in the real cypher.glb, model units
const CYPHER_HEIGHT = 1.704; // full model height in the real cypher.glb, model units
const ROBOT_HALF_WIDTH = { cypher: 0.49, sentinel: 0.48, patch: 0.70 }; // metres

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

// Device boxes: each device is fitAndPlace'd to a 4-unit footprint centred
// on its socPositions() point, standing on y=0 — the conservative box
// (the tallest device, the server, is 4.0 units). Clearing the
// conservative box clears the real device too.
function deviceBoxes() {
  const pos = socPositions();
  return Object.entries(pos).map(([id, p]) => ({
    id,
    min: new THREE.Vector3(p.x - 2, 0, p.z - 2),
    max: new THREE.Vector3(p.x + 2, 4, p.z + 2),
  }));
}

/** Tag centre in world space: chest bone + the chest offset, rotated to his facing. */
function tagCentre() {
  const rot = CYPHER_SPAWN.rotationY;
  const s = CYPHER_SPAWN.scale;
  const off = NAME_TAG_CHEST_OFFSET;
  return new THREE.Vector3(
    CYPHER_SPAWN.x + s * off.z * Math.sin(rot),
    CHEST_BONE_Y * s + s * off.y,
    CYPHER_SPAWN.z + s * off.z * Math.cos(rot),
  );
}

/** Projected feet + head of one robot (the rect half-width is computed in the test). */
function robotRect(cam, spawn) {
  const feet = projectPx(cam, new THREE.Vector3(spawn.x, 0, spawn.z));
  const head = projectPx(cam, new THREE.Vector3(spawn.x, CYPHER_HEIGHT * spawn.scale, spawn.z));
  return { feet, head };
}

// Depth of a robot's head from the camera, in scene units (for px widths).
function headDepth(cam, spawn) {
  const head = new THREE.Vector3(spawn.x, CYPHER_HEIGHT * spawn.scale, spawn.z);
  return head.clone().sub(cam.position).dot(
    new THREE.Vector3(...SOC_CAMERA_TARGET).sub(cam.position).normalize(),
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
    // The optimizer measured 23.1px for this layout.
    expect(tagPxH).toBeGreaterThan(40);
    expect(nameCapPx).toBeGreaterThanOrEqual(16);
  });

  it('renders Cypher himself at least 120px tall — a presenter, not a speck', () => {
    const cam = socCamera();
    const feet = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, 0, CYPHER_SPAWN.z));
    const head = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, CYPHER_HEIGHT * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    // The optimizer measured 189px for this layout.
    expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
  });
});

describe('robot visibility from the SOC camera', () => {
  it('has a clear sightline from the camera to Cypher\'s chest and head', () => {
    const camPos = new THREE.Vector3(...SOC_CAMERA_POS);
    const centre = tagCentre();
    const head = new THREE.Vector3(CYPHER_SPAWN.x, CYPHER_HEIGHT * CYPHER_SPAWN.scale, CYPHER_SPAWN.z);
    const boxes = deviceBoxes();
    for (const b of boxes) {
      expect(segmentHitsBox(camPos, centre, b.min, b.max)).toBe(false);
      expect(segmentHitsBox(camPos, head, b.min, b.max)).toBe(false);
    }
  });

  it('has a clear sightline from the camera to Sentinel\'s and Patch\'s heads', () => {
    const camPos = new THREE.Vector3(...SOC_CAMERA_POS);
    const boxes = deviceBoxes();
    for (const spawn of [SENTINEL_SPAWN, PATCH_SPAWN]) {
      const head = new THREE.Vector3(spawn.x, CYPHER_HEIGHT * spawn.scale, spawn.z);
      for (const b of boxes) {
        expect(segmentHitsBox(camPos, head, b.min, b.max)).toBe(false);
      }
    }
  });

  it('keeps all three robots fully in frame — rects, not just centre points', () => {
    const cam = socCamera();
    const tan = Math.tan(THREE.MathUtils.degToRad(21));
    const spawns = [
      ['cypher', CYPHER_SPAWN],
      ['sentinel', SENTINEL_SPAWN],
      ['patch', PATCH_SPAWN],
    ];
    const rects = [];
    for (const [key, spawn] of spawns) {
      const { feet, head } = robotRect(cam, spawn);
      expect(head.behind).toBe(false);
      expect(feet.behind).toBe(false);
      // Half-width in px at the head's depth (a point check let Patch's
      // head hang off the frame edge in the first layout).
      const depth = headDepth(cam, spawn);
      const hwPx = (ROBOT_HALF_WIDTH[key] * spawn.scale * FRAME_H) / (2 * depth * tan);
      expect(head.x - hwPx).toBeGreaterThanOrEqual(0);
      expect(head.x + hwPx).toBeLessThanOrEqual(FRAME_W);
      expect(head.y).toBeGreaterThanOrEqual(0);
      expect(feet.y).toBeLessThanOrEqual(FRAME_H);
      rects.push([head.x - hwPx, head.y, head.x + hwPx, feet.y]);
    }
    // No robot hides behind another: pairwise rect overlap under 20%.
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [ax0, ay0, ax1, ay1] = rects[i];
        const [bx0, by0, bx1, by1] = rects[j];
        const ox = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0));
        const oy = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
        const inter = ox * oy;
        const areaI = (ax1 - ax0) * (ay1 - ay0);
        const areaJ = (bx1 - bx0) * (by1 - by0);
        expect(inter / Math.min(areaI, areaJ)).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it('keeps every device label top in frame, so each device stays identifiable', () => {
    const cam = socCamera();
    const pos = socPositions();
    for (const p of Object.values(pos)) {
      const label = projectPx(cam, new THREE.Vector3(p.x, 5.6, p.z));
      expect(label.behind).toBe(false);
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x).toBeLessThanOrEqual(FRAME_W);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(FRAME_H);
    }
  });
});
