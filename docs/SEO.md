# SEO

Canonical host: **https://www.road2cissp.com** (the apex `road2cissp.com` must
301-redirect to www — set this at DNS/Vercel; it's the one thing code can't enforce).

## Done (static wins)

- **`index.html`** — canonical, `og:url`, `og:locale`, `og:image` + `twitter:image`,
  `robots` (`index, follow, max-image-preview:large`), and JSON-LD `@graph`
  (Organization, WebSite, Product+Offer). Site-wide defaults, so any route without
  `<Seo>` still has valid tags.
- **`public/robots.txt`** — now declares `Sitemap:` (it didn't before).
- **`public/sitemap.xml`** — www host, added `/pricing` (was missing), `lastmod` +
  `changefreq`.
- **`src/components/Seo.jsx`** — dependency-free per-route meta (title, description,
  canonical, OG/Twitter, optional JSON-LD). Wired into `Landing` (`/`) and `Pricing`
  (`/pricing`, with FAQPage rich-result JSON-LD). Add `<Seo …/>` to any other public
  page that deserves its own snippet (academy roadmap, library, labs).

## Proposed (do deliberately)

1. **Prerendering / SSG — DEFERRED (decision 2026-11-07: measure in GSC first).**
   This is a client-rendered SPA, so non-JS crawlers (and some social scrapers)
   get an empty `#root`. Google renders JS, and we've optimized that path
   (per-route `<Seo>`, JSON-LD, sitemap, canonicals), so the plan is to submit to
   Search Console and only invest in SSG if GSC shows real indexing gaps.
   - **A Puppeteer/Playwright prerender is NOT viable here**: Vercel builds with
     plain `vite build` and has no headless browser, so it would break the deploy.
   - The Vercel-safe option is a **Node SSG framework** (`vite-react-ssg` / `vike`)
     over the public route list (`/`, `/pricing`, `/academy/roadmap`, `/library`,
     `/lab`, `/labs`, `/practice`, `/tracks`, `/roadmap`, `/challenge`,
     `/learning-path`). It renders in Node (no browser) but is an app-wide refactor:
     guard every `window` / Three.js / `localStorage` / auth access for SSR. Needs a
     careful build + per-route smoke check; spike it on `/` + `/pricing` first.
2. **A real OG image.** `og:image` currently points at `/cipher-mascot.jpg` (a
   stopgap so cards aren't blank). Add a designed **1200×630 `public/og-image.png`**
   (logo + tagline "From IT fundamentals to the CISSP") and switch the two tags in
   `index.html` back to `/og-image.png` with explicit `og:image:width/height`.
3. ~~**Price single-source-of-truth.**~~ DONE — `GET /api/billing/price` returns
   the live Stripe price; `Pricing.jsx` renders the page, structured data, and
   button from it (fallback `$19`); the static Product/Offer was removed from
   `index.html`.
4. ~~**Per-page meta on the remaining public routes.**~~ DONE — `<Seo>` now covers
   `/`, `/pricing`, `/academy/roadmap`, `/library`, `/tracks`, `/roadmap`. Still
   worth adding to `/academy/courses` + `/lab`/`/labs` when convenient.
5. **BreadcrumbList + Course JSON-LD** for `/academy/courses/*` once those routes
   prerender (rich results for course/breadcrumb).
6. **Google Search Console + Bing Webmaster** — submit the sitemap, confirm the
   www canonical, watch Core Web Vitals (the main JS bundle is large; see the
   build's chunk-size warning — code-split to improve LCP).
