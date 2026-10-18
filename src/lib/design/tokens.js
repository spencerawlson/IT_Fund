// Design tokens for the light glass UI. The CSS variables in src/index.css must match
// these values; tokens.test.js checks that, and checks text contrast on every glass level.

/**
 * Text colours, darkest first. ink1 is the near-black used for headings and body copy;
 * ink3 is the dimmest text allowed, and only on glass-2/glass-3.
 */
export const INK = {
  ink1: '#111111',
  ink2: '#3D4451',
  ink3: '#5B6472',
};

/**
 * The violet accent for text, icons, progress, and focus. It is intentionally deeper
 * than the button fill so small elements remain legible on white.
 */
export const ACTION = {
  action: '#7C3AED',
  actionHover: '#6D28D9',
  actionInk: '#FFFFFF',
  focus: '#7C3AED',
};

/** Light-purple primary-button surface. Near-black text is used on this fill. */
export const ACTION_SURFACE = {
  surface: '#C4B5FD',
  surfaceHover: '#A78BFA',
  surfaceInk: '#1E1B2E',
};

/** Status colours. Used for meaning (passed, warning, error, note), never decoration. */
export const SEMANTIC = {
  success: '#047857',
  warning: '#B45309',
  danger: '#B91C1C',
  info: '#2563EB',
};

/** Page base and the three glass fills ([r, g, b, alpha]). White is the dominant surface. */
export const BASE = '#FFFFFF';
export const SURFACES = {
  'glass-1': [255, 255, 255, 0.68],
  'glass-2': [255, 255, 255, 0.88],
  'glass-3': [255, 255, 255, 0.96],
};

/** Solarized terminal palette: deep blue-green base, Solarized green text. */
export const TERMINAL = {
  background: '#002B36',
  border: '#073642',
  text: '#859900',
  brightText: '#AABD00',
  mutedText: '#93A1A1',
  error: '#FF6B68',
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

/** The background a glass panel can sit on: the plain white page base. */
export function backgroundSamples() {
  return [hexToRgb(BASE)];
}

/** Lowest contrast of a text colour on a glass level, across every background sample. */
export function worstContrast(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(...backgroundSamples().map((bg) => contrast(text, over(SURFACES[surface], bg))));
}
