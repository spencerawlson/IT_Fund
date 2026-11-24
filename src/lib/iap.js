// In-app purchases (App Store Guideline 3.1.1) — the web half of the
// StoreKit 2 flow. The native half is the `r2c-storekit` Capacitor plugin
// (plugins/r2c-storekit/, hand-written, no SDK); the server half is
// backend/iap.py (+ backend/iap_routes.py). Full design + App Store
// Connect steps: docs/IAP.md.
//
// The flow, end to end:
//   1. On iOS (native shell only) the Pricing / SignIn pages call
//      useIapProducts(), which asks the App Store for the two products.
//      The App Store is the source of truth for whether the products
//      exist yet: an empty list means "not configured in App Store
//      Connect", and the buy buttons hide (the same pattern as Apple
//      sign-in hiding its button while unconfigured).
//   2. purchaseIap(productId) runs the StoreKit purchase sheet. On
//      success the plugin returns the signed transaction JWS — NOT a
//      finished transaction. The JWS is posted to POST /iap/verify, the
//      backend verifies it against Apple's root certificate and grants
//      the entitlement, and only then is the transaction finished.
//      That order is what makes a purchase survive an app kill mid-flight.
//   3. initIap() (called once from main.jsx) subscribes to the plugin's
//      transactionUpdate events (renewals, Ask to Buy approvals) and syncs
//      the current entitlements on launch — the restore-purchases path
//      and the safety net for a purchase whose verify call never landed.
//
// On the website (and on Android, which has no IAP yet — Play Billing is
// a separate job) every function here is a no-op that reports
// available:false, and the pages keep Stripe. Nothing in this module
// runs a purchase on the web.
//
// `createIapClient(plugin)` takes the plugin as an argument so tests can
// pass a fake; the module-level functions use the real plugin.
import { useEffect, useState } from 'react';
import R2CStoreKit from 'r2c-storekit';
import { isNative, nativePlatform } from '@/lib/native';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** The two App Store subscription products, product ID -> plan name (the
    same plan names the backend and Stripe use: "monthly" / "annual").
    Single source of truth on this side; the backend keeps its own copy in
    backend/iap.py and the native plugin takes the IDs as a parameter, so
    no ID is hard-coded in more than one place per side. The App Store
    prices mirror the web prices ($29/mo, $250/yr) via the nearest price
    tier per currency — the tier amounts live in App Store Connect. */
export const IAP_PRODUCT_IDS = Object.freeze({
  monthly: 'com.road2cissp.app.premium.monthly',
  yearly: 'com.road2cissp.app.premium.yearly',
});

export const IAP_PLANS = Object.freeze({
  'com.road2cissp.app.premium.monthly': 'monthly',
  'com.road2cissp.app.premium.yearly': 'annual',
});

/** True only in the iOS native shell — the only place IAP exists. The
    website keeps Stripe; Android keeps Stripe until Play Billing lands. */
export function isIapPlatform() {
  return isNative() && nativePlatform() === 'ios';
}

function productIds() {
  return Object.values(IAP_PRODUCT_IDS);
}

/**
 * The IAP client: a thin wrapper over the Capacitor plugin plus the
 * backend verify call. `plugin` is the `r2c-storekit` plugin (or a fake
 * in tests). Every method that touches the store first checks
 * isIapPlatform() so the web path can never start a purchase.
 */
export function createIapClient(plugin) {
  async function verifyWithBackend(signedTransaction) {
    const res = await fetch(`${API_BASE}/iap/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ signed_transaction: signedTransaction }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const err = new Error(data?.detail || `Purchase verification failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function finishTransaction(transactionId) {
    try {
      await plugin.finishTransaction({ transactionId });
    } catch {
      // Finishing is best-effort: the entitlement is already granted, and
      // StoreKit re-delivers an unfinished transaction on next launch,
      // where the launch sync verifies and finishes it then.
    }
  }

  /** Verify one signed transaction with the backend and finish it. The
      shared core of purchase, restore, launch sync, and the update
      listener — a transaction is only finished after the backend says
      the entitlement is granted. */
  async function syncTransaction(signedTransaction, transactionId) {
    const status = await verifyWithBackend(signedTransaction);
    await finishTransaction(transactionId);
    return status;
  }

  return {
    /** The products the App Store knows about, in plan order (monthly,
        then yearly). Empty list = products not configured yet (or no
        App Store on this platform) — the caller hides the buy buttons. */
    async getProducts() {
      if (!isIapPlatform()) return [];
      let result;
      try {
        result = await plugin.getProducts({ productIds: productIds() });
      } catch {
        return [];
      }
      const products = Array.isArray(result?.products) ? result.products : [];
      const byId = new Map(products.map((p) => [p.productId, p]));
      return productIds()
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((p) => ({ ...p, plan: IAP_PLANS[p.productId] || null }));
    },

    /** Run the StoreKit purchase sheet for one product. Returns
        { state: 'purchased', status } on success (status is the backend
        /billing/status shape after the grant), { state: 'cancelled' } when
        the user dismisses the sheet, or { state: 'pending' } for Ask to
        Buy — the transaction then arrives through the update listener.
        Throws when the purchase or the backend verification fails; the
        transaction is left unfinished so it can be retried. */
    async purchase(productId) {
      if (!isIapPlatform()) {
        throw new Error('In-app purchases are only available in the iOS app.');
      }
      const result = await plugin.purchase({ productId });
      if (result.state === 'cancelled') return { state: 'cancelled' };
      if (result.state === 'pending') return { state: 'pending' };
      if (result.state !== 'purchased' || !result.signedTransaction) {
        throw new Error('The App Store purchase did not return a signed transaction.');
      }
      const status = await syncTransaction(result.signedTransaction, result.transactionId);
      return { state: 'purchased', status };
    },

    /** Restore purchases + launch sync: every current entitlement is
        verified with the backend and finished. Returns the list of
        statuses granted (empty when there is nothing to restore). */
    async restore() {
      if (!isIapPlatform()) return [];
      let result;
      try {
        result = await plugin.getCurrentEntitlements();
      } catch {
        return [];
      }
      const transactions = Array.isArray(result?.transactions) ? result.transactions : [];
      const statuses = [];
      for (const txn of transactions) {
        if (!txn.signedTransaction || !txn.transactionId) continue;
        try {
          statuses.push(await syncTransaction(txn.signedTransaction, txn.transactionId));
        } catch {
          // One bad entitlement must not block the rest.
        }
      }
      return statuses;
    },

    /** Open the system manage-subscriptions sheet (iOS Settings >
        Apple ID > Subscriptions, in-app). Throws on the web. */
    async showManageSubscriptions() {
      if (!isIapPlatform()) {
        throw new Error('Manage subscriptions is only available in the iOS app.');
      }
      await plugin.showManageSubscriptions();
    },

    /** Subscribe to StoreKit transaction updates (renewals, Ask to Buy
        approvals). The handler receives the backend status for each
        verified transaction. Returns an unsubscribe function. */
    addTransactionListener(onStatus) {
      if (!isIapPlatform() || typeof plugin.addListener !== 'function') {
        return () => {};
      }
      const handle = plugin.addListener('transactionUpdate', async (event) => {
        if (!event?.signedTransaction || !event?.transactionId) return;
        try {
          const status = await syncTransaction(event.signedTransaction, event.transactionId);
          onStatus?.(status);
        } catch {
          // A failed verify leaves the transaction unfinished; StoreKit
          // re-delivers it, and the launch sync retries it then.
        }
      });
      return () => {
        if (handle && typeof handle.remove === 'function') handle.remove();
      };
    },
  };
}

// The module-level client over the real plugin. The plugin's JS side is
// a thin registerPlugin wrapper (its web fallback reports no products),
// so importing it is safe on the web and in tests; tests that need a
// fake pass one to createIapClient / the hook's client argument instead.
let defaultClient = null;
function getDefaultClient() {
  if (!defaultClient) {
    defaultClient = createIapClient(R2CStoreKit);
  }
  return defaultClient;
}

/** React hook: the App Store products on iOS, or available:false
    everywhere else (web, Android, products not configured). The pages
    render the IAP buy buttons only when available is true. */
export function useIapProducts(client = null) {
  const [state, setState] = useState({ available: false, products: [], loading: isIapPlatform(), error: null });
  useEffect(() => {
    let live = true;
    if (!isIapPlatform()) {
      setState({ available: false, products: [], loading: false, error: null });
      return undefined;
    }
    const iap = client || getDefaultClient();
    iap
      .getProducts()
      .then((products) => {
        if (live) setState({ available: products.length > 0, products, loading: false, error: null });
      })
      .catch((err) => {
        if (live) setState({ available: false, products: [], loading: false, error: err });
      });
    return () => {
      live = false;
    };
  }, [client]);
  return state;
}

/** Buy one product through IAP and return the backend status. Thin
    wrapper over the default client for the pages. */
export async function purchaseIap(productId, client = null) {
  const iap = client || getDefaultClient();
  return iap.purchase(productId);
}

/** Open the system manage-subscriptions sheet (iOS only). */
export async function showManageSubscriptions(client = null) {
  const iap = client || getDefaultClient();
  return iap.showManageSubscriptions();
}

/** Restore purchases through the App Store (iOS only): verify every
    current entitlement with the backend and return the statuses granted
    (empty when there is nothing to restore). The account page's visible
    "Restore purchases" button calls this (Guideline 3.1.1). */
export async function restoreIap(client = null) {
  const iap = client || getDefaultClient();
  return iap.restore();
}

let initialized = false;

/** Start the IAP background wiring once (called from main.jsx): the
    transaction-update listener plus a launch sync of the current
    entitlements (restore). No-op everywhere but the iOS shell, and safe
    to call twice. `onStatus` is called with the backend status whenever
    a transaction lands (the app refreshes its subscription state). */
export function initIap(onStatus, client = null) {
  if (initialized || !isIapPlatform()) return () => {};
  initialized = true;
  const iap = client || getDefaultClient();
  const unsubscribe = iap.addTransactionListener(onStatus);
  // Launch sync: an unfinished transaction (a purchase whose verify call
  // never landed, a restore) is verified and finished here.
  iap.restore().catch(() => {});
  return unsubscribe;
}

/** Test-only reset for the initIap once-guard. */
export function __resetIapInitForTests() {
  initialized = false;
  defaultClient = null;
}
