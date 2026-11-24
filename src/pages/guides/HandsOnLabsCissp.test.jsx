import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/AuthContext';
import { ThemeProvider } from '../../components/ThemeProvider';
import { SeoCollectorContext } from '../../components/Seo';
import HandsOnLabsCissp from './HandsOnLabsCissp';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location={path}>
            <HandsOnLabsCissp />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

function firstParagraphText(html) {
  const m = html.match(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

describe('Hands-on labs guide page', () => {
  const { html, seo } = renderPage('/guides/hands-on-labs-cissp');

  it('renders with one h1 and guide meta', () => {
    expect(seo.title).toContain('Do hands-on labs help with CISSP preparation?');
    expect(seo.description).toBeTruthy();
    expect(seo.path).toBe('/guides/hands-on-labs-cissp');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('answers the target question directly in the first paragraph', () => {
    const answer = firstParagraphText(html);
    expect(answer).toBeTruthy();
    expect(answer.length).toBeGreaterThanOrEqual(15);
    expect(answer.length).toBeLessThanOrEqual(500);
    expect(answer).toMatch(/^Yes/);
  });

  it('carries Article + FAQPage JSON-LD', () => {
    const types = seo.jsonLd['@graph'].map((n) => n['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');
    const faq = seo.jsonLd['@graph'].find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(3);
  });

  it('links to labs, pricing, roadmap, exam, and FAQ', () => {
    expect(html).toContain('href="/labs"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/academy/roadmap"');
    expect(html).toContain('href="/academy/exam"');
    expect(html).toContain('href="/faq"');
  });

  it('names the lab split and the real terminals', () => {
    expect(html).toContain('31 simulated');
    expect(html).toContain('30 labs');
    expect(html).toContain('Cisco IOS');
    expect(html).toContain('Linux triage');
    expect(html).toContain('Python automation');
  });
});
