import { describe, it, expect, beforeEach } from 'vitest';
import { loadAnalytics, __resetAnalyticsForTests } from './analytics';

// Minimal document stand-in: only createElement / querySelector / head
// are touched by the loader.
function fakeDocument() {
  const scripts = [];
  return {
    head: { appendChild: (el) => scripts.push(el) },
    createElement: () => ({
      setAttribute(key, value) {
        this[key] = value;
      },
    }),
    querySelector: (selector) => {
      const match = selector.match(/script\[src="([^"]+)"\]/);
      if (!match) return null;
      return scripts.find((s) => s.src === match[1]) || null;
    },
    _scripts: scripts,
  };
}

describe('consent-gated analytics loader (R-04)', () => {
  beforeEach(() => {
    __resetAnalyticsForTests();
  });

  it('is a no-op with no document (SSR / prerender)', () => {
    expect(loadAnalytics(undefined)).toBe(false);
  });

  it('injects Plausible + Ventoryn with the right attributes, once', () => {
    const doc = fakeDocument();
    expect(loadAnalytics(doc)).toBe(true);
    expect(doc._scripts).toHaveLength(2);
    const [plausible, ventoryn] = doc._scripts;
    expect(plausible.src).toBe('https://plausible.io/js/script.js');
    expect(plausible['data-domain']).toBe('road2cissp.com');
    expect(plausible.defer).toBe(true);
    expect(ventoryn.src).toBe('https://ventoryn.app/v.js');
    expect(ventoryn['data-site']).toBe('418e926be25e251d95badb9e');
    expect(ventoryn.defer).toBe(true);
    // Second call (StrictMode double-effect, re-accept) injects nothing more.
    expect(loadAnalytics(doc)).toBe(true);
    expect(doc._scripts).toHaveLength(2);
  });

  it('does not re-inject tags already present in the document', () => {
    const doc = fakeDocument();
    doc.head.appendChild({ src: 'https://plausible.io/js/script.js' });
    doc.head.appendChild({ src: 'https://ventoryn.app/v.js' });
    expect(loadAnalytics(doc)).toBe(true);
    expect(doc._scripts).toHaveLength(2);
  });
});
