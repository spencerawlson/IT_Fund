import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThemeProvider } from '@/components/ThemeProvider';
import MissionWorkspace from './MissionWorkspace';

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
});
