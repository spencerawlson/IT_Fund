import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import { SeoCollectorContext } from '@/components/Seo';
import Academy from './Academy';

const SIGNED_IN_AUTH = { user: { id: 'test-user' }, isLoadingAuth: false, authChecked: true };

// SSR uses the academy's server snapshot (empty state), so this renders the
// signed-in dashboard's welcome state. The Missions and Labs sections below
// "Your progress" render in both dashboard states, so this covers them.
function renderPage() {
  const collector = { seo: null, register(data) { this.seo = data; } };
  return renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <ThemeProvider>
        <AuthProvider initialAuth={SIGNED_IN_AUTH}>
          <StaticRouter location="/app">
            <Academy />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </SeoCollectorContext.Provider>,
  );
}

describe('Academy home Missions section (audit B-25)', () => {
  it('names and links all three missions below "Your progress", so a signed-in learner can find them from home', () => {
    const html = renderPage();
    // The section comes after the progress section — it used to not exist at all.
    expect(html.indexOf('Your progress')).toBeGreaterThan(-1);
    expect(html.indexOf('Missions')).toBeGreaterThan(html.indexOf('Your progress'));
    expect(html).toContain('Operation Glasshouse');
    expect(html).toContain('Operation Broken Shield');
    expect(html).toContain('Operation Packet Flood');
    expect(html).toContain('href="/missions/op-broken-shield"');
    expect(html).toContain('href="/missions/op-packet-flood"');
    // Operation Glasshouse has no backend mission record and no /missions
    // page (no op-glasshouse anywhere in src or backend) — it links to its
    // lab instead of a mission page that would 404.
    expect(html).toContain('href="/labs/sec-pentest-web-001"');
    expect(html).not.toContain('/missions/op-glasshouse');
    // Meta only where the backend registry records it.
    expect(html).toContain('Beginner');
    expect(html).toContain('Intermediate');
    expect(html).toContain('30 min');
    expect(html).toContain('80 XP');
  });

  it('keeps the Glasshouse card premise-only: no objective enumeration outside the terminal (terminal-only rule, Spencer 2026-11-13)', () => {
    const html = renderPage();
    // Premise only, drawn from the registry brief in src/data/missions.js.
    expect(html).toContain('Get into the ACME intranet web app and prove how deep it goes.');
    // The old copy listed the attack chain (recon, auth bypass, SQLi, XSS,
    // shell) on the public card, before the learner ever reaches a terminal.
    expect(html).not.toContain('recon, auth bypass, SQL injection, XSS, and seizing the shell');
  });

  it('links into the labs from home without rebuilding the lab list (B-04)', () => {
    const html = renderPage();
    expect(html).toContain('Hands-on labs');
    expect(html).toContain('href="/labs"');
  });
});
