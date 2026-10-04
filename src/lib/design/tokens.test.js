import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION, BASE, INK, SEMANTIC, SURFACES, TINTS, contrast, hexToRgb, worstContrast } from './tokens';

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const cssVar = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
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
    TINTS.forEach(({ color, opacity }, i) => {
      // --bg-tint-N: radial-gradient(closest-side, rgba(r, g, b, a), transparent)
      const m = css.match(new RegExp(`--bg-tint-${i + 1}:\\s*radial-gradient\\(closest-side,\\s*rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)\\),\\s*transparent\\)`));
      expect(m, `bg-tint-${i + 1} gradient`).not.toBeNull();
      const [r, g, b] = hexToRgb(color);
      expect([m[1], m[2], m[3]].join(' '), `bg-tint-${i + 1} colour`).toBe(`${r} ${g} ${b}`);
      expect(m[4], `bg-tint-${i + 1} opacity`).toBe(String(opacity));
    });
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
