import * as THREE from 'three';

// The data-center SOC layout — one big scene, three rooms INSIDE the data
// center Spencer gave us (public/models/datacenter.glb, already in the
// repo, untouched). The data center itself has three rooms; the robots
// stay in it, nowhere else. Every number here was measured from the real
// mesh with Blender (ray-cast sightlines + floor-height map), never
// assumed — see the PR body for the measurements.
//
// Coordinate frames: room facts are in BLENDER metres (x, y horizontal,
// z up) because that is what the mesh analysis used. Scene positions are
// three.js units at ROOM_SCALE (x5): threeX = bx * 5, threeY = bz * 5,
// threeZ = -by * 5 (glTF Y-up). socPositions() and the camera shots are
// already in scene units; the per-room facts stay in metres.

// The room, measured from the real datacenter.glb:
// outer 4.85 x 5.21 m, ceiling 2.70 m. The walkable floor surface is at
// z = 0.17 m (the bbox min is the base below it) — robots and devices
// stand on the floor, so placeDataCenterRoom drops the room so the floor
// sits at y = 0 instead of sinking their feet 0.17 m (the PR #62 scene
// stood them at the bbox min, 0.85 units under the visible floor).
export const ROOM_SCALE = 5.0;
export const ROOM_FLOOR_HEIGHT_M = 0.17;
export const ROOM_BOUNDS_M = { xMin: -2.43, xMax: 2.43, yMin: -2.61, yMax: 2.61, zMax: 2.7 };

// The internal partitions (Blender metres): the horizontal wall runs at
// y ≈ +0.18 with wide door gaps, the vertical wall at x ≈ +0.42. The
// room is ONE merged mesh with ONE opaque material, so there is no
// per-partition material to make glass at runtime (and the GLB stays
// untouched) — the see-through between rooms is the wide doorways in
// the partitions, not the panels: every cross-room sightline the
// cameras use passes through a doorway gap, verified by ray-cast
// against the real mesh. The panels themselves read as glass + metal
// frames in the renders; the doorways are what the cameras look through.
export const H_PARTITION_Y_M = 0.18;
export const V_PARTITION_X_M = 0.42;

// The three rooms inside the data center (Blender metres). Spencer's
// assignment: Cypher in the desk/computer room, Patch in the workshop
// (soldering equipment + 3D printer), Sentinel in the server room.
export const ROOMS_M = {
  cypher: { name: 'desk room', xMin: -2.43, xMax: 2.43, yMin: -2.61, yMax: H_PARTITION_Y_M },
  sentinel: { name: 'server room', xMin: -2.43, xMax: V_PARTITION_X_M, yMin: H_PARTITION_Y_M, yMax: 2.61 },
  patch: { name: 'workshop', xMin: V_PARTITION_X_M, xMax: 2.43, yMin: H_PARTITION_Y_M, yMax: 2.61 },
};

// Where each robot lives (Blender metres, floor plane). Cypher works
// in front of the south desk and patrols the clear floor north of it
// while he talks; Sentinel works the racks; Patch works the bench.
// Cypher's work spot is 0.7 m north of the desk's north edge (y = -1.7):
// close enough to read as "at his desk", far enough north that the
// WIDE camera sees his chest tag over the desk monitors (at y = -1.5 a
// monitor blocked it — ray-cast proved), and clear of the chair at
// (-1.0, -1.2).
export const ROBOT_SPOTS_M = {
  cypher: {
    work: { x: -0.5, y: -1.0 },
    patrol: { y: -0.35, xMin: -0.5, xMax: 1.2 },
  },
  sentinel: { work: { x: -0.3, y: 1.0 } },
  patch: { work: { x: 1.2, y: 1.0 } },
};

// Cypher's chair in the desk room (Blender metres, measured from the real
// mesh with a ray-cast height map + renders, never assumed): the seat top
// is ~0.60 m at (-1.05, -1.2), the backrest east of the seat, so the
// chair faces the west desk. The lesson panel seats him on it turned
// south to face the learner — a swivel chair turned toward the visitor —
// at his south desk, head and shoulders above the monitors.
export const CYPHER_CHAIR_M = { x: -1.05, y: -1.2, seatHeightM: 0.60 };

// Facing, as three.js rotationY: the models face +Z (south, toward the
// learner) at 0; west is -PI/2, east is +PI/2.
export const FACING = { south: 0, west: -Math.PI / 2, east: Math.PI / 2, north: Math.PI };
// Working pose: Cypher faces his desk (south), Sentinel faces the racks
// (west), Patch faces the bench (east). Speaking pose: all face south.
export const ROBOT_WORK_FACING = { cypher: FACING.south, sentinel: FACING.west, patch: FACING.east };

// Robot body boxes (facing-aware): the half-width is the shoulder/tread
// span across the facing axis, the half-depth the torso front-to-back
// along it. A square box (half-width on both axes) overstates the body —
// Patch's 1.40 m tread span runs north-south when he faces east, but his
// depth is only ~0.8 m east-west, so a square box flagged his corner as
// blocking R1 when the real body is clear of the sightline.
export const ROBOT_HALF_WIDTH_M = { cypher: 0.49, sentinel: 0.48, patch: 0.70 };
export const ROBOT_HALF_DEPTH_M = { cypher: 0.35, sentinel: 0.35, patch: 0.40 };
export const ROBOT_HEIGHT_M = 1.704;

/** The facing-aware body box of a robot at its work spot, in scene units. */
export function robotWorkBox(key) {
  const spot = spotToScene(ROBOT_SPOTS_M[key].work);
  const facing = ROBOT_WORK_FACING[key];
  const hw = ROBOT_HALF_WIDTH_M[key] * ROOM_SCALE;
  const hd = ROBOT_HALF_DEPTH_M[key] * ROOM_SCALE;
  // Facing south/north the width runs along X; facing east/west along Z.
  const across = Math.abs(Math.sin(facing)) < 0.5 ? hw : hd;
  const along = Math.abs(Math.sin(facing)) < 0.5 ? hd : hw;
  return {
    min: new THREE.Vector3(spot.x - across, 0, spot.z - along),
    max: new THREE.Vector3(spot.x + across, ROBOT_HEIGHT_M * ROOM_SCALE, spot.z + along),
  };
}

// The four mission devices (Blender metres). PC1/GUEST are workstations
// in Cypher's desk room; R1/SRV are in Sentinel's server room. Kept clear
// of the robots' spots and of the camera sightlines to Cypher's tag.
export const DEVICE_POSITIONS_M = {
  R1: { x: 0.0, y: 2.2 },
  PC1: { x: 2.0, y: -1.5 },
  GUEST: { x: 2.1, y: 0.0 },
  SRV: { x: -1.4, y: 0.55 },
};

/** Device id -> { x, z } on the room floor, in scene units (x5). */
export function socPositions() {
  const out = {};
  for (const [id, p] of Object.entries(DEVICE_POSITIONS_M)) {
    out[id] = { x: p.x * ROOM_SCALE, z: -p.y * ROOM_SCALE };
  }
  return out;
}

/** A robot spot (Blender metres) in scene units at `scale` (default the
 * SOC's ROOM_SCALE; the lesson panel passes 1.0 for the room's real size). */
export function spotToScene(p, scale = ROOM_SCALE) {
  return { x: p.x * scale, z: -p.y * scale };
}

// --- Camera shots (scene units) -------------------------------------------------
// The camera focuses on whoever is talking; otherwise it holds the wide
// "look across" shot of all three rooms. All sightlines were ray-cast
// clear against the real room mesh (heads + chests, plus the cross-room
// sightlines that let each focus shot show another robot working through
// the glass/doorways in the background) AND checked in-frame (the
// earlier south cameras failed that second check: the Sentinel one had
// Cypher's head dead-centre 0.73 m from the lens, hiding Sentinel, and
// the Patch one left Cypher 48° off-axis, out of frame — the ray-cast
// alone only proves the room doesn't block the ray, not that a robot is
// in frame or unobscured). Genuinely different angles per speaker
// (Spencer, 2026-11-14: "everything is just in one angle" — the old
// scene was one steep top-down shot): WIDE looks due north, high and
// far (the establishing look-across); CYPHER is the same due-north
// azimuth but a close low medium shot (a third of WIDE's distance);
// SENTINEL is shot from the south-east (looking north-west); PATCH from
// the south-west (looking north-east). The two north-room shots differ
// by ~51° of azimuth — a pan between them would be the same top-down
// shot nudged, so each has its own camera position, not a shared one.
// Cypher reads larger in the north-room shots because his desk room is
// nearest the south cameras — the natural depth of the look-across
// view, not a mis-focus: he never covers the speaker's head (checked),
// and the speaker is the one the camera is centred on.
// WIDE sits south of the room, high enough to see over the south wall.
export const CAMERA_SHOTS = {
  wide: { pos: [0, 17, 30], target: [0, 2, -2] },
  sentinel: { pos: [12, 16, 24], target: [-1.5, 5, -5] },
  patch: { pos: [-12, 12, 22], target: [6, 5, -5] },
};

// Cypher's shot tracks him: he patrols east-west while he talks, so the
// camera and its target follow his x and he stays centred.
export function cypherShot(cypherXM) {
  const x = cypherXM * ROOM_SCALE;
  const z = -ROBOT_SPOTS_M.cypher.patrol.y * ROOM_SCALE;
  return { pos: [x, 9, 12], target: [x, 5, z] };
}

export const SPEAKERS = ['wide', 'cypher', 'sentinel', 'patch'];

/** The camera shot for a speaker; Cypher's needs his current patrol x. */
export function shotForSpeaker(speaker, cypherXM) {
  if (speaker === 'cypher') return cypherShot(cypherXM);
  return CAMERA_SHOTS[speaker] || CAMERA_SHOTS.wide;
}

// --- Camera geometry (for the "genuinely different angles" bar) ------------------
// Bearing of a shot's viewing direction, in degrees east of due north
// (north is -z in scene units): WIDE and CYPHER look due north (0°),
// SENTINEL looks north-west (-25°), PATCH north-east (+26°).
export function shotBearing(shot) {
  const dx = shot.target[0] - shot.pos[0];
  const dz = shot.target[2] - shot.pos[2];
  return (Math.atan2(dx, -dz) * 180) / Math.PI;
}

/** Straight-line distance from a shot's camera to its target (scene units). */
export function shotDistance(shot) {
  const dx = shot.target[0] - shot.pos[0];
  const dy = shot.target[1] - shot.pos[1];
  const dz = shot.target[2] - shot.pos[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Elevation of a shot's viewing direction above the horizontal, degrees. */
export function shotElevation(shot) {
  const dy = shot.pos[1] - shot.target[1];
  const dh = Math.hypot(shot.target[0] - shot.pos[0], shot.target[2] - shot.pos[2]);
  return (Math.atan2(dy, dh) * 180) / Math.PI;
}

// --- Device showcase ----------------------------------------------------------------
// After the briefing, the opening tours the four mission devices in 3D —
// Spencer's complaint is that the equipment is only clearly visible in
// the 2D view; in 3D the robots dominate and the devices are hard to
// see/identify. Each device gets its own close, low camera (not the
// top-down look-across): the device fills the frame and its label is
// emphasised. Order follows the network path: the workstations, then
// the gateway, then the server. Targets are the device centres
// (y ≈ 2, half the 4-unit footprint); sightlines ray-cast clear against
// the real room mesh, and each device is checked in-frame and large
// (see socLayout.test.js + the Blender renders).
export const SHOWCASE_ORDER = ['PC1', 'GUEST', 'R1', 'SRV'];
export const DEVICE_SHOTS = {
  // Close, low, in-room cameras (not the top-down look-across). Targets
  // sit at y = 3.5 (between the device centre and its label at y = 5.6)
  // so the label fits in frame too — aiming at the device centre put
  // the label off the top edge. The cameras route around the ROBOTS as
  // well as the room: a robot working next to a device blocks a
  // straight-on shot (Patch hid GUEST, Sentinel hid R1 — proven by
  // render, not just ray-cast). GUEST is shot from the south (Patch is
  // north of it); R1 from inside the server room, east of Sentinel
  // (the through-the-gap angle left the router half-hidden behind the
  // partition frame); SRV from the desk room through the server-room
  // doorway gap; PC1 from inside the desk room (Cypher is at his desk,
  // west of the line).
  PC1: { pos: [2.5, 7, 2.5], target: [10, 3.5, 7.5] },
  GUEST: { pos: [5, 7, 5], target: [10.5, 3.5, 0] },
  R1: { pos: [1.5, 7, -2], target: [0, 3.5, -11] },
  SRV: { pos: [-7, 9, 8], target: [-7, 3.5, -2.75] },
};

/** The showcase camera for a device id (falls back to wide). */
export function deviceShot(deviceId) {
  return DEVICE_SHOTS[deviceId] || CAMERA_SHOTS.wide;
}

// --- SOC frame size (tablet bar) ------------------------------------------------------
// The SOC frame is the full-width first row of the mission grid at every
// breakpoint (lg:col-span-2 above lg, single column below it), inside the
// max-w-6xl (1152px) main with px-3 below sm and px-6 at sm+, inside a
// Card with md padding (p-5 below sm, p-6 at sm+). Pure: the frame size
// at a viewport width, in CSS px — the numbers Spencer's tablet photo
// is judged against (the live frame was ~60% of the width in the right
// column; this one is ~90% at tablet widths).
export const SOC_FRAME_ASPECT = 10 / 16;
export function socFrameSize(viewportW) {
  const mainPad = viewportW < 640 ? 24 : 48;
  const contentW = Math.min(viewportW - mainPad, 1152);
  const cardPad = viewportW < 640 ? 40 : 48;
  const w = Math.max(0, contentW - cardPad);
  return { w, h: w * SOC_FRAME_ASPECT };
}

// --- Cypher's patrol -------------------------------------------------------------
// While Cypher speaks he walks his patrol in the desk room: a ping-pong
// along x at a walking pace, facing the learner (south) the whole time so
// his chest tag stays readable. Pure: position at elapsed seconds t.
export const PATROL_SPEED_M_S = 0.25;
export function patrolX(t, patrol = ROBOT_SPOTS_M.cypher.patrol) {
  const span = patrol.xMax - patrol.xMin;
  const phase = ((t * PATROL_SPEED_M_S) / span) % 2;
  if (phase < 0) return patrol.xMin;
  if (phase < 1) return patrol.xMin + phase * span;
  return patrol.xMax - (phase - 1) * span;
}

// --- Ambient work ----------------------------------------------------------------
// The robots who are not speaking keep working in their rooms. Pure
// scheduler: which clip a robot should be playing at elapsed seconds t.
// Sentinel touches/checks the racks (a point one-shot every 12 s, idle
// between); Patch works the bench (a thinking loop in 4 s stretches of
// every 14 s, idle between). The caller plays the returned clip every
// frame — play() is idempotent while the clip is already current, and the
// one-shot returns to idle through the mixer's finished handler.
export function ambientClipFor(robot, elapsedS) {
  if (robot === 'sentinel') {
    return elapsedS % 12 < 1.5 ? 'point' : 'idle';
  }
  if (robot === 'patch') {
    return elapsedS % 14 < 4 ? 'thinking' : 'idle';
  }
  return 'idle';
}

// --- Room placement ---------------------------------------------------------------
/**
 * Stand the data-center room on y = 0 (its FLOOR, not its bbox min),
 * centred on the origin, at `scale`. The GLB's own frame is metres; the
 * SOC uses ROOM_SCALE, the lesson panel uses 1.0.
 */
export function placeDataCenterRoom(room, scale) {
  const box = new THREE.Box3().setFromObject(room);
  const center = new THREE.Vector3();
  box.getCenter(center);
  room.scale.setScalar(scale);
  room.position.set(
    -center.x * scale,
    -ROOM_FLOOR_HEIGHT_M * scale,
    -center.z * scale,
  );
  return room;
}
