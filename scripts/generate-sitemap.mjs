// Generate public/sitemap.xml from the catalogue (SEO Phase 2, 2.2).
//
// The sitemap used to be hand-maintained (19 URLs, stale lastmods). This
// script derives every URL from the data that also drives the site, so the
// sitemap can never drift from what is actually prerendered:
//
//   19 static routes — carried over from the current sitemap.xml with their
//      existing lastmod/changefreq/priority (their content dates are not
//      tracked anywhere else; if a static page's content changes, update its
//      lastmod here by hand in the same commit).
//   21 course pages  — /academy/courses/<slug>
//   63 module pages  — /academy/courses/<slug>/<beginner|intermediate|advanced>
//   13 path pages    — /academy/paths/<slug>
//  222 lesson pages  — /academy/lessons/<id> (every lesson has a public
//      excerpt now — the overview's first paragraph, decision (b) — so
//      every lesson page prerenders as a real article, free and premium)
//   ───────────────
//  343 URLs total.
//
// Deliberately NOT included:
//   - Track URLs (/academy/:trackId). AcademyTrack redirects to the course
//     page; redirect URLs do not belong in a sitemap.
//   - Player routes (/academy/:trackId/lesson/:deckId, boss, flashcard).
//     They carry <Seo robots="noindex"> and are never indexed.
//
// lastmod for dynamic routes comes from backend/data/content.json's
// generatedAt (the content export date). Only the date is read from that
// file — no lesson content is ever emitted here.
//
// The script is run by `npm run build` BEFORE prerender (prerender reads
// the sitemap to know what to render), and its output is committed, like
// src/data/content-public.js: tests read the committed file. Regeneration is
// idempotent: the static entries are re-parsed from the generated file and
// the dynamic ones are rebuilt from the catalogue.
//
// Usage: node scripts/generate-sitemap.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COURSE_META } from '../src/data/catalog/courses.js';
import { PATHS } from '../src/data/catalog/paths.js';
import { tracks, lessonExcerpts } from '../src/data/content-public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.road2cissp.com';

// A sitemap entry is dynamic (rebuilt from the catalogue every run) when it
// matches one of these; everything else is a static entry carried over.
const DYNAMIC = [
  /^https:\/\/www\.road2cissp\.com\/academy\/courses\/[^/]+(\/[^/]+)?$/,
  /^https:\/\/www\.road2cissp\.com\/academy\/paths\/[^/]+$/,
  /^https:\/\/www\.road2cissp\.com\/academy\/lessons\/[^/]+$/,
];

function parseEntries(xml) {
  const entries = [];
  for (const [, body] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const tag = (name) => {
      const m = body.match(new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`));
      return m ? m[1] : null;
    };
    const loc = tag('loc');
    const lastmod = tag('lastmod');
    const changefreq = tag('changefreq');
    if (!loc || !lastmod || !changefreq) throw new Error(`generate-sitemap: malformed <url> entry: ${body.trim()}`);
    entries.push({ loc, lastmod, changefreq, priority: tag('priority') });
  }
  return entries;
}

function staticUrls() {
  const current = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const entries = parseEntries(current).filter((e) => !DYNAMIC.some((re) => re.test(e.loc)));
  if (entries.length === 0) throw new Error('generate-sitemap: no static URLs parsed from public/sitemap.xml');
  return entries;
}

function contentDate() {
  const content = JSON.parse(readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8'));
  if (!content.generatedAt) throw new Error('generate-sitemap: backend/data/content.json has no generatedAt');
  return content.generatedAt.slice(0, 10);
}

/**
 * The full sitemap URL list, in the order it is written. Pure function of
 * the catalogue + the current static entries, so tests can assert the counts
 * (21 courses, 63 modules, 13 paths, 222 lessons) without touching the file.
 * A lesson is listed when it has a public excerpt — every lesson does now
 * (decision (b)); a lesson without one would stay out rather than ship a
 * thin page.
 */
export function collectSitemapUrls() {
  const dynamicLastmod = contentDate();
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const urls = staticUrls();

  for (const course of COURSE_META) {
    const track = trackById.get(course.trackId);
    if (!track) throw new Error(`generate-sitemap: course ${course.slug} references unknown track ${course.trackId}`);
    urls.push({ loc: `${SITE}/academy/courses/${course.slug}`, lastmod: dynamicLastmod, changefreq: 'monthly', priority: '0.8' });
    for (const tier of track.tiers) {
      urls.push({ loc: `${SITE}/academy/courses/${course.slug}/${tier.id}`, lastmod: dynamicLastmod, changefreq: 'monthly', priority: '0.7' });
    }
  }

  for (const path of PATHS) {
    urls.push({ loc: `${SITE}/academy/paths/${path.slug}`, lastmod: dynamicLastmod, changefreq: 'monthly', priority: '0.8' });
  }

  for (const lessonId of Object.keys(lessonExcerpts)) {
    if (!lessonExcerpts[lessonId]) continue; // no excerpt, no listing (thin page)
    urls.push({ loc: `${SITE}/academy/lessons/${lessonId}`, lastmod: dynamicLastmod, changefreq: 'monthly', priority: '0.7' });
  }

  const seen = new Set();
  for (const { loc } of urls) {
    if (seen.has(loc)) throw new Error(`generate-sitemap: duplicate URL ${loc}`);
    seen.add(loc);
  }
  return urls;
}

function render(urls) {
  const body = urls
    .map(({ loc, lastmod, changefreq, priority }) =>
      `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq>${priority ? `<priority>${priority}</priority>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by scripts/generate-sitemap.mjs from the catalogue. Do not edit by hand. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function main() {
  const urls = collectSitemapUrls();
  writeFileSync(join(ROOT, 'public', 'sitemap.xml'), render(urls), 'utf8');
  const counts = {
    static: urls.filter((u) => !DYNAMIC.some((re) => re.test(u.loc))).length,
    courses: urls.filter((u) => /^https:\/\/www\.road2cissp\.com\/academy\/courses\/[^/]+$/.test(u.loc)).length,
    modules: urls.filter((u) => /^https:\/\/www\.road2cissp\.com\/academy\/courses\/[^/]+\/[^/]+$/.test(u.loc)).length,
    paths: urls.filter((u) => u.loc.includes('/academy/paths/')).length,
    lessons: urls.filter((u) => u.loc.includes('/academy/lessons/')).length,
  };
  // eslint-disable-next-line no-console
  console.log(
    `sitemap: ${urls.length} URLs (${counts.static} static, ${counts.courses} courses, ${counts.modules} modules, ${counts.paths} paths, ${counts.lessons} lessons)`,
  );
}

if (process.argv[1]?.endsWith('generate-sitemap.mjs')) main();
