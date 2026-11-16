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

  it('marks the free labs in the progress list (Spencer, 2026-11-16)', () => {
    // A visitor checking their progress must see at a glance which labs
    // needed no plan. Keyed off the free set, never hardcoded.
    expect(SRC).toContain('isLabFree(def.id)');
    expect(SRC).toContain('<FreeLabBadge />');
  });

  it('hides mission-only labs from the progress list (Spencer, 2026-11-16)', () => {
    // Operation Broken Shield is mission-only everywhere: the ACL lab
    // gets no row, no Start button, and does not count toward
    // "labs completed" — its attempts live in the Missions section.
    expect(SRC).toContain('MISSION_ONLY_LABS');
    expect(SRC).toContain('defs.filter((l) => !MISSION_ONLY_LABS[l.id])');
  });

  it('resolves mission callsigns without the lesson -> lab bridge', () => {
    // The old lookup went lesson -> lab -> mission through
    // LAB_FOR_LESSON, which no longer maps the mission's lessons to the
    // lab — the callsign now resolves mission id -> lab directly, so
    // Operation Broken Shield still shows its callsign, not "OP BROKEN SHIELD".
    expect(SRC).toContain('labForMission(missionId)');
    expect(SRC).toContain("MISSIONS[labForMission(missionId)]");
    expect(SRC).not.toContain('LAB_FOR_LESSON');
    expect(SRC).not.toContain('MISSION_FOR_LESSON');
  });
});
