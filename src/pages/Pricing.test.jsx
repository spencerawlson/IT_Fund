import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import Pricing from './Pricing';

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

// Effects never run under SSR, so the page renders without any network —
// the live Stripe price fetch is skipped and the fallback price renders.
function renderPage() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location="/pricing">
          <Pricing />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('Pricing', () => {
  it('names the two free labs with links, so a visitor knows exactly which labs need no plan (Spencer, 2026-11-16)', () => {
    const html = renderPage();
    expect(html).toContain('VLANs and Inter-VLAN Routing');
    expect(html).toContain('Python Scripting Basics');
    expect(html).toContain('no plan needed');
    expect(html).toContain('href="/labs/net-vlan-001"');
    expect(html).toContain('href="/labs/py-basics-001"');
    // The old bare wording named no lab at all.
    expect(html).not.toContain('The free tier gets two;');
  });

  it('surfaces the refund + grace terms with a Terms link, so the buyer sees them where they decide (audit B-29)', () => {
    const html = renderPage();
    expect(html).toContain('Full refund if you ask within 14 days');
    expect(html).toContain('support@road2cissp.com');
    expect(html).toContain('keep full access for 7 days');
    expect(html).toContain('href="/terms"');
  });

  it('shows both plans with the decided prices — monthly $29, annual $250 flat (Spencer, 2026-11-18)', () => {
    const html = renderPage();
    expect(html).toContain('Monthly');
    expect(html).toContain('Annual');
    expect(html).toContain('$29');
    // SSR renders the interval as `/ <!-- -->month` (React comment node).
    expect(html).toMatch(/\/\s*<!-- -->\s*month/);
    expect(html).toContain('$250');
    expect(html).toMatch(/\/\s*<!-- -->\s*year/);
    // $29 x 12 = $348; $348 - $250 = $98 saved, about $20.83 a month.
    expect(html).toContain('save $98 a year');
    expect(html).toContain('$20.83');
    expect(html).toContain('Best value');
  });

  it('disables annual checkout until the price is configured, so an unconfigured annual plan can never break checkout', () => {
    // SSR renders the fallback state: no live /billing/plans fetch ran, so
    // annual is unconfigured and its button must be disabled, not live.
    const html = renderPage();
    expect(html).toContain('Annual billing coming soon');
    expect(html).toContain('disabled');
  });
});
