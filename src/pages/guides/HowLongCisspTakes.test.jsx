import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/AuthContext';
import { ThemeProvider } from '../../components/ThemeProvider';
import { SeoCollectorContext } from '../../components/Seo';
import HowLongCisspTakes from './HowLongCisspTakes';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={ANON_AUTH}>
          <StaticRouter location={path}>
            <HowLongCisspTakes />
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

describe('How long does CISSP take guide page', () => {
  const { html, seo } = renderPage('/guides/how-long-does-cissp-take');

  it('renders with one h1 and guide meta', () => {
    expect(seo.title).toContain('How long does CISSP preparation take?');
    expect(seo.description).toBeTruthy();
    expect(seo.path).toBe('/guides/how-long-does-cissp-take');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('answers the target question directly in the first paragraph', () => {
    const answer = firstParagraphText(html);
    expect(answer).toBeTruthy();
    expect(answer.length).toBeGreaterThanOrEqual(15);
    expect(answer.length).toBeLessThanOrEqual(500);
    expect(answer).toMatch(/three to six months/);
  });

  it('carries Article + FAQPage JSON-LD', () => {
    const types = seo.jsonLd['@graph'].map((n) => n['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');
    const faq = seo.jsonLd['@graph'].find((n) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(3);
  });

  it('states the verified ISC2 exam facts', () => {
    expect(html).toContain('100–150 items');
    expect(html).toContain('3 hours');
    expect(html).toContain('700 out of 1,000');
    expect(html).toContain('five years of cumulative paid work');
    expect(html).toContain('Associate of ISC2');
    expect(html).toContain('U.S. $749');
    expect(html).toContain('https://www.isc2.org/register-for-exam/isc2-exam-pricing');
  });

  it('states the verified retake policy and links the plan pages', () => {
    expect(html).toContain('30 test-free days');
    expect(html).toContain('four attempts in a 12-month period');
    expect(html).toContain('href="/academy/roadmap"');
    expect(html).toContain('href="/academy/exam"');
    expect(html).toContain('href="/labs"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/faq"');
  });
});
