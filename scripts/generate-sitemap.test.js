// SEO Phase 2 (2.2): the generated sitemap lists exactly what is
// prerendered — 19 static + 21 courses + 63 modules + 13 paths + the 5 free
// lessons — and nothing that isn't (no premium lessons, no track redirects,
// no player routes).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectSitemapUrls } from './generate-sitemap.mjs';
import { freeLessonContent } from '../src/data/content-public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.road2cissp.com';

const isCourse = (loc) => /^https:\/\/www\.road2cissp\.com\/academy\/courses\/[^/]+$/.test(loc);
const isModule = (loc) => /^https:\/\/www\.road2cissp\.com\/academy\/courses\/[^/]+\/[^/]+$/.test(loc);
const isPath = (loc) => loc.startsWith(`${SITE}/academy/paths/`);
const isLesson = (loc) => loc.startsWith(`${SITE}/academy/lessons/`);
const isDynamic = (loc) => isCourse(loc) || isModule(loc) || isPath(loc) || isLesson(loc);

describe('generate-sitemap (SEO Phase 2)', () => {
  const urls = collectSitemapUrls();
  const locs = urls.map((u) => u.loc);

  it('lists 121 URLs: 19 static + 21 courses + 63 modules + 13 paths + 5 free lessons', () => {
    expect(urls).toHaveLength(121);
    expect(locs.filter((l) => !isDynamic(l))).toHaveLength(19);
    expect(locs.filter(isCourse)).toHaveLength(21);
    expect(locs.filter(isModule)).toHaveLength(63);
    expect(locs.filter(isPath)).toHaveLength(13);
    expect(locs.filter(isLesson)).toHaveLength(5);
  });

  it('lists exactly the free lessons — no premium lesson URL', () => {
    const lessonIds = locs.filter(isLesson).map((l) => l.split('/').pop()).sort();
    expect(lessonIds).toEqual(Object.keys(freeLessonContent).sort());
  });

  it('lists no track URLs (they redirect to the course page) and no player routes', () => {
    for (const loc of locs) {
      expect(loc, `track URL in sitemap: ${loc}`).not.toMatch(/\/academy\/[^/]+\/lesson\//);
      expect(loc, `player URL in sitemap: ${loc}`).not.toMatch(/\/(deck|boss)\//);
    }
    // Every /academy/* URL is a course, module, path, lesson, or one of the
    // static academy pages (/academy/courses, /academy/paths, /academy/roadmap…).
    const staticAcademy = ['/academy/courses', '/academy/paths', '/academy/roadmap', '/academy/badges', '/academy/exam'];
    for (const loc of locs.filter((l) => l.includes('/academy/'))) {
      const path = new URL(loc).pathname;
      expect(isDynamic(loc) || staticAcademy.includes(path), `unexpected academy URL: ${loc}`).toBe(true);
    }
  });

  it('has no duplicates, all on the www host, with YYYY-MM-DD lastmods', () => {
    expect(new Set(locs).size).toBe(locs.length);
    for (const { loc, lastmod, changefreq } of urls) {
      expect(loc.startsWith(`${SITE}/`)).toBe(true);
      expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['weekly', 'monthly', 'yearly']).toContain(changefreq);
    }
  });

  it('carries the static entries over with their existing lastmods (not the build date)', () => {
    const byLoc = new Map(urls.map((u) => [u.loc, u]));
    expect(byLoc.get(`${SITE}/pricing`).lastmod).toBe('2026-11-13');
    expect(byLoc.get(`${SITE}/practice`).lastmod).toBe('2026-11-07');
  });

  it('stamps dynamic routes with the content export date', () => {
    const generatedAt = JSON.parse(readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8')).generatedAt.slice(0, 10);
    for (const { loc, lastmod } of urls.filter((u) => isDynamic(u.loc))) {
      expect(lastmod, loc).toBe(generatedAt);
    }
  });

  it('is deterministic: two collections are identical', () => {
    expect(collectSitemapUrls()).toEqual(urls);
  });
});
