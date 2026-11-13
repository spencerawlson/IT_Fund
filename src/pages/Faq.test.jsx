import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '../components/ThemeProvider';
import { SeoCollectorContext } from '../components/Seo';
import Faq from './Faq';
import { FAQ_GROUPS, ALL_FAQS } from '../data/faqs';

function renderPage(path) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <StaticRouter location={path}>
          <Faq />
        </StaticRouter>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('FAQ page', () => {
  const { html, seo } = renderPage('/faq');

  it('renders with one h1 and FAQ meta', () => {
    expect(seo.title).toContain('Frequently asked questions');
    expect(seo.description).toBeTruthy();
    expect(seo.path).toBe('/faq');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('carries one FAQPage JSON-LD with every consolidated entry', () => {
    expect(seo.jsonLd['@type']).toBe('FAQPage');
    expect(seo.jsonLd.mainEntity).toHaveLength(ALL_FAQS.length);
    expect(ALL_FAQS.length).toBe(52);
  });

  it('has no duplicate question+answer pairs in the consolidated data', () => {
    const keys = ALL_FAQS.map((f) => `${f.q}\n${f.a}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('renders every consolidated question the expected number of times', () => {
    // Most questions render once; same-question-different-answer pairs
    // (e.g. "Do I need to install anything?", "How does the practice exam
    // work?") render once per distinct answer.
    const expected = new Map();
    for (const { q } of ALL_FAQS) expected.set(q, (expected.get(q) ?? 0) + 1);
    for (const [q, n] of expected) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (html.match(new RegExp(`<h3[^>]*>${escaped}</h3>`, 'g')) || []).length;
      expect(count, `question renders ${n}x: ${q}`).toBe(n);
    }
  });

  it('renders all ten groups with anchor links', () => {
    expect(FAQ_GROUPS).toHaveLength(10);
    const esc = (s) => s.replace(/&/g, '&amp;');
    for (const g of FAQ_GROUPS) {
      expect(html).toContain(`href="#${g.id}"`);
      expect(html).toContain(esc(g.title));
    }
  });

  it('renders the search box', () => {
    expect(html).toContain('id="faq-search"');
    expect(html).toContain('Search questions');
  });

  it('keeps the shared practice-exam answers to one entry each', () => {
    const pause = ALL_FAQS.filter((f) => f.q === 'Can I pause the exam?');
    const finish = ALL_FAQS.filter((f) => f.q === 'What happens after I finish?');
    expect(pause).toHaveLength(1);
    expect(finish).toHaveLength(1);
  });

  it('keeps same-question-different-answer pairs as separate entries', () => {
    const install = ALL_FAQS.filter((f) => f.q === 'Do I need to install anything?');
    expect(install).toHaveLength(2);
    expect(install[0].a).not.toBe(install[1].a);
  });

  it('links to the FAQ page from the footer and to contact for unanswered questions', () => {
    expect(html).toContain('href="/faq"');
    expect(html).toContain('href="/contact"');
  });
});
