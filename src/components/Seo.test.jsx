import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Seo, { SeoCollectorContext, DEFAULT_ROBOTS } from './Seo';
import PageNotFound from '../lib/PageNotFound';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function collect(element) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  renderToString(
    <SeoCollectorContext.Provider value={collector}>
      {element}
    </SeoCollectorContext.Provider>,
  );
  return collector.seo;
}

describe('Seo robots prop (audit F-02: noindex on 404 states)', () => {
  it('registers a noindex robots value when passed one', () => {
    const seo = collect(
      <Seo title="Page not found · Road to CISSP" description="This page does not exist." path="/nope" robots="noindex" />,
    );
    expect(seo.robots).toBe('noindex');
  });

  it('defaults to the site-wide index rule when no robots prop is passed', () => {
    const seo = collect(
      <Seo title="Pricing — Road to CISSP" description="One subscription." path="/pricing" />,
    );
    expect(seo.robots).toBe(DEFAULT_ROBOTS);
    expect(seo.robots).toContain('index');
  });
});

describe('PageNotFound', () => {
  it('renders a noindex Seo tag (soft 404s must not be indexed)', () => {
    const collector = { seo: null, register(data) { this.seo = data; } };
    const queryClient = new QueryClient();
    const html = renderToString(
      <SeoCollectorContext.Provider value={collector}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location="/this-page-does-not-exist-xyz">
            <PageNotFound />
          </StaticRouter>
        </QueryClientProvider>
      </SeoCollectorContext.Provider>,
    );
    expect(collector.seo.robots).toBe('noindex');
    expect(html).toContain('Page Not Found');
  });
});

describe('CourseNotFound', () => {
  it('carries a noindex Seo tag in Courses.jsx', () => {
    // CourseNotFound is module-private, so this guards the source: the same
    // <Seo robots="noindex"> pattern as PageNotFound, in the same file.
    const src = readFileSync(join(ROOT, 'src/pages/academy/Courses.jsx'), 'utf8');
    const notFound = src.slice(src.indexOf('function CourseNotFound()'));
    expect(notFound).toContain('robots="noindex"');
    expect(notFound).toContain('Course not found');
  });
});
