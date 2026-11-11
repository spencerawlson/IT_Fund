// Subscription state for the paywall. Free tier: 5 sample lessons, 57 flashcards
// (5 decks), 2 labs, all marketing pages. Everything else needs an active
// subscription. The FREE_* sets below are the SINGLE source of truth for the
// free tier: LessonView (lessons) and AcademyPlay (decks) both import them
// from here — never redefine them locally.
//
// useSubscription() calls GET /api/billing/status (cookie auth) and caches the
// result for the session. A 503 from billing means billing is unavailable, and
// the hook FAILS CLOSED (subscribed: false, status 'billing-unavailable'):
// an unconfigured or down billing backend must never unlock the product.
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
      if (res.status === 503) return { subscribed: false, status: 'billing-unavailable', currentPeriodEnd: null };
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

// Exported for tests (mocked fetch): fetchStatus is the only place the
// billing-status HTTP mapping lives, so the fail-closed behaviour is testable.
export { fetchStatus };

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
// Single source of truth for the free tier (see header comment). The free
// tier is unified: the opening lesson of each track, with its flashcards.
// Reading lessons and flashcard decks are different content, so the two sets
// are listed separately — but they cover the same five tracks, and the union
// of what is free today is the free set. One id nuance: the security track's
// opening lesson is sec-concepts while its opening deck is cy-linux — both
// stay free, so do not "fix" the mismatch by dropping either one.

/** The 5 free sample lessons (reading): one opening lesson per track. */
export const FREE_LESSON_IDS = new Set(['net-osi', 'sec-concepts', 'py-basics', 'lx-cli', 'cl-concepts']);

export function isLessonFree(lessonId) {
  return FREE_LESSON_IDS.has(lessonId);
}

/** The 5 free decks (flashcards): 12 + 12 + 12 + 10 + 11 = 57 cards. */
export const FREE_DECKS = new Set([
  'net-osi', // networking track opener
  'cy-linux', // security track opener
  'py-basics', // python track opener
  'lx-cli', // linux track opener
  'cl-concepts', // cloud track opener
]);

export function isDeckFree(deckId) {
  return FREE_DECKS.has(deckId);
}

/** Two showcase labs are free: networking fundamentals + a real Docker container lab.
    Keyed by lab ID (the identifier the /labs/:labId route matches on), not slug. */
export const FREE_LABS = new Set(['net-vlan-001', 'py-basics-001']);

export function isLabFree(labId) {
  return FREE_LABS.has(labId);
}
