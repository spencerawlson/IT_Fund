// Ventoryn campaign attribution: captures the vtn_ tag from an
// incoming signed link (utm_content=vtn_...) and carries it through
// to Stripe Checkout (see Pricing.jsx + backend/billing.py). First
// touch only — a tag already stored is never overwritten by a later
// visit through a different campaign. Road to CISSP cannot verify
// the tag itself (only Ventoryn holds that key); it is a pure
// pass-through, validated here for shape only.

export const ATTRIBUTION_STORAGE_KEY = 'rtc_attribution_tag';
export const ATTRIBUTION_TAG_PATTERN = /^vtn_[A-Za-z0-9_.-]{1,120}$/;

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // private mode / disabled storage can throw on access
  }
}

/**
 * Call once per page load. `search` defaults to the current URL's
 * query string. Never throws — attribution is best-effort and must
 * never break navigation.
 */
export function captureAttributionTag(search, storage) {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    if (store.getItem(ATTRIBUTION_STORAGE_KEY)) return; // first touch only
    const qs = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const tag = new URLSearchParams(qs).get('utm_content');
    if (tag && ATTRIBUTION_TAG_PATTERN.test(tag)) {
      store.setItem(ATTRIBUTION_STORAGE_KEY, tag);
    }
  } catch {
    // best-effort
  }
}

/** The captured tag, or null. Never throws. */
export function getAttributionTag(storage) {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    return store.getItem(ATTRIBUTION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}
