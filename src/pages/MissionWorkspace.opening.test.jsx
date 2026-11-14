import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import MissionWorkspace from './MissionWorkspace';

// Behavioural reproduction for the live camera-tour defect (2026-11-14):
// two live checks (PR #63, PR #66) never saw the mission opening's device
// showcase dwell on PC1/GUEST/R1/SRV. The phase machine is only covered by
// source-string assertions elsewhere, so this mounts the real workspace
// with the network + voice stubbed and drives the whole opening on fake
// timers, reading the phase back from the SOC card's caption
// ("Equipment tour — <device>") and the Skip button.
//
// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BRIEF = [
  'Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.',
  'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
  'Correct the configuration with least privilege — block the intruder, keep legitimate traffic flowing — then document the incident and file your report.',
  'Check where you stand in the Mission Console: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown.',
];

const MISSION_DEF = {
  id: 'op-broken-shield',
  title: 'Operation Broken Shield',
  callsign: 'OPERATION BROKEN SHIELD',
  brief: BRIEF,
  xp: 80,
  description: 'Broken Shield',
};

const OBJECTIVES = [
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

const START_RESPONSE = {
  attempt: { id: 'att-1', status: 'IN_PROGRESS' },
  resumed: false,
  session: { id: 'sess-1', status: 'ACTIVE', validation_results: [] },
  objectives: OBJECTIVES,
};

// The voice is the phase machine's clock: each briefing turn plays, then
// ends, and the machine advances when loading and playing are both false.
// The fake speaks each turn for 2 s of fake time after a 0.3 s fetch.
const voiceControl = vi.hoisted(() => ({ playCalls: [] }));
const startControl = vi.hoisted(() => ({ resumed: false }));

vi.mock('@/api/missions', () => ({
  missionsApi: {
    getMission: vi.fn(async () => MISSION_DEF),
    start: vi.fn(async () => ({ ...START_RESPONSE, resumed: startControl.resumed })),
    getAttempt: vi.fn(async () => ({ attempt: { id: 'att-1' }, objectives: OBJECTIVES })),
    action: vi.fn(async () => ({})),
    complete: vi.fn(async () => ({})),
    history: vi.fn(async () => []),
  },
}));

vi.mock('@/api/labs', () => ({
  labsApi: {
    listDefinitions: vi.fn(async () => []),
    history: vi.fn(async () => []),
    start: vi.fn(async () => ({ id: 'sess-1' })),
    getSession: vi.fn(async () => ({ id: 'sess-1', status: 'ACTIVE' })),
    recordFindings: vi.fn(async () => ({})),
    exec: vi.fn(async () => ({ output: '', exit_code: 0 })),
    validate: vi.fn(async () => ({ id: 'sess-1', status: 'ACTIVE', progress: {} })),
    reset: vi.fn(async () => ({ id: 'sess-1', status: 'ACTIVE' })),
    destroy: vi.fn(async () => null),
  },
}));

vi.mock('@/api/voice', async () => {
  const React = await import('react');
  function useCypherVoice() {
    const [playing, setPlaying] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [subtitle, setSubtitle] = React.useState('');
    const play = React.useCallback(async (text) => {
      voiceControl.playCalls.push(text);
      setLoading(true);
      setSubtitle(text);
      setTimeout(() => {
        setLoading(false);
        setPlaying(true);
      }, 300);
      setTimeout(() => {
        setPlaying(false);
        setSubtitle('');
      }, 2300);
      return text;
    }, []);
    const stop = React.useCallback(() => {
      setPlaying(false);
      setLoading(false);
      setSubtitle('');
    }, []);
    return {
      play, stop, playing, loading, fallback: false, error: '', subtitle,
      muted: false, setMuted: () => {}, volume: 0.9, setVolume: () => {},
    };
  }
  return { useCypherVoice, __clearVoiceCache: () => {} };
});

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

function renderWorkspace() {
  return TestRenderer.create(
    <StaticRouter location="/missions/op-broken-shield">
      <Routes>
        <Route path="/missions/:missionId" element={<MissionWorkspace />} />
      </Routes>
    </StaticRouter>,
  );
}

/** The SOC card's opening caption (aria-live) — the phase readout. */
function captionOf(root) {
  const nodes = root.findAllByProps({ 'aria-live': 'polite' });
  if (!nodes.length) return null;
  const text = nodes[0].children.filter((c) => typeof c === 'string').join('');
  return text || null;
}

function skipVisible(root) {
  return root.findAll(
    (node) => node.type === 'button'
      && Array.isArray(node.children)
      && node.children.includes('Skip intro'),
  ).length > 0;
}

async function flush() {
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
}

async function advance(ms) {
  // Step in small increments: fake timers fire synchronously inside one
  // advanceTimersByTime call, so a single big jump batches every state
  // update in the window into one render — the phase machine never sees
  // `playing` go true and then false as separate renders, and its 400 ms
  // advance timer lands at the end of the window instead of mid-window.
  // The real browser commits each timer's update separately; stepping
  // reproduces that.
  let remaining = ms;
  while (remaining > 0) {
    const step = Math.min(100, remaining);
    await act(async () => {
      vi.advanceTimersByTime(step);
    });
    await flush();
    remaining -= step;
  }
}

describe('MissionWorkspace opening — device showcase (live defect repro)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    voiceControl.playCalls.length = 0;
    startControl.resumed = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('runs the full opening on a fresh attempt: briefing turns, then a 4 s dwell per device, then done', async () => {
    let renderer;
    await act(async () => {
      renderer = renderWorkspace();
    });
    await flush();
    const root = renderer.root;

    // The mission loaded and the opening started.
    expect(captionOf(root)).toBe('Opening the SOC…');
    expect(skipVisible(root)).toBe(true);

    // Cinematic open (1.8 s) -> briefing turn 1 (Cypher opens).
    await advance(2000);
    expect(voiceControl.playCalls).toHaveLength(1);
    expect(voiceControl.playCalls[0]).toContain('Orion Technologies');

    // Each turn: 0.3 s fetch, 2 s of audio, then a 0.4 s advance.
    // Turn 2 is Sentinel (topology), turn 3 is Patch (least privilege),
    // turn 4 is Cypher closing (console instructions).
    await advance(300 + 2000 + 500);
    expect(voiceControl.playCalls).toHaveLength(2);
    expect(voiceControl.playCalls[1]).toContain('topology');
    await advance(300 + 2000 + 500);
    expect(voiceControl.playCalls).toHaveLength(3);
    expect(voiceControl.playCalls[2]).toContain('least privilege');
    await advance(300 + 2000 + 500);
    expect(voiceControl.playCalls).toHaveLength(4);
    expect(voiceControl.playCalls[3]).toContain('Mission Console');

    // Past the last turn the opening enters the showcase: one device at
    // a time, 4 s each, in network-path order. The last turn's audio still
    // has to finish first (2 s) plus the 0.4 s advance, like the others.
    await advance(300 + 2000 + 500);
    expect(captionOf(root)).toBe('Equipment tour — PC1');
    await advance(4000);
    expect(captionOf(root)).toBe('Equipment tour — GUEST');
    await advance(4000);
    expect(captionOf(root)).toBe('Equipment tour — R1');
    await advance(4000);
    expect(captionOf(root)).toBe('Equipment tour — SRV');
    await advance(4000);
    // Showcase over: no caption, no Skip button — the mission is handed over.
    expect(captionOf(root)).toBeNull();
    expect(skipVisible(root)).toBe(false);
    expect(voiceControl.playCalls).toHaveLength(4);

    await act(async () => { renderer.unmount(); });
  });

  it('a resumed attempt skips the opening entirely — no briefing, no showcase', async () => {
    // By design: the opening plays only on a fresh attempt. A resumed
    // learner is mid-mission, not watching an intro (MissionWorkspace
    // fresh-vs-resumed effect). So a resumed attempt must never speak a
    // briefing turn and never show the tour caption.
    startControl.resumed = true;
    let renderer;
    await act(async () => {
      renderer = renderWorkspace();
    });
    await flush();
    const root = renderer.root;
    expect(captionOf(root)).toBeNull();
    expect(skipVisible(root)).toBe(false);
    await advance(10000);
    expect(voiceControl.playCalls).toHaveLength(0);
    expect(captionOf(root)).toBeNull();
    expect(skipVisible(root)).toBe(false);

    await act(async () => { renderer.unmount(); });
  });
});
