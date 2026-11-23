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
// Both hooks read hoisted mutable state so the mounted meter tests can
// flip the subscription / lab-usage state per test.
const subscriptionMocks = vi.hoisted(() => ({
  subscription: {
    subscribed: false,
    status: 'none',
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  },
  labUsage: { usage: undefined, loading: true, error: null },
}));

vi.mock('@/lib/subscription', async (importOriginal) => {
  // Keep the real constants (ALLOWANCE_SECONDS, warning thresholds) — only
  // the two hooks are mocked, so LabUsageMeter's threshold math stays real.
  const actual = await importOriginal();
  return {
    ...actual,
    useSubscription: () => subscriptionMocks.subscription,
    useLabUsage: () => subscriptionMocks.labUsage,
  };
});

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

  it('shows the self-service Delete account section (Guideline 5.1.1(v), 2026-11-23)', () => {
    const html = renderAccount();
    expect(html).toContain('Delete account');
    expect(html).toContain('cancels your Stripe subscription');
    expect(html).toContain('cannot be undone');
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
      // The savings line is yearly-only (2026-11-23): it must not show on
      // the monthly default, even with annual configured.
      expect(textOf(renderer.toJSON())).not.toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).not.toContain('$20.83');
      await click(option(renderer, 'annual'));
      // ...and it appears once annual is selected.
      expect(textOf(renderer.toJSON())).toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).toContain('$20.83');
      expect(textOf(subscribeButton(renderer).children)).toContain('Subscribe — $250/yr');
      await click(subscribeButton(renderer));
      expect(checkoutCalls).toHaveLength(1);
      expect(JSON.parse(checkoutCalls[0].body)).toEqual({ plan: 'annual' });
      expect(location.href).toBe('https://checkout.stripe.test/session');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('the savings line shows only on annual, never on monthly', async () => {
    // 2026-11-23: the "About $20.83 a month — save $98 a year" line was
    // gated on annual.configured, so it rendered on Monthly too. It must
    // appear only when the yearly plan is selected, and disappear again
    // when the learner switches back to monthly.
    const checkoutCalls = mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      expect(checkoutCalls).toHaveLength(0);
      expect(textOf(renderer.toJSON())).not.toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).not.toContain('$20.83');
      await click(option(renderer, 'annual'));
      expect(textOf(renderer.toJSON())).toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).toContain('$20.83');
      await click(option(renderer, 'monthly'));
      expect(textOf(renderer.toJSON())).not.toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).not.toContain('$20.83');
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

// Phase 0 lab-hours meter on the account page (mounted, 2026-11-23): the
// meter lives in the SUBSCRIBED branch, under the renewal line. useLabUsage
// is mocked through the hoisted state at the top of this file (no
// /labs/usage fetch runs); the plans fetch is stubbed like the toggle tests.
describe('SignIn lab usage meter (mounted, Phase 0)', () => {
  const SUBSCRIBED = {
    subscribed: true,
    status: 'active',
    currentPeriodEnd: '2026-12-11T12:00:00Z', // midday UTC: the same calendar date in every time zone the suite runs in
    loading: false,
    refresh: () => {},
  };
  const FREE = {
    subscribed: false,
    status: 'none',
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  };
  const meteredUsage = (overrides = {}) => ({
    metered: true,
    usedSeconds: 26400, // 7h 20m
    allowanceSeconds: 72000,
    overageSeconds: 0,
    liveSeconds: 0,
    resetsAt: '2026-04-17T12:00:00',
    ...overrides,
  });

  beforeEach(() => {
    subscriptionMocks.subscription = { ...SUBSCRIBED };
    subscriptionMocks.labUsage = { usage: undefined, loading: true, error: null };
  });
  afterEach(() => {
    subscriptionMocks.subscription = { ...FREE };
    subscriptionMocks.labUsage = { usage: undefined, loading: true, error: null };
    vi.unstubAllGlobals();
  });

  it('renders the meter under the renewal line for a subscribed user', async () => {
    subscriptionMocks.labUsage = { usage: meteredUsage(), loading: false, error: null };
    mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Premium active');
      expect(text).toContain('renews December 11, 2026');
      expect(text).toContain('7h 20m');
      expect(text).toContain('of 20h included');
      expect(text).toContain('resets Apr 17');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('fails closed when the usage fetch errors: "Lab usage unavailable", page intact', async () => {
    subscriptionMocks.labUsage = { usage: null, loading: false, error: 'unavailable' };
    mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Premium active');
      expect(text).toContain('Lab usage unavailable');
      expect(text).not.toContain('of 20h included');
      expect(text).toContain('Manage subscription');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('mounts cleanly while the meter is still loading (no crash, no meter yet)', async () => {
    // ship_verification: the section moved to async meter data, so a mount
    // with the usage still null/loading must not throw — the guard in
    // LabUsageMeter (usage === undefined renders nothing) is what this
    // test pins. Disable that guard and this test fails with the same
    // TypeError a subscriber would see.
    subscriptionMocks.labUsage = { usage: undefined, loading: true, error: null };
    mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Premium active');
      expect(text).not.toContain('Lab usage unavailable');
      expect(text).not.toContain('of 20h included');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('shows no meter for a free-tier user (metered:false)', async () => {
    subscriptionMocks.subscription = { ...FREE };
    subscriptionMocks.labUsage = {
      usage: { metered: false, usedSeconds: 0, allowanceSeconds: 72000, overageSeconds: 0, liveSeconds: 0, resetsAt: null },
      loading: false,
      error: null,
    };
    mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('free tier');
      expect(text).not.toContain('of 20h included');
      expect(text).not.toContain('Lab usage unavailable');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('shows the over-age preview line past 20h, with no money language', async () => {
    subscriptionMocks.labUsage = {
      usage: meteredUsage({ usedSeconds: 75600, overageSeconds: 3600 }),
      loading: false,
      error: null,
    };
    mockBillingFetch({ annualConfigured: true });
    stubWindow();
    const renderer = await renderSection();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('1h 00m over your included 20h');
      expect(text).toContain("overage billing isn't live yet");
      expect(text).not.toContain('$');
      expect(text).not.toContain('invoice');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
