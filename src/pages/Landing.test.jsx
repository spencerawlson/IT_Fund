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
  it('links to /pricing from the footer only — the header was trimmed for simplicity', () => {
    const html = renderLanding();
    const pricingLinks = html.match(/href="\/pricing"/g) || [];
    expect(pricingLinks).toHaveLength(1);
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

describe('Landing simple structure (skillsbuild-style)', () => {
  it('keeps the hero H1 and both CTAs', () => {
    const html = renderLanding();
    expect(html).toContain('Learn IT by doing it — all the way to CISSP.');
    expect(html).toContain('Start learning free');
    expect(html).toContain('Try a lab');
    // Eyebrow and signup note removed (the closing band carries the sign-in copy).
    expect(html).not.toContain('IT fundamentals → cloud expert');
    expect(html).not.toContain('Sign up with Google or GitHub — no password needed.');
  });

  it('keeps the header to logo + Sign in + Create free account', () => {
    const html = renderLanding();
    const header = (html.match(/<header[\s\S]*?<\/header>/) || [])[0] || '';
    expect(header).toContain('Road to CISSP');
    expect(header).toContain('Sign in');
    expect(header).toContain('Create free account');
    expect(header).not.toContain('href="/labs"');
    expect(header).not.toContain('href="/pricing"');
  });

  it('shows the proof as one line, not a stats grid', () => {
    const html = renderLanding();
    expect(html).not.toContain('aria-label="Highlights"');
    expect(html).toContain('flashcards ·');
    expect(html).toContain('hands-on labs ·');
    expect(html).toContain('8 CISSP domains ·');
    expect(html).toContain('5 timed exam simulators');
  });

  it('keeps all 7 certs on the road', () => {
    const html = renderLanding();
    for (const code of ['SY0-701', 'N10-009', 'Linux+', 'CS0-004', 'SAA-C03', 'SCS-C03', 'CISSP']) {
      expect(html).toContain(code);
    }
    expect(html).toContain('Plus skills tracks:');
  });

  it("has the Who it's for cards and no features grid, how-it-works, or testimonials", () => {
    const html = renderLanding();
    expect(html).toContain('Who it&#x27;s for'); // React SSR escapes the apostrophe
    expect(html).toContain('Starting out');
    expect(html).toContain('Working in IT');
    expect(html).toContain('Switching careers');
    expect(html).not.toContain('Everything you need, in one place');
    expect(html).not.toContain('How it works');
    expect(html).not.toContain('Real stories');
  });
});

describe('Landing background glyphs (blur)', () => {
  it('blurs the scattered-glyphs layer so the outlines read as soft texture', () => {
    const html = renderLanding();
    const glyphs = (html.match(/<div[^>]*data-testid="landing-glyphs"[^>]*>/) || [])[0] || '';
    expect(glyphs).toContain('filter:blur(2px)');
    // The blur lives on the one layer wrapper, not on each glyph.
    expect(html.match(/filter:blur\(2px\)/g) || []).toHaveLength(1);
    // Scatter, colours, opacities unchanged — the glyphs are still there.
    expect((html.match(/viewBox="-26 -26 52 52"/g) || []).length).toBe(170);
  });
});

describe('Landing seats counter (limited seats)', () => {
  it('renders no counter under SSR — the live count arrives client-side, never hardcoded', () => {
    const html = renderLanding();
    expect(html).not.toContain('seats taken');
    expect(html).not.toContain('seats are taken');
    expect(html).not.toContain('data-testid="seats-counter"');
    expect(html).not.toContain('10,000');
  });

  it('keeps the signup CTAs enabled under SSR (seats state unknown until the fetch resolves)', () => {
    const html = renderLanding();
    expect(html).not.toContain('aria-disabled="true"');
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

describe('Landing header sign-in (mobile, 2026-11-23)', () => {
  // The header Sign in was `hidden sm:inline-flex` unless seats were full,
  // so phones saw no Sign in anywhere in the header.
  const headerHtml = () => {
    const html = renderLanding();
    return (html.match(/<header[\s\S]*?<\/header>/) || [])[0] || '';
  };
  const anchorsOf = (html) => [...html.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)];
  const classTokens = (attrs) => ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);

  it('shows "Sign in" on all sizes — never hidden on phones', () => {
    const header = headerHtml();
    const signIn = anchorsOf(header).find(([, , inner]) => inner.trim() === 'Sign in');
    expect(signIn).toBeDefined();
    expect(classTokens(signIn[1])).not.toContain('hidden');
    expect(classTokens(signIn[1])).toContain('inline-flex');
  });

  it('shortens the signup label to "Sign up" on phones, full label from sm up', () => {
    const header = headerHtml();
    expect(header).toContain('>Sign up<');
    expect(header).toContain('Create free account');
    expect(header).toContain('sm:hidden');
    expect(header).toContain('hidden sm:inline');
  });
});
