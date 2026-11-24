import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/AuthContext';
import { ThemeProvider } from '../../components/ThemeProvider';
import { SeoCollectorContext } from '../../components/Seo';
import BestSelfPacedCissp from './BestSelfPacedCissp';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location={path}>
            <BestSelfPacedCissp />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('Best self-paced CISSP courses guide', () => {
  const { html, seo } = renderPage('/guides/best-self-paced-cissp-courses');

  it('renders with one h1 and guide meta', () => {
    expect(seo.title).toContain('Best self-paced CISSP courses');
    expect(seo.description).toBeTruthy();
    expect(seo.path).toBe('/guides/best-self-paced-cissp-courses');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('opens with a direct answer paragraph (15–500 chars, per check-prerender)', () => {
    const firstP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    expect(firstP).toBeTruthy();
    const text = firstP[1].replace(/<[^>]+>/g, '').trim();
    expect(text.length).toBeGreaterThan(15);
    expect(text.length).toBeLessThanOrEqual(500);
  });

  it('names all five competitors and states no invented prices', () => {
    for (const name of ['Udemy', 'Cybrary', 'Infosec Institute', 'Destination Certification', 'InfosecTrain']) {
      expect(html).toContain(name);
    }
    // The two unverifiable prices are never published: Udemy has no dollar
    // figure on the page, and InfosecTrain shows "quote on application".
    expect(html).toContain('varies by sale');
    expect(html).toContain('Quote on application');
  });

  it('carries Article + FAQPage JSON-LD', () => {
    const graph = seo.jsonLd['@graph'];
    expect(graph.map((n) => n['@type']).sort()).toEqual(['Article', 'FAQPage']);
    const faq = graph.find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBe(4);
  });
});
