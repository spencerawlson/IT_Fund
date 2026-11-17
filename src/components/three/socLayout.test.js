import { describe, it, expect } from 'vitest';
import {
  ROOM_SCALE,
  ROOMS_M,
  ROBOT_SPOTS_M,
  CYPHER_CHAIR_M,
  SOC_CHAIR_M,
  CYPHER_SEAT_M,
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
  SOC_CAMERA_FOV,
  SOC_DEVICE_LABEL,
  SOC_SHOWCASE_LABEL_SCALE,
  SOC_DESIGN_ASPECT,
  SOC_MAX_FOV,
  socFovForAspect,
  SOC_DEVICE_LABEL_Y,
  SHOWCASE_TARGET_Y,
  ROBOT_SPEAK_FACING,
  ROBOT_WORK_FACING,
  talkingClipFor,
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

  it('keeps Cypher\'s work spot on the open floor, clear of the chair', () => {
    // Enlarged SOC (2026-11-17): south of his chair, toward the cameras,
    // at the start of the patrol, and well clear of the chair.
    const { work, patrol } = ROBOT_SPOTS_M.cypher;
    expect(work.y).toBeLessThan(SOC_CHAIR_M.y);
    expect(Math.hypot(work.x - SOC_CHAIR_M.x, work.y - SOC_CHAIR_M.y)).toBeGreaterThanOrEqual(0.9);
    expect(work).toEqual({ x: patrol.xMin, y: patrol.y });
  });

  it('keeps Cypher\'s patrol inside the desk room, clear of the chair and desks', () => {
    const { patrol } = ROBOT_SPOTS_M.cypher;
    // Patrol runs south of the chair (toward the cameras), starting
    // 1.05 m east of it, and never reaches the east wall.
    expect(patrol.y).toBeLessThan(SOC_CHAIR_M.y - 0.5);
    expect(patrol.xMin - SOC_CHAIR_M.x).toBeGreaterThanOrEqual(1.0);
    expect(patrol.xMax).toBeLessThan(ROOMS_M.cypher.xMax - 1.0);
    expect(inRoomCheck(patrol.xMin, patrol.y)).toBe(true);
    expect(inRoomCheck(patrol.xMax, patrol.y)).toBe(true);
    function inRoomCheck(x, y) {
      const r = ROOMS_M.cypher;
      return x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax;
    }
  });

  it('puts Cypher\'s chair inside the desk room, north of the south desk, with a sane seat height', () => {
    // Measured from the real mesh (ray-cast height map): seat top ~0.60 m
    // at (-1.05, -1.2), backrest east of the seat. The lesson panel seats
    // him on it; the SOC work spot and patrol already keep clear of it.
    const chair = CYPHER_CHAIR_M;
    const room = ROOMS_M.cypher;
    expect(chair.x).toBeGreaterThanOrEqual(room.xMin);
    expect(chair.x).toBeLessThanOrEqual(room.xMax);
    expect(chair.y).toBeGreaterThanOrEqual(room.yMin);
    expect(chair.y).toBeLessThanOrEqual(room.yMax);
    expect(chair.y).toBeGreaterThan(-1.7); // the data center's chair, north of its south desk
    expect(chair.seatHeightM).toBeGreaterThan(0.4);
    expect(chair.seatHeightM).toBeLessThan(0.8);
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
    expect(pos.R1).toEqual({ x: 0, z: -16.5 });
    expect(pos.PC1).toEqual({ x: 15, z: 11.25 });
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

  it('seats Cypher on the chair at his desk, in the desk room', () => {
    // Concept rebuild: he sits, never patrols in the SOC. The seat is
    // the chair shifted 0.15 m west so he sits clear of the
    // near monitor at x -0.75 — still on the seat (0.63 m at x -1.2),
    // still in his room, at his desk.
    // The SOC chair moved with the enlarged plan's desk group (2026-11-17).
    expect(SOC_CHAIR_M).toEqual({ x: CYPHER_CHAIR_M.x - 0.6, y: CYPHER_CHAIR_M.y + 0.09, seatHeightM: 0.60 });
    expect(CYPHER_SEAT_M).toEqual({ x: SOC_CHAIR_M.x - 0.15, y: SOC_CHAIR_M.y });
    const r = ROOMS_M.cypher;
    expect(CYPHER_SEAT_M.x).toBeGreaterThanOrEqual(r.xMin);
    expect(CYPHER_SEAT_M.x).toBeLessThanOrEqual(r.xMax);
    expect(CYPHER_SEAT_M.y).toBeGreaterThanOrEqual(r.yMin);
    expect(CYPHER_SEAT_M.y).toBeLessThanOrEqual(r.yMax);
  });

  it('seats Cypher for his shot — fixed at his chair, a close eye-level medium', () => {
    // He sits on the chair at his desk (no patrol), so his shot is fixed
    // on CYPHER_SEAT_M: the target sits on him, the camera stands south
    // of him (in front — he faces south) and close.
    const shot = cypherShot();
    const seatX = CYPHER_SEAT_M.x * ROOM_SCALE;
    const seatZ = -CYPHER_SEAT_M.y * ROOM_SCALE;
    expect(Math.abs(shot.target[0] - seatX)).toBeLessThanOrEqual(1);
    expect(shot.target[2]).toBe(seatZ);
    expect(shot.pos[2]).toBeGreaterThan(seatZ);
    expect(shotDistance(shot)).toBeLessThanOrEqual(14);
    expect(shotForSpeaker('cypher')).toEqual(shot);
    expect(shotForSpeaker('cypher', 0.35)).toEqual(shot); // the patrol x is gone
  });

  it('gives each speaker a genuinely different angle — eye level, not one shot nudged', () => {
    // Spencer (2026-11-14): "everything is just in one angle". Since the
    // Blender-built room (2026-11-16) every shot is taken from roughly
    // eye level INSIDE the room, like the concept render: all under 25°
    // elevation. Each focus shot differs from WIDE by bearing (≥15°) or
    // by distance (a close-up at ≤60% of WIDE's distance). Measured:
    // bearings WIDE −3°, CYPHER −15°, SENTINEL −27°, PATCH −20°;
    // distances WIDE 28.3, CYPHER 11.8, SENTINEL 9.5, PATCH 15.3.
    for (const shot of [CAMERA_SHOTS.wide, CAMERA_SHOTS.sentinel, CAMERA_SHOTS.patch, cypherShot()]) {
      expect(shotElevation(shot)).toBeLessThan(25);
    }
    const wideD = shotDistance(CAMERA_SHOTS.wide);
    for (const shot of [cypherShot(), CAMERA_SHOTS.sentinel, CAMERA_SHOTS.patch]) {
      const bearingDiff = Math.abs(shotBearing(shot) - shotBearing(CAMERA_SHOTS.wide));
      const closer = shotDistance(shot) / wideD <= 0.6;
      expect(bearingDiff >= 15 || closer).toBe(true);
    }
  });

  it('gives PATCH his own camera — not a pan from SENTINEL\'s', () => {
    // Two north-room shots from one camera would be a pan, not a
    // viewpoint: PATCH's camera stands in the desk room's east side
    // (looking through the workshop doorway), SENTINEL's further west in
    // front of the server room glass — ≥6 units (1.2 m) apart (measured
    // 7.1), each aimed at its own robot.
    const [a, b] = [CAMERA_SHOTS.patch.pos, CAMERA_SHOTS.sentinel.pos];
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThanOrEqual(6);
    expect(CAMERA_SHOTS.patch.target).not.toEqual(CAMERA_SHOTS.sentinel.target);
    expect(CAMERA_SHOTS.patch.pos[0]).toBeGreaterThan(CAMERA_SHOTS.sentinel.pos[0]);
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
    // Targets sit at the device's (x, z) at y = 3.7 (between the
    // device centre and its label at y = 5.6, so the label fits too —
    // 3.5 still left GUEST's emphasised label top ~0.1° outside the
    // 42° FOV, see the label-framing test below); every showcase camera
    // is close (≤15 units) and low (≤35° elevation) — a close-up, not
    // the top-down look-across.
    const pos = socPositions();
    for (const [id, shot] of Object.entries(DEVICE_SHOTS)) {
      // toBeCloseTo: GUEST's z is -0 (Blender y 0.0 x -5), the shot's is 0.
      expect(shot.target[0]).toBeCloseTo(pos[id].x, 5);
      expect(shot.target[2]).toBeCloseTo(pos[id].z, 5);
      expect(shot.target[1]).toBe(SHOWCASE_TARGET_Y);
      expect(shotDistance(shot)).toBeLessThanOrEqual(15);
      expect(shotElevation(shot)).toBeLessThanOrEqual(35);
    }
  });

  it('keeps every emphasised label and every device footprint in frame', () => {
    // Regression for the live check (2026-11-14): GUEST's label was cut
    // off at the top edge of the canvas in the 3D view. The label sprite
    // is centred at y = 5.6 (MissionSocScene: FOOTPRINT + 1.6), 1.1 tall,
    // and grows 1.6x on the device on camera — so its top sits at 6.48.
    // The camera is 42° vertical FOV (ModelViewer), i.e. 21° half-FOV:
    // the angle from the view direction to the label top and to the
    // device-footprint bottom (y = 0) must both sit inside 21° for every
    // showcase shot, or the label (or the device) is cut off. At the old
    // target y = 3.5 GUEST's label top was ~21.2° — outside.
    const HALF_FOV_DEG = SOC_CAMERA_FOV / 2;
    const LABEL_TOP_Y = SOC_DEVICE_LABEL_Y + (SOC_DEVICE_LABEL.height * SOC_SHOWCASE_LABEL_SCALE) / 2;
    const pos = socPositions();
    const angleTo = (shot, point) => {
      const v = [shot.target[0] - shot.pos[0], shot.target[1] - shot.pos[1], shot.target[2] - shot.pos[2]];
      const w = [point[0] - shot.pos[0], point[1] - shot.pos[1], point[2] - shot.pos[2]];
      const dot = v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
      const lv = Math.hypot(v[0], v[1], v[2]);
      const lw = Math.hypot(w[0], w[1], w[2]);
      return (Math.acos(dot / (lv * lw)) * 180) / Math.PI;
    };
    for (const [id, shot] of Object.entries(DEVICE_SHOTS)) {
      const p = pos[id];
      expect(angleTo(shot, [p.x, LABEL_TOP_Y, p.z])).toBeLessThan(HALF_FOV_DEG);
      expect(angleTo(shot, [p.x, 0, p.z])).toBeLessThan(HALF_FOV_DEG);
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
    // At 0.25 m/s: reaches the east end after span/0.25 s, back west after twice that.
    const leg = (xMax - xMin) / 0.25;
    expect(patrolX(leg)).toBeCloseTo(xMax, 5);
    expect(patrolX(2 * leg)).toBeCloseTo(xMin, 5);
    expect(patrolX(leg / 2)).toBeCloseTo((xMin + xMax) / 2, 5);
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

describe('socFovForAspect', () => {
  it('keeps the 52° lens at the 16:10 design aspect and wider', () => {
    expect(socFovForAspect(SOC_DESIGN_ASPECT)).toBe(SOC_CAMERA_FOV);
    expect(socFovForAspect(16 / 9)).toBe(SOC_CAMERA_FOV);
    expect(socFovForAspect(2.4)).toBe(SOC_CAMERA_FOV);
  });

  it('widens the vertical lens on narrower frames so horizontal coverage holds', () => {
    // A square frame (a phone in portrait, letterboxed square): same
    // horizontal field of view as the 16:10 design frame.
    const hFov = (vFov, aspect) => (2 * Math.atan(Math.tan((vFov * Math.PI) / 360) * aspect) * 180) / Math.PI;
    const designH = hFov(SOC_CAMERA_FOV, SOC_DESIGN_ASPECT);
    expect(hFov(socFovForAspect(1), 1)).toBeCloseTo(designH, 5);
    expect(socFovForAspect(1)).toBeGreaterThan(SOC_CAMERA_FOV);
  });

  it('caps the lens on very tall frames, and ignores a bad aspect', () => {
    expect(socFovForAspect(0.46)).toBe(SOC_MAX_FOV);
    expect(socFovForAspect(0)).toBe(SOC_CAMERA_FOV);
    expect(socFovForAspect(Number.NaN)).toBe(SOC_CAMERA_FOV);
  });
});

describe('in-room speaker cameras (2026-11-17)', () => {
  // Spencer: "when Sentinel is talking, the camera should go inside the room
  // to show his face". Scene units -> Blender metres: x / 5, y = -z / 5.
  const toM = ([x, , z]) => ({ x: x / ROOM_SCALE, y: -z / ROOM_SCALE });
  const inRoom = (room, p) => p.x > room.xMin && p.x < room.xMax && p.y > room.yMin && p.y < room.yMax;

  it.each(['sentinel', 'patch'])('puts %s’s camera inside his own room, close, aimed at his face', (key) => {
    const shot = CAMERA_SHOTS[key];
    const cam = toM(shot.pos);
    const spot = ROBOT_SPOTS_M[key].work;
    expect(inRoom(ROOMS_M[key], cam)).toBe(true);
    const dist = Math.hypot(cam.x - spot.x, cam.y - spot.y);
    expect(dist).toBeGreaterThan(1.2);
    expect(dist).toBeLessThan(2.2);
    // Aimed at the robot (target on his spot), at face height, eye-level camera.
    expect(toM(shot.target)).toEqual(expect.objectContaining({ x: spot.x, y: spot.y }));
    expect(shot.target[1] / ROOM_SCALE).toBeGreaterThan(1.2);
    expect(shot.pos[1] / ROOM_SCALE).toBeCloseTo(1.5, 5);
  });

  it.each(['sentinel', 'patch'])('turns %s to face his camera while he speaks (face within 25 degrees)', (key) => {
    const shot = CAMERA_SHOTS[key];
    // Direction robot -> camera as a three.js yaw (models face +z at 0).
    const dx = shot.pos[0] - shot.target[0];
    const dz = shot.pos[2] - shot.target[2];
    const toCamera = Math.atan2(dx, dz);
    const off = Math.abs(((ROBOT_SPEAK_FACING[key] - toCamera + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    expect((off * 180) / Math.PI).toBeLessThan(25);
    // And he still turns away from pure work facing (racks / bench) to do it.
    expect(ROBOT_SPEAK_FACING[key]).not.toBe(ROBOT_WORK_FACING[key]);
  });

  it('keeps Sentinel and Patch working while they talk: talk, with a reach every few seconds', () => {
    for (const key of ['sentinel', 'patch']) {
      const clips = Array.from({ length: 160 }, (_, i) => talkingClipFor(key, i * 0.1));
      expect(clips.filter((c) => c === 'talk').length).toBeGreaterThan(clips.length / 2);
      expect(clips).toContain('point');
      expect(new Set(clips)).toEqual(new Set(['talk', 'point']));
    }
  });
});
