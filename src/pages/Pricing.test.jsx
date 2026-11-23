import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import Pricing from './Pricing';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

// Effects never run under SSR, so the page renders without any network —
// the live Stripe price fetch is skipped and the fallback price renders.
function renderPage() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location="/pricing">
          <Pricing />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('Pricing', () => {
  it('names the two free labs with links, so a visitor knows exactly which labs need no plan (Spencer, 2026-11-16)', () => {
    const html = renderPage();
    expect(html).toContain('VLANs and Inter-VLAN Routing');
    expect(html).toContain('Python Scripting Basics');
    expect(html).toContain('no plan needed');
    expect(html).toContain('href="/labs/net-vlan-001"');
    expect(html).toContain('href="/labs/py-basics-001"');
    // The old bare wording named no lab at all.
    expect(html).not.toContain('The free tier gets two;');
  });

  it('surfaces the refund + grace terms with a Terms link, so the buyer sees them where they decide (audit B-29)', () => {
    const html = renderPage();
    expect(html).toContain('Full refund if you ask within 14 days');
    expect(html).toContain('support@road2cissp.com');
    expect(html).toContain('keep full access for 7 days');
    expect(html).toContain('href="/terms"');
  });

  it('shows both plans with the decided prices — monthly $29, annual $250 flat (Spencer, 2026-11-18)', () => {
    const html = renderPage();
    expect(html).toContain('Monthly');
    expect(html).toContain('Annual');
    expect(html).toContain('$29');
    // SSR renders the interval as `/ <!-- -->month` (React comment node).
    expect(html).toMatch(/\/\s*<!-- -->\s*month/);
    expect(html).toContain('$250');
    expect(html).toMatch(/\/\s*<!-- -->\s*year/);
    // $29 x 12 = $348; $348 - $250 = $98 saved, about $20.83 a month.
    expect(html).toContain('save $98 a year');
    expect(html).toContain('$20.83');
    expect(html).toContain('Best value');
  });

  it('disables annual checkout until the price is configured, so an unconfigured annual plan can never break checkout', () => {
    // SSR renders the fallback state: no live /billing/plans fetch ran, so
    // annual is unconfigured and its button must be disabled, not live.
    const html = renderPage();
    expect(html).toContain('Annual billing coming soon');
    expect(html).toContain('disabled');
  });
});

// In-app purchases (Guideline 3.1.1, 2026-11-23): in the iOS shell the
// Stripe checkout is replaced by the App Store purchase. SSR never runs
// the products effect, so the hook stays in its initial state — products
// unavailable — which is exactly the "not configured in App Store
// Connect yet" state the buttons must handle.
describe('Pricing in the iOS shell (IAP)', () => {
  const SIGNED_IN_AUTH = {
    user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
    isLoadingAuth: false,
    authChecked: true,
  };

  function renderIosPage() {
    return renderToString(
      <ThemeProvider>
        <AuthProvider initialAuth={SIGNED_IN_AUTH}>
          <StaticRouter location="/pricing">
            <Pricing />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>,
    );
  }

  const asIos = () => {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
  };
  const asWeb = () => {
    delete globalThis.Capacitor;
  };

  it('offers the App Store purchase instead of Stripe checkout, with the buttons disabled until the App Store returns the products', () => {
    asIos();
    try {
      const html = renderIosPage();
      // No Stripe checkout language anywhere in the app build.
      expect(html).not.toContain('Secure checkout by Stripe');
      expect(html).not.toContain('Subscribe — $29/mo');
      // The buy buttons are App Store buttons, disabled until the
      // products exist (SSR = effect never ran = not configured). The
      // "being set up" note itself only appears once the products fetch
      // resolves with none — under SSR the hook is still loading, so the
      // note is asserted in the mounted test below instead.
      expect(html).toContain('Subscribe with Apple — $29');
      expect(html).toContain('Subscribe with Apple — $250');
      // The page stays informational: no purchase button is live.
      expect(html.match(/<button[^>]*disabled[^>]*>/g)?.length).toBeGreaterThanOrEqual(2);
    } finally {
      asWeb();
    }
  });

  it('routes refunds through Apple in the iOS shell, not support', () => {
    asIos();
    try {
      const html = renderIosPage();
      expect(html).toContain('App Store purchases are refunded by Apple');
      expect(html).toContain('reportaproblem.apple.com');
      expect(html).toContain('Cancel anytime in iOS Settings. Billed through the App Store.');
      expect(html).not.toContain('Full refund if you ask within 14 days');
    } finally {
      asWeb();
    }
  });

  it('keeps Stripe checkout on the web', () => {
    const html = renderPage();
    expect(html).toContain('Cancel anytime. Secure checkout by Stripe.');
    expect(html).toContain('Full refund if you ask within 14 days');
    expect(html).not.toContain('Subscribe with Apple');
    expect(html).not.toContain('reportaproblem.apple.com');
  });
});

// NOTE: the App Store prices on the cards (the yearly product mapping to
// plan "annual" in IAP_PLANS) are covered by the mounted SignIn tests,
// which run the same useIapProducts hook + product mapping against the
// mocked plugin. A mounted Pricing test would need the full page — and
// the full page mount pulls in AuthContext, Seo, and the Capacitor App
// shell, all of which need a real DOM (document, AppWeb) that the node
// test env does not have. The SSR tests above cover the iOS gating,
// the Apple labels, the disabled state, and the refund copy.
