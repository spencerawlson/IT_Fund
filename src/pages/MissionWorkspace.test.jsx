import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';
import MissionWorkspace, {
  execWithSessionRecovery,
  formatObjectives,
  isSessionGoneError,
} from './MissionWorkspace';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Effects never run under SSR, so the page renders its loading state without
// any network — that is what this smoke test asserts. The live flow (start,
// inspect, report, debrief) is exercised against the real backend, not here.
// The page calls the tutor hooks, so it needs the QueryClient the app root
// always provides.
function renderWorkspace() {
  const queryClient = new QueryClient();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StaticRouter location="/missions/op-broken-shield">
          <Routes>
            <Route path="/missions/:missionId" element={<MissionWorkspace />} />
          </Routes>
        </StaticRouter>
      </ThemeProvider>
    </QueryClientProvider>,
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
    // The refresh runs through the session-recovery helper (which reports
    // each exec's session via onSession) — see execWithSessionRecovery.
    expect(src).toContain('execWithSessionRecovery');
    expect(src).toContain('onSession: setSession');
    expect(src).toContain('onExec={handleFirewallExec}');
  });

  it('records the mission XP in the learner XP ledger on completion (defect: debrief said 0 XP, dashboard unmoved)', () => {
    // The server returns xp_awarded, but a return value alone never reached
    // the dashboard — completeMission must bank it via recordMissionCompletion
    // (once per mission, amount from the server), or the award is invisible.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain("recordMissionCompletion(missionId, res.xp_awarded)");
    expect(src).toContain("import { recordMissionCompletion, recordVerifiedLabCompletion } from '@/lib/academy'");
  });

  it('shows the mission XP from the definition before completion', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('missionDef.xp');
    expect(src).toContain('First completion earns');
  });

  it('autosaves the incident-report draft server-side and restores it on resume (defect: draft lost on reload)', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    // The draft is saved through the save_draft action (debounced, flushed
    // on blur) and the form's initial values merge the filed report with
    // the saved draft, so a reload restores what was typed.
    expect(src).toContain("type: 'save_draft'");
    expect(src).toContain('DRAFT_SAVE_DELAY_MS');
    expect(src).toContain('incident_report_draft');
    expect(src).toContain('reportDraftInitial');
    expect(src).toContain('initial={reportDraftInitial}');
    expect(src).toContain('onDraftChange={handleDraftChange}');
    expect(src).toContain('onDraftBlur={flushDraft}');
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

describe('isSessionGoneError', () => {
  it('recognizes the backend not_found message', () => {
    expect(isSessionGoneError(new Error('Lab session not found.'))).toBe(true);
    const http404 = new Error('Lab session not found.');
    http404.status = 404;
    expect(isSessionGoneError(http404)).toBe(true);
  });

  it('does not treat other errors as a gone session', () => {
    expect(isSessionGoneError(new Error('boom'))).toBe(false);
    const rate = new Error('Lab rate limit reached. Slow down and try again shortly.');
    rate.status = 429;
    expect(isSessionGoneError(rate)).toBe(false);
    expect(isSessionGoneError(null)).toBe(false);
    expect(isSessionGoneError(undefined)).toBe(false);
  });
});

describe('execWithSessionRecovery', () => {
  // Regression for the live Apply-after-reset failure (2026-11-13 23:40
  // EST): after "Reset the lab", the Apply button failed with
  // "Failed to fetch" and then "Lab session not found." — the in-memory
  // lab session on the host was gone (backend restart) — and the console
  // had no recovery: every exec kept dying on the dead id until a manual
  // page reload. The exec wrapper now re-syncs the session from the
  // attempt and retries once with the live id.
  const ok = (sessionId) => ({ output: 'ok', exit_code: 0, session: { id: sessionId } });

  it('passes a successful exec straight through and reports the session', async () => {
    const seenSessions = [];
    const res = await execWithSessionRecovery({
      sessionId: 'sess-old',
      exec: async (id, command) => {
        expect(command).toBe('show access-lists');
        return ok(id);
      },
      refreshSession: async () => { throw new Error('must not be called'); },
      onSession: (s) => seenSessions.push(s.id),
      command: 'show access-lists',
    });
    expect(res.output).toBe('ok');
    expect(seenSessions).toEqual(['sess-old']);
  });

  it('re-syncs and retries with the live session id when the old one is gone', async () => {
    const used = [];
    const gone = new Error('Lab session not found.');
    gone.status = 404;
    const res = await execWithSessionRecovery({
      sessionId: 'sess-dead',
      exec: async (id) => {
        used.push(id);
        if (id === 'sess-dead') throw gone;
        return ok(id);
      },
      refreshSession: async () => ({ id: 'sess-live' }),
      onSession: () => {},
      command: 'show access-lists',
    });
    expect(res.output).toBe('ok');
    expect(used).toEqual(['sess-dead', 'sess-live']);
  });

  it('rethrows the original error when no live session comes back', async () => {
    const gone = new Error('Lab session not found.');
    gone.status = 404;
    let calls = 0;
    await expect(execWithSessionRecovery({
      sessionId: 'sess-dead',
      exec: async () => { calls += 1; throw gone; },
      refreshSession: async () => null,
      onSession: () => {},
      command: 'show access-lists',
    })).rejects.toThrow('Lab session not found.');
    expect(calls).toBe(1);
  });

  it('does not re-sync for errors that are not a gone session', async () => {
    const rate = new Error('Lab rate limit reached.');
    rate.status = 429;
    let refreshes = 0;
    await expect(execWithSessionRecovery({
      sessionId: 'sess-live',
      exec: async () => { throw rate; },
      refreshSession: async () => { refreshes += 1; return { id: 'sess-live' }; },
      onSession: () => {},
      command: 'show access-lists',
    })).rejects.toThrow('Lab rate limit reached.');
    expect(refreshes).toBe(0);
  });

  it('does not retry when the re-sync returns the same dead id', async () => {
    const gone = new Error('Lab session not found.');
    gone.status = 404;
    let calls = 0;
    await expect(execWithSessionRecovery({
      sessionId: 'sess-dead',
      exec: async () => { calls += 1; throw gone; },
      refreshSession: async () => ({ id: 'sess-dead' }),
      onSession: () => {},
      command: 'show access-lists',
    })).rejects.toThrow('Lab session not found.');
    expect(calls).toBe(1);
  });
});

describe('session recovery wiring', () => {
  it('reset recovers a gone session by re-starting the mission', () => {
    // When the lab session is gone, labsApi.reset on the dead id can
    // never work — the workspace must re-start the mission (the backend
    // abandons the dead attempt and hands back a fresh session), the same
    // recovery a page reload performs.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('isSessionGoneError');
    expect(src).toContain('missionsApi.start(missionId)');
  });
});
