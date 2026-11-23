import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION, ACTION_SURFACE, BASE, CONTINUE_SURFACE, DARK_ACTION, DARK_ACTION_SURFACE, DARK_BASE, DARK_CONTINUE_SURFACE, DARK_INK, DARK_SEMANTIC, DARK_SURFACES, INK, SEMANTIC, SURFACES, TERMINAL, contrast, hexToRgb, over, worstContrast, worstDarkContrast } from './tokens';

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const cssVar = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
// Variables inside the html[data-theme="dark"] block (the first :root match is light).
const darkBlock = css.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
const darkCssVar = (name) => darkBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
const rgbChannels = (hex) => hexToRgb(hex).join(' ');
// ink1 -> ink-1, actionHover -> action-hover
const kebab = (key) => key.replace(/([A-Z0-9])/g, (c) => `-${c.toLowerCase()}`);

describe('design tokens', () => {
  it('index.css matches tokens.js', () => {
    for (const [key, hex] of Object.entries({ ...INK, ...ACTION, ...SEMANTIC })) {
      expect(cssVar(`${kebab(key)}-rgb`), key).toBe(rgbChannels(hex));
    }
    expect(cssVar('bg-base')).toBe(BASE);
    for (const [name, [r, g, b, a]] of Object.entries(SURFACES)) {
      expect(cssVar(`surface-${name.slice(-1)}`), name).toBe(`rgba(${r}, ${g}, ${b}, ${a})`);
    }
  });

  it('all text colours pass WCAG AA (4.5:1) on reading and overlay glass', () => {
    for (const surface of ['glass-2', 'glass-3']) {
      for (const [key, hex] of Object.entries(INK)) {
        expect(worstContrast(hex, surface), `${key} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('primary and secondary text pass AA on card glass', () => {
    expect(worstContrast(INK.ink1, 'glass-1')).toBeGreaterThanOrEqual(4.5);
    expect(worstContrast(INK.ink2, 'glass-1')).toBeGreaterThanOrEqual(4.5);
  });

  it('status colours pass AA as text on reading glass', () => {
    for (const [key, hex] of Object.entries(SEMANTIC)) {
      expect(worstContrast(hex, 'glass-2'), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('primary button text passes AA on the accent', () => {
    expect(contrast(hexToRgb(ACTION.actionInk), hexToRgb(ACTION.action))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexToRgb(ACTION.actionInk), hexToRgb(ACTION.actionHover))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('"Up next" hero surface (mobile, 2026-11-23)', () => {
  // The dashboard hero must read as different from every other card, in both
  // themes. The surface is a token (not a hand-rolled tint): light is a dull
  // lavender wash over white, dark is a grey lift over black.
  it('matches tokens.js in both themes and keeps text readable', () => {
    expect(cssVar('surface-continue')).toBe(`rgba(${CONTINUE_SURFACE.join(', ')})`);
    expect(darkCssVar('surface-continue')).toBe(`rgba(${DARK_CONTINUE_SURFACE.join(', ')})`);
    for (const [key, hex] of Object.entries(INK)) {
      expect(
        contrast(hexToRgb(hex), over(CONTINUE_SURFACE, hexToRgb(BASE))),
        `${key} on continue`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const [key, hex] of Object.entries(DARK_INK)) {
      expect(
        contrast(hexToRgb(hex), over(DARK_CONTINUE_SURFACE, hexToRgb(DARK_BASE))),
        `${key} on dark continue`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('light-only presentation', () => {
  it('uses a white page base', () => {
    expect(BASE).toBe('#FFFFFF');
    expect(cssVar('bg-base')).toBe('#FFFFFF');
  });

  it('light-purple button surfaces match tokens.js and keep near-black text readable', () => {
    expect(cssVar('action-surface-rgb')).toBe(rgbChannels(ACTION_SURFACE.surface));
    expect(cssVar('action-surface-hover-rgb')).toBe(rgbChannels(ACTION_SURFACE.surfaceHover));
    expect(cssVar('action-surface-ink-rgb')).toBe(rgbChannels(ACTION_SURFACE.surfaceInk));
    expect(contrast(hexToRgb(ACTION_SURFACE.surfaceInk), hexToRgb(ACTION_SURFACE.surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexToRgb(ACTION_SURFACE.surfaceInk), hexToRgb(ACTION_SURFACE.surfaceHover))).toBeGreaterThanOrEqual(4.5);
  });

  it('Solarized terminal colours match tokens.js and green text passes AA', () => {
    expect(cssVar('terminal-bg')).toBe(TERMINAL.background);
    expect(cssVar('terminal-border')).toBe(TERMINAL.border);
    expect(cssVar('terminal-text-rgb')).toBe(rgbChannels(TERMINAL.text));
    expect(cssVar('terminal-bright-rgb')).toBe(rgbChannels(TERMINAL.brightText));
    expect(cssVar('terminal-muted-rgb')).toBe(rgbChannels(TERMINAL.mutedText));
    expect(cssVar('terminal-error-rgb')).toBe(rgbChannels(TERMINAL.error));
    expect(contrast(hexToRgb(TERMINAL.text), hexToRgb(TERMINAL.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexToRgb(TERMINAL.mutedText), hexToRgb(TERMINAL.background))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dark theme (Instagram-style true black)', () => {
  it('ships a dark variable block on a true-black page base', () => {
    expect(DARK_BASE).toBe('#000000');
    expect(css).toContain('html[data-theme="dark"]');
    expect(darkCssVar('bg-base')).toBe(DARK_BASE);
    expect(darkCssVar('background')).toBe('0 0% 0%');
  });

  it('dark index.css variables match tokens.js', () => {
    for (const [key, hex] of Object.entries({ ...DARK_INK, ...DARK_ACTION, ...DARK_SEMANTIC })) {
      expect(darkCssVar(`${kebab(key)}-rgb`), key).toBe(rgbChannels(hex));
    }
    for (const [name, [r, g, b, a]] of Object.entries(DARK_SURFACES)) {
      expect(darkCssVar(`surface-${name.slice(-1)}`), name).toBe(`rgba(${r}, ${g}, ${b}, ${a})`);
    }
  });

  it('the dark block does not touch the Solarized terminal palette', () => {
    expect(darkBlock).not.toContain('--terminal-');
  });

  it('all dark text colours pass WCAG AA (4.5:1) on every dark glass level', () => {
    for (const surface of ['glass-1', 'glass-2', 'glass-3']) {
      for (const [key, hex] of Object.entries(DARK_INK)) {
        expect(worstDarkContrast(hex, surface), `${key} on dark ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(worstDarkContrast(DARK_ACTION.action, surface), `action on dark ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('dark status colours pass AA as text on dark reading glass', () => {
    for (const [key, hex] of Object.entries(DARK_SEMANTIC)) {
      expect(worstDarkContrast(hex, 'glass-2'), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the dark primary button keeps its light-purple fill and near-black text readable', () => {
    expect(darkCssVar('action-surface-rgb')).toBe(rgbChannels(DARK_ACTION_SURFACE.surface));
    expect(darkCssVar('action-surface-hover-rgb')).toBe(rgbChannels(DARK_ACTION_SURFACE.surfaceHover));
    expect(darkCssVar('action-surface-ink-rgb')).toBe(rgbChannels(DARK_ACTION_SURFACE.surfaceInk));
    expect(contrast(hexToRgb(DARK_ACTION_SURFACE.surfaceInk), hexToRgb(DARK_ACTION_SURFACE.surface))).toBeGreaterThanOrEqual(4.5);
    // The fill itself against a black card: the button must be visible on black.
    expect(contrast(hexToRgb(DARK_ACTION_SURFACE.surface), hexToRgb(DARK_BASE))).toBeGreaterThanOrEqual(4.5);
    // Bright-violet action text passes on black, and near-black text passes on it.
    expect(contrast(hexToRgb(DARK_ACTION.action), hexToRgb(DARK_BASE))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hexToRgb(DARK_ACTION.actionInk), hexToRgb(DARK_ACTION.action))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dark theme: literal accent text never stays dark on black', () => {
  // Regression (2026-11-23): text-violet-800 was used in 14 places with no
  // dark rule, so it rendered dark purple on black. Every dark-shade text
  // utility the app uses (*-600 and darker, from Tailwind's literal palette)
  // must have a html[data-theme="dark"] remap in index.css.
  it('every text-<colour>-600/700/800/900 class used in src/ has a dark remap', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name)) files.push(p);
      }
    };
    walk(root);
    const used = new Set();
    const re = /\btext-(red|rose|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|orange|lime|slate|gray|zinc|neutral|stone)-(600|700|800|900|950)(?:\/\d+)?(?![\w-])/g;
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(re)) used.add(m[0]);
    // In CSS the "/" of an opacity variant is escaped: .text-amber-700\/80
    const remapped = (cls) => css.includes(`html[data-theme="dark"] .${cls.split('/').join(String.fromCharCode(92) + '/')}`);
    const missing = [...used].filter((c) => !remapped(c)).sort();
    expect(used.size).toBeGreaterThan(10);
    expect(missing, `dark-mode remap missing in src/index.css for: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lesson slide deck uses the site colours only', () => {
  // Spencer (2026-11-23): the slide concept's graphite/orange was a reference
  // for layout only — the deck keeps the site's own colours. Every --sd-*
  // token must map onto an existing site variable; no literal colour.
  const block = css.match(/\.slide-deck \{([\s\S]*?)\n\}/)?.[1] ?? '';
  it('every deck token is a site variable, never a literal colour', () => {
    const tokens = [...block.matchAll(/--sd-[a-z0-9-]+:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(tokens.length).toBeGreaterThan(10);
    for (const value of tokens) {
      expect(value, value).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(value === 'transparent' || /var\(--(?!sd-)[a-z0-9-]+\)/.test(value), value).toBe(true);
    }
  });
});
