import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { SeoCollectorContext } from '../components/Seo';
import Reviews from './Reviews';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location={path}>
            <Reviews />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('Reviews page', () => {
  const { html, seo } = renderPage('/reviews');

  it('renders with one h1 and reviews meta', () => {
    expect(seo.title).toBe('Reviews · Road to CISSP');
    expect(seo.description).toBe('Learner reviews of Road to CISSP — hands-on labs, lessons, and exam prep.');
    expect(seo.path).toBe('/reviews');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('carries a CollectionPage JSON-LD', () => {
    expect(seo.jsonLd['@type']).toBe('CollectionPage');
    expect(seo.jsonLd.url).toBe('https://www.road2cissp.com/reviews');
  });

  it('opens with a direct summary paragraph', () => {
    const firstP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    expect(firstP).not.toBeNull();
    const text = firstP[1].replace(/<[^>]+>/g, '');
    expect(text.length).toBeGreaterThanOrEqual(15);
    expect(text.length).toBeLessThanOrEqual(500);
  });

  it('renders the loading state on the server render (fetch runs client-side only)', () => {
    // The fetch-dependent list is not asserted against the network: the
    // server render shows the loading state, and the client then shows the
    // approved reviews or the empty state.
    expect(html).toContain('Loading reviews…');
  });

  it('shows a sign-in prompt, not the form, to signed-out visitors', () => {
    expect(html).toContain('Sign in');
    expect(html).not.toContain('Leave a review');
    expect(html).not.toContain('id="review-body"');
  });
});
