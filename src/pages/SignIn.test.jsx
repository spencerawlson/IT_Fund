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
    provider: null,
    plan: null,
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  },
  labUsage: { usage: undefined, loading: true, error: null },
}));

// The StoreKit plugin is mocked so the iOS purchase/manage paths run
// against a fake App Store (see src/lib/iap.test.js for the client-level
// tests). The web tests never call it — the hook's effect returns early
// off iOS — so this mock cannot change their behaviour.
const pluginMocks = vi.hoisted(() => {
  const calls = { purchase: [], finishTransaction: [], showManageSubscriptions: 0 };
  const plugin = {
    getProducts: vi.fn(async ({ productIds }) => ({
      products: [
        { productId: 'com.road2cissp.app.premium.monthly', displayName: 'Premium Monthly', description: 'Monthly', displayPrice: '$29.00', price: 29, currencyCode: 'USD' },
        { productId: 'com.road2cissp.app.premium.yearly', displayName: 'Premium Annual', description: 'Annual', displayPrice: '$250.00', price: 250, currencyCode: 'USD' },
      ].filter((p) => productIds.includes(p.productId)),
    })),
    purchase: vi.fn(async ({ productId }) => {
      calls.purchase.push(productId);
      return { state: 'purchased', transactionId: 'tx-1', productId, signedTransaction: 'signed-jws' };
    }),
    getCurrentEntitlements: vi.fn(async () => ({ transactions: [] })),
    finishTransaction: vi.fn(async ({ transactionId }) => { calls.finishTransaction.push(transactionId); }),
    showManageSubscriptions: vi.fn(async () => { calls.showManageSubscriptions += 1; }),
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
  };
  return { plugin, calls };
});

vi.mock('r2c-storekit', () => ({ default: pluginMocks.plugin }));

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

describe('SignIn with Apple (Guideline 4.8, 2026-11-23)', () => {
  it('shows Sign in with Apple on the sign-in view while providers load', () => {
    const html = renderSignIn();
    expect(html).toContain('Sign in with Apple');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Continue with GitHub');
    expect(html).toContain('Google, GitHub, or Apple');
  });

  it('offers Link Apple alongside Link GitHub for a Google-only account', () => {
    const html = renderAccount();
    expect(html).toContain('Link GitHub');
    expect(html).toContain('Link Apple');
    expect(html).not.toContain('Link Google'); // already signed in with Google
  });
});

describe('SignIn Apple button gating (mounted, 2026-11-23)', () => {
  // The full page mounts AuthProvider + ThemeProvider, which touch
  // document/window/localStorage, so the node test env needs a browser stub.
  function stubBrowser() {
    const location = { href: '' };
    vi.stubGlobal('window', {
      location,
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    vi.stubGlobal('document', {
      title: '',
      visibilityState: 'visible',
      documentElement: { getAttribute: () => null, setAttribute: () => {} },
      // Seo upserts meta tags into <head> on mount.
      head: { querySelector: () => null, appendChild: () => {} },
      createElement: () => ({ setAttribute: () => {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
    });
    return location;
  }

  function mockAuthFetch(providers) {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/auth/providers')) {
        return { ok: true, json: async () => ({ providers }) };
      }
      if (String(url).includes('/auth/me')) {
        return { ok: false, json: async () => ({}) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));
  }

  async function renderSignInPage() {
    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <AuthProvider initialAuth={ANON_AUTH}>
            <StaticRouter location="/signin">
              <SignIn />
            </StaticRouter>
          </AuthProvider>
        </ThemeProvider>,
      );
    });
    // Flush the providers fetch (.then chain) and the state update.
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    return renderer;
  }

  beforeEach(() => { stubBrowser(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows the Apple button when the server reports Apple configured', async () => {
    mockAuthFetch(['google', 'github', 'apple']);
    const renderer = await renderSignInPage();
    try {
      expect(textOf(renderer.toJSON())).toContain('Sign in with Apple');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('hides the Apple button when Apple is unconfigured — never a broken button', async () => {
    mockAuthFetch(['google', 'github']);
    const renderer = await renderSignInPage();
    try {
      const text = textOf(renderer.toJSON());
      expect(text).toContain('Continue with Google');
      expect(text).not.toContain('Sign in with Apple');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('clicking the Apple button starts the Apple login', async () => {
    mockAuthFetch(['google', 'github', 'apple']);
    const location = globalThis.window.location;
    const renderer = await renderSignInPage();
    try {
      const buttons = renderer.root.findAllByType('button');
      const apple = buttons.find((b) => textOf(b.children).includes('Sign in with Apple'));
      expect(apple).toBeTruthy();
      await click(apple);
      expect(location.href).toBe('/api/auth/apple/login');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});

// In-app purchases (Guideline 3.1.1, 2026-11-23): in the iOS shell the
// free-tier Subscribe button buys through the App Store and "Manage
// subscription" routes per provider — the App Store sheet for Apple
// subscribers, the Stripe portal for Stripe subscribers. SSR never runs
// the products effect, so the hook stays in its initial state (products
// unavailable), which is the "not configured yet" state.
describe('SignIn subscription card in the iOS shell (IAP, SSR)', () => {
  const FREE = {
    subscribed: false,
    status: 'none',
    provider: null,
    plan: null,
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  };
  const asIos = () => {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
  };
  const asWeb = () => { delete globalThis.Capacitor; };

  beforeEach(() => {
    Object.assign(subscriptionMocks.subscription, FREE);
  });
  afterEach(() => {
    Object.assign(subscriptionMocks.subscription, FREE);
    asWeb();
    vi.unstubAllGlobals();
  });

  it('offers the App Store purchase to a free user, disabled until the products exist', () => {
    asIos();
    const html = renderAccount();
    expect(html).toContain('Subscribe with Apple — $29/mo');
    expect(html).not.toContain('Subscribe — $29/mo');
  });

  it('tells an Apple subscriber to manage in iOS Settings, never the Stripe portal', () => {
    asIos();
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'apple',
      plan: 'monthly',
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    const html = renderAccount();
    expect(html).toContain('Premium active');
    expect(html).toContain('Manage or cancel anytime in iOS Settings');
    expect(html).not.toContain('Stripe portal');
  });

  it('shows a Restore purchases button to a subscriber in the iOS shell, and never on the web', () => {
    asIos();
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'apple',
      plan: 'monthly',
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    expect(renderAccount()).toContain('Restore purchases');
    asWeb();
    expect(renderAccount()).not.toContain('Restore purchases');
  });

  it('shows a Restore purchases button to a free user in the iOS shell', () => {
    asIos();
    expect(renderAccount()).toContain('Restore purchases');
  });

  it('keeps the Stripe portal line for a Stripe subscriber', () => {
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'stripe',
      plan: null,
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    const html = renderAccount();
    expect(html).toContain('Premium active');
    expect(html).toContain('Update payment method or cancel anytime from the Stripe portal.');
    expect(html).not.toContain('iOS Settings');
  });
});

// Mounted iOS tests: the products effect runs, so the App Store prices
// appear and the Subscribe button buys through the mocked plugin.
describe('SignIn subscription card in the iOS shell (IAP, mounted)', () => {
  const FREE = {
    subscribed: false,
    status: 'none',
    provider: null,
    plan: null,
    currentPeriodEnd: null,
    loading: false,
    refresh: () => {},
  };

  function mockIapFetch() {
    const verifyCalls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (String(url).includes('/billing/plans')) {
        return {
          ok: true,
          json: async () => ({
            monthly: { configured: true, unit_amount: 2900, currency: 'usd', interval: 'month', display: '$29' },
            annual: { configured: true, unit_amount: 25000, currency: 'usd', interval: 'year', display: '$250' },
          }),
        };
      }
      if (String(url).includes('/iap/verify')) {
        verifyCalls.push({ url: String(url), body: options?.body });
        return { ok: true, json: async () => ({ ok: true, provider: 'apple', plan: 'monthly' }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));
    return verifyCalls;
  }

  async function renderIosSection() {
    const renderer = await renderSection();
    // Flush the products effect (getProducts promise + state update).
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    return renderer;
  }

  beforeEach(() => {
    Object.assign(subscriptionMocks.subscription, FREE);
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
    pluginMocks.calls.purchase.length = 0;
    pluginMocks.calls.finishTransaction.length = 0;
    pluginMocks.calls.showManageSubscriptions = 0;
  });
  afterEach(() => {
    Object.assign(subscriptionMocks.subscription, FREE);
    delete globalThis.Capacitor;
    vi.unstubAllGlobals();
  });

  it('shows the not-set-up note when the App Store returns no products, and the Subscribe button stays disabled', async () => {
    mockIapFetch();
    pluginMocks.plugin.getProducts.mockResolvedValueOnce({ products: [] });
    const renderer = await renderIosSection();
    try {
      expect(textOf(renderer.toJSON())).toContain('Subscriptions are being set up in the App Store — check back soon.');
      expect(subscribeButton(renderer).props.disabled).toBe(true);
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('shows the App Store annual price and the savings line from the App Store prices when annual is selected', async () => {
    mockIapFetch();
    const renderer = await renderIosSection();
    try {
      await click(option(renderer, 'annual'));
      // The yearly product maps to plan "annual" (IAP_PLANS) — the
      // annual App Store price, not the Stripe fallback, drives the
      // button and the savings line ($29 x 12 - $250 = $98; $250/12).
      expect(textOf(renderer.toJSON())).toContain('Subscribe with Apple — $250.00/yr');
      expect(textOf(renderer.toJSON())).toContain('save $98 a year');
      expect(textOf(renderer.toJSON())).toContain('$20.83');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('shows the App Store prices and buys the monthly product through StoreKit, never Stripe', async () => {
    const verifyCalls = mockIapFetch();
    const refresh = vi.fn();
    subscriptionMocks.subscription.refresh = refresh;
    const renderer = await renderIosSection();
    try {
      // The App Store display price replaces the Stripe fallback.
      expect(textOf(renderer.toJSON())).toContain('Subscribe with Apple — $29.00/mo');
      expect(textOf(renderer.toJSON())).not.toContain('Subscriptions are being set up');
      const button = subscribeButton(renderer);
      expect(button.props.disabled).toBe(false);
      await click(button);
      expect(pluginMocks.calls.purchase).toEqual(['com.road2cissp.app.premium.monthly']);
      expect(verifyCalls).toHaveLength(1);
      expect(JSON.parse(verifyCalls[0].body)).toEqual({ signed_transaction: 'signed-jws' });
      expect(pluginMocks.calls.finishTransaction).toEqual(['tx-1']);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('opens the system manage-subscriptions sheet for an Apple subscriber, never the Stripe portal', async () => {
    mockIapFetch();
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'apple',
      plan: 'monthly',
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    const renderer = await renderIosSection();
    try {
      const buttons = renderer.root.findAllByType('button');
      const manage = buttons.find((b) => textOf(b.children).includes('Manage subscription'));
      expect(manage).toBeTruthy();
      await click(manage);
      expect(pluginMocks.calls.showManageSubscriptions).toBe(1);
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('restores purchases for an Apple subscriber and reports when there is nothing to restore', async () => {
    mockIapFetch();
    const refresh = vi.fn();
    subscriptionMocks.subscription.refresh = refresh;
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'apple',
      plan: 'monthly',
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    const renderer = await renderIosSection();
    try {
      const buttons = renderer.root.findAllByType('button');
      const restore = buttons.find((b) => textOf(b.children).includes('Restore purchases'));
      expect(restore).toBeTruthy();
      await click(restore);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(textOf(renderer.toJSON())).toContain('No purchases to restore on this Apple ID.');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });

  it('restores a current entitlement and reports the subscription active', async () => {
    const verifyCalls = mockIapFetch();
    const refresh = vi.fn();
    subscriptionMocks.subscription.refresh = refresh;
    Object.assign(subscriptionMocks.subscription, {
      subscribed: true,
      status: 'active',
      provider: 'apple',
      plan: 'monthly',
      currentPeriodEnd: '2026-12-23T00:00:00Z',
    });
    pluginMocks.plugin.getCurrentEntitlements.mockResolvedValueOnce({
      transactions: [{ transactionId: 'tx-1', signedTransaction: 'signed-jws' }],
    });
    const renderer = await renderIosSection();
    try {
      const buttons = renderer.root.findAllByType('button');
      const restore = buttons.find((b) => textOf(b.children).includes('Restore purchases'));
      expect(restore).toBeTruthy();
      await click(restore);
      expect(verifyCalls).toHaveLength(1);
      expect(JSON.parse(verifyCalls[0].body)).toEqual({ signed_transaction: 'signed-jws' });
      expect(pluginMocks.calls.finishTransaction).toEqual(['tx-1']);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(textOf(renderer.toJSON())).toContain('Purchases restored — your subscription is active.');
    } finally {
      TestRenderer.act(() => { renderer.unmount(); });
    }
  });
});
