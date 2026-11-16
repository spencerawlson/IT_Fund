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

describe('Landing primary CTA (R-11)', () => {
  // Whole class tokens: 'hover:bg-action-surface-hover' contains the
  // substring 'bg-action-surface', so match tokens, not raw text.
  const classTokens = (attrs) => ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);
  const anchorsOf = (html) => [...html.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)];

  it('has exactly one primary CTA: the hero "Start learning free"', () => {
    const html = renderLanding();
    const primary = anchorsOf(html).filter(([, attrs]) =>
      classTokens(attrs).includes('bg-action-surface'),
    );
    expect(primary).toHaveLength(1);
    expect(primary[0][1]).toContain('href="/signin"');
    expect(primary[0][2]).toContain('Start learning free');
  });

  it('demotes the competing "Create free account" and "Try a lab" actions to secondary', () => {
    const html = renderLanding();
    const competing = anchorsOf(html).filter(
      ([, , inner]) => inner.includes('Create free account') || inner.includes('Try a lab'),
    );
    expect(competing.length).toBeGreaterThanOrEqual(2);
    for (const [, attrs] of competing) {
      expect(classTokens(attrs)).toContain('bg-white/70');
      expect(classTokens(attrs)).not.toContain('bg-action-surface');
    }
  });
});

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

  it('offers a Cookie settings control in the footer (R-04)', () => {
    const html = renderLanding();
    expect(html).toContain('Cookie settings');
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
    // The FAQPage moved to /faq with the rest of the FAQs (2026-11-13) —
    // the homepage graph keeps only WebSite + Organization now.
    expect(graph.some((node) => node['@type'] === 'FAQPage')).toBe(false);
  });
});
