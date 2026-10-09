// Subscription state for the paywall. Free tier: 1 sample lesson, 50 flashcards,
// 1 lab, all marketing pages. Everything else needs an active subscription.
//
// useSubscription() calls GET /api/billing/status (cookie auth) and caches the
// result for the session. When billing isn't configured server-side (503) the
// hook treats everything as free so the app keeps working in dev.
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let cached = null; // { subscribed, status, currentPeriodEnd } | null
let inflight = null;

async function fetchStatus() {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/status`, { credentials: 'include' });
      if (res.status === 503) return { subscribed: true, status: 'unconfigured', currentPeriodEnd: null };
      if (res.status === 401) return { subscribed: false, status: 'anonymous', currentPeriodEnd: null };
      if (!res.ok) return { subscribed: false, status: 'error', currentPeriodEnd: null };
      const data = await res.json();
      return {
        subscribed: !!data.subscribed,
        status: data.status || 'none',
        currentPeriodEnd: data.current_period_end || null,
      };
    } catch {
      return { subscribed: false, status: 'error', currentPeriodEnd: null };
    } finally {
      inflight = null;
    }
  })();
  cached = await inflight;
  return cached;
}

export function clearSubscriptionCache() {
  cached = null;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ subscribed: false, status: 'loading', currentPeriodEnd: null, loading: true });

  const refresh = useCallback(async () => {
    clearSubscriptionCache();
    setState({ subscribed: false, status: 'loading', currentPeriodEnd: null, loading: true });
    const s = await fetchStatus();
    setState({ ...s, loading: false });
  }, []);

  useEffect(() => {
    let live = true;
    // Anonymous visitors get the free tier without a network call.
    if (!isAuthenticated) {
      setState({ subscribed: false, status: 'anonymous', currentPeriodEnd: null, loading: false });
      return undefined;
    }
    fetchStatus().then((s) => {
      if (live) setState({ ...s, loading: false });
    });
    return () => { live = false; };
  }, [isAuthenticated]);

  return { ...state, refresh };
}

// --- free-tier boundaries -------------------------------------------------
// The free tier is positional: the first lesson, the first 50 cards of a track,
// and the first lab are open; everything beyond needs a subscription.

/** First deck of each track is the free sample (~50 cards). */
const FREE_DECKS = new Set([
  'net-osi', // networking track opener
  'cy-linux', // security track opener
  'py-basics', // python track opener
  'lx-cli', // linux track opener
  'cl-concepts', // cloud track opener
]);

export function isDeckFree(deckId) {
  return FREE_DECKS.has(deckId);
}

/** First lab is the free sample. */
const FREE_LABS = new Set(['vlan-inter-vlan-routing']);

export function isLabFree(labId) {
  return FREE_LABS.has(labId);
}
