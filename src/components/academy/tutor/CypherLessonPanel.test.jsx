import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';
import CypherLessonPanel, { presetQuestion } from './CypherLessonPanel';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mounted tests drive the real panel (tutor + voice) with the network
// stubbed: the tutor API module, the mission API, analytics, and the 3D
// viewer (WebGL has no DOM here). The voice speak fetch is stubbed per
// test with a controllable deferred, so auto-play can be observed.
const tutorMocks = vi.hoisted(() => ({
  fetchTutorStatus: vi.fn(async () => ({ enabled: true })),
  streamTutor: vi.fn(),
}));
vi.mock('@/api/tutor', () => ({
  fetchTutorStatus: (...args) => tutorMocks.fetchTutorStatus(...args),
  streamTutor: (...args) => tutorMocks.streamTutor(...args),
}));
vi.mock('@/api/missions', () => ({
  missionsApi: {
    history: async () => ({ history: [] }),
    getAttempt: async () => null,
  },
}));
vi.mock('@/api/analytics', () => ({ logCypherEvent: vi.fn() }));
vi.mock('@/components/three/CypherCharacter', () => ({ default: () => null }));

// SSR: effects (attempt history, analytics, tutor status) do not run, so
// the panel renders its first paint — greeting, difficulty selector, and
// the mission invitation — without any network. The tutor hooks need a
// QueryClientProvider and the `to=` buttons need a router (same pattern as
// Seo.test.jsx).
function renderPanel(props) {
  const queryClient = new QueryClient();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location="/academy/lessons/net-security">
        <CypherLessonPanel {...props} />
      </StaticRouter>
    </QueryClientProvider>,
  );
}

describe('CypherLessonPanel', () => {
  it('renders the greeting and difficulty levels, with the mission section hidden by default', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: '/labs/net-acl-001',
    });
    expect(html).toContain('Hi, I’m Cipher');
    // SSR renders `{label} level` as `Beginner<!-- --> level`, so assert the
    // option values (contiguous in the HTML) instead of the joined text.
    expect(html).toContain('value="beginner"');
    expect(html).toContain('value="intermediate"');
    expect(html).toContain('value="advanced"');
    expect(html).toContain('Explanation difficulty level');
    // Operation Broken Shield is a collapsed disclosure by default: the
    // header is there, but nothing of the section — no status, no mission
    // button, no hint, no practical-application link — is shown until the
    // student clicks to open it.
    expect(html).toContain('Operation Broken Shield');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Launch Mission');
    expect(html).not.toContain('/missions/op-broken-shield');
    expect(html).not.toContain('Show a practical application');
    expect(html).not.toContain('A live incident in the SOC');
    expect(html).not.toContain('Start Mission');
  });

  it('shows the mission section when opened, with one Launch Mission button', () => {
    // The toggle is a plain useState flip; defaultMissionOpen renders the
    // open state in SSR, which is what this asserts.
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: '/labs/net-acl-001',
      defaultMissionOpen: true,
    });
    expect(html).toContain('Operation Broken Shield');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Launch Mission');
    expect(html).toContain('/missions/op-broken-shield');
    expect(html).toContain('Show a practical application');
    expect(html).toContain('A live incident in the SOC');
  });

  it('renders the 3D Cypher viewer without any manipulation hint (presenter-only)', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
      practicalHref: null,
    });
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('presetQuestion', () => {
  // The presets must fill their own question: clicking one with an empty
  // box used to submit the empty form and the backend answered 400
  // "question is required". Each preset now builds a real question about
  // this lesson, which the panel submits as a chat message.
  it('builds a real question per preset from the lesson title', () => {
    expect(presetQuestion('explain', 'Network Security', 'intermediate'))
      .toBe('Explain the key ideas of Network Security.');
    expect(presetQuestion('example', 'Network Security', 'intermediate'))
      .toBe('Give me a concrete, real-world example of Network Security.');
    expect(presetQuestion('simplify', 'Network Security', 'intermediate'))
      .toBe('Explain Network Security in simple terms, using an everyday analogy.');
  });

  it('adds the level only when it is not the default', () => {
    expect(presetQuestion('explain', 'Network Security', 'beginner'))
      .toContain('at beginner level');
    expect(presetQuestion('explain', 'Network Security', 'intermediate'))
      .not.toContain('at intermediate level');
  });

  it('never returns an empty question', () => {
    for (const mode of ['explain', 'example', 'simplify']) {
      expect(presetQuestion(mode, '', 'intermediate').trim().length).toBeGreaterThan(0);
      expect(presetQuestion(mode, undefined, 'intermediate')).toContain('this lesson');
    }
  });
});

describe('CypherLessonPanel listen-first (mounted)', () => {
  // The tutor's answer and the voice's spoken text are deliberately
  // DIFFERENT strings, so the test can tell the hidden full answer apart
  // from the shown subtitle: the backend strips Markdown before speaking,
  // so envelope.text is never the raw tutor text.
  const ANSWER = 'DHCP snooping drops untrusted DHCP replies.';
  const SPOKEN = 'The spoken words are cleaned and different.';
  const audioEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  class FakeAudio {
    constructor(url) { this.src = url; FakeAudio.instances.push(this); }
    play() { return Promise.resolve(); }
    pause() {}
  }

  let root;
  let fetchGate;

  function deferred() {
    let resolve; let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  function jsonResponse(body, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => 'application/json' },
      json: async () => body,
    };
  }

  async function flush(times = 5) {
    for (let i = 0; i < times; i++) {
      await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    }
  }

  function mountPanel() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    TestRenderer.act(() => {
      root = TestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <StaticRouter location="/academy/lessons/net-security">
            <CypherLessonPanel lesson={{ id: 'net-security', title: 'Network Security', trackId: 'net' }} missionId="op-broken-shield" practicalHref="/labs/net-acl-001" />
          </StaticRouter>
        </QueryClientProvider>,
      );
    });
    return root;
  }

  function treeText() {
    return JSON.stringify(root.toJSON());
  }

  function findButton(label) {
    return root.root.findAllByType('button').find((b) => b.children?.some((c) => typeof c === 'string' && c.includes(label)));
  }

  async function askPreset() {
    await flush();
    const preset = findButton('Explain this concept');
    expect(preset).toBeTruthy();
    TestRenderer.act(() => { preset.props.onClick(); });
    await flush();
  }

  beforeEach(() => {
    FakeAudio.instances = [];
    globalThis.Audio = FakeAudio;
    fetchGate = deferred();
    globalThis.fetch = vi.fn(() => fetchGate.promise);
    tutorMocks.streamTutor.mockImplementation(async (body, { onToken }) => {
      onToken('tok', ANSWER);
      return ANSWER;
    });
  });

  afterEach(() => {
    if (root) TestRenderer.act(() => { root.unmount(); });
    root = null;
    delete globalThis.Audio;
    vi.clearAllMocks();
  });

  it('auto-plays the answer when it arrives — no Hear click — and shows "Loading voice…" while the voice is being made', async () => {
    mountPanel();
    await askPreset();
    // Auto-play: the speak fetch fired with the answer text, untouched.
    const speakCalls = globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak');
    expect(speakCalls.length).toBe(1);
    expect(JSON.parse(speakCalls[0][1].body).text).toBe(ANSWER);
    // While the fetch is pending the button says so, and the full answer
    // text is nowhere on screen (listen-first: it is not a readable block).
    expect(treeText()).toContain('Loading voice…');
    expect(treeText()).not.toContain(ANSWER);
    expect(treeText()).not.toContain(SPOKEN);
  });

  it('shows the spoken words as subtitles while audio plays, hides the text, and the Read answer toggle reveals it', async () => {
    mountPanel();
    await askPreset();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(audioEnvelope)); });
    await flush();
    expect(treeText()).toContain('Speaking…');
    expect(treeText()).toContain(SPOKEN); // subtitle
    expect(treeText()).not.toContain(ANSWER); // full text hidden
    const toggle = findButton('Read answer');
    expect(toggle).toBeTruthy();
    TestRenderer.act(() => { toggle.props.onClick(); });
    expect(treeText()).toContain(ANSWER);
    expect(findButton('Hide answer')).toBeTruthy();
  });

  it('replays with "Hear again" once playback finishes', async () => {
    mountPanel();
    await askPreset();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(audioEnvelope)); });
    await flush();
    expect(treeText()).toContain('Speaking…');
    expect(findButton('Hear again')).toBeFalsy();
    // End the audio: the hook's onended clears playing and the subtitle.
    TestRenderer.act(() => { FakeAudio.instances[0].onended(); });
    expect(treeText()).not.toContain('Speaking…');
    const replay = findButton('Hear again');
    expect(replay).toBeTruthy();
    expect(findButton('Read answer')).toBeTruthy();
    // A fresh pending fetch for the replay, so the loading state is
    // observable (the first gate is already resolved).
    const gate2 = deferred();
    globalThis.fetch = vi.fn(() => gate2.promise);
    TestRenderer.act(() => { replay.props.onClick(); });
    expect(globalThis.fetch.mock.calls.length).toBe(1);
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/voice/speak');
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).text).toBe(ANSWER);
    expect(treeText()).toContain('Loading voice…');
  });

  it('falls back to showing the answer text with the Hear button when voice is unavailable', async () => {
    mountPanel();
    await askPreset();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(fallbackEnvelope)); });
    await flush();
    // No audio: the student gets the words to read, as before — while
    // Cypher "talks" silently (Speaking…), then the Hear button appears.
    expect(treeText()).toContain(ANSWER);
    expect(treeText()).not.toContain(SPOKEN); // the subtitle is not rendered
    expect(treeText()).toContain('Speaking…');
    expect(findButton('Read answer')).toBeFalsy();
    // The silent talk lasts 2.8 s for this text (7 words at 2.5 words/s);
    // afterwards the Hear button is the control.
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 3000)); });
    expect(treeText()).not.toContain('Speaking…');
    expect(findButton('Hear Cipher say it')).toBeTruthy();
    expect(findButton('Read answer')).toBeFalsy();
  });
});
