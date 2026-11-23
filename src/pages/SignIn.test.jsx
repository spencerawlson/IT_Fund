import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The account page's subscription card for a signed-in free user: the
// subscribe action is a Stripe checkout started from this page, not a link
// to /pricing. The real hook fetches /api/billing/status in an effect (never
// runs under SSR), so it is mocked to the resolved free state.
vi.mock('@/lib/subscription', () => ({
  useSubscription: () => ({
    subscribed: false,
    status: 'none',
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  }),
}));

import SignIn, { SubscriptionSection } from './SignIn';

const SIGNED_IN_AUTH = {
  user: { display_name: 'Test User', avatar_url: null, providers: ['google'] },
  isLoadingAuth: false,
  authChecked: true,
};

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderAccount() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={SIGNED_IN_AUTH}>
        <StaticRouter location="/signin">
          <SignIn />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

function renderSignIn(location = '/signin') {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location={location}>
          <SignIn />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('SignIn account page subscription card (2026-11-13)', () => {
  it('gives a signed-in free user a Subscribe action, never a pricing link', () => {
    const html = renderAccount();
    expect(html).toContain('Your account');
    expect(html).toContain('free tier');
    expect(html).toContain('Subscribe');
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain('See plans');
    expect(html).not.toContain('Pricing');
  });
});

describe('SignIn account page billing-period toggle (2026-11-23)', () => {
  it('renders a monthly/annual toggle with the decided prices, monthly selected by default', () => {
    const html = renderAccount();
    // SSR renders the price expression as `<!-- -->$29<!-- -->` (React
    // comment node), same as Pricing's `/ <!-- -->month` assertions.
    expect(html).toMatch(/Monthly —\s*<!-- -->\s*\$29\s*<!-- -->\s*\/mo/);
    expect(html).toMatch(/Annual —\s*<!-- -->\s*\$250\s*<!-- -->\s*\/yr/);
    // The Subscribe button follows the selected plan (monthly by default).
    expect(html).toContain('Subscribe — $29/mo');
    // Monthly is the selected radio; annual is not.
    const monthly = html.match(/<button[^>]*data-plan="monthly"[^>]*>/);
    expect(monthly).not.toBeNull();
    expect(monthly[0]).toContain('aria-checked="true"');
    expect(monthly[0]).not.toContain('disabled');
    const annual = html.match(/<button[^>]*data-plan="annual"[^>]*>/);
    expect(annual).not.toBeNull();
    expect(annual[0]).toContain('aria-checked="false"');
  });

  it('disables the annual option while the annual price is unconfigured, so it can never break checkout', () => {
    // SSR renders the fallback state: no live /billing/plans fetch ran, so
    // annual is unconfigured and its option must be disabled, not live.
    const html = renderAccount();
    const annual = html.match(/<button[^>]*data-plan="annual"[^>]*>/);
    expect(annual).not.toBeNull();
    expect(annual[0]).toContain('disabled');
    expect(html).toContain('The $250/yr price is being set up — monthly is available now.');
  });
});

describe('SignIn seats-full refusal (seat cap)', () => {
  it('surfaces the seats-full refusal plainly when the callback sends ?error=seats_full', () => {
    const html = renderSignIn('/signin?error=seats_full');
    expect(html).toContain('All seats are taken');
    expect(html).toContain('sign-ups are closed');
    expect(html).not.toContain('waitlist');
  });

  it('shows no seats-full alert on a plain sign-in', () => {
    const html = renderSignIn();
    expect(html).not.toContain('All seats are taken');
    expect(html).not.toContain('sign-ups are closed');
  });
});

// Mounted interaction tests: the toggle drives the plan posted to checkout.
// The section is rendered directly (the page adds AuthProvider/ThemeProvider/
// router); useSubscription is mocked to the free state at the top of this
// file, so no /billing/status fetch runs. The plans fetch is stubbed per
// test; the checkout fetch captures the posted body; window.location is a
// plain object so the redirect can be observed.
function textOf(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) return textOf(node.children);
  return '';
}

function mockBillingFetch({ annualConfigured = true, failPlans = false, checkoutUrl = 'https://checkout.stripe.test/session' } = {}) {
  const checkoutCalls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (String(url).includes('/billing/plans')) {
      if (failPlans) throw new Error('no network');
      return {
        ok: true,
        json: async () => ({
          monthly: { configured: true, unit_amount: 2900, currency: 'usd', interval: 'month', display: '$29' },
          annual: { configured: annualConfigured, unit_amount: 25000, currency: 'usd', interval: 'year', display: '$250' },
        }),
      };
    }
    if (String(url).includes('/billing/checkout')) {
      checkoutCalls.push({ url: String(url), body: options?.body });
      return { ok: true, json: async () => ({ checkout_url: checkoutUrl }) };
    }
    // The /billing/price fallback chain and anything else: no network.
    throw new Error(`unexpected fetch: ${url}`);
  }));
  return checkoutCalls;
}

function stubWindow({ attributionTag = null } = {}) {
  const location = { href: '' };
  vi.stubGlobal('window', {
    location,
    localStorage: {
      getItem: (key) => (key === 'rtc_attribution_tag' ? attributionTag : null),
      setItem: () => {},
    },
  });
  return location;
}

async function renderSection() {
  let renderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(<SubscriptionSection />);
  });
  // Flush the plans fetch (.then chain) and the state update it triggers.
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return renderer;
}

function option(renderer, plan) {
  return renderer.root.findByProps({ 'data-plan': plan });
}

function subscribeButton(renderer) {
  const buttons = renderer.root.findAllByType('button');
  return buttons.find((b) => textOf(b.children).includes('Subscribe'));
}

async function click(node) {
  await TestRenderer.act(async () => {
    node.props.onClick();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('SignIn billing-period toggle (mounted, 2026-11-23)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network'); }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('selecting annual posts { plan: "annual" } to /billing/checkout and follows the redirect', async () => {
    const checkoutCalls = mockBillingFetch({ annualConfigured: true });
    const location = stubWindow();
    const renderer = await renderSection();
    try {
      expect(textOf(renderer.toJSON())).toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).toContain('$20.83');
      await click(option(renderer, 'annual'));
      expect(textOf(subscribeButton(renderer).children)).toContain('Subscribe — $250/yr');
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'annual' });
      expect(location.href).toBe('https://checkout.stripe.test/session');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('monthly is the default: Subscribe posts { plan: "monthly" } without touching the toggle', async () => {
    const checkoutCalls = mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      expect(textOf(subscribeButton(renderer).children)).toContain('Subscribe — $29/mo');
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'monthly' });
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('annual option is disabled when annual is unconfigured, and Subscribe still buys monthly', async () => {
    const checkoutCalls = mockBillingFetch({ annualConfigured: false });
    stubWindow();
    const renderer = await renderSection();
    try {
      expect(option(renderer, 'annual').props.disabled).toBe(true);
      expect(option(renderer, 'monthly').props.disabled).toBe(false);
      expect(textOf(renderer.toJSON())).toContain('The $250/yr price is being set up');
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'monthly' });
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('a failed plans fetch keeps the fallback prices and monthly checkout', async () => {
    const checkoutCalls = mockBillingFetch({ failPlans: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Monthly — $29/mo');
      expect(text).toContain('Annual — $250/yr');
      expect(option(renderer, 'annual').props.disabled).toBe(true);
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'monthly' });
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('carries a captured attribution tag through to checkout', async () => {
    const checkoutCalls = mockBillingFetch({ annualConfigured: true });
    stubWindow({ attributionTag: 'vtn_test123' });
    const renderer = await renderSection();
    try {
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'monthly', attribution_tag: 'vtn_test123' });
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
