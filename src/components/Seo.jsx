import { createContext, useContext, useEffect } from 'react';

// Per-route SEO for the SPA: sets the title, description, canonical, and the
// Open Graph / Twitter tags that change per page, plus optional JSON-LD. No
// dependency (no react-helmet) — it upserts tags into <head> directly. Google
// renders JS so it sees these; for non-JS crawlers, prerendering is the proper
// fix (see docs/SEO.md). index.html holds the sensible site-wide defaults, so
// a page without <Seo> still has valid tags.
//
// Server rendering: the prerender script wraps the app in
// <SeoCollectorContext.Provider value={collector}>. During a server render
// each <Seo> registers its props into the collector (instead of touching
// document, which does not exist there), and the prerender script injects
// them into the static page's <head>. The page component stays the single
// source of truth for its own tags — the client path below is untouched.
export const SeoCollectorContext = createContext(null);

const SITE = 'https://www.road2cissp.com';

// The site-wide default, matching the <meta name="robots"> in index.html.
// Pages that pass no `robots` prop get this, so navigating away from a
// noindex page (e.g. a 404) never leaves "noindex" behind in <head>.
export const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * @param {string} title        full <title>
 * @param {string} description  meta description (<=~160 chars)
 * @param {string} path         route path, e.g. "/pricing" (canonical = SITE + path)
 * @param {object} [jsonLd]     optional schema.org object injected as ld+json
 * @param {string} [robots]     robots meta content, e.g. "noindex" for 404
 *                              states (defaults to the site-wide index rule)
 */
export default function Seo({ title, description, path = '/', jsonLd, robots }) {
  const collector = useContext(SeoCollectorContext);
  if (typeof window === 'undefined' && collector) {
    collector.register({ title, description, path, jsonLd, robots: robots || DEFAULT_ROBOTS });
  }

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const url = `${SITE}${path}`;
    if (title) document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots || DEFAULT_ROBOTS);
    upsertLink('canonical', url);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    let script;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-route', path);
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => { if (script) script.remove(); };
  }, [title, description, path, jsonLd, robots]);

  return null;
}
