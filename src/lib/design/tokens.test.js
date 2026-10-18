import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION, ACTION_SURFACE, BASE, INK, SEMANTIC, SURFACES, TERMINAL, contrast, hexToRgb, worstContrast } from './tokens';

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

describe('light-only presentation', () => {
  it('uses a white page base and ships no dark-theme variable block', () => {
    expect(BASE).toBe('#FFFFFF');
    expect(css).not.toContain('html[data-theme="dark"]');
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
