import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import MissionWorkspace from './MissionWorkspace';

// Terminal-only mission (Operation Packet Flood): the workspace must render
// the lab's real shell, the attestation list and the flooder report — and
// NONE of Broken Shield's SOC room: no 3D/2D topology, no firewall console,
// no traffic test, no cinematic opening. Same mock harness as
// MissionWorkspace.opening.test.jsx (network + voice stubbed), but the
// mission served is the flood one.
//
// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BRIEF = [
  'Orion Technologies — the intranet barely responds and the link is saturated. Users report the network crawling, and nobody knows why yet.',
  'Investigate the network segment: capture the traffic with Wireshark or tcpdump, and find which host is flooding it — and what kind of flood it is.',
  'Once you know the source, correct the configuration to stop the flood at its source and keep legitimate traffic flowing — then document the incident and file your report.',
  'Check where you stand in the Mission Console below: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown — after capturing, run `check` to re-validate first.',
];

const MISSION_DEF = {
  id: 'op-packet-flood',
  lab_id: 'tools-wireshark-001',
  lesson_id: 'net-troubleshoot',
  callsign: 'OPERATION PACKET FLOOD',
  brief: BRIEF,
  xp: 80,
  description: 'Packet Flood',
  objectives: [
    { id: 'open', label: 'Open the capture and list its packets', hints: ['tshark -r flood.pcap'] },
    { id: 'protocols', label: 'Identify the protocols in the capture', hints: ['tshark -r flood.pcap -q -z io,phs'] },
    { id: 'stream', label: 'Follow the HTTP login TCP stream', hints: ['tshark -r flood.pcap -q -z follow,tcp,ascii,0'] },
    { id: 'creds', label: 'Find the cleartext credentials', hints: ['Follow the login stream.'] },
    { id: 'exfil', label: 'Spot the DNS exfiltration', hints: ['tshark -r flood.pcap -Y dns'] },
    { id: 'writeup', label: 'Write up your findings', hints: ['echo your summary > findings.txt'] },
    { id: 'flood-source', label: 'Name the flooding host and the flood type', hints: ['Count packets per source.'] },
    { id: 'document', label: 'Document the incident', hints: ['Write what happened.'] },
    { id: 'report', label: 'Submit the mission report', hints: ['File the report once every other objective passes.'] },
  ],
};

const OBJECTIVES = MISSION_DEF.objectives.map((o) => ({
  id: o.id, label: o.label, passed: false, message: '',
}));

const ATTEMPT = {
  id: 'att-1',
  mission_id: 'op-packet-flood',
  status: 'in_progress',
  score: null,
  xp_awarded: 0,
  objectives_passed: [],
  findings: {
    version: 1,
    topology: { inspected: [] },
    firewall: { inspected: false },
    incident_report: { summary: '', root_cause: '', fix: '', submitted: false },
    incident_report_draft: { summary: '', root_cause: '', fix: '' },
    flood: { source_ip: '', flood_type: '' },
  },
  choices: [],
  lab_session_id: 'sess-1',
  started_at: null,
  completed_at: null,
};

const SESSION = {
  id: 'sess-1',
  lab_id: 'tools-wireshark-001',
  status: 'RUNNING',
  validation_results: [],
  findings: {},
  progress: {},
  attested: false,
};

const START_RESPONSE = {
  attempt: ATTEMPT,
  resumed: false,
  session: SESSION,
  objectives: OBJECTIVES,
  mission: MISSION_DEF,
};

const voiceControl = vi.hoisted(() => ({
  playCalls: [], stall: false, setPlaying: null, setLoading: null,
}));

vi.mock('@/api/missions', () => ({
  missionsApi: {
    getMission: vi.fn(async () => MISSION_DEF),
    start: vi.fn(async () => START_RESPONSE),
    getAttempt: vi.fn(async () => ({ attempt: ATTEMPT, session: SESSION, objectives: OBJECTIVES })),
    action: vi.fn(async () => ({ attempt: ATTEMPT, session: SESSION, objectives: OBJECTIVES })),
    complete: vi.fn(async () => ({})),
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
      if (!voiceControl.stall) {
        setTimeout(() => {
          setPlaying(false);
          setSubtitle('');
        }, 2300);
      }
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
    <StaticRouter location="/missions/op-packet-flood">
      <Routes>
        <Route path="/missions/:missionId" element={<MissionWorkspace />} />
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

describe('MissionWorkspace — Operation Packet Flood (terminal-only mission)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    voiceControl.playCalls.length = 0;
    voiceControl.stall = false;
    voiceControl.setPlaying = null;
    voiceControl.setLoading = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the terminal workspace: evidence, attestation list, flooder report, console — and no SOC room', async () => {
    let renderer;
    await act(async () => {
      renderer = renderWorkspace();
    });
    await flush();
    const root = renderer.root;

    // The mission loaded: callsign in the header, mission console present.
    expect(hasText(root, 'OPERATION PACKET FLOOD')).toBe(true);
    expect(hasText(root, 'Mission Console')).toBe(true);

    // Terminal mode: the evidence card replaces the SOC room, the lab
    // objectives attest in place, and the flooder report is its own card.
    expect(hasText(root, 'Your evidence')).toBe(true);
    expect(hasText(root, 'flood.pcap')).toBe(true);
    expect(hasText(root, 'Packet analysis')).toBe(true);
    expect(hasText(root, 'Open the capture and list its packets')).toBe(true);
    expect(hasText(root, 'I did this')).toBe(true);
    expect(hasText(root, 'Report the flooder')).toBe(true);
    expect(hasText(root, 'Flooding host (IP address)')).toBe(true);
    expect(hasText(root, 'Kind of flood')).toBe(true);
    expect(hasText(root, 'Incident report')).toBe(true);

    // None of Broken Shield's SOC surface may appear.
    expect(hasText(root, 'SOC Room')).toBe(false);
    expect(hasText(root, 'Firewall console')).toBe(false);
    expect(hasText(root, 'Traffic test')).toBe(false);
    expect(hasText(root, '2D topology')).toBe(false);
    expect(hasText(root, 'Skip intro')).toBe(false);

    // The Lesson button points at the flood mission's lesson.
    const lessonLinks = root.findAll(
      (node) => node.type === 'a' && typeof node.props?.href === 'string'
        && node.props.href.includes('/academy/lessons/net-troubleshoot'),
    );
    expect(lessonLinks.length).toBeGreaterThan(0);

    await act(async () => { renderer.unmount(); });
  });

  it('never plays the SOC opening for a terminal mission — no briefing turns, no tour', async () => {
    let renderer;
    await act(async () => {
      renderer = renderWorkspace();
    });
    await flush();
    const root = renderer.root;
    expect(hasText(root, 'Skip intro')).toBe(false);
    await advance(10000);
    expect(voiceControl.playCalls).toHaveLength(0);
    expect(hasText(root, 'Skip intro')).toBe(false);

    await act(async () => { renderer.unmount(); });
  });
});
