import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import LessonView from './LessonView';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mounted: the lesson page loads its body through the content API, so the
// API is stubbed per lesson — a real architecture diagram for net-osi and
// net-switch-route, none for the blueprint-only lessons. Subscription is
// stubbed to subscribed so the Pro-gated lessons render instead of the
// paywall. The tutor panel is stubbed out — it is not what this test
// exercises.
const mockContent = {
  'net-switch-route': {
    overview: ['Switches forward frames; routers forward packets.'],
    learn: [],
    architecture: { diagram: 'SWITCH -- ROUTER', caption: 'A switch forwards frames; a router forwards packets.' },
    examples: [],
    cheatSheet: [],
  },
  'it-hardware': {
    overview: ['Hardware overview.'],
    learn: [],
    architecture: null,
    examples: [],
    cheatSheet: [],
  },
  'net-osi': {
    overview: ['OSI overview.'],
    learn: [],
    architecture: { diagram: 'OSI LAYERS', caption: 'Seven layers.' },
    examples: [],
    cheatSheet: [],
  },
  'net-devices-media': {
    overview: ['Devices overview.'],
    learn: [],
    architecture: null,
    examples: [],
    cheatSheet: [],
  },
  'net-troubleshoot': {
    overview: ['Troubleshooting is the skill employers actually pay for.'],
    learn: [],
    architecture: null,
    examples: [],
    cheatSheet: [],
  },
  'py-basics': {
    overview: ['Python basics.'],
    learn: [],
    architecture: null,
    examples: [],
    cheatSheet: [],
    further_reading: [
      { title: 'The Python Tutorial', url: 'https://docs.python.org/3/tutorial/' },
    ],
  },
};

vi.mock('@/lib/academy', () => ({
  useAcademy: () => ({ resume: null, lessons: {} }),
}));
vi.mock('@/lib/subscription', () => ({
  useSubscription: () => ({ subscribed: true, loading: false }),
  isLessonFree: () => false,
}));
vi.mock('@/lib/content', () => ({
  getLessonContent: async (id) => ({
    content: mockContent[id] || { overview: ['Overview.'], learn: [], architecture: null, examples: [], cheatSheet: [] },
    cipherNote: null,
  }),
  getDeckContent: async () => ({ deck: {}, cards: [], puzzles: [] }),
  lessonTextFromContent: () => '',
}));
vi.mock('@/hooks/useDocumentTitle', () => ({ default: () => {} }));
vi.mock('@/components/academy/tutor/CypherLessonPanel', () => ({ default: () => null }));

async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

async function renderLesson(lessonId) {
  let root;
  act(() => {
    root = TestRenderer.create(
      <ThemeProvider>
        <StaticRouter location={`/academy/lessons/${lessonId}`}>
          <Routes>
            <Route path="/academy/lessons/:lessonId" element={<LessonView />} />
          </Routes>
        </StaticRouter>
      </ThemeProvider>,
    );
  });
  await flush();
  return root;
}

function imgSrcs(root) {
  return root.root.findAllByType('img').map((n) => n.props.src);
}

describe('LessonView blueprints', () => {
  it('net-switch-route shows the ASCII diagram AND both its sheets', async () => {
    const root = await renderLesson('net-switch-route');
    const srcs = imgSrcs(root);
    expect(srcs).toContain('/blueprint-network-switch-48-port.jpg');
    expect(srcs).toContain('/blueprint-network-router.jpg');
    expect(JSON.stringify(root.toJSON())).toContain('SWITCH -- ROUTER');
  });

  it('it-hardware shows its sheet in an Architecture section with no diagram', async () => {
    const root = await renderLesson('it-hardware');
    expect(imgSrcs(root)).toContain('/blueprint-rack-server-2u.jpg');
    // The section (and its nav entry) exist because of the blueprint alone.
    expect(JSON.stringify(root.toJSON())).toContain('Architecture');
  });

  it('net-osi (unmapped) shows its diagram and no blueprint', async () => {
    const root = await renderLesson('net-osi');
    expect(JSON.stringify(root.toJSON())).toContain('OSI LAYERS');
    expect(imgSrcs(root).filter((s) => s.includes('blueprint-'))).toEqual([]);
  });

  it('net-devices-media shows the rack and patch panel sheets and the full poster in Resources', async () => {
    const root = await renderLesson('net-devices-media');
    const srcs = imgSrcs(root);
    expect(srcs).toContain('/blueprint-network-rack-42u.jpg');
    expect(srcs).toContain('/blueprint-patch-panel-48-port.jpg');
    expect(srcs).toContain('/blueprint-equipment-poster.jpg');
    expect(JSON.stringify(root.toJSON())).toContain('Resources');
  });
});

describe('LessonView further reading', () => {
  it('py-basics shows its Further reading links (new tab, noopener)', async () => {
    const root = await renderLesson('py-basics');
    expect(JSON.stringify(root.toJSON())).toContain('Further reading');
    // Scope to the section: the lesson's deck Resources may list the same
    // URL, so count only the anchors inside Further reading.
    const section = root.root.findByProps({ id: 'further-reading' });
    const links = section.findAllByType('a').filter((n) => n.props.href === 'https://docs.python.org/3/tutorial/');
    expect(links.length).toBe(1);
    expect(links[0].props.target).toBe('_blank');
    expect(links[0].props.rel).toContain('noopener');
  });

  it('a lesson with no links shows no Further reading section', async () => {
    const root = await renderLesson('net-osi');
    expect(JSON.stringify(root.toJSON())).not.toContain('Further reading');
  });
});

describe('LessonView mission-only lab removal', () => {
  it('net-security shows no Launch Lab button and no lab row (Spencer, 2026-11-16)', async () => {
    // Operation Broken Shield is mission-only everywhere: the ACL lab
    // runs inside the mission, so the lesson offers no standalone lab.
    // This lesson has no Visual Lab either, so the whole button row is gone.
    const root = await renderLesson('net-security');
    const json = JSON.stringify(root.toJSON());
    expect(json).not.toContain('Launch Lab');
    expect(json).not.toContain('/labs/net-acl-001');
    expect(json).not.toContain('Open in Visual Lab');
  });

  it('rt-routing-security shows no Launch Lab button either', async () => {
    const root = await renderLesson('rt-routing-security');
    const json = JSON.stringify(root.toJSON());
    expect(json).not.toContain('Launch Lab');
    expect(json).not.toContain('/labs/net-acl-001');
  });
});

describe('LessonView net-troubleshoot labs + Watch', () => {
  it('renders both lab buttons — the DNS primary and the Wireshark extra — plus the Visual Lab button', async () => {
    const root = await renderLesson('net-troubleshoot');
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Launch Lab: DNS & Connectivity Troubleshooting');
    expect(json).toContain('Launch Lab: Wireshark / tshark Packet Analysis');
    expect(json).toContain('Open in Visual Lab');
    const links = root.root.findAllByType('a').map((n) => n.props.href);
    expect(links).toContain('/labs/net-dns-connectivity-001');
    expect(links).toContain('/labs/tools-wireshark-001');
    expect(links).toContain('/lab?item=proto-dns');
  });

  it('renders the Watch section as an honest coming-soon note — no fake video, no dead link', async () => {
    const root = await renderLesson('net-troubleshoot');
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Watch: reading a capture in Wireshark');
    expect(json).toContain('Coming soon');
    expect(root.root.findAllByType('video')).toHaveLength(0);
    // ...and a lesson with no walkthrough shows no Watch section.
    const other = await renderLesson('net-osi');
    expect(JSON.stringify(other.toJSON())).not.toContain('Watch: reading a capture in Wireshark');
  });

  it('shows the loading state while the lesson content is still null', async () => {
    // No flush: the content promises have not resolved yet, so the page
    // must render its loading state without throwing.
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <StaticRouter location="/academy/lessons/net-troubleshoot">
            <Routes>
              <Route path="/academy/lessons/:lessonId" element={<LessonView />} />
            </Routes>
          </StaticRouter>
        </ThemeProvider>,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Loading lesson');
    await act(async () => { renderer.unmount(); });
  });
});
