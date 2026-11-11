import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { SeoCollectorContext } from '../components/Seo';
import Landing from './Landing';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderLanding() {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location="/">
            <Landing />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return html;
}

describe('Landing navigation (audit F-05)', () => {
  it('links to /pricing from the header and the footer', () => {
    const html = renderLanding();
    const pricingLinks = html.match(/href="\/pricing"/g) || [];
    expect(pricingLinks.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Pricing');
  });

  it('links to the Privacy and Terms pages from the footer', () => {
    const html = renderLanding();
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });
});

const SOCIAL_URLS = [
  'https://www.youtube.com/@road2cissp',
  'https://www.facebook.com/profile.php?id=61596190452892',
  'https://x.com/road2cissp',
  'https://www.instagram.com/road2cissp/',
  'https://www.linkedin.com/company/road2cissp',
];

function renderLandingWithSeo() {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location="/">
            <Landing />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('Landing social profiles', () => {
  it('links all five social profiles from the footer', () => {
    const { html } = renderLandingWithSeo();
    for (const url of SOCIAL_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
    expect(html).toContain('Follow us:');
  });

  it('declares all five profiles in the Organization sameAs JSON-LD', () => {
    const { seo } = renderLandingWithSeo();
    const graph = seo.jsonLd['@graph'];
    expect(Array.isArray(graph)).toBe(true);
    const org = graph.find((node) => node['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org.sameAs).toEqual(SOCIAL_URLS);
    // The FAQPage stays in the graph alongside the new nodes.
    expect(graph.some((node) => node['@type'] === 'FAQPage')).toBe(true);
  });
});
