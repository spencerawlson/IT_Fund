// Post-deploy live check: every sitemap URL must serve its own prerendered
// page, not the home page. (Audit P0-2: the old SPA catch-all rewrite in
// vercel.json sent every extensionless path to /index.html, so all 16
// sitemap URLs returned byte-identical home HTML.)
//
// SEO Phase 2 (1.5) + lesson excerpts (decision (b)): every dynamic route
// is IN the sitemap now — courses, modules, paths, and all 222 lessons
// (premium lessons prerender as real pages with their public excerpt) — so
// they all run through the distinct-body / unique-title / self-canonical
// checks below with everything else. No dynamic route serves the shell
// anymore; DYNAMIC_SHELL_ROUTES is empty and kept only so the check can
// grow a shell route again without restructuring if one ever returns.
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

// Dynamic routes that still serve the generic shell (not in the sitemap):
// none — every lesson has a public excerpt now (decision (b)).
export const DYNAMIC_SHELL_ROUTES = [];

export function sitemapRoutes() {
  const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

function titleOf(html) {
  return (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '(no title)';
}

function canonicalOf(html) {
  return (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '(no canonical)';
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'road2cissp-live-check' } });
    return { status: res.status, html: await res.text() };
  } catch {
    return null;
  }
}

function hashOf(html) {
  return createHash('sha256').update(html).digest('hex').slice(0, 12);
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
    const hash = hashOf(html);
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

  // The shell itself still exists (the Phase 1 shell assertions above):
  // it must differ from the home page and carry no canonical. No dynamic
  // route is expected to serve it anymore (DYNAMIC_SHELL_ROUTES is empty),
  // but the loop below stays so a future shell route is checked the same way.
  const shellRes = await fetchText(`${BASE}/shell.html`);
  let shellHash = null;
  let shellTitle = null;
  if (!shellRes) {
    failures.push('/shell.html: fetch failed');
  } else if (shellRes.status !== 200) {
    failures.push(`/shell.html: HTTP ${shellRes.status} (deploy predates the Phase 1 shell?)`);
  } else {
    shellHash = hashOf(shellRes.html);
    shellTitle = titleOf(shellRes.html);
    if (canonicalOf(shellRes.html) !== '(no canonical)') {
      failures.push(`/shell.html: shell carries a canonical (${canonicalOf(shellRes.html)}) — it must have none`);
    }
    console.log(`/shell.html -> ${shellRes.status} hash=${shellHash} title="${shellTitle}"`);
  }
  const homeRes = await fetchText(`${BASE}/`);
  const homeHash = homeRes && homeRes.status === 200 ? hashOf(homeRes.html) : null;
  if (homeHash && shellHash && homeHash === shellHash) {
    failures.push('shell.html: identical body to the home page — the shell is not a shell');
  }
  for (const route of DYNAMIC_SHELL_ROUTES) {
    const res = await fetchText(`${BASE}${route}`);
    if (!res) {
      failures.push(`${route}: fetch failed`);
      continue;
    }
    if (res.status !== 200) {
      failures.push(`${route}: HTTP ${res.status}`);
      continue;
    }
    const hash = hashOf(res.html);
    const title = titleOf(res.html);
    const canonical = canonicalOf(res.html);
    if (shellHash && hash !== shellHash) failures.push(`${route}: body hash ${hash} != shell hash ${shellHash} (serves something other than the shell)`);
    if (homeHash && hash === homeHash) failures.push(`${route}: identical body to the home page (hash ${hash}) — the F1 defect is back`);
    if (shellTitle && title !== shellTitle) failures.push(`${route}: title "${title}" != shell title "${shellTitle}"`);
    if (canonical !== '(no canonical)') failures.push(`${route}: canonical ${canonical} — the shell must carry none`);
    console.log(`${route} -> ${res.status} hash=${hash} title="${title}" (dynamic: shell)`);
  }
  if (failures.length) {
    console.error(`\nLIVE CHECK FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\nLive check OK: ${routes.length} sitemap routes, all distinct; ${DYNAMIC_SHELL_ROUTES.length} dynamic route(s) still serving the shell.`);
}

if (process.argv[1]?.endsWith('live-check.mjs')) main();
