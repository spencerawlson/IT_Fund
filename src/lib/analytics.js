// Consent-gated analytics loader (R-04).
//
// The Plausible + Ventoryn script tags used to live statically in
// index.html, so they loaded on every visit before any choice. They are
// now injected from here, only after the visitor accepts analytics in the
// cookie banner (see src/components/CookieConsent.jsx, src/lib/consent.js).
//
// Both tools are cookieless and collect no personal data (Plausible:
// no cookies, no cross-site tracking; Ventoryn: first-party, no cookies,
// no storage, no personal data) — but they are still third-party scripts,
// so they stay behind the consent gate.
//
// Idempotent: a second call after a successful load is a no-op, so
// StrictMode double-effects and re-accepts can't inject the tags twice.
const PLAUSIBLE_SRC = 'https://plausible.io/js/script.js';
const PLAUSIBLE_DOMAIN = 'road2cissp.com';
const VENTORYN_SRC = 'https://ventoryn.app/v.js';
const VENTORYN_SITE = '418e926be25e251d95badb9e';

let loaded = false;

function inject(doc, { src, ...attrs }) {
  if (doc.querySelector(`script[src="${src}"]`)) return;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = src;
  for (const [key, value] of Object.entries(attrs)) {
    script.setAttribute(key, value);
  }
  doc.head.appendChild(script);
}

/**
 * Inject the analytics tags. `targetDocument` is injectable for tests;
 * defaults to the global document when one exists. Returns true when the
 * tags were (or already had been) injected, false with no document
 * (SSR / prerender — nothing to load into).
 */
export function loadAnalytics(targetDocument) {
  const doc =
    targetDocument ||
    (typeof document !== 'undefined' ? document : undefined);
  if (!doc || !doc.head || typeof doc.createElement !== 'function') return false;
  if (loaded) return true;
  inject(doc, { src: PLAUSIBLE_SRC, 'data-domain': PLAUSIBLE_DOMAIN });
  inject(doc, { src: VENTORYN_SRC, 'data-site': VENTORYN_SITE });
  loaded = true;
  return true;
}

/** Test-only reset for the module-level loaded flag. */
export function __resetAnalyticsForTests() {
  loaded = false;
}
