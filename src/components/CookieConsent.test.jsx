import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import CookieConsent from './CookieConsent';

// Server render (no window): consent is undecided, so the banner is in the
// HTML — this is also what the prerender ships, which is what the curl
// retest greps for. Effects never run under renderToString.
function renderBanner() {
  return renderToString(<CookieConsent />);
}

describe('CookieConsent banner (R-04)', () => {
  it('renders the banner with the consent marker for the curl retest', () => {
    const html = renderBanner();
    expect(html).toContain('data-cookie-consent="banner"');
    expect(html).toContain('cookie-consent-banner');
    expect(html).toContain('Cookies &amp; analytics');
  });

  it('offers accept and decline as equal one-click choices, plus preferences', () => {
    const html = renderBanner();
    expect(html).toContain('Accept analytics');
    expect(html).toContain('Decline');
    expect(html).toContain('Manage preferences');
    expect(html).toContain('Privacy Policy');
  });

  it('ships NO analytics script tag — the tags load only after consent', () => {
    const html = renderBanner();
    expect(html).not.toContain('plausible.io');
    expect(html).not.toContain('ventoryn.app/v.js');
    expect(html).not.toContain('<script');
  });
});

describe('CookieConsent banner in the native app', () => {
  beforeEach(() => {
    // The banner must never appear in the Capacitor app: Apple rejects
    // apps that show a cookie prompt without App Tracking Transparency
    // (Guideline 5.1.2(i); Kay Ayiti v1.0, Nov 23, 2026).
    globalThis.Capacitor = { isNativePlatform: () => true };
  });

  afterEach(() => {
    delete globalThis.Capacitor;
  });

  it('renders nothing when running natively', () => {
    const html = renderBanner();
    expect(html).not.toContain('data-cookie-consent="banner"');
    expect(html).not.toContain('Cookies &amp; analytics');
    expect(html).not.toContain('Accept analytics');
  });
});
