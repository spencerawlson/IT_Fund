import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '../components/ThemeProvider';
import { SeoCollectorContext } from '../components/Seo';
import Contact, { SUPPORT_EMAIL } from './Contact';

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

describe('Contact page', () => {
  const { html, seo } = renderPage(Contact, '/contact');

  it('renders with a Contact title and one h1', () => {
    expect(seo.title).toContain('Contact');
    expect(seo.description).toBeTruthy();
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('publishes the real support address as a mailto link — and no other address', () => {
    expect(SUPPORT_EMAIL).toBe('support@road2cissp.com');
    expect(html).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(html).toContain(SUPPORT_EMAIL);
    const addresses = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    expect(new Set(addresses)).toEqual(new Set([SUPPORT_EMAIL]));
  });

  it('has no contact form (a dead form is worse than a mailto)', () => {
    expect(html).not.toMatch(/<form/);
  });

  it('links to the pricing FAQ and the Terms refund policy', () => {
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('Terms');
  });
});
