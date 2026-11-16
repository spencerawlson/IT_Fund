// Cookie / analytics consent (R-04), modelled on Farelune's consent-gated
// partner-script pattern: nothing non-essential loads before the visitor
// chooses, and refusing is one click, as easy as accepting.
//
// Storage: localStorage (the choice itself is not a tracker — it never
// leaves the browser). Values: 'accepted' | 'declined'; null = undecided.
// The banner shows while the choice is undecided, and again whenever the
// visitor re-opens it from a "Cookie settings" control.
//
// SSR-safe: every read guards `window`/`localStorage`, so the prerender
// (Node, no browser) treats consent as undecided and renders the banner
// into the static HTML.
export const CONSENT_KEY = 'r2c-consent';
export const CONSENT_CHANGE_EVENT = 'r2c-consent-change';
export const CONSENT_OPEN_EVENT = 'r2c-consent-open';

export function readConsent() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(accepted) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined');
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  } catch {
    // Storage unavailable (private mode, blocked): the choice just doesn't
    // persist, and the banner shows again next visit. Nothing breaks.
  }
}

/** Re-open the banner from a "Cookie settings" control. */
export function openConsentSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
