import { describe, it, expect } from 'vitest';
import {
  ROOM_SCALE,
  ROOMS_M,
  ROBOT_SPOTS_M,
  DEVICE_POSITIONS_M,
  socPositions,
  spotToScene,
  CAMERA_SHOTS,
  cypherShot,
  shotForSpeaker,
  shotBearing,
  shotDistance,
  shotElevation,
  SHOWCASE_ORDER,
  DEVICE_SHOTS,
  deviceShot,
  robotWorkBox,
  socFrameSize,
  patrolX,
  ambientClipFor,
} from './socLayout';

// The three rooms inside the data center (Spencer's assignment):
// Cypher in the desk/computer room, Patch in the workshop, Sentinel in
// the server room. Each robot's spot must be inside its own room.
describe('rooms', () => {
  it('assigns each robot to its own room inside the data center', () => {
    const inRoom = (room, x, y) => x >= room.xMin && x <= room.xMax && y >= room.yMin && y <= room.yMax;
    expect(inRoom(ROOMS_M.cypher, ROBOT_SPOTS_M.cypher.work.x, ROBOT_SPOTS_M.cypher.work.y)).toBe(true);
    expect(inRoom(ROOMS_M.sentinel, ROBOT_SPOTS_M.sentinel.work.x, ROBOT_SPOTS_M.sentinel.work.y)).toBe(true);
    expect(inRoom(ROOMS_M.patch, ROBOT_SPOTS_M.patch.work.x, ROBOT_SPOTS_M.patch.work.y)).toBe(true);
    // And no robot's spot is inside another robot's room.
    expect(inRoom(ROOMS_M.sentinel, ROBOT_SPOTS_M.cypher.work.x, ROBOT_SPOTS_M.cypher.work.y)).toBe(false);
    expect(inRoom(ROOMS_M.patch, ROBOT_SPOTS_M.cypher.work.x, ROBOT_SPOTS_M.cypher.work.y)).toBe(false);
    expect(inRoom(ROOMS_M.cypher, ROBOT_SPOTS_M.sentinel.work.x, ROBOT_SPOTS_M.sentinel.work.y)).toBe(false);
    expect(inRoom(ROOMS_M.patch, ROBOT_SPOTS_M.sentinel.work.x, ROBOT_SPOTS_M.sentinel.work.y)).toBe(false);
    expect(inRoom(ROOMS_M.cypher, ROBOT_SPOTS_M.patch.work.x, ROBOT_SPOTS_M.patch.work.y)).toBe(false);
    expect(inRoom(ROOMS_M.sentinel, ROBOT_SPOTS_M.patch.work.x, ROBOT_SPOTS_M.patch.work.y)).toBe(false);
  });

  it('keeps Cypher\'s work spot in front of his desk, clear of the chair', () => {
    const { work } = ROBOT_SPOTS_M.cypher;
    // 0.7 m north of the south desk's north edge (y = -1.7): close
    // enough to read as "at his desk", far enough that the WIDE camera
    // sees his chest tag over the desk monitors (at y = -1.5 a monitor
    // blocked it — ray-cast proved). Clear of the chair at (-1.0, -1.2).
    expect(work.y).toBeGreaterThan(-1.7);
    expect(Math.hypot(work.x - -1.0, work.y - -1.2)).toBeGreaterThanOrEqual(0.5);
    expect(work.y).toBeLessThan(ROBOT_SPOTS_M.cypher.patrol.y);
  });

  it('keeps Cypher\'s patrol inside the desk room, clear of the chair and desks', () => {
    const { patrol } = ROBOT_SPOTS_M.cypher;
    // Patrol runs north of the south desk (y > -1.7) and 0.85 m north of
    // the chair at (-1.0, -1.2), starting east of it at x = -0.5.
    expect(patrol.y).toBeGreaterThan(-1.7);
    expect(patrol.y - (-1.2)).toBeCloseTo(0.85, 5);
    expect(patrol.xMin).toBeGreaterThan(-0.9);
    expect(patrol.xMax).toBeLessThan(2.0);
    expect(inRoomCheck(patrol.xMin, patrol.y)).toBe(true);
    expect(inRoomCheck(patrol.xMax, patrol.y)).toBe(true);
    function inRoomCheck(x, y) {
      const r = ROOMS_M.cypher;
      return x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax;
    }
  });

  it('keeps the devices in their rooms and clear of the robots', () => {
    const inRoom = (room, x, y) => x >= room.xMin && x <= room.xMax && y >= room.yMin && y <= room.yMax;
    // PC1/GUEST are workstations in the desk room; R1/SRV in the server room.
    expect(inRoom(ROOMS_M.cypher, DEVICE_POSITIONS_M.PC1.x, DEVICE_POSITIONS_M.PC1.y)).toBe(true);
    expect(inRoom(ROOMS_M.cypher, DEVICE_POSITIONS_M.GUEST.x, DEVICE_POSITIONS_M.GUEST.y)).toBe(true);
    expect(inRoom(ROOMS_M.sentinel, DEVICE_POSITIONS_M.R1.x, DEVICE_POSITIONS_M.R1.y)).toBe(true);
    expect(inRoom(ROOMS_M.sentinel, DEVICE_POSITIONS_M.SRV.x, DEVICE_POSITIONS_M.SRV.y)).toBe(true);
    // Every device is at least 0.9 m from every robot spot (the PR #62 bar).
    const spots = [
      ROBOT_SPOTS_M.cypher.work,
      { x: ROBOT_SPOTS_M.cypher.patrol.xMin, y: ROBOT_SPOTS_M.cypher.patrol.y },
      { x: ROBOT_SPOTS_M.cypher.patrol.xMax, y: ROBOT_SPOTS_M.cypher.patrol.y },
      ROBOT_SPOTS_M.sentinel.work,
      ROBOT_SPOTS_M.patch.work,
    ];
    for (const d of Object.values(DEVICE_POSITIONS_M)) {
      for (const s of spots) {
        expect(Math.hypot(d.x - s.x, d.y - s.y)).toBeGreaterThanOrEqual(0.9);
      }
    }
  });
});

describe('socPositions', () => {
  it('converts device metres to scene units at ROOM_SCALE', () => {
    const pos = socPositions();
    expect(Object.keys(pos).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    // threeX = bx * 5, threeZ = -by * 5.
    expect(pos.R1).toEqual({ x: 0, z: -11 });
    expect(pos.PC1).toEqual({ x: 10, z: 7.5 });
    expect(spotToScene({ x: 1, y: -1 })).toEqual({ x: ROOM_SCALE, z: ROOM_SCALE });
  });

  it('converts a spot at an explicit scale — the lesson panel is real size', () => {
    // The panel renders the room at scale 1.0, not the SOC's 5x: a spot
    // converted at the SOC scale would land 5x too far out (outside the
    // room). spotToScene takes the scale, so the panel passes 1.0.
    expect(spotToScene({ x: -0.5, y: -1.0 }, 1.0)).toEqual({ x: -0.5, z: 1.0 });
    expect(spotToScene({ x: -0.5, y: -1.0 })).toEqual({ x: -2.5, z: 5.0 });
  });
});

describe('camera shots', () => {
  it('has a shot per speaker plus the wide default', () => {
    expect(Object.keys(CAMERA_SHOTS).sort()).toEqual(['patch', 'sentinel', 'wide']);
    expect(shotForSpeaker('wide')).toBe(CAMERA_SHOTS.wide);
    expect(shotForSpeaker('sentinel')).toBe(CAMERA_SHOTS.sentinel);
    expect(shotForSpeaker('patch')).toBe(CAMERA_SHOTS.patch);
    expect(shotForSpeaker('nobody')).toBe(CAMERA_SHOTS.wide);
  });

  it('tracks Cypher as he patrols — camera and target follow his x', () => {
    const west = cypherShot(-0.5);
    const east = cypherShot(1.2);
    expect(west.pos[0]).toBe(-0.5 * ROOM_SCALE);
    expect(west.target[0]).toBe(-0.5 * ROOM_SCALE);
    expect(east.pos[0]).toBe(1.2 * ROOM_SCALE);
    expect(east.target[0]).toBe(1.2 * ROOM_SCALE);
    expect(shotForSpeaker('cypher', 0.35).pos[0]).toBe(0.35 * ROOM_SCALE);
  });

  it('gives each speaker a genuinely different angle — not one top-down shot nudged', () => {
    // Spencer (2026-11-14): "everything is just in one angle". The old
    // scene was one steep top-down shot (~48° elevation). Every shot
    // here is under 30° elevation, and each focus shot differs from
    // WIDE by bearing (≥15°) or by distance (a close-up at ≤60% of
    // WIDE's distance). Measured bearings: WIDE 0°, CYPHER 0°,
    // SENTINEL −25°, PATCH +34°; distances: WIDE 35.3, CYPHER 11.0,
    // SENTINEL 33.8, PATCH 33.2.
    for (const shot of Object.values(CAMERA_SHOTS)) {
      expect(shotElevation(shot)).toBeLessThan(30);
    }
    expect(shotBearing(CAMERA_SHOTS.wide)).toBeCloseTo(0, 5);
    expect(shotBearing(CAMERA_SHOTS.sentinel)).toBeCloseTo(-25, 0);
    expect(shotBearing(CAMERA_SHOTS.patch)).toBeCloseTo(34, 0);
    expect(Math.abs(shotBearing(CAMERA_SHOTS.sentinel) - shotBearing(CAMERA_SHOTS.patch))).toBeGreaterThanOrEqual(40);
    const wideD = shotDistance(CAMERA_SHOTS.wide);
    expect(shotDistance(cypherShot(0.35)) / wideD).toBeLessThanOrEqual(0.6);
    expect(Math.abs(shotBearing(CAMERA_SHOTS.sentinel) - shotBearing(CAMERA_SHOTS.wide))).toBeGreaterThanOrEqual(15);
    expect(Math.abs(shotBearing(CAMERA_SHOTS.patch) - shotBearing(CAMERA_SHOTS.wide))).toBeGreaterThanOrEqual(15);
  });

  it('gives PATCH his own camera — not a pan from SENTINEL\'s', () => {
    // The two north-room shots shared one south-east camera (a pan,
    // not a viewpoint). PATCH now has his own south-west camera; the
    // positions differ in x by 24 units and the bearings by ~59°.
    expect(CAMERA_SHOTS.patch.pos).not.toEqual(CAMERA_SHOTS.sentinel.pos);
    expect(CAMERA_SHOTS.patch.pos[0]).toBeLessThan(0);
    expect(CAMERA_SHOTS.sentinel.pos[0]).toBeGreaterThan(0);
  });

  it('makes the robot body boxes facing-aware — width across, depth along', () => {
    // Patch's 1.40 m tread span runs north-south when he faces east;
    // his depth is only ~0.8 m east-west. A square box (half-width on
    // both axes) flagged his corner as blocking R1 when the real body
    // is clear of the sightline. Cypher faces south (width along X),
    // Sentinel west and Patch east (width along Z).
    const cypher = robotWorkBox('cypher');
    expect(cypher.max.x - cypher.min.x).toBeCloseTo(0.49 * 2 * ROOM_SCALE, 5);
    expect(cypher.max.z - cypher.min.z).toBeCloseTo(0.35 * 2 * ROOM_SCALE, 5);
    const patch = robotWorkBox('patch');
    expect(patch.max.z - patch.min.z).toBeCloseTo(0.70 * 2 * ROOM_SCALE, 5);
    expect(patch.max.x - patch.min.x).toBeCloseTo(0.40 * 2 * ROOM_SCALE, 5);
    const sentinel = robotWorkBox('sentinel');
    expect(sentinel.max.z - sentinel.min.z).toBeCloseTo(0.48 * 2 * ROOM_SCALE, 5);
    expect(sentinel.max.x - sentinel.min.x).toBeCloseTo(0.35 * 2 * ROOM_SCALE, 5);
    for (const box of [cypher, patch, sentinel]) {
      expect(box.min.y).toBe(0);
      expect(box.max.y).toBeCloseTo(1.704 * ROOM_SCALE, 5);
    }
  });
});

describe('device showcase', () => {
  it('tours the four devices in network order', () => {
    expect(SHOWCASE_ORDER).toEqual(['PC1', 'GUEST', 'R1', 'SRV']);
    expect(Object.keys(DEVICE_SHOTS).sort()).toEqual(['GUEST', 'PC1', 'R1', 'SRV']);
    for (const id of SHOWCASE_ORDER) {
      expect(deviceShot(id)).toBe(DEVICE_SHOTS[id]);
    }
    expect(deviceShot('NOPE')).toBe(CAMERA_SHOTS.wide);
  });

  it('aims each showcase camera at its device, close and low', () => {
    // Targets sit at the device's (x, z) at y = 3.5 (between the
    // device centre and its label at y = 5.6, so the label fits too);
    // every showcase camera is close (≤15 units) and low (≤35°
    // elevation) — a close-up, not the top-down look-across.
    const pos = socPositions();
    for (const [id, shot] of Object.entries(DEVICE_SHOTS)) {
      // toBeCloseTo: GUEST's z is -0 (Blender y 0.0 x -5), the shot's is 0.
      expect(shot.target[0]).toBeCloseTo(pos[id].x, 5);
      expect(shot.target[2]).toBeCloseTo(pos[id].z, 5);
      expect(shot.target[1]).toBe(3.5);
      expect(shotDistance(shot)).toBeLessThanOrEqual(15);
      expect(shotElevation(shot)).toBeLessThanOrEqual(35);
    }
  });
});

describe('socFrameSize', () => {
  it('keeps the SOC frame big on tablets, not just desktop', () => {
    // Spencer's tablet photo (2026-11-14): the live frame was ~60% of
    // the width in the right column. This frame is the full-width first
    // row at every breakpoint, so at tablet widths it is ~90% of the
    // viewport: 820px -> 724x453, 1024px -> 928x580, 1180px -> 1084x678.
    // Desktop 1920px -> the 1104x690 frame the scene tests measure.
    const cases = [
      [820, 724, 452.5],
      [1024, 928, 580],
      [1180, 1084, 677.5],
      [1920, 1104, 690],
    ];
    for (const [viewport, w, h] of cases) {
      const frame = socFrameSize(viewport);
      expect(frame.w).toBe(w);
      expect(frame.h).toBeCloseTo(h, 5);
      // At tablet widths the content is not capped by max-w-6xl, so the
      // frame is ~90% of the viewport. At 1920px the 1152px cap binds
      // (1104/1920 = 0.58) — the frame is as wide as the layout allows.
      if (viewport <= 1180) {
        expect(frame.w / viewport).toBeGreaterThanOrEqual(0.85);
      }
    }
    // Phones stay usable too: 390px -> 326x204.
    const phone = socFrameSize(390);
    expect(phone.w).toBe(326);
    expect(phone.h).toBeCloseTo(203.75, 5);
  });
});

describe('patrolX', () => {
  it('ping-pongs along the patrol at walking pace', () => {
    const { xMin, xMax } = ROBOT_SPOTS_M.cypher.patrol;
    expect(patrolX(0)).toBeCloseTo(xMin, 5);
    // Span 1.7 m at 0.25 m/s: reaches the east end at 6.8 s, back west at 13.6 s.
    expect(patrolX(6.8)).toBeCloseTo(xMax, 5);
    expect(patrolX(13.6)).toBeCloseTo(xMin, 5);
    expect(patrolX(3.4)).toBeCloseTo((xMin + xMax) / 2, 5);
    // Always inside the patrol.
    for (let t = 0; t < 30; t += 0.37) {
      const x = patrolX(t);
      expect(x).toBeGreaterThanOrEqual(xMin);
      expect(x).toBeLessThanOrEqual(xMax);
    }
  });
});

describe('ambientClipFor', () => {
  it('has Sentinel point at the racks in pulses, idle between', () => {
    expect(ambientClipFor('sentinel', 0)).toBe('point');
    expect(ambientClipFor('sentinel', 1.4)).toBe('point');
    expect(ambientClipFor('sentinel', 2)).toBe('idle');
    expect(ambientClipFor('sentinel', 12)).toBe('point');
    expect(ambientClipFor('sentinel', 20)).toBe('idle');
  });

  it('has Patch thinking at the bench in stretches, idle between', () => {
    expect(ambientClipFor('patch', 0)).toBe('thinking');
    expect(ambientClipFor('patch', 3.9)).toBe('thinking');
    expect(ambientClipFor('patch', 5)).toBe('idle');
    expect(ambientClipFor('patch', 14)).toBe('thinking');
  });

  it('idles anything else', () => {
    expect(ambientClipFor('cypher', 0)).toBe('idle');
    expect(ambientClipFor('nobody', 0)).toBe('idle');
  });
});
