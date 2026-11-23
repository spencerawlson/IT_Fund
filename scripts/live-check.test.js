// SEO Phase 2 (1.5) + lesson excerpts (decision (b)): the live check's
// dynamic-route coverage flipped with the prerender. The course, module, and
// lesson dynamics are IN the sitemap now, so they run through the
// distinct-body / unique-title / self-canonical checks with everything else;
// no dynamic route serves the shell anymore — the premium lesson has a public
// excerpt now (overview first paragraph), so it prerenders as a real page.
// This test asserts that split without fetching the live site.
import { describe, it, expect } from 'vitest';
import { sitemapRoutes, DYNAMIC_SHELL_ROUTES } from './live-check.mjs';

describe('live-check dynamic coverage (SEO Phase 2 + excerpts)', () => {
  const routes = sitemapRoutes();

  it('covers the prerendered dynamics through the sitemap: a course, a module, a free lesson, a premium lesson', () => {
    expect(routes).toContain('/academy/courses/cybersecurity-operations');
    expect(routes).toContain('/academy/courses/cybersecurity-operations/beginner');
    expect(routes).toContain('/academy/lessons/net-osi');
    expect(routes).toContain('/academy/lessons/net-ports');
  });

  it('keeps no shell routes: every lesson is in the sitemap now', () => {
    expect(DYNAMIC_SHELL_ROUTES).toEqual([]);
  });

  it('covers 338 sitemap routes', () => {
    expect(routes).toHaveLength(338);
  });
});
