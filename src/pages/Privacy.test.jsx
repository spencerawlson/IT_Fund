import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '../components/ThemeProvider';
import { SeoCollectorContext } from '../components/Seo';
import Privacy from './Privacy';
import Terms from './Terms';

function renderPage(Page, path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <StaticRouter location={path}>
          <Page />
        </StaticRouter>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('Privacy page (audit F-06)', () => {
  const { html, seo } = renderPage(Privacy, '/privacy');

  it('renders with a Privacy title and one h1', () => {
    expect(seo.title).toContain('Privacy Policy');
    expect(seo.description).toBeTruthy();
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('covers only what the codebase does', () => {
    expect(html).toContain('Google or GitHub');
    expect(html).toContain('HttpOnly session cookie');
    expect(html).toContain('Stripe Checkout');
    expect(html).toContain('never touch this site');
    expect(html).toContain('Plausible Analytics');
    expect(html).toContain('do not sell your personal data');
    expect(html).toContain('no self-serve way to delete your account');
  });

  it('invents no support email or contact channel', () => {
    expect(html).not.toMatch(/support@|hello@|contact@/);
  });
});

describe('Terms page (audit F-06)', () => {
  const { html, seo } = renderPage(Terms, '/terms');

  it('renders with a Terms title and one h1', () => {
    expect(seo.title).toContain('Terms of Service');
    expect(seo.description).toBeTruthy();
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('covers the plan, cancellation, refunds, free tier, and non-affiliation', () => {
    expect(html).toContain('$19 per month');
    expect(html).toContain('Stripe Customer Portal');
    expect(html).toContain('end of the billing period');
    expect(html).toContain('5 sample lessons, 57 flashcards');
    expect(html).toContain('first subscription');
    expect(html).toContain('within 14 days');
    expect(html).toContain('past due');
    expect(html).toContain('7 days');
    expect(html).toContain('personal study');
    expect(html).toContain('not a prediction');
    expect(html).toContain('700/1000 scaled score');
    expect(html).toContain('not affiliated with, endorsed by, or sponsored by ISC2 or CompTIA');
  });

  it('publishes the real support address (refund requests) and no other address', () => {
    // The audit's "no invented contact channel" rule still holds — the only
    // address on the page is the real one Spencer decided (2026-11-11).
    expect(html).toContain('support@road2cissp.com');
    const addresses = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    expect(new Set(addresses)).toEqual(new Set(['support@road2cissp.com']));
  });
});
