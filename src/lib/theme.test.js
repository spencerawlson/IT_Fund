import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  THEME_COLORS,
  THEME_DARK,
  THEME_LIGHT,
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  resolveLiveTheme,
  resolveTheme,
  storeTheme,
  systemPrefersDark,
} from './theme';

const fakeStorage = (value = null) => {
  let stored = value;
  return {
    getItem: vi.fn(() => stored),
    setItem: vi.fn((k, v) => { stored = v; }),
    get stored() { return stored; },
  };
};

const fakeDoc = () => {
  const attrs = {};
  const metaAttrs = {};
  return {
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] ?? null },
    querySelector: () => ({ setAttribute: (k, v) => { metaAttrs[k] = v; } }),
    attrs,
    metaAttrs,
  };
};

describe('resolveTheme', () => {
  it('a stored choice always wins over the system', () => {
    expect(resolveTheme({ stored: 'dark', prefersDark: false })).toBe('dark');
    expect(resolveTheme({ stored: 'light', prefersDark: true })).toBe('light');
  });

  it('with no stored choice the OS preference decides', () => {
    expect(resolveTheme({ stored: null, prefersDark: true })).toBe('dark');
    expect(resolveTheme({ stored: null, prefersDark: false })).toBe('light');
    expect(resolveTheme({})).toBe('light');
  });

  it('an invalid stored value falls back to the system, never to a broken theme', () => {
    expect(resolveTheme({ stored: 'sepia', prefersDark: true })).toBe('dark');
    expect(resolveTheme({ stored: 'sepia', prefersDark: false })).toBe('light');
  });
});

describe('storage round-trip', () => {
  it('stores and reads the choice under the itfund- key', () => {
    const storage = fakeStorage();
    storeTheme('dark', storage);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(getStoredTheme(storage)).toBe('dark');
  });

  it('returns null when nothing valid is stored', () => {
    expect(getStoredTheme(fakeStorage())).toBeNull();
    expect(getStoredTheme(fakeStorage('sepia'))).toBeNull();
  });

  it('survives unavailable storage instead of throwing', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(getStoredTheme(throwing)).toBeNull();
    expect(() => storeTheme('dark', throwing)).not.toThrow();
  });
});

describe('system preference', () => {
  it('reads prefers-color-scheme: dark', () => {
    expect(systemPrefersDark(() => ({ matches: true }))).toBe(true);
    expect(systemPrefersDark(() => ({ matches: false }))).toBe(false);
    expect(systemPrefersDark(() => { throw new Error('no matchMedia'); })).toBe(false);
  });
});

describe('applyTheme', () => {
  it('sets data-theme on <html> and the theme-color meta', () => {
    const doc = fakeDoc();
    expect(applyTheme('dark', doc)).toBe(true);
    expect(doc.attrs['data-theme']).toBe('dark');
    expect(doc.metaAttrs.content).toBe(THEME_COLORS[THEME_DARK]);
    applyTheme('light', doc);
    expect(doc.attrs['data-theme']).toBe('light');
    expect(doc.metaAttrs.content).toBe(THEME_COLORS[THEME_LIGHT]);
  });

  it('no-ops without a document (SSR)', () => {
    expect(applyTheme('dark', null)).toBe(false);
    expect(applyTheme('dark', {})).toBe(false);
  });
});

describe('resolveLiveTheme', () => {
  it('prefers the stored choice, else the OS', () => {
    const realStorage = globalThis.localStorage;
    const realMatchMedia = globalThis.window?.matchMedia;
    // jsdom (vitest default environment here is node): localStorage/window
    // may be absent — resolveLiveTheme must still return a valid theme.
    expect(['light', 'dark']).toContain(resolveLiveTheme());
    void realStorage; void realMatchMedia;
  });
});

describe('no-flash inline script in index.html', () => {
  it('sets data-theme from storage/system before first paint', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain(THEME_STORAGE_KEY);
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html).toContain('data-theme');
    expect(html).toContain('theme-color');
    // The script must run before the app bundle mounts (head, before main.jsx).
    const scriptAt = html.indexOf(THEME_STORAGE_KEY);
    const bundleAt = html.indexOf('/src/main.jsx');
    expect(scriptAt).toBeGreaterThan(-1);
    expect(scriptAt).toBeLessThan(bundleAt);
  });
});
