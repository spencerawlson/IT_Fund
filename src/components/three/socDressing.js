import * as THREE from 'three';
import {
  ROOM_SCALE,
  H_PARTITION_Y_M,
  SOC_H_PARTITION_Y_M,
} from '@/components/three/socLayout';

// The concept look (Spencer's render, 2026-11-14) on top of PR #63's
// rooms: glass walls, nameplate signs, the "R2C DATA CENTER" screen.
// Everything here is a SEPARATE scene object — the data-center GLB
// stays exactly as created (one merged opaque mesh: its partitions
// cannot be made glass, and its desk + chair are already the model's
// own, so no furniture is built here). The dressing is built in scene
// units (x5) from the metre facts in socLayout.js.
//
// Glass: the partitions are opaque, so real glass can only live where
// the wall ISN'T — the wide doorway in the H-wall (desk room <->
// workshop, x +0.27..+2.13). Two panes there with a door gap between
// them, slim metal frames, barely-there opacity: the cameras look
// THROUGH the glass at the robots, and the doorway stays open. The
// V-wall doorway (server room <-> workshop) stays fully open — it is
// the door, not a window.
// Signs: hanging nameplates above each robot (the concept's wall signs
// would sit on the opaque partitions and read as stickers; hanging
// plates read as signs from the wide camera and never block a robot —
// they hang above the heads). The R2C screen hangs on the north wall
// behind Sentinel/Patch. No LED strips: the partitions' heights vary
// (the H-wall is ~1.35 m in its west stretch, taller elsewhere), so a
// straight strip along a "top" floats in places — the blue accent is
// carried by the signs' cyan borders/text and the screen instead.
export const SOC_DRESSING = {
  // H-wall doorway glass (Blender metres): two panes, door gap 0.5 m.
  glass: {
    wallY: H_PARTITION_Y_M,
    heightM: 2.2,
    panes: [
      { xMin: 0.27, xMax: 1.2 },
      { xMin: 1.7, xMax: 2.13 },
    ],
    frameM: 0.06,
    opacity: 0.14,
  },
  // Hanging signs (Blender metres): plate + two rods to the ceiling.
  // Wall-mounted, like the concept render (2026-11-16 rebuild): Cypher's
  // plate on the front of his desk, Sentinel's and Patch's on the glass
  // partition in front of their rooms, facing the cameras (south). No rods.
  // x/y/zM are the plate centre in Blender metres; wM/hM its size.
  signs: [
    // Positions follow the enlarged SOC (2026-11-17): Cypher's plate moved
    // with his desk, the others along the H glass with the plan (1.5x).
    { key: 'cypher', title: 'Cypher', sub: 'AI Learning Agent', x: -0.97, y: -0.51, zM: 0.45, wM: 0.46, hM: 0.15 },
    { key: 'sentinel', title: 'Sentinel', sub: 'Infrastructure & Security', x: -1.02, y: SOC_H_PARTITION_Y_M - 0.03, zM: 2.45, wM: 0.9, hM: 0.28 },
    { key: 'patch', title: 'Patch', sub: 'Lab & Printing (3D / Fabrication)', x: 3.0, y: SOC_H_PARTITION_Y_M - 0.03, zM: 2.45, wM: 0.78, hM: 0.25 },
  ],
  signPlateM: { w: 0.9, h: 0.28 },
  signCentreZM: 2.0,
  // North-wall screen (Blender metres): hung high (centre 2.15 m) so
  // its text clears the server racks (tops ~2.0 m) from the wide
  // camera — the racks stand in front of the wall, and a screen at
  // 1.8 m hides its text behind them (proven by render). y = 2.35:
  // the north wall's inner face is 2.44 (ray-cast), so 2.5 sat INSIDE
  // the wall and the screen was invisible. 0.7 m tall (not 0.9): at
  // 0.9 the title sat on the frame's top edge; at 0.7 both lines read.
  screen: { x: 0, y: 2.35, z: 2.15, wM: 1.6, hM: 0.7 },
};

const SIGN_CANVAS_W = 1024;
const SIGN_CANVAS_H = 320;
const SCREEN_CANVAS_W = 1024;
const SCREEN_CANVAS_H = 576;

function drawSign(ctx, w, h, title, sub) {
  const s = w / SIGN_CANVAS_W;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(56,189,248,0.8)';
  ctx.lineWidth = 6 * s;
  ctx.strokeRect(3 * s, 3 * s, w - 6 * s, h - 6 * s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.font = `800 ${Math.round(120 * s)}px Inter, system-ui, sans-serif`;
  ctx.fillText(title, w / 2, h * 0.36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = `600 ${Math.round(56 * s)}px Inter, system-ui, sans-serif`;
  ctx.fillText(sub, w / 2, h * 0.74);
}

function drawScreen(ctx, w, h) {
  const s = w / SCREEN_CANVAS_W;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(56,189,248,0.25)';
  ctx.lineWidth = 2 * s;
  for (let x = 0; x <= w; x += 64 * s) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 64 * s) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#38bdf8';
  ctx.font = `800 ${Math.round(110 * s)}px Inter, system-ui, sans-serif`;
  ctx.fillText('R2C DATA CENTER', w / 2, h * 0.42);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 ${Math.round(48 * s)}px Inter, system-ui, sans-serif`;
  ctx.fillText('OPERATION BROKEN SHIELD  •  LIVE', w / 2, h * 0.68);
}

function canvasTexture(createCanvas, w, h, draw) {
  // Returns null instead of throwing when no canvas is available (no
  // jsdom in node, no document) — the SOC never breaks on the dressing.
  try {
    const make = createCanvas || (() => document.createElement('canvas'));
    const canvas = make();
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    draw(ctx, w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  } catch {
    return null;
  }
}

function plateMesh(texture, wUnits, hUnits, name) {
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wUnits, hUnits), material);
  mesh.name = name;
  return mesh;
}

/** A wall-mounted nameplate sign (one glowing plate), or null without a canvas. */
export function makeSign(sign, { createCanvas } = {}) {
  const texture = canvasTexture(createCanvas, SIGN_CANVAS_W, SIGN_CANVAS_H,
    (ctx, w, h) => drawSign(ctx, w, h, sign.title, sign.sub));
  if (!texture) return null;
  const group = new THREE.Group();
  group.name = `soc-sign-${sign.key}`;
  const plate = plateMesh(
    texture,
    (sign.wM ?? SOC_DRESSING.signPlateM.w) * ROOM_SCALE,
    (sign.hM ?? SOC_DRESSING.signPlateM.h) * ROOM_SCALE,
    `soc-sign-plate-${sign.key}`,
  );
  plate.position.set(
    sign.x * ROOM_SCALE,
    (sign.zM ?? SOC_DRESSING.signCentreZM) * ROOM_SCALE,
    -sign.y * ROOM_SCALE,
  );
  group.add(plate);
  return group;
}

/** The north-wall "R2C DATA CENTER" screen, or null without a canvas. */
export function makeScreen({ createCanvas } = {}) {
  const texture = canvasTexture(createCanvas, SCREEN_CANVAS_W, SCREEN_CANVAS_H, drawScreen);
  if (!texture) return null;
  const mesh = plateMesh(
    texture,
    SOC_DRESSING.screen.wM * ROOM_SCALE,
    SOC_DRESSING.screen.hM * ROOM_SCALE,
    'soc-screen',
  );
  mesh.position.set(
    SOC_DRESSING.screen.x * ROOM_SCALE,
    SOC_DRESSING.screen.z * ROOM_SCALE,
    -SOC_DRESSING.screen.y * ROOM_SCALE,
  );
  // Plane geometry faces +Z (south, toward the wide camera) — no turn.
  return mesh;
}

function glassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: SOC_DRESSING.glass.opacity,
    roughness: 0.05,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Build the whole dressing as one group (scene units): H-wall doorway
 * glass + frames, the three hanging signs, the R2C screen. Returns the
 * group (never null — the glass needs no canvas; a missing canvas only
 * drops the signs/screen).
 */
export function buildSocDressing({ createCanvas } = {}) {
  // Since the Blender-built room (soc-room.glb, 2026-11-16) the glass
  // partitions and the R2C wall display are part of the room itself, so
  // the dressing is just the three nameplate signs (canvas textures;
  // skipped headless). makeScreen / glassMaterial stay exported for reuse.
  const group = new THREE.Group();
  group.name = 'soc-dressing';
  for (const sign of SOC_DRESSING.signs) {
    const built = makeSign(sign, { createCanvas });
    if (built) group.add(built);
  }
  return group;
}
