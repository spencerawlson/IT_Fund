import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui-glass';
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  readConsent,
  writeConsent,
} from '@/lib/consent';
import { loadAnalytics } from '@/lib/analytics';

// Cookie consent banner + preference control (R-04), modelled on Farelune's
// consent-gated pattern: no non-essential tracker loads before the visitor
// chooses, and refusing is one click, as easy as accepting.
//
// Rendered at the App root so it shows on every page. The choice is stored
// in localStorage (never leaves the browser) and re-openable from any
// "Cookie settings" control (landing + privacy footers).
//
// SSR: the first render (server and client) assumes undecided, so the
// banner is in the prerendered HTML and there is no hydration mismatch.
// The stored choice is read in an effect after mount; a returning visitor
// who already chose sees the banner hide then. Accepting loads the
// analytics tags (Plausible + Ventoryn, both cookieless) via loadAnalytics.
export default function CookieConsent() {
  const [consent, setConsent] = useState(null);
  const [reopened, setReopened] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(true);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setAnalyticsOn(stored !== 'declined');
    if (stored === 'accepted') loadAnalytics();
    const onOpen = () => {
      setConsent(readConsent());
      setAnalyticsOn(readConsent() !== 'declined');
      setShowPreferences(false);
      setReopened(true);
    };
    const onChange = () => setConsent(readConsent());
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    };
  }, []);

  if (consent !== null && !reopened) return null;

  function choose(accepted) {
    writeConsent(accepted);
    setConsent(accepted ? 'accepted' : 'declined');
    setReopened(false);
    // A declined-then-reloaded page never had the tags; a tag loaded in
    // this session can't be unloaded, so a withdrawal reloads to honour it.
    if (accepted) loadAnalytics();
    else if (document.querySelector('script[src*="plausible.io"], script[src*="ventoryn.app"]')) {
      window.location.reload();
    }
  }

  function savePreferences() {
    writeConsent(analyticsOn);
    setConsent(analyticsOn ? 'accepted' : 'declined');
    setReopened(false);
    if (analyticsOn) loadAnalytics();
    else if (document.querySelector('script[src*="plausible.io"], script[src*="ventoryn.app"]')) {
      window.location.reload();
    }
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      data-cookie-consent="banner"
      className="cookie-consent-banner fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-card glass-2 p-5 shadow-lg sm:inset-x-6 sm:bottom-6"
    >
      <h2 id="cookie-consent-title" className="text-body font-semibold text-ink-1">
        Cookies &amp; analytics
      </h2>
      <p className="mt-2 text-small leading-relaxed text-ink-2">
        We count visits with Plausible Analytics and Ventoryn Analytics — both
        cookieless, neither tracks you across sites. Nothing loads until you
        choose: accept and we count your visit, decline and we measure
        nothing. Read more in our{' '}
        <a href="/privacy" className="font-semibold text-ink-1 underline">
          Privacy Policy
        </a>
        .
      </p>
      {showPreferences ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-small text-ink-2">
            <input
              type="checkbox"
              checked={analyticsOn}
              onChange={(e) => setAnalyticsOn(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-violet-700"
            />
            <span>
              <span className="font-semibold text-ink-1">Anonymous analytics</span>
              {' — '}Plausible + Ventoryn visit counts, no cookies, no personal data.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={savePreferences}>Save preferences</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPreferences(false)}>Back</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => choose(true)}>Accept analytics</Button>
          <Button size="sm" variant="secondary" onClick={() => choose(false)}>Decline</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPreferences(true)}>
            Manage preferences
          </Button>
        </div>
      )}
    </section>
  );
}
