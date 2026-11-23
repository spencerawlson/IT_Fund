// SEO Phase 2 (1.5): the live check's dynamic-route coverage flipped with
// the prerender. The course, module, and free-lesson dynamics are IN the
// sitemap now, so they run through the distinct-body / unique-title /
// self-canonical checks with everything else; only the premium lesson still
// serves the shell (no public excerpt yet), and it must stay out of the
// sitemap. This test asserts that split without fetching the live site.
import { describe, it, expect } from 'vitest';
import { sitemapRoutes, DYNAMIC_SHELL_ROUTES } from './live-check.mjs';

describe('live-check dynamic coverage (SEO Phase 2)', () => {
  const routes = sitemapRoutes();

  it('covers the prerendered dynamics through the sitemap: a course, a module, a free lesson', () => {
    expect(routes).toContain('/academy/courses/cybersecurity-operations');
    expect(routes).toContain('/academy/courses/cybersecurity-operations/beginner');
    expect(routes).toContain('/academy/lessons/net-osi');
  });

  it('keeps exactly one shell route: the premium lesson, which is not in the sitemap', () => {
    expect(DYNAMIC_SHELL_ROUTES).toEqual(['/academy/lessons/net-ports']);
    for (const route of DYNAMIC_SHELL_ROUTES) {
      expect(routes, `${route} must not be in the sitemap`).not.toContain(route);
    }
  });

  it('covers 121 sitemap routes', () => {
    expect(routes).toHaveLength(121);
  });
});
