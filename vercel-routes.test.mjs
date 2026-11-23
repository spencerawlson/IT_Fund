// Guard for R-05: every client route in src/App.jsx must have a matching
// rewrite in vercel.json's frontend service, and there must be NO catch-all
// rewrite — the old `/(.*)` -> /index.html served the SPA shell with HTTP
// 200 for every unknown path (soft 404s, including /.env and /.git/*).
// Anything without a rewrite falls through to Vercel's real 404
// (public/404.html). Adding a route to App.jsx without its rewrite here
// fails this test, so a deep link can never silently break.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)));

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const appSrc = readFileSync(join(ROOT, 'src', 'App.jsx'), 'utf8');
const sitemap = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');

// Convert a Vercel rewrite source to a RegExp: :param matches one segment,
// :param* matches zero or more segments (including the preceding slash).
function sourceToRegExp(source) {
  let re = source.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  re = re.replace(/\/:[A-Za-z0-9_]+\*/g, '(?:/.*)?');
  re = re.replace(/:[A-Za-z0-9_]+/g, '[^/]+');
  return new RegExp(`^${re}$`);
}

// One concrete sample path per route pattern (params -> 'sample').
function samplePath(route) {
  return route.replace(/:[A-Za-z0-9_]+/g, 'sample');
}

const frontendRewrites = vercel.services?.frontend?.rewrites || [];
const rewriteRes = frontendRewrites.map((r) => sourceToRegExp(r.source));

// SEO Phase 1 (1.2): dynamic routes serve the generic shell, not the home
// page — their rewrites point at /shell.html; every other rewrite still
// points at /index.html.
const DYNAMIC_SHELL_SOURCES = ['/academy/:path*', '/module/:path*', '/labs/:path*', '/missions/:path*'];

function isCovered(path) {
  return rewriteRes.some((re) => re.test(samplePath(path)));
}

describe('vercel frontend rewrites cover every client route (R-05)', () => {
  it('has no catch-all rewrite (the soft-404 source)', () => {
    for (const r of frontendRewrites) {
      expect(r.source).not.toBe('/(.*)');
      expect(r.source).not.toBe('/*');
      expect(r.source).not.toBe('/(.*)?');
      expect(r.destination).toBe(
        DYNAMIC_SHELL_SOURCES.includes(r.source) ? '/shell.html' : '/index.html',
      );
    }
  });

  it('covers every <Route path> in src/App.jsx', () => {
    const routes = [...appSrc.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
    // Sanity: the extractor must actually see the routes, or this test is vacuous.
    expect(routes.length).toBeGreaterThan(20);
    const catchAll = routes.filter((p) => p === '*');
    expect(catchAll).toHaveLength(1);
    const uncovered = routes.filter((p) => p !== '*' && !isCovered(p));
    expect(uncovered).toEqual([]);
  });

  it('covers every sitemap route', () => {
    const sitemapPaths = [...sitemap.matchAll(/<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g)].map(
      (m) => new URL(m[1]).pathname,
    );
    expect(sitemapPaths.length).toBeGreaterThan(10);
    expect(sitemapPaths.filter((p) => !isCovered(p))).toEqual([]);
  });

  it('routes no /api path to a backend service (removed 2026-11-23)', () => {
    // The Vercel backend service was removed: it could never boot without
    // SESSION_SECRET (backend/main.py fail-fast guard, added Nov 11) and no
    // production client ever called it — the bundle calls
    // api.road2cissp.com directly. /api/* on www now falls through to the
    // edge 404 instead of a 500 FUNCTION_INVOCATION_FAILED.
    const api = (vercel.rewrites || []).find((r) => r.source.includes('/api'));
    expect(api).toBeUndefined();
    expect(vercel.services?.backend).toBeUndefined();
  });

  it('ships a static branded 404 page for the edge to serve', () => {
    const file = join(ROOT, 'public', '404.html');
    expect(existsSync(file)).toBe(true);
    const html = readFileSync(file, 'utf8');
    expect(html).toContain('Page Not Found');
    expect(html).toContain('noindex');
    expect(html).toContain('href="/"');
  });
});
