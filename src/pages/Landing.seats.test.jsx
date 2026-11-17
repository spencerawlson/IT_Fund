import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer from 'react-test-renderer';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SeoCollectorContext } from '@/components/Seo';
import Landing from './Landing';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The real AuthProvider registers a document.visibilitychange listener on
// mount (no DOM here), so the mounted seats tests stub the auth context the
// way CypherLessonPanel.test.jsx does — the seats fetch is the thing under
// test here, not auth. Landing renders for an anonymous visitor either way.
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoadingAuth: false, authChecked: true }),
  AuthProvider: ({ children }) => children,
}));

// Mounted tests drive the real landing with the seats fetch stubbed by URL:
// /public/seats answers with the configured payload (the API's
// snake_case shape: total_accounts / cap), everything else answers not-ok. The default stub rejects, so the fetch-failure test needs no setup.
function mockSeatsFetch(payload) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/public/seats')) {
      return { ok: true, json: async () => payload };
    }
    return { ok: false, json: async () => ({}) };
  }));
}

function renderLandingMounted() {
  const collector = { seo: null, register(data) { this.seo = data; } };
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <SeoCollectorContext.Provider value={collector}>
        <ThemeProvider>
          <StaticRouter location="/">
            <Landing />
          </StaticRouter>
        </ThemeProvider>
      </SeoCollectorContext.Provider>,
    );
  });
  return renderer;
}

async function flushEffects(renderer) {
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return renderer;
}

function textOf(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) return textOf(node.children);
  return '';
}

// The hero pill, if rendered (null until the fetch resolves or on failure).
function pill(renderer) {
  const found = renderer.root.findAllByProps({ 'data-testid': 'seats-counter-pill' });
  return found.length ? found[0] : null;
}

function ctaByText(renderer, label) {
  return renderer.root.findAllByType('a').find((a) => textOf(a).includes(label));
}

describe('Landing seats pill (hero, directly above the CTAs)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network'); }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('renders the pill in the hero directly above the CTAs, once, with en-CA separators', async () => {
    mockSeatsFetch({ total_accounts: 5002, cap: 10000 });
    const renderer = await flushEffects(renderLandingMounted());
    const p = pill(renderer);
    expect(p).not.toBeNull();
    expect(textOf(p)).toContain('5,002 of 10,000 seats taken');
    // One counter on the page: it appears before the CTA buttons in DOM
    // order, and the header carries no counter.
    const whole = textOf(renderer.root);
    expect(whole.indexOf('5,002')).toBeLessThan(whole.indexOf('Start learning free'));
    expect(textOf(renderer.root.findByType('header'))).not.toContain('seats taken');
    // The old hero line under the CTAs is gone.
    expect(renderer.root.findAllByProps({ 'data-testid': 'seats-counter' })).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('at the cap the pill reads full and the hero keeps its seats-full message with disabled CTAs', async () => {
    mockSeatsFetch({ total_accounts: 10000, cap: 10000 });
    const renderer = await flushEffects(renderLandingMounted());
    const p = pill(renderer);
    expect(p).not.toBeNull();
    expect(textOf(p)).toContain('10,000 of 10,000 seats taken');
    expect(textOf(renderer.root)).toContain('All 10,000 seats are taken \u2014 sign-ups are closed.');
    expect(ctaByText(renderer, 'Start learning free').props['aria-disabled']).toBe(true);
    expect(ctaByText(renderer, 'Try a lab').props['aria-disabled']).toBeFalsy();
  });

  it('renders nothing for the counter when the seats fetch fails', async () => {
    const renderer = await flushEffects(renderLandingMounted());
    expect(pill(renderer)).toBeNull();
    expect(textOf(renderer.root)).not.toContain('seats taken');
    expect(renderer.root.findAllByProps({ 'data-testid': 'seats-counter' })).toHaveLength(0);
    expect(ctaByText(renderer, 'Start learning free').props['aria-disabled']).toBeFalsy();
  });
});
