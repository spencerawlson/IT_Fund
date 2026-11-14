import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import MissionSocScene, {
  SOC_DEVICES, socPositions, CYPHER_SPAWN, SENTINEL_SPAWN, PATCH_SPAWN,
  SOC_CAMERA_POS, SOC_CAMERA_TARGET,
} from './MissionSocScene';
import {
  ROOMS_M, ROBOT_SPOTS_M, CYPHER_SEAT_M, CAMERA_SHOTS, cypherShot, spotToScene,
  SHOWCASE_ORDER, deviceShot, robotWorkBox,
} from './socLayout';

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

  it('frames the SOC as a video card — full width, taller than 16:9', () => {
    const html = renderToString(
      <MissionSocScene devices={SOC_DEVICES} incidentActive contained={false} />,
    );
    // The SOC frame is the mission's centrepiece: full width of the
    // content area, 16:10 — taller than the old 16:9 box.
    expect(html).toContain('aspect-[16/10]');
    expect(html).not.toContain('aspect-video');
    expect(html).not.toContain('h-[26rem]');
    expect(html).not.toContain('sm:h-[30rem]');
  });

  it('accepts a showcaseRef (the opening device tour) without throwing', () => {
    // The showcase camera + label emphasis live in the scene tick
    // (read every frame, like speakerRef); the geometry is proven by
    // the device-showcase tests below, this pins the prop wiring.
    const html = renderToString(
      <MissionSocScene
        devices={SOC_DEVICES}
        incidentActive
        contained={false}
        showcaseRef={{ current: 'PC1' }}
      />,
    );
    expect(typeof html).toBe('string');
    expect(html).toContain('aspect-[16/10]');
  });

  it('never walks Cypher, and lets the speaker talk — the tick is speaker-gated', () => {
    // The opening splits the briefing across the three robots, and all
    // three turns are read by Cypher's voice (the only configured one) —
    // so the tick cannot move Cypher whenever audio plays: during a
    // Sentinel or Patch turn he would pace while someone else speaks.
    // He SITS (concept rebuild): seatRobot() calls the controller's
    // sit(), which stops the mixer and holds the pose, so no clip can
    // pull him out of the chair — and the tick never plays a clip on
    // him at all. Talking shows only as the head bob, gated on his own
    // turn: on Sentinel/Patch turns he sits still while they talk (talk
    // clip + head bob), gated on their greeting window so the greeting
    // one-shot is never cut. The tick itself runs only in the browser;
    // these are source pins on the gating, like the other tick rules.
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'MissionSocScene.jsx'), 'utf8');
    expect(src).toContain("const cypherSpeaking = talking && speaker === 'cypher'");
    expect(src).toContain('seatRobot(controller)');
    expect(src).toContain('cypher.setTalking(cypherSpeaking)');
    expect(src).toContain('cypher.setTalkLevel(cypherSpeaking ? (voice?.level || 0) : 0)');
    expect(src).toContain("const sentinelSpeaking = !!voiceRef?.current?.talking && speaker === 'sentinel' && t > sentinelGreetUntil");
    expect(src).toContain("const patchSpeaking = !!voiceRef?.current?.talking && speaker === 'patch' && t > patchGreetUntil");
    expect(src).toContain('sentinel.setTalkLevel(voiceRef.current.level || 0)');
    expect(src).toContain('patch.setTalkLevel(voiceRef.current.level || 0)');
    // The old behaviour — walk on any voice activity, or a walk clip on
    // Cypher at all — must be gone.
    expect(src).not.toContain('cypher.setTalkLevel(voice?.level || 0)');
    expect(src).not.toContain("cypher.play('walk')");
    expect(src).not.toContain('patrolX');
  });
});

describe('robot spawns', () => {
  it('places each robot in its own room inside the data center', () => {
    // Spencer's assignment: Cypher in the desk/computer room, Sentinel
    // in the server room, Patch in the workshop. The rooms are the data
    // center's own rooms (socLayout); the spawns are their scene-unit
    // positions, so convert back to metres to check.
    const inRoom = (room, p) => {
      const m = { x: p.x / 5, y: -p.z / 5 };
      return m.x >= room.xMin && m.x <= room.xMax && m.y >= room.yMin && m.y <= room.yMax;
    };
    expect(inRoom(ROOMS_M.cypher, CYPHER_SPAWN)).toBe(true);
    expect(inRoom(ROOMS_M.sentinel, SENTINEL_SPAWN)).toBe(true);
    expect(inRoom(ROOMS_M.patch, PATCH_SPAWN)).toBe(true);
    expect(inRoom(ROOMS_M.sentinel, CYPHER_SPAWN)).toBe(false);
    expect(inRoom(ROOMS_M.patch, CYPHER_SPAWN)).toBe(false);
    expect(inRoom(ROOMS_M.cypher, SENTINEL_SPAWN)).toBe(false);
    expect(inRoom(ROOMS_M.cypher, PATCH_SPAWN)).toBe(false);
  });

  it('seats Cypher on the chair at his desk, facing the learner (south)', () => {
    // His seat (Blender -1.20, -1.2) is the chair at his desk, shifted
    // 0.15 m west of its centre so he sits clear of the near
    // monitor — seated, head and shoulders above the desk monitors,
    // visible over them from the WIDE camera. Scale
    // 5.0 lifts the real-scale 1.70 m model so he reads beside the
    // 4-unit devices; rotationY 0 faces him south, toward the learner.
    expect(CYPHER_SPAWN).toEqual({ ...spotToScene(CYPHER_SEAT_M), scale: 5.0, rotationY: 0 });
    expect(CYPHER_SPAWN.x).toBe(-6);
    expect(CYPHER_SPAWN.z).toBe(6);
  });

  it('places Sentinel at the racks facing west, Patch at the bench facing east', () => {
    // Working poses: Sentinel faces the racks (west), Patch faces the
    // bench (east). They turn south to face the learner when speaking.
    expect(SENTINEL_SPAWN).toEqual({ ...spotToScene(ROBOT_SPOTS_M.sentinel.work), scale: 5.0, rotationY: -Math.PI / 2 });
    expect(PATCH_SPAWN).toEqual({ ...spotToScene(ROBOT_SPOTS_M.patch.work), scale: 5.0, rotationY: Math.PI / 2 });
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

// The SOC cameras and the sightlines — the visibility bar, measured against the real Meshy cypher.glb + the real
// cameras + the real data-center room. These are pure geometry (no
// WebGL, no entry-path state): they hold on direct entry and on reload
// exactly as on the handoff path, because the scene mounts the robots
// unconditionally whenever the 3D view mounts — there is no handoff gate
// in the code. The layout was measured from the real room mesh
// (ray-triangle sightlines through the room's own triangles and doorway
// gaps, projected-rect framing on the 1104x690 frame). The cameras sit
// south of the room, high, looking in through the south opening and the
// doorway gaps — the room's partitions are one merged opaque mesh, so
// the see-through between rooms is the doorways, not a glass material.
// Two earlier south cameras were rejected by this check (not by the
// ray-cast, which only proves the room doesn't block a ray): the
// Sentinel one had Cypher's head dead-centre 0.73 m from the lens,
// hiding Sentinel, and the Patch one left Cypher 48° off-axis, out of
// frame. The north-room focus shots each have their OWN camera —
// Sentinel from the south-east, Patch from the south-west (bearings
// −25° / +34°, ~59° apart) — a pan between them would be the same
// top-down shot nudged, which is what Spencer called out ("everything
// is just in one angle").

const FRAME_W = 1104; // SOC frame on a 1920px desktop: full content width, 16:10
const FRAME_H = 690;
// Seated Cypher, measured from the real cypher.glb in three.js (the
// lesson builder's sit() geometry, asserted in RobotCharacter.test.jsx):
// chest bone 0.96 m, head bone 1.353 m, knee 0.564 m, foot dangling
// 0.275 m.
const SEATED_CHEST_Y_M = 0.96;
const SEATED_HEAD_Y_M = 1.353;
const SEATED_FOOT_Y_M = 0.275;
const CYPHER_HEIGHT = 1.704; // full model height in the real cypher.glb, model units — the standing robots' head height (a conservative stand-in for Sentinel/Patch)
const ROBOT_HALF_WIDTH = { cypher: 0.49, sentinel: 0.48, patch: 0.70 }; // metres

function cameraFor(shot) {
  const cam = new THREE.PerspectiveCamera(42, FRAME_W / FRAME_H, 0.1, 1000);
  cam.position.set(...shot.pos);
  cam.lookAt(...shot.target);
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

/** Chest centre in world space for seated Cypher at scene (x, z) — the chest bone, at the group origin. */
function chestCentreAt(x, z) {
  return new THREE.Vector3(x, SEATED_CHEST_Y_M * CYPHER_SPAWN.scale, z);
}

/** Head / foot heights for a spawn: Cypher sits (head 1.353, feet dangling 0.275), the others stand. */
function headYFor(spawn) {
  return (spawn === CYPHER_SPAWN ? SEATED_HEAD_Y_M : CYPHER_HEIGHT) * spawn.scale;
}
function feetYFor(spawn) {
  return (spawn === CYPHER_SPAWN ? SEATED_FOOT_Y_M : 0) * spawn.scale;
}

/** Projected feet + head of one robot (the rect half-width is computed in the test). */
function robotRect(cam, spawn) {
  const feet = projectPx(cam, new THREE.Vector3(spawn.x, feetYFor(spawn), spawn.z));
  const head = projectPx(cam, new THREE.Vector3(spawn.x, headYFor(spawn), spawn.z));
  return { feet, head };
}

// Depth of a robot's head from the camera, in scene units (for px widths).
function headDepth(cam, spawn, target) {
  const head = new THREE.Vector3(spawn.x, headYFor(spawn), spawn.z);
  return head.clone().sub(cam.position).dot(
    new THREE.Vector3(...target).sub(cam.position).normalize(),
  );
}

describe('Cypher visibility at the SOC cameras', () => {
  it('renders Cypher himself at least 120px tall at WIDE — a presenter, not a speck', () => {
    const cam = cameraFor(CAMERA_SHOTS.wide);
    // Seated: head 1.353 m, feet dangling 0.275 m — the figure spans
    // ~1.08 m, ~154px at the wide camera. Measured 154px.
    const feet = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, SEATED_FOOT_Y_M * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    const head = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, SEATED_HEAD_Y_M * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
  });

  it('renders Cypher himself at least 120px tall on his focus shot', () => {
    // The focus camera is fixed at his chair, so he stays centred.
    const cam = cameraFor(cypherShot());
    const feet = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, SEATED_FOOT_Y_M * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    const head = projectPx(cam, new THREE.Vector3(CYPHER_SPAWN.x, SEATED_HEAD_Y_M * CYPHER_SPAWN.scale, CYPHER_SPAWN.z));
    expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
  });
});

describe('robot visibility from the SOC cameras', () => {
  it('has a clear sightline from every camera to the speaker\'s chest and head', () => {
    // The device boxes are the only occluders the scene itself places
    // (the room mesh was ray-cast separately in Blender); the cameras
    // sit high, so every ray stays above the 4-unit device boxes.
    const boxes = deviceBoxes();
    const cases = [
      [CAMERA_SHOTS.wide, CYPHER_SPAWN],
      [cypherShot(), CYPHER_SPAWN],
      [CAMERA_SHOTS.sentinel, SENTINEL_SPAWN],
      [CAMERA_SHOTS.patch, PATCH_SPAWN],
    ];
    for (const [shot, spawn] of cases) {
      const camPos = new THREE.Vector3(...shot.pos);
      const centre = chestCentreAt(spawn.x, spawn.z);
      const head = new THREE.Vector3(spawn.x, headYFor(spawn), spawn.z);
      for (const b of boxes) {
        expect(segmentHitsBox(camPos, centre, b.min, b.max)).toBe(false);
        expect(segmentHitsBox(camPos, head, b.min, b.max)).toBe(false);
      }
    }
  });

  it('has a clear sightline from every camera to the other robots\' heads', () => {
    const boxes = deviceBoxes();
    const cases = [
      [CAMERA_SHOTS.wide, [CYPHER_SPAWN, SENTINEL_SPAWN, PATCH_SPAWN]],
      [cypherShot(), [SENTINEL_SPAWN, PATCH_SPAWN]],
      [CAMERA_SHOTS.sentinel, [CYPHER_SPAWN, PATCH_SPAWN]],
      [CAMERA_SHOTS.patch, [CYPHER_SPAWN, SENTINEL_SPAWN]],
    ];
    for (const [shot, spawns] of cases) {
      const camPos = new THREE.Vector3(...shot.pos);
      for (const spawn of spawns) {
        const head = new THREE.Vector3(spawn.x, headYFor(spawn), spawn.z);
        for (const b of boxes) {
          expect(segmentHitsBox(camPos, head, b.min, b.max)).toBe(false);
        }
      }
    }
  });

  it('keeps all three robots in frame at WIDE — rects, not just centre points', () => {
    const cam = cameraFor(CAMERA_SHOTS.wide);
    const tan = Math.tan(THREE.MathUtils.degToRad(21));
    const spawns = [
      ['cypher', CYPHER_SPAWN],
      ['sentinel', SENTINEL_SPAWN],
      ['patch', PATCH_SPAWN],
    ];
    const rects = [];
    const heads = [];
    const depths = [];
    for (const [key, spawn] of spawns) {
      const { feet, head } = robotRect(cam, spawn);
      expect(head.behind).toBe(false);
      expect(feet.behind).toBe(false);
      // Half-width in px at the head's depth (a point check let Patch's
      // head hang off the frame edge in the first layout).
      const depth = headDepth(cam, spawn, CAMERA_SHOTS.wide.target);
      const hwPx = (ROBOT_HALF_WIDTH[key] * spawn.scale * FRAME_H) / (2 * depth * tan);
      expect(head.x - hwPx).toBeGreaterThanOrEqual(0);
      expect(head.x + hwPx).toBeLessThanOrEqual(FRAME_W);
      expect(head.y).toBeGreaterThanOrEqual(0);
      expect(feet.y).toBeLessThanOrEqual(FRAME_H);
      rects.push([head.x - hwPx, head.y, head.x + hwPx, feet.y]);
      heads.push([head.x, head.y]);
      depths.push(depth);
    }
    // No robot's HEAD hides behind a NEARER robot's rect: the desk room
    // is in front of the server room from this camera, so the rects do
    // overlap in the lower body (up to ~46%) — depth overlap, not
    // hiding. The check is directional — a farther robot's rect cannot
    // hide a nearer robot's head, because the nearer robot is in front
    // of it. The heads stay clear of each other, which is what makes
    // each robot identifiable.
    for (let i = 0; i < rects.length; i++) {
      for (let j = 0; j < rects.length; j++) {
        if (i === j || depths[i] >= depths[j]) continue;
        const [hx, hy] = heads[j];
        const [x0, y0, x1, y1] = rects[i];
        expect(hx < x0 || hx > x1 || hy < y0 || hy > y1).toBe(true);
      }
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [ax0, ay0, ax1, ay1] = rects[i];
        const [bx0, by0, bx1, by1] = rects[j];
        const ox = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0));
        const oy = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
        const inter = ox * oy;
        const areaI = (ax1 - ax0) * (ay1 - ay0);
        const areaJ = (bx1 - bx0) * (by1 - by0);
        expect(inter / Math.min(areaI, areaJ)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('keeps every device label top in frame at WIDE, so each device stays identifiable', () => {
    const cam = cameraFor(CAMERA_SHOTS.wide);
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

describe('speaker focus shots', () => {
  it('centres the speaker and shows the other two working in the background', () => {
    // The speaker is the one the camera is centred on (head within
    // 60px of the frame centre) and at least 120px tall; the other two
    // robots' heads are in frame — visible through the glass/doorways in
    // their rooms. Measured: Sentinel 211px centred, Patch 229px +
    // Cypher in frame; Patch 224px centred, Sentinel 253px + Cypher
    // in frame. Cypher reads larger in the north-room shots because
    // his desk room is nearest the south cameras — he never covers
    // the speaker's head (checked above at WIDE and by the
    // head-separation below). The Patch shot's closest heads are
    // 94px apart (Patch–Cypher), so its bar is 90px, not 100px.
    const cases = [
      [CAMERA_SHOTS.sentinel, SENTINEL_SPAWN, [CYPHER_SPAWN, PATCH_SPAWN], 100],
      [CAMERA_SHOTS.patch, PATCH_SPAWN, [CYPHER_SPAWN, SENTINEL_SPAWN], 90],
    ];
    for (const [shot, speaker, others, minSep] of cases) {
      const cam = cameraFor(shot);
      const { feet, head } = robotRect(cam, speaker);
      expect(head.behind).toBe(false);
      expect(feet.behind).toBe(false);
      expect(Math.abs(head.x - FRAME_W / 2)).toBeLessThanOrEqual(60);
      expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
      for (const other of others) {
        const o = robotRect(cam, other);
        expect(o.head.behind).toBe(false);
        expect(o.head.x).toBeGreaterThanOrEqual(0);
        expect(o.head.x).toBeLessThanOrEqual(FRAME_W);
        expect(o.head.y).toBeGreaterThanOrEqual(0);
        expect(o.head.y).toBeLessThanOrEqual(FRAME_H);
        // The background robot's head stays clear of the speaker's head.
        expect(Math.hypot(o.head.x - head.x, o.head.y - head.y)).toBeGreaterThanOrEqual(minSep);
      }
    }
  });

  it('frames Cypher as a close-up on his focus shot — the others are out of it, by design', () => {
    // The focus camera is fixed at his chair, a close medium over the
    // monitor bank (pos [x, 11, 12] -> target [x, 5, 6]): he stays
    // centred and tall. Sentinel and Patch are NOT in this shot — a
    // close-up's 42° FOV cannot hold the north rooms (their heads sit
    // ~39° off-axis from this camera), and aiming north to include
    // them would lose his centring. They are visible in the WIDE shot
    // and in each other's focus shots; this one is for Cypher.
    const cam = cameraFor(cypherShot());
    const { feet, head } = robotRect(cam, CYPHER_SPAWN);
    expect(head.behind).toBe(false);
    expect(Math.abs(head.x - FRAME_W / 2)).toBeLessThanOrEqual(60);
    expect(feet.y - head.y).toBeGreaterThanOrEqual(120);
  });

  it('uses the wide shot as the scene default camera', () => {
    expect(SOC_CAMERA_POS).toEqual(CAMERA_SHOTS.wide.pos);
    expect(SOC_CAMERA_TARGET).toEqual(CAMERA_SHOTS.wide.target);
  });
});

describe('device showcase shots', () => {
  it('centres each device large in frame, label and all', () => {
    // After the briefing, the opening tours the four devices in 3D —
    // Spencer's complaint is that the equipment is only clearly visible
    // in the 2D view. Each showcase shot is a close-up: the device is
    // centred (within 60px of the frame centre), at least 200px tall
    // and fully in frame, and its label (1.1 units tall at y = 5.6) is
    // fully in frame too — aiming at the device centre put the label
    // off the top edge, so the shots aim at y = 3.5 instead. Measured:
    // PC1 334px, GUEST 378px, R1 254px, SRV 256px; labels at y 96–259.
    const pos = socPositions();
    for (const id of SHOWCASE_ORDER) {
      const cam = cameraFor(deviceShot(id));
      const p = pos[id];
      const centre = projectPx(cam, new THREE.Vector3(p.x, 2, p.z));
      const top = projectPx(cam, new THREE.Vector3(p.x, 4, p.z));
      const bottom = projectPx(cam, new THREE.Vector3(p.x, 0, p.z));
      const labelTop = projectPx(cam, new THREE.Vector3(p.x, 5.6 + 0.55, p.z));
      const labelBottom = projectPx(cam, new THREE.Vector3(p.x, 5.6 - 0.55, p.z));
      expect(centre.behind).toBe(false);
      expect(Math.abs(centre.x - FRAME_W / 2)).toBeLessThanOrEqual(60);
      expect(bottom.y - top.y).toBeGreaterThanOrEqual(200);
      expect(top.y).toBeGreaterThanOrEqual(0);
      expect(bottom.y).toBeLessThanOrEqual(FRAME_H);
      expect(labelTop.behind).toBe(false);
      expect(labelTop.y).toBeGreaterThanOrEqual(0);
      expect(labelBottom.y).toBeLessThanOrEqual(FRAME_H);
    }
  });

  it('keeps every showcase sightline clear of the robots, not just the room', () => {
    // The room-mesh ray-cast (Blender) proves the walls don't block
    // these shots, but it says nothing about the ROBOTS: a straight-on
    // shot put Patch between the camera and GUEST and Sentinel between
    // the camera and R1 — caught by render, not by ray-cast. During the
    // showcase the robots are at their work spots (Cypher at his desk,
    // Sentinel at the racks, Patch at the bench), so the sightline from
    // each showcase camera to its device's centre + top must clear
    // their facing-aware body boxes (robotWorkBox — a square box
    // overstates Patch's depth and flags a false block).
    const boxes = ['cypher', 'sentinel', 'patch'].map((key) => robotWorkBox(key));
    const pos = socPositions();
    for (const id of SHOWCASE_ORDER) {
      const shot = deviceShot(id);
      const camPos = new THREE.Vector3(...shot.pos);
      const p = pos[id];
      for (const y of [2, 4]) {
        const target = new THREE.Vector3(p.x, y, p.z);
        for (const b of boxes) {
          expect(segmentHitsBox(camPos, target, b.min, b.max)).toBe(false);
        }
      }
    }
  });
});
