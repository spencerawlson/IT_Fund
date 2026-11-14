import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import LabProgress from './LabProgress';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(join(ROOT, 'src/pages/LabProgress.jsx'), 'utf8');

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderPage() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location="/labs/progress">
          <LabProgress />
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('LabProgress', () => {
  it('renders the loading state without throwing (SSR smoke, no network)', () => {
    const html = renderPage();
    expect(typeof html).toBe('string');
    expect(html).toContain('Loading');
  });

  it('treats a 401/402 from the missions API as locked, not a failure', () => {
    // A free or signed-out learner isn't entitled to missions — that is not
    // the same thing as the missions API being broken, so it must not
    // reuse missionsError (the red "Could not load missions" banner).
    expect(SRC).toContain('e.status === 401 || e.status === 402');
    expect(SRC).toContain('setMissionsLocked(true)');
    expect(SRC).toContain('Missions unlock with Premium');
    expect(SRC).not.toMatch(/missionsLocked[^\n]*text-danger/);
  });

  it('points signed-in users at their account to subscribe, not at pricing (2026-11-13)', () => {
    expect(SRC).toContain('to="/signin">Subscribe</Button>');
    expect(SRC).toContain('to="/pricing">See plans</Button>');
  });
});
