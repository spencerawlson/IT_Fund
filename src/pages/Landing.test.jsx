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
