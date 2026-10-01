// Design tokens for the liquid-glass UI. The CSS variables in src/index.css must match these
// values; tokens.test.js checks that, and checks text contrast on every glass level.

/**
 * Text colours, brightest first. ink3 is the dimmest text allowed, and only on glass-2/glass-3:
 * on glass-1 (cards over the bright background) use ink1 or ink2.
 */
export const INK = {
  ink1: '#1E1B2E',
  ink2: '#475569',
  ink3: '#5B6472',
};

/** The one accent (violet): every primary action and focus ring uses it, nothing else does. */
export const ACTION = {
  action: '#7C3AED',
  actionHover: '#6D28D9',
  actionInk: '#FFFFFF',
  focus: '#7C3AED',
};

/** Status colours. Used for meaning (passed, warning, error, note), never decoration. */
export const SEMANTIC = {
  success: '#047857',
  warning: '#B45309',
  danger: '#B91C1C',
  info: '#2563EB',
};

/** Page base and the three glass fills ([r, g, b, alpha]). White-dominant light theme. */
export const BASE = '#F5F3FB';
export const SURFACES = {
  'glass-1': [255, 255, 255, 0.55],
  'glass-2': [255, 255, 255, 0.82],
  'glass-3': [255, 255, 255, 0.92],
};

/** Liquid background blobs: colour and opacity, as rendered by LiquidBackground. */
export const BLOBS = [
  { color: '#8B5CF6', opacity: 0.2 },
  { color: '#A78BFA', opacity: 0.18 },
  { color: '#C4B5FD', opacity: 0.16 },
];

// ---- contrast maths (WCAG 2.x) ----

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Paints a translucent [r, g, b, a] colour over an opaque [r, g, b] one. */
export function over([r, g, b, a], [br, bg, bb]) {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The backgrounds a glass panel can sit on: the plain base, each blob at full strength, and
 * every pair of overlapping blobs. The darkening overlay is ignored, so this errs bright.
 */
export function backgroundSamples() {
  const base = hexToRgb(BASE);
  const paint = (blob, under) => over([...hexToRgb(blob.color), blob.opacity], under);
  const singles = BLOBS.map((b) => paint(b, base));
  const pairs = BLOBS.flatMap((a, i) => BLOBS.slice(i + 1).map((b) => paint(b, paint(a, base))));
  return [base, ...singles, ...pairs];
}

/** Lowest contrast of a text colour on a glass level, across every background sample. */
export function worstContrast(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(...backgroundSamples().map((bg) => contrast(text, over(SURFACES[surface], bg))));
}
