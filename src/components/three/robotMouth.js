import * as THREE from 'three';

/**
 * Lip sync for the three robots (Spencer, 2026-11-18: "a simple glowing
 * line, like the smile they have now, just opening and changing shape").
 *
 * The robots' faces are screens: eyes and smile are painted into the face
 * texture, so nothing on them moved. Each robot now gets a live mouth:
 * a small dark patch over the painted smile with a glowing line drawn on it,
 * attached to the head bone so it follows every clip. Silent, it is the
 * same smile. Talking, it opens with the voice level and changes shape with
 * the voice's frequency bands: a low-pitched sound rounds it ("oh"), a
 * high-pitched one makes it wide and flat ("ee"), in between it opens wide
 * ("ah").
 *
 * Positions are the painted smiles in model metres, bind pose (x right,
 * y up, z forward), measured 2026-11-18 by ray-casting each face and
 * reading the face texture, checked on front orthographic renders.
 * `tilt` is the visor's slope at the mouth (rad about x, top leaning
 * forward), `width` the painted smile's width, `box` the [width, height] of
 * the dark patch: big enough to hide the painted smile and its glow, short
 * enough to stay clear of the eyes (whose lowest point is 3.5-5 cm above).
 */
export const ROBOT_MOUTHS = {
  cypher: { center: [0.0, 1.345, 0.2205], width: 0.08, box: [0.17, 0.085], tilt: 0.15, color: '#3ee6ef' },
  sentinel: { center: [0.003, 1.381, 0.259], width: 0.068, box: [0.15, 0.07], tilt: 0.0, color: '#62d2ff' },
  patch: { center: [0.155, 1.16, 0.33], width: 0.13, box: [0.26, 0.062], tilt: 0.17, color: '#4ee0ea' },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Mouth shape from the voice. `level` is the 0..1 loudness, `bands` the
 * 24 averaged frequency bands (0..1) the voice hook measures. Returns
 * { open, width, height }: open 0..1, width as a fraction of the painted
 * smile's width, height as a fraction of the mouth box height.
 */
export function mouthShape(level, bands) {
  const open = clamp01(((level || 0) - 0.04) / 0.5);
  let centroid = 0.3;
  if (bands && bands.length) {
    let sum = 0;
    let weighted = 0;
    for (let i = 0; i < bands.length; i += 1) {
      sum += bands[i];
      weighted += bands[i] * i;
    }
    if (sum > 1e-4) centroid = weighted / sum / (bands.length - 1);
  }
  // Speech energy sits low in the spectrum; map its usual centroid range.
  const bright = clamp01((centroid - 0.12) / 0.3); // 0 "oh" .. 1 "ee"
  const width = 0.75 + 0.35 * bright - 0.2 * (1 - bright) * open;
  const height = open * (0.3 + 0.45 * (1 - bright));
  return { open, width, height };
}

const CANVAS_W = 256;

/**
 * Draw one frame of the mouth (the resting smile when shape.open is ~0) on a
 * canvas the shape of `spec.box`; the painted smile spans spec.width of it.
 */
export function drawMouth(ctx, shape, spec, W, H) {
  const color = spec.color;
  // The glow from the previous frame's line must not touch the patch.
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.clearRect(0, 0, W, H);
  // Dark patch over the painted smile, feathered so it melts into the visor.
  // An ellipse, opaque over the middle, fading at the rim.
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(W / 2, H / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(6,8,10,1)');
  g.addColorStop(0.72, 'rgba(6,8,10,1)');
  g.addColorStop(1, 'rgba(6,8,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  const smileW = (W * spec.width) / spec.box[0];
  const half = (smileW / 2) * shape.width;
  const cx = W / 2;
  const top = H * 0.4;
  const line = smileW * 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = line;
  ctx.beginPath();
  if (shape.open < 0.05) {
    // The resting smile, as painted.
    ctx.moveTo(cx - half, top);
    ctx.quadraticCurveTo(cx, top + smileW * 0.32, cx + half, top);
    ctx.stroke();
    return;
  }
  // Open mouth: a gentle upper lip and a lower lip that drops with the sound.
  const drop = smileW * 0.12 + shape.height * (H * 0.62 - smileW * 0.12);
  ctx.moveTo(cx - half, top);
  ctx.quadraticCurveTo(cx, top + smileW * 0.06, cx + half, top);
  ctx.quadraticCurveTo(cx, top + drop * 2, cx - half, top);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,40,46,0.95)';
  ctx.fill();
  ctx.stroke();
}

/**
 * Build a robot's live mouth and attach it to `headBone`. Call with the
 * model in its bind pose (straight after loading, before any clip). Returns
 * { mesh, update(level, bands, dt), dispose() }, or null where there is no
 * DOM canvas (node tests) or no head bone / no entry for the robot.
 */
export function attachMouth(key, headBone, { createCanvas } = {}) {
  const spec = ROBOT_MOUTHS[key];
  if (!spec || !headBone) return null;
  const make = createCanvas || (typeof document !== 'undefined' ? () => document.createElement('canvas') : null);
  if (!make) return null;
  const canvas = make();
  const W = CANVAS_W;
  const H = Math.round((CANVAS_W * spec.box[1]) / spec.box[0]);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.box[0], spec.box[1]), material);
  mesh.name = `${key}-mouth`;
  mesh.renderOrder = 2;

  // Model-space placement (4 mm in front of the visor, tilted with it),
  // expressed in the head bone's frame so it follows the head.
  const normal = new THREE.Vector3(0, -Math.sin(spec.tilt), Math.cos(spec.tilt));
  // The mouth box sits a little below the smile's centre: it opens downward.
  // Canvas row 0.4·H is the smile's top line: put the box so it lands on
  // the painted smile's centre line.
  const at = new THREE.Vector3(...spec.center).add(new THREE.Vector3(0, -spec.box[1] * 0.1 + spec.width * 0.06, 0)).addScaledVector(normal, 0.004);
  headBone.updateWorldMatrix(true, false);
  const inv = headBone.matrixWorld.clone().invert();
  const worldQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(spec.tilt, 0, 0));
  const headQuat = new THREE.Quaternion();
  headBone.getWorldQuaternion(headQuat);
  const headScale = new THREE.Vector3();
  headBone.getWorldScale(headScale);
  mesh.position.copy(at.applyMatrix4(inv));
  mesh.quaternion.copy(headQuat.invert().multiply(worldQuat));
  mesh.scale.set(1 / headScale.x, 1 / headScale.y, 1 / headScale.z);
  headBone.add(mesh);

  let shown = null;
  const current = { open: 0, width: 1, height: 0 };
  const draw = () => {
    drawMouth(ctx, current, spec, W, H);
    texture.needsUpdate = true;
  };
  draw();

  return {
    mesh,
    update(level, bands, dt = 1 / 60) {
      const target = mouthShape(level, bands);
      // Quick to open, a touch slower to close: reads as speech, not flicker.
      const k = 1 - Math.exp(-(target.open > current.open ? 28 : 16) * dt);
      current.open += (target.open - current.open) * k;
      current.width += (target.width - current.width) * k;
      current.height += (target.height - current.height) * k;
      const sig = `${current.open.toFixed(2)}|${current.width.toFixed(2)}|${current.height.toFixed(2)}`;
      if (sig !== shown) {
        shown = sig;
        draw();
      }
    },
    dispose() {
      headBone.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
