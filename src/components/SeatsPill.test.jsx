import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer from 'react-test-renderer';
import SeatsPill from './SeatsPill';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mockSeatsFetch(payload) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/public/seats')) {
      return { ok: true, json: async () => payload };
    }
    return { ok: false, json: async () => ({}) };
  }));
}

function textOf(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) return textOf(node.children);
  return '';
}

async function renderPill(props = {}) {
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(<SeatsPill {...props} />);
  });
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return renderer;
}

function pill(renderer) {
  const found = renderer.root.findAllByProps({ 'data-testid': 'seats-counter-pill' });
  return found.length === 1 ? found[0] : null;
}

describe('SeatsPill (header seats counter)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network'); })); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders "N of 10,000 seats taken" with the number bold in the violet accent', async () => {
    mockSeatsFetch({ total_accounts: 5002, cap: 10000 });
    const renderer = await renderPill();
    try {
      expect(textOf(renderer.toJSON())).toContain('5,002 of 10,000 seats taken');
      const el = pill(renderer);
      expect(el).not.toBeNull();
      // Tinted outline pill, not the filled "full" treatment.
      expect(el.props.className).toContain('bg-action/10');
      expect(el.props.className).not.toContain('bg-action-surface');
      const number = el.children[0];
      expect(number.type).toBe('span');
      expect(number.props.className).toContain('font-bold');
      expect(number.props.className).toContain('text-action');
      expect(textOf(number.children)).toBe('5,002');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('at the cap fills the pill with the purple action surface ("full")', async () => {
    mockSeatsFetch({ total_accounts: 10000, cap: 10000 });
    const renderer = await renderPill();
    try {
      expect(textOf(renderer.toJSON())).toContain('10,000 of 10,000 seats taken');
      const el = pill(renderer);
      expect(el).not.toBeNull();
      expect(el.props.className).toContain('bg-action-surface');
      expect(el.props.className).not.toContain('bg-action/10');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('renders nothing when the seats fetch fails — never a wrong number', async () => {
    const renderer = await renderPill();
    try {
      expect(renderer.toJSON()).toBeNull();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('uses a passed-in seats value without fetching (the landing page already holds it)', async () => {
    const fetchSpy = vi.fn(async () => { throw new Error('should not fetch'); });
    vi.stubGlobal('fetch', fetchSpy);
    const renderer = await renderPill({ seats: { totalAccounts: 123, cap: 10000 } });
    try {
      expect(textOf(renderer.toJSON())).toContain('123 of 10,000 seats taken');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('renders nothing with seats={null} and does not fetch (parent owns the value)', async () => {
    const fetchSpy = vi.fn(async () => { throw new Error('should not fetch'); });
    vi.stubGlobal('fetch', fetchSpy);
    const renderer = await renderPill({ seats: null });
    try {
      expect(renderer.toJSON()).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
