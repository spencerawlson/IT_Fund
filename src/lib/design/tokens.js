// Design tokens for the glass UI. The CSS variables in src/index.css must match these
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
export const BASE = '#F7F6F3';
export const SURFACES = {
  'glass-1': [255, 255, 255, 0.55],
  'glass-2': [255, 255, 255, 0.82],
  'glass-3': [255, 255, 255, 0.92],
};

/** Background tints: ultra-subtle static radial washes, as rendered by LiquidBackground.
 *  Peak [r, g, b] colour and opacity — each gradient fades to transparent. */
export const TINTS = [
  { color: '#6366F1', opacity: 0.055 },
  { color: '#64748B', opacity: 0.075 },
];

// ---- Apple-standard dark theme (mirrors html[data-theme="dark"] in src/index.css) ----

/**
 * Dark text colours, brightest first. ink3 is the dimmest text allowed, and only on
 * glass-2/glass-3 — same rule as the light theme. All pass WCAG AA on the dark glass.
 */
export const INK_DARK = {
  ink1: '#FFFFFF',
  ink2: '#AEAEB3',
  ink3: '#8E8E93',
};

/** Dark accent: violet brightened for black backgrounds; white button text still passes AA. */
export const ACTION_DARK = {
  action: '#7F55F2',
  actionHover: '#7C3AED',
  actionInk: '#FFFFFF',
  focus: '#7F55F2',
};

/** Dark status colours (Apple system dark palette). Used for meaning, never decoration. */
export const SEMANTIC_DARK = {
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  info: '#0A84FF',
};

/** Dark page base and the three glass fills ([r, g, b, alpha]): #1C1C1E frosted over pure black. */
export const BASE_DARK = '#000000';
export const SURFACES_DARK = {
  'glass-1': [28, 28, 30, 0.55],
  'glass-2': [28, 28, 30, 0.65],
  'glass-3': [28, 28, 30, 0.7],
};

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
 * The backgrounds a glass panel can sit on: the plain base, each tint at peak strength, and
 * every pair of overlapping tints. The darkening overlay is ignored, so this errs bright.
 */
export function backgroundSamples() {
  const base = hexToRgb(BASE);
  const paint = (tint, under) => over([...hexToRgb(tint.color), tint.opacity], under);
  const singles = TINTS.map((t) => paint(t, base));
  const pairs = TINTS.flatMap((a, i) => TINTS.slice(i + 1).map((b) => paint(b, paint(a, base))));
  return [base, ...singles, ...pairs];
}

/** Lowest contrast of a text colour on a glass level, across every background sample. */
export function worstContrast(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(...backgroundSamples().map((bg) => contrast(text, over(SURFACES[surface], bg))));
}

/** Dark backgrounds a glass panel can sit on: pure black, each tint at peak strength,
 *  and every pair of overlapping tints. */
export function backgroundSamplesDark() {
  const base = hexToRgb(BASE_DARK);
  const paint = (tint, under) => over([...hexToRgb(tint.color), tint.opacity], under);
  const singles = TINTS.map((t) => paint(t, base));
  const pairs = TINTS.flatMap((a, i) => TINTS.slice(i + 1).map((b) => paint(b, paint(a, base))));
  return [base, ...singles, ...pairs];
}

/** Lowest contrast of a text colour on a dark glass level, across every dark background sample. */
export function worstContrastDark(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(
    ...backgroundSamplesDark().map((bg) => contrast(text, over(SURFACES_DARK[surface], bg))),
  );
}
