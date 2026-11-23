// SEO Phase 2 (2.4): path pages carry <Seo> (title, description, canonical,
// BreadcrumbList) and unknown ids are noindexed. Same for an unknown module
// slug (the ModuleDetail not-found state previously rendered no <Seo> at all).
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { PathDetail } from './Paths';
import { ModuleDetail } from './Courses';
import { SeoCollectorContext } from '@/components/Seo';
import { getPath } from '@/data/catalog';

function renderRoute(element, location, routePath) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <StaticRouter location={location}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </StaticRouter>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

describe('PathDetail server render (SEO Phase 2)', () => {
  it('renders its own title, description, canonical, and breadcrumbs', () => {
    const path = getPath('networking');
    const { html, seo } = renderRoute(<PathDetail />, '/academy/paths/networking', '/academy/paths/:slug');
    expect(seo.title).toBe(`${path.title} · Career path · Road to CISSP`);
    expect(seo.description).toBe(path.summary);
    expect(seo.path).toBe('/academy/paths/networking');
    expect(seo.robots).toContain('index');
    expect(seo.jsonLd['@graph'][0]['@type']).toBe('BreadcrumbList');
    expect(seo.jsonLd['@graph'][0].itemListElement.map((el) => el.name)).toEqual([
      'Home',
      'Career paths',
      path.title,
    ]);
    expect(html).toContain(path.title);
  });

  it('unknown path: noindexed', () => {
    const { seo } = renderRoute(<PathDetail />, '/academy/paths/no-such-path', '/academy/paths/:slug');
    expect(seo.robots).toBe('noindex');
    expect(seo.title).toContain('not found');
  });
});

describe('ModuleDetail not-found state', () => {
  it('unknown module: noindexed', () => {
    const { seo } = renderRoute(<ModuleDetail />, '/academy/courses/python-automation/nope', '/academy/courses/:courseSlug/:moduleSlug');
    expect(seo.robots).toBe('noindex');
    expect(seo.title).toContain('not found');
  });
});
