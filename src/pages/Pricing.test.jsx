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
});
