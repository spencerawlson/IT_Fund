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

1. **Prerendering / SSG — the big lever.** This is a client-rendered SPA, so
   non-JS crawlers (and some social scrapers) get an empty `#root`. Prerender the
   static public routes to real HTML at build time. Options, lowest-risk first:
   - `vite-react-ssg` or `vite-plugin-prerender` over the public route list
     (`/`, `/pricing`, `/academy/roadmap`, `/library`, `/lab`, `/labs`, `/practice`,
     `/tracks`, `/roadmap`, `/challenge`, `/learning-path`). Guard Three.js / auth
     / `window` code so it no-ops during the prerender pass (jsdom has no WebGL).
   - Verify each prerendered file has the right `<title>`/description baked in.
   - Risk: the 3D (`ModelViewer`) and auth contexts must not throw server-side.
     They already degrade without WebGL, but this needs a careful build + per-route
     smoke check before shipping.
2. **A real OG image.** `og:image` currently points at `/cipher-mascot.jpg` (a
   stopgap so cards aren't blank). Add a designed **1200×630 `public/og-image.png`**
   (logo + tagline "From IT fundamentals to the CISSP") and switch the two tags in
   `index.html` back to `/og-image.png` with explicit `og:image:width/height`.
3. **Price single-source-of-truth.** The displayed price (`$19/mo`) is hardcoded in
   `Pricing.jsx` AND asserted in `index.html` JSON-LD, decoupled from the actual
   Stripe `STRIPE_PRICE_ID`. Expose a public `GET /api/billing/price` that returns
   the live Price (amount/currency/interval) and render from it, so the page, the
   structured data, and the charge can never drift.
4. **Per-page meta on the remaining public routes** (academy roadmap, courses,
   library, labs) via `<Seo>` — unique title + description each.
5. **BreadcrumbList + Course JSON-LD** for `/academy/courses/*` once those routes
   prerender (rich results for course/breadcrumb).
6. **Google Search Console + Bing Webmaster** — submit the sitemap, confirm the
   www canonical, watch Core Web Vitals (the main JS bundle is large; see the
   build's chunk-size warning — code-split to improve LCP).
