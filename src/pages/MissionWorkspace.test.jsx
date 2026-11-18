import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
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

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { WS_OBJECTIVES, WS_MISSION_DEF, WS_SESSION, WS_START } = vi.hoisted(() => {
  const WS_OBJECTIVES = [
    { id: 'topology', label: 'Inspect every device in the topology', passed: false },
    { id: 'firewall-inspect', label: 'Read the firewall rules', passed: false },
    { id: 'deny-guest', label: 'Block the intruder', passed: false },
    { id: 'permit-others', label: 'Keep the door open for friends', passed: false },
    { id: 'apply', label: 'Apply the rule where it counts', passed: false },
    { id: 'guest-blocked', label: 'Prove the guest is locked out', passed: false },
    { id: 'trusted-allowed', label: 'Prove friends still get in', passed: false },
    { id: 'document', label: 'Write up the incident', passed: false },
    { id: 'report', label: 'File the mission report', passed: false },
  ];
  const WS_MISSION_DEF = {
    id: 'op-broken-shield',
    title: 'Operation Broken Shield',
    callsign: 'OPERATION BROKEN SHIELD',
    brief: [
      'Orion Technologies — unauthorized traffic detected between two network segments.',
      'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
    ],
    xp: 80,
    description: 'Broken Shield',
    lab_id: 'net-acl-001',
    lesson_id: 'net-security',
    objectives: WS_OBJECTIVES,
  };
  const WS_SESSION = {
    id: 'sess-1', status: 'ACTIVE', validation_results: [], findings: { config: {} },
  };
  const WS_START = {
    attempt: { id: 'att-1', status: 'IN_PROGRESS', findings: {} },
    resumed: false,
    session: WS_SESSION,
    objectives: WS_OBJECTIVES,
  };
  return { WS_OBJECTIVES, WS_MISSION_DEF, WS_SESSION, WS_START };
});

vi.mock('@/api/missions', () => ({
  missionsApi: {
    getMission: vi.fn(async () => WS_MISSION_DEF),
    start: vi.fn(async () => WS_START),
    getAttempt: vi.fn(async () => ({ attempt: WS_START.attempt, session: WS_SESSION, objectives: WS_OBJECTIVES })),
    action: vi.fn(async () => ({})),
    complete: vi.fn(async () => ({})),
    history: vi.fn(async () => []),
  },
}));

vi.mock('@/api/labs', () => ({
  labsApi: {
    // Every lab exec fails at the network: the transient failure the live
    // terminal page hit during the 2026-11-16 deploy window.
    exec: vi.fn(async () => { throw new TypeError('Failed to fetch'); }),
    validate: vi.fn(async () => WS_SESSION),
    reset: vi.fn(async () => WS_SESSION),
    recordFindings: vi.fn(async () => ({})),
  },
}));

vi.mock('@/api/voice', () => ({
  useCypherVoice: () => ({
    play: vi.fn(async () => {}),
    stop: vi.fn(),
    playing: false,
    loading: false,
    fallback: false,
    error: '',
    subtitle: '',
    muted: false,
    setMuted: () => {},
    volume: 0.9,
    setVolume: () => {},
  }),
  __clearVoiceCache: () => {},
}));

vi.mock('@/api/analytics', () => ({ logCypherEvent: vi.fn() }));

vi.mock('@/components/academy/tutor/TutorAssist', async (importOriginal) => ({
  ...(await importOriginal()),
  useTutorEnabled: () => false,
  useTutor: () => ({
    text: '', loading: false, error: '', ask: vi.fn(), stop: vi.fn(),
  }),
  TutorText: () => null,
  Thinking: () => null,
}));

vi.mock('@/lib/academy', async (importOriginal) => ({
  ...(await importOriginal()),
  recordMissionCompletion: vi.fn(),
  recordVerifiedLabCompletion: vi.fn(),
}));

vi.mock('@/hooks/useDocumentTitle', () => ({ default: () => {} }));
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
  ThemeProvider: ({ children }) => children,
}));
vi.mock('@/components/UpgradePrompt', () => ({ default: () => null }));

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
        <StaticRouter location={{ pathname: '/missions/op-broken-shield/terminal', state: { briefed: true } }}>
          <Routes>
            <Route path="/missions/:missionId/terminal" element={<MissionWorkspace />} />
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

  it('loads no 3D at all — the room lives on the briefing screen, three.js never enters this page', () => {
    // The split (2026-11-16): /missions/:missionId is the briefing
    // screen (the 3D room, route-lazy); this terminal page must never
    // load the 3D bundle. Nothing in this file may mention the scene or
    // import anything from the three.js components.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).not.toContain('MissionSocScene');
    expect(src).not.toContain('components/three/');
    expect(src).not.toMatch(/^import .* from ['"]three['"]/m);
  });

  it('uses the missions API for start/action/complete and the lab API for the terminal', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('missionsApi.start(missionId)');
    expect(src).toContain("missionsApi.action(attempt.id");
    expect(src).toContain('missionsApi.complete(attempt.id)');
    expect(src).toContain('labsApi.exec(session.id');
    expect(src).toContain('recordVerifiedLabCompletion(labId,');
  });

  it('keeps the 2D topology as the inspection tool — the 3D room lives on the briefing screen', () => {
    // The split (2026-11-16): the terminal page has no 3D room, so the
    // topology is the inspection tool — click each device, the objective
    // passes once all four are inspected. No renderer fallback exists
    // here anymore (there is no renderer to fail).
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('<MissionTopology');
    expect(src).toContain('Topology — inspect the devices');
    expect(src).toContain('onInspect={onInspect}');
    expect(src).not.toContain('handleRendererFailed');
    expect(src).not.toContain('SOC Room');
  });

  it('puts the console + incident report beside the topology + firewall on wide desktops — no scrolling to the bottom', () => {
    // Live complaint (2026-11-16): the incident report sat at the bottom
    // of a long vertical stack, and wide desktop monitors had unused room
    // on both sides. On wide desktops the page is three columns — the
    // transmission + brief cluster left, the topology + firewall centre,
    // the console + incident report right — so the key cards are in the
    // first viewport. The 1810 px gate is kept from the pre-split layout
    // (the room rationale no longer applies — the room lives on the
    // briefing screen — but the gate is the documented boundary): below
    // it the two-column stacked layout stands.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('min-[1810px]:grid-cols-[16rem_minmax(0,1fr)_20rem]');
    expect(src).toContain('min-[1810px]:max-w-[112rem]');
    // The centre column (topology + firewall) is row 1 centre on wide
    // desktops.
    expect(src).toContain('min-[1810px]:col-start-2 min-[1810px]:row-start-1');
    // The console + incident report rail is the right column on wide
    // desktops, and the "below" wording is gone (the console is beside
    // the centre column now, not below it).
    expect(src).toContain('min-[1810px]:col-start-3 min-[1810px]:row-start-1');
    expect(src).not.toContain('Check the Mission Console below');
  });

  it('generalizes beyond Broken Shield: only the SOC mission gets the topology + firewall', () => {
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    // No mission/lab/lesson id is hardcoded anymore — the shape comes from
    // the route's mission id, the lab + lesson from the API.
    expect(src).not.toContain('MISSION_LAB_ID');
    expect(src).not.toContain('MISSION_LESSON_ID');
    expect(src).toContain('missionId === SOC_MISSION_ID');
    expect(src).toContain('missionDef?.lab_id || session?.lab_id');
    expect(src).toContain('missionDef?.lesson_id');
    // Terminal missions skip the topology, the firewall console and the
    // traffic test — and attest lab objectives + report the flooder
    // instead.
    expect(src).toContain('!isSocMission');
    expect(src).toContain('FloodReportForm');
    expect(src).toContain('MissionLabObjectives');
    expect(src).toContain('attestLabObjective');
    expect(src).toContain('report_flooder');
    expect(src).toContain('Your evidence');
  });

  it('never awards lab XP for an attested-only completion', () => {
    // Spencer's 2026-11-11 rule, same gate as LabWorkspace: the Wireshark
    // lab's objectives are "I did this", so its session is attested and
    // recordVerifiedLabCompletion must not run for it.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toMatch(/if \(!session\.attested && labId\) \{\s*recordVerifiedLabCompletion\(labId/);
  });

  it('drops the "Hear the briefing" wording and Listen button — only the sound controls stay', () => {
    // Spencer (2026-11-14): "No need to have any wording there." The
    // briefing plays on the briefing screen now (the robots read it
    // there), so the card's heading, its explanatory paragraph and the
    // Listen button are gone. The sound controls stay (mute + volume)
    // via the button's controlsOnly mode, so the learner can re-listen.
    // The "Where do you stand?" card and the XP line are untouched
    // (see the checklist test above).
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).not.toContain('Hear the briefing');
    expect(src).not.toContain('Listen to the briefing');
    expect(src).not.toContain('reads Sentinel’s briefing out loud');
    expect(src).not.toContain('The words show as subtitles');
    expect(src).toContain('controlsOnly');
    expect(src).not.toContain('onPlayingChange');
  });

  it('explains the outcome in the SOC room automatically — no explain button on the terminal', () => {
    // Spencer (2026-11-18): no "Ask Cypher to explain the outcome" button on
    // a card. Completing the mission requests the explanation at once and
    // the SOC closing scene speaks it, nobody has to ask. Behaviour is
    // covered by MissionWorkspace.debrief.test.jsx; this pins the wiring.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).not.toContain('Ask Cypher to explain the outcome');
    expect(src).not.toContain('Hear Cypher say it');
    expect(src).toContain('if (tutorEnabled) askOutcome(res, res.objectives || objectives);');
    expect(src).toContain('<SocClosing');
    // The console can finish the mission too.
    expect(src).toContain("if (c === 'complete' || c === 'completed')");
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

  it('never promotes a terminal command failure to the page-level error banner', () => {
    // Live defect (2026-11-16): a transient "Failed to fetch" from one
    // terminal command left a permanent banner under the topology even
    // though the diagram rendered fine — LabTerminal's onError fed the
    // page error, and nothing cleared it after recovery. Command errors
    // show inline in the terminal only; the banner is for action/load
    // failures (doAction, reset, …), which clear on the next action.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).not.toContain('onError={setError}');
    expect(src).toContain('{error && (');
    expect(src).toContain("setError(friendlyErrorMessage(e))");
  });

  it('keeps the three wide-desktop columns equal height — the firewall card must not hang lower', () => {
    // Live report (2026-11-16): at the 1810 px three-column layout the
    // Firewall console card hung lower than the Traffic test (left) and
    // Incident report (right) cards. The grid stretches the columns and
    // each column is a flex column whose LAST card grows to the tallest
    // column's height, so the three bottom edges sit exactly level.
    const src = readFileSync(join(ROOT, 'src/pages/MissionWorkspace.jsx'), 'utf8');
    expect(src).toContain('items-stretch');
    expect(src.match(/className="flex flex-col gap-4/g)).toHaveLength(3);
    for (const heading of ['Traffic test', 'Firewall console — R1, access-list 10', 'Incident report']) {
      // The <h2> itself (the heading also appears in comments, so match
      // the element, not the bare string).
      const i = src.indexOf(`<h2 className="text-heading text-ink-1">${heading}</h2>`);
      expect(i).toBeGreaterThan(0);
      expect(src.slice(Math.max(0, i - 200), i)).toContain('flex-1');
    }
    // The stretched incident card stays intentional: its form fills the
    // card and the submit button anchors at the card's bottom.
    const formSrc = readFileSync(join(ROOT, 'src/components/missions/IncidentReportForm.jsx'), 'utf8');
    expect(formSrc).toContain('flex h-full flex-col gap-3');
    expect(formSrc).toContain('mt-auto');
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

function wsTextOf(root) {
  return root.findAll((node) => typeof node.children?.join === 'function')
    .flatMap((node) => node.children)
    .filter((c) => typeof c === 'string')
    .join(' ');
}

async function wsFlush() {
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
}

describe('MissionWorkspace — failed terminal command (live 2026-11-16)', () => {
  it('shows no page-level error banner when a command fails at the network — the topology still renders', async () => {
    // Regression for the live report: under "View your lab topology" the
    // page showed "Failed to fetch lab" while the diagram displayed fine.
    // A failed command shows inline in the terminal (friendly text) and
    // never promotes to the page banner; the topology is static SVG and
    // renders regardless.
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <StaticRouter location={{ pathname: '/missions/op-broken-shield/terminal', state: { briefed: true } }}>
          <Routes>
            <Route path="/missions/:missionId/terminal" element={<MissionWorkspace />} />
          </Routes>
        </StaticRouter>,
      );
    });
    await wsFlush();
    const root = renderer.root;
    const text = wsTextOf(root);
    expect(text).toContain('Topology — inspect the devices');
    expect(text).toContain('Mission Console');

    const input = root.findByProps({ 'aria-label': 'Terminal command' });
    await act(async () => {
      input.props.onChange({ target: { value: 'show access-lists' } });
    });
    // Two <form>s live on this page (the terminal + the incident report):
    // submit the one that owns the terminal input.
    const termForm = root.findAllByType('form').find(
      (f) => f.findAllByProps({ 'aria-label': 'Terminal command' }).length > 0,
    );
    expect(termForm).toBeTruthy();
    await act(async () => {
      termForm.props.onSubmit({ preventDefault: () => {} });
    });
    await wsFlush();

    const after = wsTextOf(renderer.root);
    // The terminal shows the failure inline, in plain language…
    expect(after).toContain('Could not reach the server — check your connection and try again.');
    // …and the raw fetch text reaches the learner nowhere.
    expect(after).not.toContain('Failed to fetch');
    // …and no page-level danger banner exists (the banner's <p> is the
    // only text-danger node this page renders when nothing was filed).
    const danger = renderer.root.findAll(
      (n) => typeof n.props?.className === 'string' && n.props.className.includes('text-danger'),
    );
    expect(danger).toHaveLength(0);
    // The topology is still there.
    expect(after).toContain('Topology — inspect the devices');

    await act(async () => { renderer.unmount(); });
  });
});
