import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import MissionWorkspace from './MissionWorkspace';

// Debrief auto-play (Spencer, 2026-11-16): he finished Operation Broken
// Shield with a perfect score and tapping "Ask Cypher to explain the
// outcome" only WROTE the debrief — no voice — with a separate "Hear
// Cypher say it" button to press. One tap must now give text AND voice
// together (the PR #78 listen-first pattern), the Hear button is gone,
// and the spoken outcome starts with the congratulation from the server
// debrief ("Great job completing … with a perfect score! …").
//
// Same mock harness as the flood test (network + voice stubbed), but the
// mission is Broken Shield with the report already filed, so the
// "Complete mission — debrief" button is on the page.
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
  lab_id: 'net-acl-001',
  lesson_id: 'net-security',
  title: 'Operation Broken Shield',
  callsign: 'OPERATION BROKEN SHIELD',
  brief: BRIEF,
  xp: 80,
  description: 'Broken Shield',
  objectives: [
    { id: 'topology', label: 'Inspect every device in the topology', hints: ['Open the SOC view and click each device: R1, PC1, GUEST, SRV'] },
    { id: 'firewall-inspect', label: 'Read the firewall rules', hints: ['Open the firewall console and review the current rules — an empty ACL is the incident'] },
    { id: 'deny-guest', label: 'Block the intruder', hints: ['Deny the guest network.'] },
    { id: 'permit-others', label: 'Keep the door open for friends', hints: ['Permit the trusted networks.'] },
    { id: 'apply', label: 'Apply the rule where it counts', hints: ['Apply the ACL to the interface.'] },
    { id: 'guest-blocked', label: 'Prove the guest is locked out', hints: ['Test traffic from the guest.'] },
    { id: 'trusted-allowed', label: 'Prove friends still get in', hints: ['Test traffic from a trusted host.'] },
    { id: 'document', label: 'Write up the incident', hints: ['Write what happened, the unauthorized path, and the fix you applied'] },
    { id: 'report', label: 'File the mission report', hints: ['File the report once every other objective passes'] },
  ],
};

const OBJECTIVES = MISSION_DEF.objectives.map((o) => ({
  id: o.id, label: o.label, passed: true, message: 'ok',
}));

const ATTEMPT = {
  id: 'att-1',
  mission_id: 'op-broken-shield',
  status: 'IN_PROGRESS',
  score: null,
  xp_awarded: 0,
  objectives_passed: OBJECTIVES.map((o) => o.id),
  findings: {
    version: 1,
    topology: { inspected: ['R1', 'PC1', 'GUEST', 'SRV'] },
    firewall: { inspected: true },
    incident_report: { summary: 'Guest reached the servers.', root_cause: 'Empty ACL on R1.', fix: 'Deny guest, permit trusted.', submitted: true },
    incident_report_draft: { summary: '', root_cause: '', fix: '' },
  },
  choices: [],
  lab_session_id: 'sess-1',
  started_at: null,
  completed_at: null,
};

const SESSION = {
  id: 'sess-1',
  lab_id: 'net-acl-001',
  status: 'ACTIVE',
  validation_results: [],
  findings: { config: [] },
  progress: {},
  attested: false,
};

const START_RESPONSE = {
  attempt: ATTEMPT,
  resumed: false,
  session: SESSION,
  objectives: OBJECTIVES,
};

const DEBRIEF = {
  score: 100,
  xp_awarded: 80,
  debrief: 'Great job completing Operation Broken Shield with a perfect score! You blocked the unauthorized path and kept legitimate traffic flowing.',
  attempt: { ...ATTEMPT, status: 'COMPLETED' },
  objectives: OBJECTIVES,
};

const EXPLANATION = 'You blocked the guest while keeping trusted traffic flowing — least privilege done right. Next, review ACL ordering.';

const voiceControl = vi.hoisted(() => ({
  playCalls: [], setPlaying: null, setLoading: null,
}));
const tutorControl = vi.hoisted(() => ({ explanation: 'You blocked the guest while keeping trusted traffic flowing — least privilege done right. Next, review ACL ordering.' }));

vi.mock('@/api/missions', () => ({
  missionsApi: {
    getMission: vi.fn(async () => MISSION_DEF),
    start: vi.fn(async () => START_RESPONSE),
    getAttempt: vi.fn(async () => ({ attempt: ATTEMPT, session: SESSION, objectives: OBJECTIVES })),
    action: vi.fn(async () => ({ attempt: ATTEMPT, session: SESSION, objectives: OBJECTIVES })),
    complete: vi.fn(async () => DEBRIEF),
    listDefinitions: vi.fn(async () => ({ missions: [
      { id: 'op-broken-shield', title: 'Operation Broken Shield' },
      { id: 'op-packet-flood', title: 'Operation Packet Flood' },
    ] })),
    history: vi.fn(async () => []),
  },
}));

vi.mock('@/api/labs', () => ({
  labsApi: {
    listDefinitions: vi.fn(async () => []),
    history: vi.fn(async () => []),
    start: vi.fn(async () => ({ id: 'sess-1' })),
    getSession: vi.fn(async () => SESSION),
    recordFindings: vi.fn(async () => ({})),
    exec: vi.fn(async () => ({ output: '', exit_code: 0 })),
    validate: vi.fn(async () => SESSION),
    reset: vi.fn(async () => SESSION),
    destroy: vi.fn(async () => null),
  },
}));

vi.mock('@/api/voice', async () => {
  const React = await import('react');
  function useCypherVoice() {
    const [playing, setPlaying] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [subtitle, setSubtitle] = React.useState('');
    if (voiceControl.setPlaying === null) {
      voiceControl.setPlaying = setPlaying;
      voiceControl.setLoading = setLoading;
    }
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
  return { useCypherVoice, fetchVoiceStatus: async () => ({ characters: {} }), __clearVoiceCache: () => {} };
});

vi.mock('@/api/analytics', () => ({ logCypherEvent: vi.fn() }));

vi.mock('@/components/academy/tutor/TutorAssist', async (importOriginal) => {
  const React = await import('react');
  const actual = await importOriginal();
  function useTutor() {
    const [text, setText] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const ask = React.useCallback(async () => {
      setText('');
      setError('');
      setLoading(true);
      setTimeout(() => {
        setText(tutorControl.explanation);
        setLoading(false);
      }, 300);
      return tutorControl.explanation;
    }, []);
    const stop = React.useCallback(() => { setLoading(false); }, []);
    return { text, loading, error, ask, stop };
  }
  return {
    ...actual,
    useTutorEnabled: () => true,
    useTutor,
  };
});

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
    <StaticRouter location={{ pathname: '/missions/op-broken-shield/terminal', state: { briefed: true } }}>
      <Routes>
        <Route path="/missions/:missionId/terminal" element={<MissionWorkspace />} />
      </Routes>
    </StaticRouter>,
  );
}

/** True when any rendered node contains the text. */
function hasText(root, text) {
  return root.findAll(
    (node) => Array.isArray(node.children)
      && node.children.some((c) => typeof c === 'string' && c.includes(text)),
  ).length > 0;
}

function findButton(root, label) {
  return root.findAll(
    (node) => node.type === 'button'
      && Array.isArray(node.children)
      && node.children.some((c) => typeof c === 'string' && c.includes(label)),
  )[0];
}

async function flush() {
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
}

async function advance(ms) {
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

describe('MissionWorkspace — debrief auto-play (perfect score)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    voiceControl.playCalls.length = 0;
    voiceControl.setPlaying = null;
    voiceControl.setLoading = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('one tap on "Ask Cypher to explain the outcome" shows the text AND speaks it, congratulation first — no "Hear Cypher say it" button', async () => {
    let renderer;
    await act(async () => {
      renderer = renderWorkspace();
    });
    await flush();
    const root = renderer.root;

    // The report is filed, so the debrief button is on the page.
    const completeButton = findButton(root, 'Complete mission — debrief');
    expect(completeButton).toBeTruthy();
    await act(async () => { await completeButton.props.onClick(); });
    await flush();

    // Completing brings the SOC room back over the terminal (Spencer,
    // 2026-11-18): the robots congratulate the learner and announce the
    // next mission. Skip to its end card, which names the next mission.
    expect(root.findAll((n) => n.props?.role === 'dialog').length).toBe(1);
    await act(async () => { findButton(root, 'Skip').props.onClick(); });
    await flush();
    expect(hasText(root, 'Operation Packet Flood')).toBe(true);
    expect(hasText(root, 'Start next mission')).toBe(true);
    // "Review my results" closes the SOC layer, revealing the debrief.
    await act(async () => { findButton(root, 'Review my results').props.onClick(); });
    await flush();
    expect(root.findAll((n) => n.props?.role === 'dialog').length).toBe(0);
    expect(voiceControl.playCalls).toHaveLength(0);

    // The debrief card is up: perfect score, the server debrief text,
    // and the tutor section with its single Ask button.
    expect(hasText(root, 'Mission complete.')).toBe(true);
    expect(hasText(root, 'Great job completing Operation Broken Shield with a perfect score!')).toBe(true);
    expect(hasText(root, 'Cypher explains the outcome')).toBe(true);
    const askButton = findButton(root, 'Ask Cypher to explain the outcome');
    expect(askButton).toBeTruthy();

    // One tap: the explanation text arrives…
    await act(async () => { await askButton.props.onClick(); });
    await advance(1000);
    expect(hasText(root, 'least privilege done right')).toBe(true);

    // …and Cypher speaks it at the same time — no second tap. The
    // spoken outcome is the server debrief first (it opens with the
    // congratulation) and then the explanation.
    expect(voiceControl.playCalls).toHaveLength(1);
    expect(voiceControl.playCalls[0]).toContain('Great job completing Operation Broken Shield with a perfect score!');
    expect(voiceControl.playCalls[0]).toContain('least privilege done right');
    // While speaking, only Stop shows — the "Hear Cypher say it"
    // button is gone entirely.
    expect(findButton(root, 'Hear Cypher say it')).toBeFalsy();
    expect(findButton(root, 'Stop')).toBeTruthy();

    await act(async () => { renderer.unmount(); });
  });
});
