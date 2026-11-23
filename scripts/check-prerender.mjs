// Build-output check: every sitemap URL must have a prerendered static
// page in dist/ carrying real content. Runs at the end of `npm run build`
// so a regression fails the build instead of shipping silently.
//
// Per route it asserts:
//   - dist/<route>/index.html exists
//   - exactly one <h1> (AI answers and the GEO audit need one)
//   - a first <p> of 15-400 characters (the direct-answer paragraph
//     AI answers quote). Calibrated from the 121 prerendered routes
//     (SEO Phase 2): module index summaries run 19-39 chars, and the
//     longest real opening paragraph (lx-cli's) is 342 chars. The bounds
//     still catch an empty or degenerate first paragraph; shell/empty
//     detection rests on the >=50-words and duplicate-body checks.
//   - at least 50 words of visible text (under that, crawlers see a shell)
//   - a JSON-LD block (the site shell carries one; per-page blocks add more)
//   - a unique <title> across routes (duplicates read as one page)
// Also asserts the Plausible analytics tag and llms.txt made it into dist.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

function sitemapRoutes() {
  const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
}

function visibleText(html) {
  return stripHidden(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Hidden subtrees are not page content: the Cypher tutor panel is always
// mounted on lesson pages (hidden + inert while closed, so the voice
// survives closing it), and its label text ("Cypher — your AI tutor")
// would otherwise be the first <p> on lessons without a prerequisite
// notice. Strip <section aria-hidden="true"> blocks before measuring.
// (Assumes no nested <section> inside a hidden one — true of the panel.)
function stripHidden(html) {
  return html.replace(/<section[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/section>/gi, ' ');
}

function firstParagraph(html) {
  const noScripts = stripHidden(html).replace(/<script[\s\S]*?<\/script>/gi, ' ');
  // `<p(?:\s[^>]*)?>` — not `<p[^>]*>` — so <path> elements from the lucide
  // SVG icons are never mistaken for a paragraph.
  const m = noScripts.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i);
  if (!m) return '';
  return visibleText(m[1]);
}

function main() {
  const failures = [];
  const routes = sitemapRoutes();
  const titles = new Map();
  for (const route of routes) {
    const file = route === '/'
      ? join(DIST, 'index.html')
      : join(DIST, route.slice(1), 'index.html');
    if (!existsSync(file)) {
      failures.push(`${route}: missing prerendered file ${file}`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    if (h1s !== 1) failures.push(`${route}: ${h1s} <h1> tags (want exactly 1)`);
    const firstP = firstParagraph(html);
    if (firstP.length < 15 || firstP.length > 400) {
      failures.push(
        `${route}: first <p> is ${firstP.length} chars (want 15-400): ` +
          JSON.stringify(firstP.slice(0, 80)),
      );
    }
    const words = (visibleText(html).match(/\w+/g) || []).length;
    if (words < 50) failures.push(`${route}: only ${words} words of text (want >= 50)`);
    if (!/application\/ld\+json/.test(html)) {
      failures.push(`${route}: no JSON-LD block`);
    }
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
    if (!title) {
      failures.push(`${route}: no <title>`);
    } else if (titles.has(title)) {
      failures.push(`${route}: duplicate <title> (also ${titles.get(title)})`);
    } else {
      titles.set(title, route);
    }
  }
  const home = readFileSync(join(DIST, 'index.html'), 'utf8');
  // R-04: the analytics tags are consent-gated — they are NOT in the shell
  // anymore. What must ship instead: (a) the cookie-consent banner in the
  // prerendered homepage, and (b) the loader that injects the tags after
  // consent, in the built JS bundle (src/lib/analytics.js).
  if (!home.includes('data-cookie-consent="banner"')) {
    failures.push('dist/index.html: no cookie-consent banner (R-04)');
  }
  const assetFiles = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js'));
  const bundleHasPlausible = assetFiles.some((f) =>
    readFileSync(join(DIST, 'assets', f), 'utf8').includes('plausible.io'),
  );
  if (!bundleHasPlausible) {
    failures.push('dist/assets: no Plausible loader in the built JS (R-04 consent-gated analytics)');
  }
  if (!existsSync(join(DIST, 'llms.txt'))) {
    failures.push('dist/llms.txt is missing (public/llms.txt not copied?)');
  }
  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`check-prerender: ${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`check-prerender: ${routes.length} routes OK (H1, direct answer, words, JSON-LD, unique titles)`);
}

main();
