import React from 'react';
import { describe, it, expect } from 'vitest';
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
