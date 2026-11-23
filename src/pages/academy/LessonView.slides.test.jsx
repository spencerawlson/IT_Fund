import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/AuthContext';
import LessonView from './LessonView';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ANON_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

// The lesson page loads its body through the content API, so the API is
// stubbed per lesson — with a derived slide deck attached, exactly as the
// export pipeline produces it. Subscription is a mutable mock so each test
// picks its own state. Written BEFORE the carousel wiring and observed
// failing on pristine code (LessonView renders no carousel at all).
const mockSubscription = { subscribed: true, loading: false, free: new Set(['net-osi']) };

const mockContent = {
  'net-osi': {
    overview: ['OSI overview.'],
    learn: [{ heading: 'Layers', body: ['Each layer adds its own header.'] }],
    architecture: null,
    examples: [],
    cheatSheet: [],
    slides: [
      { title: 'Overview', caption: 'The OSI model has seven layers.', diagram: { template: 'layers', labels: ['Physical', 'Data Link'] } },
      { title: 'Layers', caption: 'Each layer adds its own header.', diagram: { template: 'flow', labels: [] } },
    ],
  },
  'net-ports': {
    overview: ['Ports overview.'],
    learn: [{ heading: 'Well-known ports', body: ['Port 443 is HTTPS.'] }],
    architecture: null,
    examples: [],
    cheatSheet: [],
    slides: [
      { title: 'Overview', caption: 'Ports identify services.', diagram: { template: 'concept', labels: [] } },
      { title: 'Well-known ports', caption: 'Port 443 is HTTPS.', diagram: { template: 'flow', labels: [] } },
    ],
  },
};

vi.mock('@/lib/academy', () => ({
  useAcademy: () => ({ resume: null, lessons: {} }),
}));
vi.mock('@/lib/subscription', () => ({
  useSubscription: () => ({ subscribed: mockSubscription.subscribed, loading: mockSubscription.loading }),
  isLessonFree: (id) => mockSubscription.free.has(id),
  isLabFree: (id) => id === 'net-vlan-001' || id === 'py-basics-001',
  // Mirrors the real free sets in @/lib/subscription (UpgradePrompt reads FREE_LABS).
  FREE_LABS: new Set(['net-vlan-001', 'py-basics-001']),
}));
// AuthProvider's visibilitychange effect needs a DOM; the paywall only reads
// isAuthenticated, so stub the context (anonymous) instead of mounting it.
vi.mock('@/lib/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ isAuthenticated: false }),
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
      <AuthProvider initialAuth={ANON_AUTH}>
        <ThemeProvider>
          <StaticRouter location={`/academy/lessons/${lessonId}`}>
            <Routes>
              <Route path="/academy/lessons/:lessonId" element={<LessonView />} />
            </Routes>
          </StaticRouter>
        </ThemeProvider>
      </AuthProvider>,
    );
  });
  await flush();
  return root;
}

describe('LessonView slide carousel', () => {
  beforeEach(() => {
    mockSubscription.subscribed = true;
    mockSubscription.loading = false;
  });

  it('shows the deck on a free lesson, between the Overview and the Learn section', async () => {
    mockSubscription.subscribed = false; // free lesson: no subscription needed
    const root = await renderLesson('net-osi');
    const out = JSON.stringify(root.toJSON());
    expect(out).toContain('Slide 1 of 2');
    expect(out).toContain('The OSI model has seven layers.');
    // Order: Overview paragraph, then the slide caption, then the Learn heading.
    expect(out.indexOf('OSI overview.')).toBeLessThan(out.indexOf('The OSI model has seven layers.'));
    expect(out.indexOf('The OSI model has seven layers.')).toBeLessThan(out.indexOf('Layers'));
  });

  it('shows the deck on a premium lesson for a subscriber', async () => {
    mockSubscription.subscribed = true;
    const root = await renderLesson('net-ports');
    const out = JSON.stringify(root.toJSON());
    expect(out).toContain('Slide 1 of 2');
    expect(out).toContain('Ports identify services.');
  });

  it('a non-subscriber on a premium lesson sees the paywall and NO slides', async () => {
    mockSubscription.subscribed = false;
    const root = await renderLesson('net-ports');
    const out = JSON.stringify(root.toJSON());
    expect(out).toContain('Premium content');
    expect(out).not.toContain('Ports identify services.');
    expect(out).not.toContain('Slide 1 of 2');
  });
});
