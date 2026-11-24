import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The StoreKit plugin is mocked at the module level so the module-level
// helpers (purchaseIap, showManageSubscriptions, initIap) run against a
// fake App Store; createIapClient tests below pass their own fake plugin
// instead, so the module mock does not leak into them. The fake follows
// the plugin's real contract (plugins/r2c-storekit/README.md): the
// signed transaction arrives as `signedTransaction`, and the yearly
// product maps to plan "annual".
const pluginMocks = vi.hoisted(() => {
  const listeners = {};
  const calls = { getProducts: [], purchase: [], finishTransaction: [], showManageSubscriptions: 0 };
  const plugin = {
    getProducts: vi.fn(async ({ productIds }) => {
      calls.getProducts.push(productIds);
      return {
        products: [
          { productId: 'com.road2cissp.app.premium.monthly', displayName: 'Premium Monthly', description: 'Monthly access', displayPrice: '$29.00', price: 29, currencyCode: 'USD' },
          { productId: 'com.road2cissp.app.premium.yearly', displayName: 'Premium Annual', description: 'Annual access', displayPrice: '$250.00', price: 250, currencyCode: 'USD' },
        ].filter((p) => productIds.includes(p.productId)),
      };
    }),
    purchase: vi.fn(async ({ productId }) => ({ state: 'purchased', transactionId: 'tx-1', productId, signedTransaction: 'signed-jws' })),
    getCurrentEntitlements: vi.fn(async () => ({ transactions: [] })),
    finishTransaction: vi.fn(async ({ transactionId }) => { calls.finishTransaction.push(transactionId); }),
    showManageSubscriptions: vi.fn(async () => { calls.showManageSubscriptions += 1; }),
    addListener: vi.fn(async (event, cb) => { listeners[event] = cb; return { remove: vi.fn() }; }),
  };
  return { plugin, listeners, calls };
});

vi.mock('r2c-storekit', () => ({ default: pluginMocks.plugin }));

import {
  IAP_PRODUCT_IDS, IAP_PLANS, isIapPlatform, createIapClient, purchaseIap,
  restoreIap, showManageSubscriptions, initIap, __resetIapInitForTests,
} from './iap.js';

const MONTHLY_ID = 'com.road2cissp.app.premium.monthly';
const YEARLY_ID = 'com.road2cissp.app.premium.yearly';

// The iOS shell, as the client sees it: every client method first checks
// isIapPlatform(), so the purchase/restore/listener tests run as iOS.
function asIos() {
  globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
}

// A fake plugin passed directly to createIapClient (independent of the
// module mock above): per-test behaviour via the overrides.
function fakePlugin(overrides = {}) {
  const listeners = {};
  const calls = { purchase: [], finishTransaction: [], showManageSubscriptions: 0 };
  const plugin = {
    getProducts: vi.fn(async ({ productIds }) => ({
      products: (overrides.products ?? [
        { productId: MONTHLY_ID, displayName: 'Premium Monthly', description: 'Monthly', displayPrice: '$29.00', price: 29, currencyCode: 'USD' },
        { productId: YEARLY_ID, displayName: 'Premium Annual', description: 'Annual', displayPrice: '$250.00', price: 250, currencyCode: 'USD' },
      ]).filter((p) => productIds.includes(p.productId)),
    })),
    purchase: vi.fn(async ({ productId }) => {
      calls.purchase.push(productId);
      return overrides.purchase ?? { state: 'purchased', transactionId: 'tx-1', productId, signedTransaction: 'signed-jws' };
    }),
    getCurrentEntitlements: vi.fn(async () => overrides.entitlements ?? { transactions: [] }),
    finishTransaction: vi.fn(async ({ transactionId }) => { calls.finishTransaction.push(transactionId); }),
    showManageSubscriptions: vi.fn(async () => { calls.showManageSubscriptions += 1; }),
    addListener: vi.fn(async (event, cb) => { listeners[event] = cb; return { remove: vi.fn() }; }),
  };
  return { plugin, listeners, calls };
}

// fetch stub for POST /api/iap/verify (and /billing/status, which the
// purchase success path refreshes): records every call, answers verify
// with the given outcome. The verify response is the backend's status
// shape — the client returns it as `status` to the caller.
function stubFetch({ verifyOk = true, verifyPlan = 'monthly' } = {}) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    calls.push({ url: String(url), body: options?.body });
    if (String(url).includes('/iap/verify')) {
      return { ok: verifyOk, json: async () => (verifyOk ? { ok: true, provider: 'apple', plan: verifyPlan } : { detail: 'invalid transaction' }) };
    }
    return { ok: true, json: async () => ({ subscribed: false, status: 'none', provider: null, plan: null, current_period_end: null }) };
  }));
  return calls;
}

beforeEach(() => {
  __resetIapInitForTests();
  vi.unstubAllGlobals();
  for (const fn of Object.values(pluginMocks.plugin)) {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  }
  pluginMocks.calls.getProducts.length = 0;
  pluginMocks.calls.purchase.length = 0;
  pluginMocks.calls.finishTransaction.length = 0;
  pluginMocks.calls.showManageSubscriptions = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if ('Capacitor' in globalThis) delete globalThis.Capacitor;
});

describe('IAP product IDs (one place, never hard-coded elsewhere)', () => {
  it('uses the decided bundle-scoped IDs for both plans', () => {
    expect(IAP_PRODUCT_IDS.monthly).toBe(MONTHLY_ID);
    expect(IAP_PRODUCT_IDS.yearly).toBe(YEARLY_ID);
    // Plan names are the same ones the backend and Stripe use: the
    // yearly product is the "annual" plan, not "yearly".
    expect(IAP_PLANS[MONTHLY_ID]).toBe('monthly');
    expect(IAP_PLANS[YEARLY_ID]).toBe('annual');
  });
});

describe('isIapPlatform', () => {
  it('is false on the web (no Capacitor)', () => {
    expect(isIapPlatform()).toBe(false);
  });

  it('is true only for the native iOS shell', () => {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
    expect(isIapPlatform()).toBe(true);
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    expect(isIapPlatform()).toBe(false);
    globalThis.Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web' };
    expect(isIapPlatform()).toBe(false);
  });
});

describe('createIapClient.getProducts', () => {
  beforeEach(asIos);

  it('maps App Store products to plans with display price and numeric price', async () => {
    const { plugin } = fakePlugin();
    const client = createIapClient(plugin);
    const products = await client.getProducts();
    expect(products).toHaveLength(2);
    expect(products[0]).toEqual({ productId: MONTHLY_ID, displayName: 'Premium Monthly', description: 'Monthly', displayPrice: '$29.00', price: 29, currencyCode: 'USD', plan: 'monthly' });
    expect(products[1].plan).toBe('annual');
    expect(plugin.getProducts).toHaveBeenCalledWith({ productIds: [MONTHLY_ID, YEARLY_ID] });
  });

  it('returns an empty list when the App Store has no products (not configured yet)', async () => {
    const { plugin } = fakePlugin({ products: [] });
    const client = createIapClient(plugin);
    expect(await client.getProducts()).toEqual([]);
  });

  it('returns an empty list when the App Store errors, never throws', async () => {
    const { plugin } = fakePlugin();
    plugin.getProducts.mockRejectedValueOnce(new Error('store unavailable'));
    const client = createIapClient(plugin);
    expect(await client.getProducts()).toEqual([]);
  });
});

describe('createIapClient.purchase — verify-then-finish', () => {
  beforeEach(asIos);

  it('verifies the signed transaction with the backend, then finishes it', async () => {
    const fetchCalls = stubFetch();
    const { plugin, calls } = fakePlugin();
    const client = createIapClient(plugin);
    const result = await client.purchase(MONTHLY_ID);
    expect(result).toEqual({ state: 'purchased', status: { ok: true, provider: 'apple', plan: 'monthly' } });
    // The verify call carries the signed transaction JWS.
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toContain('/iap/verify');
    expect(JSON.parse(fetchCalls[0].body)).toEqual({ signed_transaction: 'signed-jws' });
    // Finish happens only after the backend confirms.
    expect(calls.finishTransaction).toEqual(['tx-1']);
  });

  it('does not verify or finish when the user cancels the purchase sheet', async () => {
    const fetchCalls = stubFetch();
    const { plugin, calls } = fakePlugin({ purchase: { state: 'cancelled', transactionId: null, signedTransaction: null } });
    const client = createIapClient(plugin);
    expect(await client.purchase(MONTHLY_ID)).toEqual({ state: 'cancelled' });
    expect(fetchCalls).toHaveLength(0);
    expect(calls.finishTransaction).toHaveLength(0);
  });

  it('does not verify or finish a pending (Ask to Buy) purchase', async () => {
    const fetchCalls = stubFetch();
    const { plugin, calls } = fakePlugin({ purchase: { state: 'pending', transactionId: 'tx-pending', signedTransaction: 'signed-jws' } });
    const client = createIapClient(plugin);
    expect(await client.purchase(MONTHLY_ID)).toEqual({ state: 'pending' });
    expect(fetchCalls).toHaveLength(0);
    expect(calls.finishTransaction).toHaveLength(0);
  });

  it('never finishes when the backend refuses the transaction', async () => {
    stubFetch({ verifyOk: false });
    const { plugin, calls } = fakePlugin();
    const client = createIapClient(plugin);
    await expect(client.purchase(MONTHLY_ID)).rejects.toThrow('invalid transaction');
    expect(calls.finishTransaction).toHaveLength(0);
  });

  it('never finishes when the purchase returns no signed transaction', async () => {
    stubFetch();
    const { plugin, calls } = fakePlugin({ purchase: { state: 'purchased', transactionId: 'tx-1', signedTransaction: null } });
    const client = createIapClient(plugin);
    await expect(client.purchase(MONTHLY_ID)).rejects.toThrow('did not return a signed transaction');
    expect(calls.finishTransaction).toHaveLength(0);
  });
});

describe('createIapClient.restore — launch sync / restore purchases', () => {
  beforeEach(asIos);

  it('verifies and finishes every current entitlement', async () => {
    const fetchCalls = stubFetch({ verifyPlan: 'annual' });
    const { plugin, calls } = fakePlugin({
      entitlements: {
        transactions: [
          { transactionId: 'tx-a', signedTransaction: 'jws-a' },
          { transactionId: 'tx-b', signedTransaction: 'jws-b' },
        ],
      },
    });
    const client = createIapClient(plugin);
    const restored = await client.restore();
    expect(restored).toEqual([
      { ok: true, provider: 'apple', plan: 'annual' },
      { ok: true, provider: 'apple', plan: 'annual' },
    ]);
    expect(fetchCalls.filter((c) => c.url.includes('/iap/verify'))).toHaveLength(2);
    expect(calls.finishTransaction).toEqual(['tx-a', 'tx-b']);
  });

  it('returns an empty list when there is nothing to restore', async () => {
    stubFetch();
    const { plugin } = fakePlugin({ entitlements: { transactions: [] } });
    const client = createIapClient(plugin);
    expect(await client.restore()).toEqual([]);
  });
});

describe('createIapClient transaction listener — purchases finished elsewhere', () => {
  beforeEach(asIos);

  it('verifies + finishes a landed transaction and calls the listener with the backend status', async () => {
    const fetchCalls = stubFetch();
    const { plugin, calls, listeners } = fakePlugin();
    const seen = [];
    const client = createIapClient(plugin);
    client.addTransactionListener((status) => { seen.push(status); });
    expect(listeners.transactionUpdate).toBeTypeOf('function');
    await listeners.transactionUpdate({ signedTransaction: 'jws-landed', transactionId: 'tx-landed' });
    expect(fetchCalls.filter((c) => c.url.includes('/iap/verify'))).toHaveLength(1);
    expect(calls.finishTransaction).toEqual(['tx-landed']);
    expect(seen).toEqual([{ ok: true, provider: 'apple', plan: 'monthly' }]);
  });
});

describe('showManageSubscriptions', () => {
  beforeEach(asIos);

  it('opens the system manage-subscriptions sheet', async () => {
    await showManageSubscriptions();
    expect(pluginMocks.calls.showManageSubscriptions).toBe(1);
  });
});

describe('restoreIap (module-level helper)', () => {
  beforeEach(asIos);

  it('restores the current entitlements through the default client', async () => {
    stubFetch();
    pluginMocks.plugin.getCurrentEntitlements.mockResolvedValueOnce({
      transactions: [{ transactionId: 'tx-1', signedTransaction: 'signed-jws' }],
    });
    const result = await restoreIap();
    expect(result).toEqual([{ ok: true, provider: 'apple', plan: 'monthly' }]);
    expect(pluginMocks.calls.finishTransaction).toEqual(['tx-1']);
  });

  it('returns an empty list when there is nothing to restore', async () => {
    stubFetch();
    expect(await restoreIap()).toEqual([]);
  });
});

describe('purchaseIap (module-level helper)', () => {
  beforeEach(asIos);

  it('buys the monthly product through the default client', async () => {
    stubFetch();
    const result = await purchaseIap(MONTHLY_ID);
    expect(result.state).toBe('purchased');
    expect(result.status).toEqual({ ok: true, provider: 'apple', plan: 'monthly' });
    expect(pluginMocks.plugin.purchase).toHaveBeenCalledWith({ productId: MONTHLY_ID });
    expect(pluginMocks.calls.finishTransaction).toEqual(['tx-1']);
  });
});

describe('initIap — launch sync, once', () => {
  beforeEach(asIos);

  it('syncs current entitlements on launch (verify + finish) without calling onStatus for the restore', async () => {
    const fetchCalls = stubFetch();
    pluginMocks.plugin.getCurrentEntitlements.mockResolvedValueOnce({
      transactions: [{ transactionId: 'tx-launch', signedTransaction: 'jws-launch' }],
    });
    const seen = [];
    await initIap((status) => { seen.push(status); });
    // restore() runs without an await inside initIap — let it land.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchCalls.filter((c) => c.url.includes('/iap/verify'))).toHaveLength(1);
    expect(JSON.parse(fetchCalls.find((c) => c.url.includes('/iap/verify')).body)).toEqual({ signed_transaction: 'jws-launch' });
    expect(pluginMocks.calls.finishTransaction).toEqual(['tx-launch']);
    // onStatus is only for NEW transactions arriving through the
    // update listener — the restore itself is silent (the UI reads the
    // fresh subscription status on mount anyway).
    expect(seen).toEqual([]);
  });

  it('runs the launch sync only once even when called twice', async () => {
    stubFetch();
    await initIap();
    await initIap();
    expect(pluginMocks.plugin.getCurrentEntitlements).toHaveBeenCalledTimes(1);
  });
});
