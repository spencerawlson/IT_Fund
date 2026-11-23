import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LabWorkspace from './LabWorkspace';

// The mocked terminal captures the runner so tests can drive terminal
// commands (e.g. `lab exit`) directly.
const { runnerHolder } = vi.hoisted(() => ({ runnerHolder: { current: null } }));

// Mission labs open in Mission mode by default (Spencer, 2026-11-23): the
// learner lands where the terminal instruction is, not on the plain
// Objectives checklist. An explicit stored preference always wins, and the
// toggle stays available. These tests render the real page (mocked APIs)
// and assert the mode it lands in — the same react-test-renderer pattern
// as MissionBriefing.test.jsx.
//
// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { GLASSHOUSE_DEF, PLAIN_DEF, SESSION } = vi.hoisted(() => {
  const glasshouse = {
    id: 'sec-pentest-web-001',
    slug: 'web-app-pentest-full-chain',
    title: 'Web App Pentest: Full Exploitation Chain',
    difficulty: 'advanced',
    estimated_minutes: 75,
    description: 'Attack a real (intentionally vulnerable) web application with real tools. Recon the target, bypass authentication with SQL injection, extract secrets with a UNION query, prove reflected XSS, walk an IDOR to the admin record, and land remote command execution — then write it up.',
    category: 'cybersecurity',
    shell: 'linux_recon',
    environment: { provider: 'docker', live: true, deny_internet_egress: true },
    targets: [{ hostname: 'target.lab', role: 'Target' }],
    terminal: { banner: ['plain banner'], prompt: 'student@lab:~$ ' },
    objectives: [
      { id: 'recon', label: "Recon the target's web service", validator: 'recon', hints: ['nmap -Pn -sT target.lab'] },
      { id: 'auth-bypass', label: 'Bypass login with SQL injection', validator: 'auth_bypass', hints: ['POST /login sends username & password form fields.'] },
    ],
  };
  const plain = {
    id: 'py-basics-001',
    slug: 'python-basics',
    title: 'Python Basics',
    difficulty: 'beginner',
    estimated_minutes: 20,
    description: 'Learn Python basics in a real shell.',
    category: 'python',
    shell: 'linux_cli',
    environment: { provider: 'docker', live: true },
    targets: [{ hostname: 'py.lab', role: 'Workstation' }],
    terminal: { banner: ['plain banner'], prompt: 'student@py:~$ ' },
    objectives: [
      { id: 'hello', label: 'Print hello', validator: 'hello', hints: ['print("hello")'] },
    ],
  };
  const session = {
    id: 'sess-1', status: 'ACTIVE',
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
    findings: {}, validation_results: [],
  };
  return { GLASSHOUSE_DEF: glasshouse, PLAIN_DEF: plain, SESSION: session };
});

vi.mock('@/api/labs', () => ({
  labsApi: {
    listDefinitions: vi.fn(async () => ({ labs: [GLASSHOUSE_DEF, PLAIN_DEF] })),
    start: vi.fn(async () => SESSION),
    destroy: vi.fn(async () => ({})),
    recordFindings: vi.fn(async () => ({})),
    validate: vi.fn(async () => SESSION),
    exec: vi.fn(async () => ({ output: '', session: SESSION })),
    reset: vi.fn(async () => SESSION),
  },
}));
vi.mock('@/lib/subscription', () => ({
  useSubscription: () => ({ subscribed: true, loading: false }),
  isLabFree: () => false,
  useLabUsage: () => ({ usage: null }),
}));
// The terminal stub renders the banner the page passes it, so the test can
// assert the mission-mode banner is what the learner sees on landing, and
// captures the runner so tests can drive terminal commands.
vi.mock('@/components/labs/LabTerminal', () => ({
  default: React.forwardRef((props, ref) => {
    runnerHolder.current = props.runner;
    return <div data-testid="terminal">{(props.banner || []).join('\n')}</div>;
  }),
}));
vi.mock('@/components/labs/TopologyBuilder', () => ({ default: () => null }));
vi.mock('@/hooks/useDocumentTitle', () => ({ default: () => {} }));
vi.mock('@/components/UpgradePrompt', () => ({ default: () => null }));
vi.mock('@/components/LabUsageMeter', () => ({ default: () => null }));
vi.mock('@/components/ThemeProvider', () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
}));
vi.mock('@/lib/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
}));
vi.mock('@/lib/labProgress', async (importOriginal) => ({
  ...(await importOriginal()),
  recordLabCompletion: vi.fn(),
}));
vi.mock('@/lib/academy', async (importOriginal) => ({
  ...(await importOriginal()),
  recordVerifiedLabCompletion: vi.fn(),
}));

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

async function renderLab(labId) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <StaticRouter location={`/labs/${labId}`}>
        <Routes>
          <Route path="/labs/:labId" element={<LabWorkspace />} />
        </Routes>
      </StaticRouter>,
    );
  });
  await flush();
  return renderer;
}

function toggleButton(root, label) {
  return root.findAllByType('button').find((b) => b.children?.includes(label));
}

describe('mission labs open in Mission mode by default', () => {
  let savedWindow;
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reduced motion on: MissionBrief types its brief out, and under
    // reduced motion it shows the full text at once.
    savedWindow = globalThis.window;
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
    globalThis.window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    // Controllable localStorage: the mode preference lives here.
    store = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      },
      configurable: true,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
    delete globalThis.localStorage;
  });

  it('a mission lab lands in Mission mode: brief + terminal instruction, no Objectives card, no enumerating description', async () => {
    const renderer = await renderLab('sec-pentest-web-001');
    const text = textOf(renderer.root);
    // Mission mode markers: the brief and the console.
    expect(text).toContain('// INCOMING TRANSMISSION');
    expect(text).toContain('OPERATION GLASSHOUSE');
    expect(text).toContain('Target: the ACME intranet at target.lab');
    expect(text).toContain('Mission Console');
    expect(text).toContain('Exit mission mode');
    // The terminal instruction the banner carries.
    expect(text).toContain('run `objectives` for the list');
    expect(text).toContain('`progress` for the count');
    expect(text).toContain('`hint` when stuck');
    // Nothing from the plain view leaks: no checklist, no hints, no count,
    // and the description that enumerates the chain is not rendered.
    expect(text).not.toContain('Objectives');
    expect(text).not.toContain('Hint:');
    expect(text).not.toContain('bypass authentication with SQL injection');
    expect(text).not.toContain('walk an IDOR to the admin record');
    await act(async () => { renderer.unmount(); });
  });

  it('a plain lab still lands in plain mode: Objectives card, hints and description', async () => {
    const renderer = await renderLab('py-basics-001');
    const text = textOf(renderer.root);
    expect(text).toContain('Mission mode');
    expect(text).not.toContain('Exit mission mode');
    expect(text).toContain('Objectives');
    expect(text).toContain('Hint:');
    expect(text).toContain('Print hello');
    expect(text).toContain('Learn Python basics in a real shell.');
    await act(async () => { renderer.unmount(); });
  });

  it('an explicit stored preference wins: a mission lab opens plain when the learner chose plain', async () => {
    store.set('rtc-lab-gamemode', '0');
    const renderer = await renderLab('sec-pentest-web-001');
    const text = textOf(renderer.root);
    expect(text).toContain('Mission mode');
    expect(text).not.toContain('Exit mission mode');
    expect(text).toContain('Objectives');
    expect(text).toContain('Hint:');
    await act(async () => { renderer.unmount(); });
  });

  it('an explicit stored preference wins: a plain lab opens in Mission mode when the learner chose it', async () => {
    store.set('rtc-lab-gamemode', '1');
    const renderer = await renderLab('py-basics-001');
    const text = textOf(renderer.root);
    expect(text).toContain('Exit mission mode');
    expect(text).toContain('Mission Console');
    expect(text).not.toContain('Objectives');
    expect(text).not.toContain('Hint:');
    await act(async () => { renderer.unmount(); });
  });

  it('the toggle still works: a mission lab can be left in plain mode, and the choice is stored', async () => {
    const renderer = await renderLab('sec-pentest-web-001');
    expect(textOf(renderer.root)).toContain('Exit mission mode');
    // Leave Mission mode: the plain view appears, and the preference is stored.
    await act(async () => { toggleButton(renderer.root, 'Exit mission mode').props.onClick(); });
    let text = textOf(renderer.root);
    expect(text).toContain('Mission mode');
    expect(text).toContain('Objectives');
    expect(text).toContain('Hint:');
    expect(store.get('rtc-lab-gamemode')).toBe('0');
    // Back in: the brief returns and the checklist goes away.
    await act(async () => { toggleButton(renderer.root, 'Mission mode').props.onClick(); });
    text = textOf(renderer.root);
    expect(text).toContain('Exit mission mode');
    expect(text).toContain('// INCOMING TRANSMISSION');
    expect(text).not.toContain('Objectives');
    expect(store.get('rtc-lab-gamemode')).toBe('1');
    await act(async () => { renderer.unmount(); });
  });

  it('Packet Flood lands in Mission mode too — the same default covers every mission lab', async () => {
    // tools-wireshark-001 is not in the mocked catalogue, so add it: the
    // default keys off the mission registry, not the lab list.
    const { labsApi } = await import('@/api/labs');
    labsApi.listDefinitions.mockResolvedValueOnce({
      labs: [
        {
          id: 'tools-wireshark-001',
          slug: 'wireshark-tshark-packet-analysis',
          title: 'Wireshark / tshark Packet Analysis',
          difficulty: 'intermediate',
          estimated_minutes: 25,
          description: 'A packet capture hides a story: an intranet login, credentials in the clear, and data sneaking out over DNS.',
          category: 'cybersecurity',
          shell: 'linux_cli',
          environment: { provider: 'docker', live: true },
          targets: [{ hostname: 'analyst-ws', role: 'Analyst workstation' }],
          terminal: { banner: ['plain banner'], prompt: 'analyst@analyst-ws:~$ ' },
          objectives: [
            { id: 'open', label: 'Open the capture and list its packets', validator: 'ws_capture_opened', hints: ['tshark -r capture.pcap'] },
          ],
        },
        PLAIN_DEF,
      ],
    });
    const renderer = await renderLab('tools-wireshark-001');
    const text = textOf(renderer.root);
    expect(text).toContain('// INCOMING TRANSMISSION');
    expect(text).toContain('OPERATION PACKET FLOOD');
    expect(text).toContain('Exit mission mode');
    expect(text).not.toContain('Objectives');
    expect(text).not.toContain('Hint:');
    await act(async () => { renderer.unmount(); });
  });
});

// Exiting a lab must destroy the session server-side (Spencer, 2026-11-23):
// the lab-hours meter kept climbing after he left Glasshouse (0h 01m at
// 04:03, 0h 12m at 04:44, 0h 16m at ~04:48) because Exit was only a link
// and `lab exit` only navigated — neither called destroy, and the unmount
// cleanup's plain-fetch DELETE was cancelled by the navigation. Destroy
// finalizes the usage row server-side (backend/test_lab_usage.py), so the
// row stops accruing the moment the DELETE completes.

function LocationProbe({ onLocation }) {
  const loc = useLocation();
  useEffect(() => { onLocation(loc.pathname); }, [loc, onLocation]);
  return null;
}

async function renderLabWithRouter(labId) {
  let currentPath = null;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <MemoryRouter initialEntries={[`/labs/${labId}`]}>
        <LocationProbe onLocation={(p) => { currentPath = p; }} />
        <Routes>
          <Route path="/labs/:labId" element={<LabWorkspace />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flush();
  return { renderer, path: () => currentPath };
}

// The Exit control is a link before the fix and a button after it; find it
// by its label either way.
function exitControl(root) {
  return root.findAll((node) => node.children?.includes('Exit'))
    .find((n) => n.type === 'button' || n.type === 'a');
}

// Minimal click event: enough for the router Link's handler (pre-fix) and
// ignored by a plain button's onClick (post-fix).
const FAKE_CLICK = {
  button: 0, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false,
  defaultPrevented: false, preventDefault: () => {},
};

describe('exiting a lab destroys the session before navigating', () => {
  let savedWindow;
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    savedWindow = globalThis.window;
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
    globalThis.window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    store = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      },
      configurable: true,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
    delete globalThis.localStorage;
  });

  it('Exit destroys the session and waits for the DELETE before navigating', async () => {
    const { labsApi } = await import('@/api/labs');
    // Hold the DELETE open: navigation must not happen until it completes.
    let resolveDestroy;
    labsApi.destroy.mockImplementationOnce(() => new Promise((resolve) => { resolveDestroy = resolve; }));
    const { renderer, path } = await renderLabWithRouter('sec-pentest-web-001');
    expect(path()).toBe('/labs/sec-pentest-web-001');

    let clickPromise;
    await act(async () => {
      clickPromise = exitControl(renderer.root).props.onClick(FAKE_CLICK);
    });
    await flush();
    expect(labsApi.destroy).toHaveBeenCalledWith('sess-1');
    // The DELETE is still pending: still on the lab page.
    expect(path()).toBe('/labs/sec-pentest-web-001');

    await act(async () => { resolveDestroy({}); await clickPromise; });
    await flush();
    expect(path()).toBe('/practice');
    // Exactly one DELETE: the unmount cleanup must not fire a second one.
    expect(labsApi.destroy).toHaveBeenCalledTimes(1);
    await act(async () => { renderer.unmount(); });
  });

  it('lab exit destroys the session before navigating back to the lab menu', async () => {
    const { labsApi } = await import('@/api/labs');
    let resolveDestroy;
    labsApi.destroy.mockImplementationOnce(() => new Promise((resolve) => { resolveDestroy = resolve; }));
    const { renderer, path } = await renderLabWithRouter('sec-pentest-web-001');
    expect(path()).toBe('/labs/sec-pentest-web-001');

    // Run the terminal command; the DELETE is still pending, so the runner
    // must not return (and must not schedule the navigation) yet.
    let exitPromise;
    await act(async () => { exitPromise = runnerHolder.current('lab exit'); });
    await flush();
    expect(labsApi.destroy).toHaveBeenCalledWith('sess-1');
    expect(path()).toBe('/labs/sec-pentest-web-001');

    await act(async () => { resolveDestroy({}); await exitPromise; });
    // The runner keeps its 300ms beat so the learner sees "Leaving...".
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    await flush();
    expect(path()).toBe('/labs');
    expect(labsApi.destroy).toHaveBeenCalledTimes(1);
    await act(async () => { renderer.unmount(); });
  });

  it('leaving any other way still destroys the session on unmount (backstop)', async () => {
    const { labsApi } = await import('@/api/labs');
    const { renderer } = await renderLabWithRouter('sec-pentest-web-001');
    await act(async () => { renderer.unmount(); });
    expect(labsApi.destroy).toHaveBeenCalledWith('sess-1');
  });
});
