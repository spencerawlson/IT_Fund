import * as THREE from 'three';

// Cypher's name tag — a "Hello, my name is" store tag pinned on his chest
// in the mission SOC scene, reading "Hi, I'm Cypher" (the robot's name, not
// the tutor spelling). It is a real 3D object, not a floating label: a plane
// mesh parented to the chest bone, so it rides the body through the walk-in
// and the idle sway, and it yaws to face the fixed SOC camera so it stays
// readable at the room's camera distance. Everything else Cypher says comes
// through voice only — the tag carries his name and nothing else.

export const CYPHER_NAME_TAG_TEXT = "Hi, I'm Cypher";

// Tag canvas: drawn once, used as the mesh texture.
export const NAME_TAG_CANVAS_WIDTH = 1024;
export const NAME_TAG_CANVAS_HEIGHT = 592;

// Tag size in character-local units (the model is 1.70 m, the SOC scales it
// 3.0x): about the width of the torso, so it reads as a chest tag and the
// name stays legible from the SOC camera.
export const NAME_TAG_WIDTH = 1.0;
export const NAME_TAG_HEIGHT = 0.58;

// The name is the readable part at room distance: it fills the tag width.
// Fit-to-width: start large, shrink only if the font is too wide for the
// canvas, so the name stays as big as the tag allows on any font.
export const NAME_TAG_NAME_FONT_PX = 300;
export const NAME_TAG_NAME_MAX_WIDTH_PX = 950;
// Cap height of a bold sans name is ~0.716 of its font size (Inter/system-ui).
export const NAME_CAP_HEIGHT_RATIO = 0.716;

/**
 * The font size that fits `text` inside `maxWidth` at `startPx`: the start
 * size when it fits, shrunk proportionally when it does not. Never returns
 * 0 — a broken measureText keeps the start size.
 */
export function fitNameFont(ctx, text, startPx, maxWidth) {
  let measured = 0;
  try {
    ctx.font = `800 ${Math.round(startPx)}px Inter, system-ui, -apple-system, sans-serif`;
    measured = ctx.measureText ? ctx.measureText(text).width : 0;
  } catch {
    measured = 0;
  }
  if (!measured || measured <= maxWidth) return startPx;
  return Math.max(1, Math.floor((startPx * maxWidth) / measured));
}

// Tag centre, local to the chest bone (the bone sits at ~1.10 m; the torso
// front is z 0.255 in the chest band, measured from cypher.glb): just proud
// of the chest so it never z-fights the body.
export const NAME_TAG_CHEST_OFFSET = { x: 0, y: 0.05, z: 0.27 };

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Draw the tag on a 2d context: white body, red "HELLO / my name is" band,
 * then the greeting — "Hi, I'm" over the name "Cypher" in large type.
 * Layout is relative to the canvas size so any canvas works.
 */
export function drawNameTag(ctx, width, height) {
  const s = width / NAME_TAG_CANVAS_WIDTH;
  const font = (weight, px) => `${weight} ${Math.round(px * s)}px Inter, system-ui, -apple-system, sans-serif`;

  // White body with a soft edge.
  roundRectPath(ctx, 0, 0, width, height, 44 * s);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 4 * s;
  ctx.stroke();

  // Red "HELLO / my name is" band, clipped to the body's rounded top —
  // shallower now: the name owns the tag, the band is just the header.
  ctx.save();
  roundRectPath(ctx, 0, 0, width, height, 44 * s);
  ctx.clip();
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(0, 0, width, 150 * s);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(800, 76);
  ctx.fillText('HELLO', width / 2, 74 * s);
  ctx.font = font(400, 36);
  ctx.fillText('my name is', width / 2, 124 * s);

  // The greeting itself — "Hi, I'm" small, the NAME as big as the tag
  // allows (fit to the tag width). At the SOC camera the name's cap height
  // is what reads: ~19px on the 706x400 frame, where the old 168px name
  // rendered ~5px and was unreadable.
  ctx.fillStyle = '#111827';
  ctx.font = font(600, 64);
  ctx.fillText("Hi, I'm", width / 2, 200 * s);
  const namePx = fitNameFont(ctx, 'Cypher', NAME_TAG_NAME_FONT_PX * s, NAME_TAG_NAME_MAX_WIDTH_PX * s);
  ctx.font = `800 ${Math.round(namePx)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText('Cypher', width / 2, 420 * s);
}

/**
 * Build the tag mesh. `createCanvas` is injectable for tests (the repo has
 * no jsdom); without one it uses the document canvas. Returns null instead
 * of throwing when no canvas is available, so the SOC never breaks on it.
 */
export function makeNameTag({ createCanvas } = {}) {
  try {
    const make = createCanvas || (() => document.createElement('canvas'));
    const canvas = make();
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    canvas.width = NAME_TAG_CANVAS_WIDTH;
    canvas.height = NAME_TAG_CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    drawNameTag(ctx, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    // Unlit: a printed tag stays bright and legible under any scene light.
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(NAME_TAG_WIDTH, NAME_TAG_HEIGHT), material);
    mesh.name = 'cypher-name-tag';
    mesh.userData.isCypherNameTag = true;
    return mesh;
  } catch {
    return null;
  }
}

const _tagPos = new THREE.Vector3();

/**
 * Yaw the tag to face the camera. Same-height target, so the tag stays
 * vertical like a pinned tag — it never tilts up at the camera.
 */
export function faceTagToCamera(tag, cameraPos) {
  if (!tag || !cameraPos) return;
  tag.updateWorldMatrix(true, false);
  tag.getWorldPosition(_tagPos);
  tag.lookAt(cameraPos[0], _tagPos.y, cameraPos[2]);
}

/**
 * Pin the name tag to the character's chest bone and face it at the camera.
 * Returns the tag mesh, or null when there is no chest bone / no canvas.
 * The tag is NOT added for the lesson panel: only the SOC scene calls this.
 */
export function attachCypherNameTag(characterGroup, cameraPos, opts = {}) {
  if (!characterGroup) return null;
  let chest = null;
  characterGroup.traverse((obj) => {
    if (!chest && obj.isBone && obj.name === 'chest') chest = obj;
  });
  if (!chest) return null;
  const tag = makeNameTag(opts);
  if (!tag) return null;
  tag.position.set(NAME_TAG_CHEST_OFFSET.x, NAME_TAG_CHEST_OFFSET.y, NAME_TAG_CHEST_OFFSET.z);
  chest.add(tag);
  faceTagToCamera(tag, cameraPos);
  return tag;
}
