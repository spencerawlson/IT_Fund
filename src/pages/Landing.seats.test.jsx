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
// /public/seats answers with the configured payload, everything else answers
// not-ok. The default stub rejects, so the fetch-failure test needs no setup.
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

function treeText(renderer) {
  // Joined visible text: the counter renders as separate string children
  // ("5,002" / " of " / "10,000" / " seats taken"), so a contiguous match
  // needs the text joined, not the raw JSON dump.
  return textOf(renderer.toJSON());
}

function primaryCta(renderer) {
  const anchors = renderer.root.findAllByType('a');
  return anchors.find((a) => textOf(a.children).includes('Start learning free'));
}

describe('Landing seats counter (mounted, mocked fetch)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network'); })); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows the live "N of 10,000 seats taken" counter under the hero CTAs', async () => {
    mockSeatsFetch({ total_accounts: 5002, cap: 10000 });
    const renderer = renderLandingMounted();
    try {
      await flushEffects(renderer);
      const text = treeText(renderer);
      expect(text).toContain('5,002 of 10,000 seats taken');
      expect(text).not.toContain('seats are taken');
      // Seats remain: the signup CTA stays enabled.
      expect(primaryCta(renderer).props['aria-disabled']).toBeFalsy();
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('at the cap shows "10,000 of 10,000" and disables the signup CTAs with a plain note', async () => {
    mockSeatsFetch({ total_accounts: 10000, cap: 10000 });
    const renderer = renderLandingMounted();
    try {
      await flushEffects(renderer);
      const text = treeText(renderer);
      expect(text).toContain('10,000 of 10,000 seats taken');
      expect(text).toContain('All 10,000 seats are taken');
      expect(primaryCta(renderer).props['aria-disabled']).toBe(true);
      // No waitlist is invented, and sign-in / labs stay available.
      expect(text).not.toContain('waitlist');
      expect(text).toContain('Try a lab');
      expect(text).toContain('Sign in');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('renders no counter when the seats fetch fails — never a wrong number', async () => {
    const renderer = renderLandingMounted();
    try {
      await flushEffects(renderer);
      const text = treeText(renderer);
      expect(text).not.toContain('seats taken');
      expect(text).not.toContain('seats are taken');
      // The page is otherwise intact.
      expect(text).toContain('Learn IT by doing it');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
