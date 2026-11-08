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

// ---- Dark theme (Instagram-style true black) ----
// The CSS variables under html[data-theme="dark"] in src/index.css must match
// these values; tokens.test.js checks that, and checks text contrast on every
// dark glass level. The terminal palette above is NOT redeclared for dark:
// Solarized stays exactly as-is in both themes.

/** Dark text: white primary, Instagram-grey secondary, dimmest #A1A1AA
 * (#737373 would fail AA on the dark glass — checked below). */
export const DARK_INK = {
  ink1: '#FFFFFF',
  ink2: '#A8A8A8',
  ink3: '#A1A1AA',
};

/**
 * Dark violet accent: the light #7C3AED is 3.7:1 on black (fails AA);
 * #A78BFA is 7.7:1. actionInk is near-black because white text on the
 * bright violet fill is 2.7:1 (fails); near-black on it is 6.2:1.
 */
export const DARK_ACTION = {
  action: '#A78BFA',
  actionHover: '#C4B5FD',
  actionInk: '#1E1B2E',
  focus: '#A78BFA',
};

/**
 * Primary-button surface, UNCHANGED in dark: the #C4B5FD fill is 11.4:1
 * against a black card and 9.1:1 with its near-black text, so the button
 * reads on black exactly as it does on white.
 */
export const DARK_ACTION_SURFACE = {
  surface: '#C4B5FD',
  surfaceHover: '#A78BFA',
  surfaceInk: '#1E1B2E',
};

/** Status colours, brightened so they pass AA on the dark glass. */
export const DARK_SEMANTIC = {
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
};

/** Dark page base and glass fills ([r, g, b, alpha]). True black dominates. */
export const DARK_BASE = '#000000';
export const DARK_SURFACES = {
  'glass-1': [18, 18, 18, 0.68],
  'glass-2': [28, 28, 30, 0.88],
  'glass-3': [28, 28, 30, 0.96],
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

/** The background a dark glass panel can sit on: the true-black page base. */
export function darkBackgroundSamples() {
  return [hexToRgb(DARK_BASE)];
}

/** Lowest contrast of a text colour on a glass level, across every background sample. */
export function worstContrast(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(...backgroundSamples().map((bg) => contrast(text, over(SURFACES[surface], bg))));
}

/** Lowest contrast of a text colour on a dark glass level, over the black page base. */
export function worstDarkContrast(textHex, surface) {
  const text = hexToRgb(textHex);
  return Math.min(...darkBackgroundSamples().map((bg) => contrast(text, over(DARK_SURFACES[surface], bg))));
}
