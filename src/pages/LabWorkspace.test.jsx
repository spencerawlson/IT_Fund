import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import LabWorkspace from './LabWorkspace';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(join(ROOT, 'src/pages/LabWorkspace.jsx'), 'utf8');

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

// Effects never run under SSR, so the page renders its loading state without
// any network — that is what this smoke test asserts. The mission-mode
// behaviour is guarded by source assertions below, the same pattern as
// MissionWorkspace.test.jsx.
function renderPage() {
  return renderToString(
    <ThemeProvider>
      <AuthProvider initialAuth={ANON_AUTH}>
        <StaticRouter location="/labs/net-eigrp-tshoot-001">
          <Routes>
            <Route path="/labs/:labId" element={<LabWorkspace />} />
          </Routes>
        </StaticRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('LabWorkspace', () => {
  it('renders the loading state without throwing (SSR smoke, no network)', () => {
    const html = renderPage();
    expect(typeof html).toBe('string');
    expect(html).toContain('Starting lab environment');
  });

  it('in mission mode the page shows no objectives checklist, hints, count or progress bar — the terminal is the only place to check', () => {
    // Same rule as Operation Broken Shield (MissionWorkspace): the student
    // checks where they stand with `objectives` / `progress` / `hint` in the
    // Mission Console. The Objectives card must only render for plain labs.
    expect(SRC).not.toContain('Mission Objectives');
    expect(SRC).toContain('Objectives</h2>');
    expect(SRC).toMatch(/\{\!gameMode && \(\s*<Card level=\{2\}>[\s\S]*?Objectives<\/h2>/);
    // No progress bar or count may leak onto the page in mission mode.
    expect(SRC).not.toMatch(/gameMode[\s\S]{0,200}ProgressBar/);
  });

  it('the mission-mode banner tells the student to check via the terminal', () => {
    expect(SRC).toContain('run `objectives` for the list');
    expect(SRC).toContain('`progress` for the count');
    expect(SRC).toContain('`hint` when stuck');
  });

  it('terminal objectives / progress / hint exist and are not mission-mode gated', () => {
    // The runner is shared by both modes, so these work in mission mode too.
    expect(SRC).toContain("if (c === 'objectives')");
    expect(SRC).toContain("if (c === 'progress'");
    expect(SRC).toContain("if (c === 'hint')");
    // The objectives list is numbered so `attest [n]` can address a row.
    expect(SRC).toContain('${i + 1}. [');
  });

  it('live labs can attest from the terminal in mission mode (the hidden card held the only "I did this" buttons)', () => {
    expect(SRC).toContain("if (c === 'attest')");
    expect(SRC).toContain('nothing to attest here');
    expect(SRC).toContain('Usage: attest [n]');
    expect(SRC).toContain('await attest(target)');
    expect(SRC).toContain('attest [n]         record a step you ran for real');
    // The command wires into the same flow as the button: record the
    // attestation as a finding, then re-validate.
    expect(SRC).toContain('recordFindings(session.id, { [objective.validator]: { attested: true } })');
    // ...and it reports honestly whether the record landed.
    expect(SRC).toContain('Recorded "${target.label}" as done.');
  });

  it('the under-console caption points at the terminal in mission mode and keeps the card wording for plain labs', () => {
    // The captions are JSX, so the command names sit inside <code> elements.
    expect(SRC).toContain('>objectives</code> to see where you stand');
    expect(SRC).toContain('>attest</code> in the console to record it');
    // Plain (non-mission) labs are unchanged: the button and the help hint stay.
    expect(SRC).toContain('press');
    expect(SRC).toContain('I did this');
    expect(SRC).toContain('>help</code> for the command list');
  });

  it('the completion dossier still renders in mission mode (the debrief stays)', () => {
    expect(SRC).toContain('{done && gameMode && (');
    expect(SRC).toContain('<MissionDossier lab={lab} mission={mission}');
  });
});
