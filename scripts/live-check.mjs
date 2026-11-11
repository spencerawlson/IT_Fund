// Post-deploy live check: every sitemap URL must serve its own prerendered
// page, not the home page. (Audit P0-2: the old SPA catch-all rewrite in
// vercel.json sent every extensionless path to /index.html, so all 16
// sitemap URLs returned byte-identical home HTML.)
//
// Usage: node scripts/live-check.mjs [base-url]
//   base defaults to https://www.road2cissp.com; a preview deployment URL
//   works the same way. Exit code 0 = every route distinct, 1 = failure.
// Run AFTER a deploy; it only reads the live site, it changes nothing.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || process.env.LIVE_CHECK_BASE || 'https://www.road2cissp.com').replace(/\/$/, '');

function sitemapRoutes() {
  const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

function titleOf(html) {
  return (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '(no title)';
}

function canonicalOf(html) {
  return (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '(no canonical)';
}

async function main() {
  const routes = sitemapRoutes();
  const failures = [];
  const seen = new Map(); // hash -> first route with that body
  const titles = new Map();
  for (const route of routes) {
    const url = `${BASE}${route}`;
    let res;
    try {
      res = await fetch(url, { headers: { 'user-agent': 'road2cissp-live-check' } });
    } catch (err) {
      failures.push(`${route}: fetch failed (${err.message})`);
      continue;
    }
    if (res.status !== 200) {
      failures.push(`${route}: HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const hash = createHash('sha256').update(html).digest('hex').slice(0, 12);
    const title = titleOf(html);
    const canonical = canonicalOf(html);
    if (seen.has(hash)) failures.push(`${route}: identical body to ${seen.get(hash)} (hash ${hash})`);
    else seen.set(hash, route);
    if (titles.has(title)) failures.push(`${route}: duplicate title "${title}" (also ${titles.get(title)})`);
    else titles.set(title, route);
    // Canonicals are absolute production URLs; on a preview base only the
    // path has to match (the origin differs by design).
    if (canonical !== '(no canonical)') {
      const canonicalPath = new URL(canonical, BASE).pathname;
      if (canonicalPath !== route && canonicalPath !== `${route}/`) {
        failures.push(`${route}: canonical ${canonical} does not match ${url}`);
      }
    }
    console.log(`${route} -> ${res.status} hash=${hash} title="${title}"`);
  }
  if (failures.length) {
    console.error(`\nLIVE CHECK FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\nLive check OK: ${routes.length} routes, all distinct.`);
}

main();
