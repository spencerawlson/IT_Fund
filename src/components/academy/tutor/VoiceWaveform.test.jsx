import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import VoiceWaveform, { waveformHeights, waveformBarStyle } from './VoiceWaveform';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('waveformHeights', () => {
  it('is a flat line when nothing is talking', () => {
    expect(waveformHeights({ current: { talking: false, level: 0 } })).toEqual(new Array(24).fill(0));
    expect(waveformHeights({ current: null })).toEqual(new Array(24).fill(0));
    expect(waveformHeights(null)).toEqual(new Array(24).fill(0));
  });

  it('follows the single level when there are no bands', () => {
    expect(waveformHeights({ current: { talking: true, level: 0.5 } })).toEqual(new Array(24).fill(0.5));
  });

  it('uses the 24 bands when present and clamps them', () => {
    const bands = new Float32Array(24).map((_, i) => i / 23);
    const heights = waveformHeights({ current: { talking: true, level: 0.5, bands } });
    expect(heights).toHaveLength(24);
    expect(heights[0]).toBeCloseTo(0);
    expect(heights[23]).toBeCloseTo(1);
  });
});

describe('VoiceWaveform', () => {
  beforeEach(() => {
    globalThis.window = { matchMedia: () => ({ matches: false }) };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
  });

  function barHeights(root) {
    return root.root.findAllByProps({ 'data-testid': 'cypher-waveform-bar' }).map((n) => n.props.style.height);
  }

  function mount(levelRef, active) {
    let root;
    TestRenderer.act(() => {
      root = TestRenderer.create(React.createElement(VoiceWaveform, { levelRef, active }));
    });
    return root;
  }

  it('renders nothing when inactive — no flat bars, no placeholder before it talks', () => {
    const levelRef = { current: { talking: true, level: 0.8, bands: new Float32Array(24).fill(0.9) } };
    const root = mount(levelRef, false);
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(0);
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform-bar' })).toHaveLength(0);
    TestRenderer.act(() => { root.unmount(); });
  });

  it('samples the bands while active and updates as the audio changes', () => {
    vi.useFakeTimers();
    const levelRef = { current: { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.2) } };
    const root = mount(levelRef, true);
    expect(barHeights(root)[0]).toBe('20%');
    // The audio changes: the next sample picks it up.
    levelRef.current = { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.8) };
    TestRenderer.act(() => { vi.advanceTimersByTime(100); });
    expect(barHeights(root)[0]).toBe('80%');
    TestRenderer.act(() => { root.unmount(); });
  });

  it('renders nothing again when playback stops', () => {
    const levelRef = { current: { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.8) } };
    const root = mount(levelRef, true);
    expect(barHeights(root)[0]).toBe('80%');
    TestRenderer.act(() => {
      root.update(React.createElement(VoiceWaveform, { levelRef, active: false }));
    });
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(0);
    TestRenderer.act(() => { root.unmount(); });
  });

  it('stays visible but frozen while paused — the last heights stay put', () => {
    vi.useFakeTimers();
    const levelRef = { current: { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.5) } };
    const root = mount(levelRef, true);
    expect(barHeights(root)[0]).toBe('50%');
    // The audio changes, but the waveform is paused: it must not follow.
    levelRef.current = { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.9) };
    TestRenderer.act(() => {
      root.update(React.createElement(VoiceWaveform, { levelRef, active: false, paused: true }));
    });
    expect(barHeights(root)[0]).toBe('50%');
    TestRenderer.act(() => { vi.advanceTimersByTime(1000); });
    expect(barHeights(root)[0]).toBe('50%');
    TestRenderer.act(() => { root.unmount(); });
  });

  it('stays still under prefers-reduced-motion', () => {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    vi.useFakeTimers();
    const levelRef = { current: { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.2) } };
    const root = mount(levelRef, true);
    // Active and loud, but reduced motion keeps the waveform flat.
    expect(barHeights(root)[0]).toBe('8%');
    levelRef.current = { talking: true, level: 0.5, bands: new Float32Array(24).fill(0.9) };
    TestRenderer.act(() => { vi.advanceTimersByTime(1000); });
    expect(barHeights(root)[0]).toBe('8%');
    TestRenderer.act(() => { root.unmount(); });
  });
});

describe('waveformBarStyle', () => {
  it('is bright violet with a neon glow at the centre and silver-white at the ends', () => {
    const nums = (style) => style.backgroundColor.match(/\d+/g).map(Number);
    const [r, g, b] = nums(waveformBarStyle(11, 50));
    expect(r).toBeLessThan(180); // violet, not silver
    expect(g).toBeLessThan(110);
    expect(b).toBeGreaterThan(240);
    expect(waveformBarStyle(11, 50).boxShadow).toContain('rgba(168, 85, 247');
    expect(waveformBarStyle(11, 50).height).toBe('50%');
    expect(waveformBarStyle(0, 50).backgroundColor).toBe('rgb(229, 231, 235)');
    expect(waveformBarStyle(0, 50).boxShadow).toBeUndefined();
    expect(waveformBarStyle(23, 50).backgroundColor).toBe('rgb(229, 231, 235)');
  });
});
