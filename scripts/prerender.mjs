// Prerender the public routes to static HTML.
//
// Runs after `vite build` and the SSR bundle build (see package.json):
//   vite build && vite build --ssr src/entry-server.jsx --outDir dist-server
//   && node scripts/prerender.mjs
//
// For every URL in public/sitemap.xml it renders the app in Node
// (react-dom/server, no browser — Vercel builds have no headless browser)
// and writes dist/<route>/index.html, with the page's own <Seo> data
// injected into <head> (title, description, canonical, OG/Twitter, JSON-LD).
// The shell's <div id="root"> carries the rendered app; the client bundle
// takes over from there exactly as it does for the empty shell.
//
// Every sitemap route MUST render a <Seo>: a route without one fails the
// build loudly instead of shipping the shell's generic title on every page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.road2cissp.com';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`prerender: shell is missing ${label}`);
  }
  return html.replace(pattern, replacement);
}

function sitemapRoutes() {
  const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const routes = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  if (routes.length === 0) {
    throw new Error('prerender: no <loc> URLs found in public/sitemap.xml');
  }
  return routes;
}

function injectHead(shell, route, seo) {
  const url = `${SITE}${route === '/' ? '' : route}`;
  let html = shell;
  html = replaceOnce(html, /<title>[^<]*<\/title>/,
    `<title>${esc(seo.title)}</title>`, '<title>');
  html = replaceOnce(html, /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(seo.description)}" />`,
    'meta description');
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`, 'canonical link');
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${esc(seo.title)}" />`, 'og:title');
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    'og:description');
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`, 'og:url');
  html = replaceOnce(html, /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    'twitter:title');
  html = replaceOnce(html, /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    'twitter:description');
  if (seo.jsonLd) {
    // One top-level block per node: consumers that only read a top-level
    // @type (including the GEO audit) miss types nested in an @graph, so
    // a graph is flattened to sibling blocks with the same data.
    const nodes = Array.isArray(seo.jsonLd['@graph'])
      ? seo.jsonLd['@graph']
      : [seo.jsonLd];
    for (const node of nodes) {
      const block = { '@context': 'https://schema.org', ...node };
      const script = `<script type="application/ld+json">${JSON.stringify(block)}</script>`;
      html = replaceOnce(html, /<\/head>/, `${script}\n  </head>`, '</head>');
    }
  }
  return html;
}

async function main() {
  const { render } = await import('../dist-server/entry-server.js');
  const shell = readFileSync(join(DIST, 'index.html'), 'utf8');
  const routes = sitemapRoutes();
  for (const route of routes) {
    const { html, seo } = await render(route);
    if (!seo?.title || !seo?.description) {
      throw new Error(
        `prerender: ${route} rendered no <Seo> title/description — ` +
          'add <Seo title description path> to the page (see src/components/Seo.jsx)',
      );
    }
    let page = injectHead(shell, route, seo);
    page = replaceOnce(page, /<div id="root"><\/div>/,
      `<div id="root">${html}</div>`, '#root');
    const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), page, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`prerendered ${route} -> ${outDir}/index.html (${html.length} chars)`);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
