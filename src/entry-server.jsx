// Server entry for prerendering (scripts/prerender.mjs). Renders the same
// <App /> the browser mounts, but under a StaticRouter with an anonymous,
// already-resolved auth state, so public pages render their content instead
// of the loading spinner.
//
// Two-pass renderToString (not renderToPipeableStream): pass 1 is a
// throwaway that invokes every React.lazy factory; the dynamic imports
// resolve on the microtask queue, and pass 2 then renders the resolved
// components synchronously. A single renderToString would stop at the
// Suspense fallback for every code-split route, and renderToPipeableStream
// leaves the fallback plus a hidden resolved copy in the static HTML —
// a no-JS visitor would see a spinner. The two-pass output is clean HTML
// with no Suspense markers at all.
//
// No browser is involved: this runs in plain Node during `npm run build`,
// which is what Vercel runs too (see docs/SEO.md).
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App.jsx';
import { SeoCollectorContext } from './components/Seo.jsx';

// Anonymous visitor, auth already resolved: public pages render their
// content. The client never uses this — it starts loading and checks the
// session cookie as before.
const PRERENDER_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function collector() {
  return {
    seo: null,
    register(data) {
      this.seo = data;
    },
  };
}

/**
 * Render one route to its app HTML. Returns { html, seo } where seo is
 * the <Seo> data the page registered (or null when the page has none).
 */
export async function render(url) {
  const element = (
    <App
      RouterComponent={StaticRouter}
      routerProps={{ location: url, context: {} }}
      initialAuth={PRERENDER_AUTH}
    />
  );
  // Pass 1: invoke the lazy factories. Its output is discarded.
  renderToString(
    <SeoCollectorContext.Provider value={collector()}>
      {element}
    </SeoCollectorContext.Provider>,
  );
  // Then render until the route's page has actually loaded (its <Seo>
  // registered). One tick is not always enough: a lazy route that picks
  // a named export (import(...).then(m => ...)) loads its chunk from disk
  // and resolves a step later, so it still showed the Suspense fallback —
  // /academy/paths failed the build that way. Bounded: a page with no
  // <Seo> still fails loudly in scripts/prerender.mjs.
  let seoCollector = collector();
  let html = '';
  for (let pass = 0; pass < 20; pass += 1) {
    await new Promise((resolve) => setTimeout(resolve, pass === 0 ? 0 : 25));
    seoCollector = collector();
    html = renderToString(
      <SeoCollectorContext.Provider value={seoCollector}>
        {element}
      </SeoCollectorContext.Provider>,
    );
    if (seoCollector.seo) break;
  }
  return { html, seo: seoCollector.seo };
}
