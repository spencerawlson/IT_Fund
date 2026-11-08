# SEO

Canonical host: **https://www.road2cissp.com** (the apex `road2cissp.com` must
301-redirect to www — set this at DNS/Vercel; it's the one thing code can't enforce).

## Done (static wins)

- **`index.html`** — canonical, `og:url`, `og:locale`, `og:image` + `twitter:image`
  (now the designed 1200×630 `public/og-image.png`, with width/height),
  `robots` (`index, follow, max-image-preview:large`), and a single WebSite
  JSON-LD node with the Organization nested as `publisher` (not `@graph`, so
  consumers that only read a top-level `@type` see it). Site-wide defaults, so
  any route without `<Seo>` still has valid tags.
- **`public/robots.txt`** — declares `Sitemap:`.
- **`public/sitemap.xml`** — www host, 16 URLs including `/pricing`, `lastmod` +
  `changefreq`.
- **`public/llms.txt`** — llmstxt.org shape: H1 + Markdown list of the key pages
  with one-line descriptions, for AI crawlers.
- **`src/components/Seo.jsx`** — dependency-free per-route meta (title, description,
  canonical, OG/Twitter, optional JSON-LD). Now wired into **all 16 public
  routes** (`/`, `/pricing`, `/academy/roadmap`, `/academy/paths`,
  `/academy/courses`, `/academy/badges`, `/academy/exam`, `/library`, `/lab`,
  `/labs`, `/practice`, `/tracks`, `/roadmap`, `/challenge`, `/learning-path`,
  `/signin`). The FAQ on `/` and the FAQ on `/pricing` both ship FAQPage JSON-LD.
- **Plausible analytics** — `defer` script tag in `index.html`
  (`data-domain="road2cissp.com"`). **The tag alone counts nothing: a Plausible
  account must be created for road2cissp.com and the site added there before
  any data lands.**

## Prerendering — DONE (2026-11-08, supersedes the 2026-11-07 deferral)

Spencer approved "build it all" (2026-11-07), so the GSC-first deferral no
longer applies. Every URL in `public/sitemap.xml` is now rendered to static
HTML at build time — no headless browser involved, so it runs on Vercel's
plain `vite build`:

- **`src/entry-server.jsx`** — renders `<App />` under a `StaticRouter` with an
  anonymous, already-resolved auth state (public pages render their content,
  not the loading spinner). Two-pass `renderToString`: pass 1 invokes the
  `React.lazy` factories, pass 2 renders the resolved components — the output
  is clean HTML with no Suspense fallback or hidden resolved copy. A single
  `renderToString` would stop at the spinner for every code-split route, and
  `renderToPipeableStream` leaves the fallback in the static HTML.
- **`scripts/prerender.mjs`** — renders each sitemap route, injects the page's
  collected `<Seo>` data into `<head>` (title, description, canonical, og:*
  and twitter:* tags, JSON-LD), injects the app HTML into `#root`, writes
  `dist/<route>/index.html`. Fails loudly when a route has no `<Seo>` title or
  description.
- **`scripts/check-prerender.mjs`** — asserts per route: file exists, exactly
  one `<h1>`, first `<p>` 40–300 chars, ≥50 words of visible text, a JSON-LD
  block, unique `<title>`; also asserts the Plausible tag and `dist/llms.txt`.
  Runs as part of `npm run build`.
- **`package.json`** — `build` = `vite build && npm run build:ssr && npm run
  prerender && npm run check-prerender`. `dist-server/` is gitignored.
- **SSR guards found while building it** (all minimal, browser behaviour
  unchanged): `AuthProvider` takes an optional `initialAuth` prop
  (prerender-only); `Lab.jsx` reads `window.location.search` only in the
  browser; hero badge / eyebrow `<p>`s on Landing, Pricing, and `PageHeader`
  (plus the PracticeExam eyebrow) became `<div>`s so the first `<p>` under
  each H1 is a real direct answer; LabLauncher got a screen-reader `<h1>` +
  description (its UI is a terminal, so it had no heading at all).
- **Known remaining audit findings** (measured with the ecosystem `analyze`
  program against the built `dist/`, 2026-11-08 — site **100/100**, GEO
  **89/100**, up from site 60/100, GEO 20/100, 11 findings): FAQ sections
  exist only on `/` and `/pricing`, and outbound citations only on
  `/academy/roadmap` — the GEO audit flags those on the other pages (medium
  + low). Clearing them needs FAQ sections on 7+ more pages and external
  links on 8+ more, which is a visible content decision, not a code fix —
  left for Spencer to call.

## Proposed (do deliberately)

1. ~~**Prerendering / SSG.**~~ DONE — see above. A Puppeteer/Playwright
   prerender is still NOT viable on Vercel (no headless browser); the Node
   approach above is what shipped.
2. ~~**A real OG image.**~~ DONE — `public/og-image.png` (1200×630, light
   background, violet accent, "Road to CISSP" + "From IT fundamentals to the
   CISSP"), tags in `index.html` switched to it.
3. ~~**Price single-source-of-truth.**~~ DONE — `GET /api/billing/price` returns
   the live Stripe price; `Pricing.jsx` renders the page, structured data, and
   button from it (fallback `$19`); the static Product/Offer was removed from
   `index.html`.
4. ~~**Per-page meta on the remaining public routes.**~~ DONE — `<Seo>` now
   covers all 16 sitemap routes.
5. **BreadcrumbList + Course JSON-LD** for `/academy/courses/*` once those routes
   prerender (rich results for course/breadcrumb).
6. **Google Search Console + Bing Webmaster** — submit the sitemap, confirm the
   www canonical, watch Core Web Vitals (the main JS bundle is large; see the
   build's chunk-size warning — code-split to improve LCP).
