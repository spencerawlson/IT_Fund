import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThemeProvider } from '@/components/ThemeProvider';
import MissionWorkspace, { formatObjectives } from './MissionWorkspace';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Effects never run under SSR, so the page renders its loading state without
// any network — that is what this smoke test asserts. The live flow (start,
// inspect, report, debrief) is exercised against the real backend, not here.
function renderWorkspace() {
  return renderToString(
    <ThemeProvider>
      <StaticRouter location="/missions/op-broken-shield">
        <Routes>
          <Route path="/missions/:missionId" element={<MissionWorkspace />} />
        </Routes>
      </StaticRouter>
    </ThemeProvider>,
  );
}

describe('MissionWorkspace', () => {
  it('renders the loading state without throwing (SSR smoke, no network)', () => {
    const html = renderWorkspace();
    expect(typeof html).toBe('string');
    expect(html).toContain('Starting mission');
  });

  it('lazy-loads the 3D scene — three.js stays out of the main chunk', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    // The SOC scene arrives via React.lazy; nothing in this file may pull
    // three.js (or ModelViewer) into the main bundle statically.
    expect(src).toMatch(/React\.lazy\(\(\) => import\(['"]@\/components\/three\/MissionSocScene['"]\)\)/);
    expect(src).not.toMatch(/^import .* from ['"]three['"]/m);
    expect(src).not.toMatch(/from ['"]@\/components\/three\/ModelViewer['"]/);
    expect(src).not.toMatch(/from ['"]@\/components\/three\/MissionSocScene['"]/);
  });

  it('uses the missions API for start/action/complete and the lab API for the terminal', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('missionsApi.start(missionId)');
    expect(src).toContain("missionsApi.action(attempt.id");
    expect(src).toContain('missionsApi.complete(attempt.id)');
    expect(src).toContain('labsApi.exec(session.id');
    expect(src).toContain("recordVerifiedLabCompletion(MISSION_LAB_ID");
  });

  it('falls back to the 2D topology when the renderer fails', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('onRendererFailed={handleRendererFailed}');
    expect(src).toContain("setViewPersisted('2d')");
    expect(src).toContain('<MissionTopology');
  });

  it('shows no objectives checklist or progress count on the page — the terminal is the only place to check', () => {
    // The page must not show where the student stands: no checklist panel,
    // no 7/9 or % progress. `objectives` / `progress` / `hint` in the
    // Mission Console are the only way to check.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).not.toContain('Mission Objectives');
    expect(src).not.toContain('ProgressBar');
    expect(src).not.toContain('passedCount');
    expect(src).not.toContain('BLOCKED ✓');
    expect(src).not.toContain('incident contained');
    // ...but the page does instruct the student to use the terminal.
    expect(src).toContain('run `objectives` to see where you stand');
    expect(src).toContain('Where do you stand?');
  });

  it('refreshes the mission objectives on check, so the terminal list never goes stale', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('missionsApi.getAttempt(attempt.id)');
    expect(src).toContain('mission objectives complete');
  });

  it('refreshes the session from firewall exec responses, so the rules read-back stays current', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('handleFirewallExec');
    expect(src).toContain('if (res && res.session) setSession(res.session)');
    expect(src).toContain('onExec={handleFirewallExec}');
  });
});

describe('formatObjectives', () => {
  const objectives = [
    { id: 'deny-guest', label: 'Block the intruder', passed: true },
    { id: 'trusted-allowed', label: 'Prove friends still get in', passed: false },
    { id: 'report', label: 'File the mission report', passed: false },
  ];

  it('renders the terminal listing with [x]/[ ] matching the passed flags', () => {
    const out = formatObjectives(objectives);
    expect(out).toContain('Mission objectives (1/3 objectives complete):');
    expect(out).toContain('[x] Block the intruder');
    expect(out).toContain('[ ] Prove friends still get in');
    expect(out).toContain('[ ] File the mission report');
  });

  it('falls back to the objective id when no label is present', () => {
    expect(formatObjectives([{ id: 'topology', passed: true }])).toContain('[x] Inspect every device in the topology');
  });

  it('reports zero of zero for an empty list', () => {
    expect(formatObjectives([])).toContain('Mission objectives (0/0 objectives complete):');
  });
});
