import * as THREE from 'three';

/**
 * makeLabel — a floating text label rendered as a camera-facing THREE.Sprite.
 *
 * Text is drawn on a canvas (white on a dark glassy pill) so labels stay crisp
 * and readable at any zoom. Sprites always face the camera and are drawn on top
 * (depthTest off) so they act as annotations rather than geometry.
 */
export function makeLabel(text, opts = {}) {
  const { height = 0.9, fontSize = 44, fg = '#ffffff' } = opts;

  const font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  const padX = 34;
  const padY = 20;

  // Measure first with a scratch context so the canvas fits the text.
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const textW = Math.ceil(measure.measureText(text).width);

  const canvas = document.createElement('canvas');
  canvas.width = textW + padX * 2;
  canvas.height = fontSize + padY * 2;
  const ctx = canvas.getContext('2d');

  // Rounded-rect background.
  const r = canvas.height / 2;
  const w = canvas.width;
  const h = canvas.height;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,12,20,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text.
  ctx.font = font;
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, h / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(height * (canvas.width / canvas.height), height, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/** Convenience: create a label and drop it into the scene at (x, y, z). */
export function addLabel(scene, text, x, y, z, opts = {}) {
  const sprite = makeLabel(text, opts);
  sprite.position.set(x, y, z);
  scene.add(sprite);
  return sprite;
}
