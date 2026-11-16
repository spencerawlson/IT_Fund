import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import MissionBriefing from './MissionBriefing';

// Smoke + structure pins for the briefing screen (the split, 2026-11-16):
// it renders its loading state server-side, it shows the incoming
// transmission once the mission loads, and the heavy 3D code loads only
// here — route-lazy — never on the terminal page.
//
// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BRIEF = [
  'Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.',
  'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
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
];

vi.mock('@/api/missions', () => ({
  missionsApi: {
    getMission: vi.fn(async () => MISSION_DEF),
    start: vi.fn(async () => ({
      attempt: { id: 'att-1', status: 'IN_PROGRESS' },
      resumed: false,
      session: { id: 'sess-1', status: 'ACTIVE', validation_results: [] },
      objectives: OBJECTIVES,
    })),
    getAttempt: vi.fn(async () => ({})),
    action: vi.fn(async () => ({})),
    complete: vi.fn(async () => ({})),
    history: vi.fn(async () => []),
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

// The 3D scene + robot preload are mocked here: this smoke test only
// needs the briefing screen's own rendering (loading state +
// transmission), not the real three.js scene — and the lazy import is
// slow enough that it resolves after this file's environment tears down
// (EnvironmentTeardownError). The real scene path is covered by
// MissionBriefing.opening.test.jsx.
vi.mock('@/components/three/MissionSocScene', () => ({ default: () => null }));
vi.mock('@/components/three/RobotCharacter', () => ({ preloadMissionRobots: () => {} }));

function textOf(root) {
  return root.findAll((node) => typeof node.children?.join === 'function')
    .flatMap((node) => node.children)
    .filter((c) => typeof c === 'string')
    .join(' ');
}

async function flush() {
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
}

describe('MissionBriefing — smoke + split pins', () => {
  // Reduced-motion stub: MissionBrief types its text out character by
  // character, in full at once under prefers-reduced-motion — so the
  // stub makes the transmission assertable without waiting out the
  // typewriter. This file runs in the node environment (no jsdom
  // window), so the stub creates globalThis.window when it does not
  // exist yet.
  let savedWindow;
  beforeEach(() => {
    vi.clearAllMocks();
    savedWindow = globalThis.window;
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
    globalThis.window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (savedWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = savedWindow;
    }
  });

  it('renders its loading state server-side', () => {
    const html = renderToString(
      <StaticRouter location="/missions/op-broken-shield">
        <Routes>
          <Route path="/missions/:missionId" element={<MissionBriefing />} />
        </Routes>
      </StaticRouter>,
    );
    expect(html).toContain('Starting mission');
  });

  it('shows the incoming transmission once the mission loads', async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <StaticRouter location="/missions/op-broken-shield">
          <Routes>
            <Route path="/missions/:missionId" element={<MissionBriefing />} />
          </Routes>
        </StaticRouter>,
      );
    });
    await flush();
    const text = textOf(renderer.root);
    // The transmission card: the header plus the brief paragraphs the
    // robots read aloud — the learner sees the objective as text here
    // as well as hearing it.
    expect(text).toContain('INCOMING TRANSMISSION');
    expect(text).toContain('Orion Technologies');
    expect(text).toContain('OPERATION BROKEN SHIELD');
    // And the room card is on the page (its lazy scene is loading).
    expect(text).toContain('SOC Room');

    await act(async () => { renderer.unmount(); });
  });

  it('loads the 3D scene lazily — three.js enters only on this route', () => {
    const briefingSrc = readFileSync(
      new URL('./MissionBriefing.jsx', import.meta.url),
      'utf8',
    );
    const workspaceSrc = readFileSync(
      new URL('./MissionWorkspace.jsx', import.meta.url),
      'utf8',
    );
    // The room is a React.lazy dynamic import on the briefing screen…
    expect(briefingSrc).toContain(
      "React.lazy(() => import('@/components/three/MissionSocScene'))",
    );
    // …with no static import of the scene itself, its viewer, or
    // three directly (socLayout is imported statically for the showcase
    // order, and it pulls three in — expected: this route IS the 3D
    // screen. The point of the pin is the scene + robots stay behind
    // React.lazy / the dynamic preload, so the terminal page's chunk
    // never sees them). The dynamic RobotCharacter import in the
    // preload effect is the same lazy pattern.
    expect(briefingSrc).not.toMatch(/from 'three'/);
    expect(briefingSrc).not.toContain("from '@/components/three/MissionSocScene'");
    expect(briefingSrc).not.toContain("from '@/components/three/ModelViewer'");
    expect(briefingSrc).not.toContain("from '@/components/three/RobotCharacter'");
    // …and the terminal page never mentions the scene at all, so its
    // chunk can never pull three.js in.
    expect(workspaceSrc).not.toContain('MissionSocScene');
    expect(workspaceSrc).not.toContain('components/three/');
  });
});
