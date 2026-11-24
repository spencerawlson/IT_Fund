import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/AuthContext';
import { ThemeProvider } from '../../components/ThemeProvider';
import { SeoCollectorContext } from '../../components/Seo';
import HowToChooseCissp from './HowToChooseCissp';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location={path}>
            <HowToChooseCissp />
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

describe('How to choose a CISSP course guide page', () => {
  const { html, seo } = renderPage('/guides/how-to-choose-cissp-course');

  it('renders with one h1 and guide meta', () => {
    expect(seo.title).toContain('How to choose a CISSP online course');
    expect(seo.description).toBeTruthy();
    expect(seo.path).toBe('/guides/how-to-choose-cissp-course');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('answers the target question directly in the first paragraph', () => {
    const answer = firstParagraphText(html);
    expect(answer).toBeTruthy();
    expect(answer.length).toBeGreaterThanOrEqual(15);
    expect(answer.length).toBeLessThanOrEqual(500);
    expect(answer).toMatch(/Start with how you actually learn/);
  });

  it('carries Article + FAQPage JSON-LD', () => {
    const types = seo.jsonLd['@graph'].map((n) => n['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');
    const faq = seo.jsonLd['@graph'].find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(3);
  });

  it('names competitors fairly and links the checklist pages', () => {
    for (const name of ['Udemy', 'Cybrary', 'Infosec Institute', 'Destination Certification', 'InfosecTrain']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/academy/roadmap"');
    expect(html).toContain('href="/academy/exam"');
    expect(html).toContain('href="/guides/hands-on-labs-cissp"');
    expect(html).toContain('href="/guides/how-long-does-cissp-take"');
  });

  it('renders the eight-item buyer checklist', () => {
    expect(html).toContain('Buyer’s checklist');
    expect(html).toContain('free tier you can try before paying');
    expect(html).toContain('ISC2 exam fee separate');
  });
});
