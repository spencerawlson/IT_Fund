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

  it('net-devices-media shows the rack sheet and the full poster in Resources', async () => {
    const root = await renderLesson('net-devices-media');
    const srcs = imgSrcs(root);
    expect(srcs).toContain('/blueprint-network-rack-42u.jpg');
    expect(srcs).toContain('/blueprint-equipment-poster.jpg');
    expect(JSON.stringify(root.toJSON())).toContain('Resources');
  });
});
