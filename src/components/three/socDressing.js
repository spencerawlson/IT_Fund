import * as THREE from 'three';
import {
  ROOM_SCALE,
  H_PARTITION_Y_M,
  ROBOT_SPOTS_M,
  CYPHER_SEAT_M,
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
  signs: [
    { key: 'cypher', title: 'Cypher', sub: 'AI Learning Agent', x: CYPHER_SEAT_M.x, y: -1.0 },
    { key: 'sentinel', title: 'Sentinel', sub: 'Infrastructure & Security', x: ROBOT_SPOTS_M.sentinel.work.x, y: 1.0 },
    { key: 'patch', title: 'Patch', sub: 'Lab & Printing (3D / Fabrication)', x: ROBOT_SPOTS_M.patch.work.x, y: 1.0 },
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

/** A hanging nameplate sign (plate + rods), or null without a canvas. */
export function makeSign(sign, { createCanvas } = {}) {
  const texture = canvasTexture(createCanvas, SIGN_CANVAS_W, SIGN_CANVAS_H,
    (ctx, w, h) => drawSign(ctx, w, h, sign.title, sign.sub));
  if (!texture) return null;
  const group = new THREE.Group();
  group.name = `soc-sign-${sign.key}`;
  const plate = plateMesh(
    texture,
    SOC_DRESSING.signPlateM.w * ROOM_SCALE,
    SOC_DRESSING.signPlateM.h * ROOM_SCALE,
    `soc-sign-plate-${sign.key}`,
  );
  plate.position.set(
    sign.x * ROOM_SCALE,
    SOC_DRESSING.signCentreZM * ROOM_SCALE,
    -sign.y * ROOM_SCALE,
  );
  group.add(plate);
  const rodMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
  // Rods run from the plate top (2.14 m) to the ceiling (2.70 m).
  const rodGeo = new THREE.BoxGeometry(0.08, 0.56 * ROOM_SCALE, 0.08);
  for (const dx of [-0.35, 0.35]) {
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(
      (sign.x + dx) * ROOM_SCALE,
      2.42 * ROOM_SCALE,
      -sign.y * ROOM_SCALE,
    );
    rod.name = `soc-sign-rod-${sign.key}`;
    group.add(rod);
  }
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
  const group = new THREE.Group();
  group.name = 'soc-dressing';
  const m = ROOM_SCALE;
  const glass = SOC_DRESSING.glass;

  // --- Glass panes in the H-wall doorway + slim frames.
  const glassMat = glassMaterial();
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
  for (const pane of glass.panes) {
    const wM = pane.xMax - pane.xMin;
    const paneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wM * m, glass.heightM * m),
      glassMat,
    );
    paneMesh.name = 'soc-glass-pane';
    paneMesh.position.set(
      ((pane.xMin + pane.xMax) / 2) * m,
      (glass.heightM / 2) * m,
      -glass.wallY * m,
    );
    group.add(paneMesh);
    // Frame: top rail + two side stiles (the floor is the bottom rail).
    const rail = new THREE.Mesh(new THREE.BoxGeometry(wM * m, glass.frameM * m, glass.frameM * m), frameMat);
    rail.name = 'soc-glass-frame';
    rail.position.set(((pane.xMin + pane.xMax) / 2) * m, glass.heightM * m, -glass.wallY * m);
    group.add(rail);
    for (const xM of [pane.xMin, pane.xMax]) {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(glass.frameM * m, glass.heightM * m, glass.frameM * m), frameMat);
      stile.name = 'soc-glass-frame';
      stile.position.set(xM * m, (glass.heightM / 2) * m, -glass.wallY * m);
      group.add(stile);
    }
  }

  // --- Hanging signs + R2C screen (canvas textures; skipped headless).
  for (const sign of SOC_DRESSING.signs) {
    const built = makeSign(sign, { createCanvas });
    if (built) group.add(built);
  }
  const screen = makeScreen({ createCanvas });
  if (screen) group.add(screen);

  return group;
}
