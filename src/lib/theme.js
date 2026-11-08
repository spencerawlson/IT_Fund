// Theme selection for road2cissp.com.
//
// The site ships light-first (white prevails) and offers a true-black dark
// theme (Instagram-style: pure #000000 page, near-black cards, #262626
// dividers). The choice is stored in localStorage; with no stored choice the
// OS preference wins; a stored choice always wins over the OS.
//
// The theme is applied as `data-theme="light" | "dark"` on <html>. The
// design tokens in src/index.css are CSS variables, so one attribute flip
// re-themes the whole site — components use token classes (text-ink-1,
// bg-action-surface, .glass-1/2/3) and never branch on the theme themselves.
// The same attribute is set by the tiny inline script in index.html before
// first paint, so there is no flash of the wrong theme on load; React only
// takes over afterwards (see ThemeProvider).

export const THEME_STORAGE_KEY = 'itfund-theme';

export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

/** The theme-color the browser chrome (status bar, tab bar) should paint. */
export const THEME_COLORS = {
  [THEME_LIGHT]: '#FFFFFF',
  [THEME_DARK]: '#000000',
};

/**
 * Resolve the effective theme from an explicit stored choice and the OS
 * preference. Pure: pass the inputs in, get the theme out. A stored choice
 * always wins; otherwise the OS preference decides; light is the default.
 */
export function resolveTheme({ stored = null, prefersDark = false } = {}) {
  if (stored === THEME_DARK || stored === THEME_LIGHT) return stored;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
}

/** Read the stored choice, or null when nothing was stored (or storage is unavailable). */
export function getStoredTheme(storage) {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    const value = store?.getItem(THEME_STORAGE_KEY);
    return value === THEME_DARK || value === THEME_LIGHT ? value : null;
  } catch {
    return null;
  }
}

/** Persist the choice. Silently no-ops when storage is unavailable. */
export function storeTheme(theme, storage) {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    store?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / blocked storage: the theme still applies for this visit.
  }
}

/** Does the OS currently prefer dark? False when matchMedia is unavailable. */
export function systemPrefersDark(matchMediaFn) {
  try {
    const mm = matchMediaFn ?? (typeof window !== 'undefined' ? window.matchMedia : null);
    return !!mm?.('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Resolve from the live environment: stored choice, else OS preference. */
export function resolveLiveTheme() {
  return resolveTheme({ stored: getStoredTheme(), prefersDark: systemPrefersDark() });
}

/**
 * Apply a theme to a document: set data-theme on <html> and the theme-color
 * meta the browser chrome paints. Accepts a document-like object so tests can
 * pass a fake; no-ops (returns false) with no document, e.g. during SSR.
 */
export function applyTheme(theme, doc) {
  const d = doc ?? (typeof document !== 'undefined' ? document : null);
  if (!d?.documentElement) return false;
  d.documentElement.setAttribute('data-theme', theme);
  const meta = d.querySelector?.('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS[THEME_LIGHT]);
  return true;
}
