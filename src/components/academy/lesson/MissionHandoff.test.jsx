import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { StaticRouter } from 'react-router-dom';
import MissionHandoff, { HANDOFF_LINE } from './MissionHandoff';
import { __clearVoiceCache } from '@/api/voice';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mounted tests drive the real handoff with the network stubbed: the
// analytics and the 3D viewer (WebGL has no DOM here). The voice speak
// fetch is stubbed per test with a controllable deferred, so auto-play can
// be observed. The handoff reads no mission state anymore — the button is
// always Launch Mission — so no mission API mock is needed.
vi.mock('@/api/analytics', () => ({ logCypherEvent: vi.fn() }));
vi.mock('@/components/three/CypherCharacter', () => ({ default: () => null }));

// SSR: effects (analytics) do not run, so the handoff renders its first
// paint — Cypher's one spoken line, the Listen control, and the one
// mission button — without any network.
// renderToString escapes apostrophes as &#x27;, so decode them before
// asserting Spencer's exact line.
function renderHandoff(props) {
  const html = renderToString(
    <StaticRouter location="/academy/network/lesson/net-security">
      <MissionHandoff missionId="op-broken-shield" lessonId="net-security" {...props} />
    </StaticRouter>,
  );
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

const EXACT_LINE = "Excellent work, Agent. Now that you've learned and practiced, I have a mission for you. Click the 'Launch Mission' button on your right to begin.";

describe('MissionHandoff', () => {
  it('is listen-first on first paint: the line is not shown as readable text, the Hear control is present, one Launch Mission button', () => {
    const html = renderHandoff();
    // The line is spoken, not read: it is hidden until the voice falls
    // back or the student asks to read it. (The exact line itself is
    // asserted by HANDOFF_LINE below and by the mounted fallback test.)
    // Auto-play runs in an effect, so first paint carries the manual Hear
    // control — the mounted tests assert it becomes "Loading voice…".
    expect(html).not.toContain(EXACT_LINE);
    expect(html).toContain('Hear Cipher say it');
    expect(html).toContain('Launch Mission');
    expect(html).toContain('/missions/op-broken-shield');
  });

  it('is always Launch Mission — never Continue or Replay', () => {
    const html = renderHandoff();
    expect(html).toContain('Launch Mission');
    expect(html).not.toContain('Continue Mission');
    expect(html).not.toContain('Replay the mission');
    expect(html).not.toContain('Start Mission');
  });

  it('replaces the old three-line sequence — none of its lines remain', () => {
    const html = renderHandoff();
    expect(html).not.toContain('Congratulations, you finished — you know the drill.');
    expect(html).not.toContain('Now that you know about this lesson, we have a mission for you.');
    expect(html).not.toContain('You can click on the Start Mission button');
    expect(html).not.toContain('Start Mission');
  });

  it('is a spoken handoff, not a written briefing block — no Sentinel, no briefing copy', () => {
    const html = renderHandoff();
    expect(html).not.toContain('Sentinel');
    expect(html).not.toContain('Mission briefing');
    expect(html).not.toContain('Mission Briefing');
  });

  it('places the Launch Mission button to the right of the message on desktop, below it on mobile', () => {
    const html = renderHandoff();
    // The row is a column on mobile and a row from sm up; the button lives
    // in its own shrink-0 column that centers itself on desktop, so it sits
    // to the right of the message on desktop and below it on mobile.
    expect(html).toContain('flex flex-col gap-4 sm:flex-row sm:items-start');
    expect(html).toContain('shrink-0 sm:self-center');
    // The button comes after the message in the DOM, in its own column.
    // The line itself is hidden on first paint (listen-first), so the
    // message column is located by its "Cipher" header.
    const msgAt = html.indexOf('Cipher</p>');
    const btnAt = html.indexOf('Launch Mission');
    expect(msgAt).toBeGreaterThan(-1);
    expect(btnAt).toBeGreaterThan(msgAt);
  });

  it('shows no manipulation hint on the Cypher viewer', () => {
    const html = renderHandoff();
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('HANDOFF_LINE', () => {
  it('is exactly Spencer’s line, always — the one spoken line and the one button never vary', () => {
    expect(HANDOFF_LINE).toBe(EXACT_LINE);
  });
});

describe('MissionHandoff listen-first (mounted)', () => {
  // The handoff line and the voice's spoken text are deliberately
  // DIFFERENT strings, so the test can tell the hidden full line apart
  // from the spoken words: the backend strips Markdown before speaking,
  // so envelope.text is never the raw tutor text. Voice-only: the spoken
  // words are NOT shown as a subtitle paragraph — nothing of the line is
  // on screen while he talks.
  const SPOKEN = 'The spoken words are cleaned and different.';
  const audioEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  // Minimal stand-in for the Web Audio API (see src/api/voice.test.js for
  // the same fakes, used for the same reason: this test environment has no
  // `window`/AudioContext, and useCypherVoice now plays through one).
  class FakeAnalyser {
    constructor() { this.fftSize = 0; this.frequencyBinCount = 1; }
    connect() {}
    getByteFrequencyData() {}
  }
  class FakeGain {
    constructor() { this.gain = { value: 1 }; }
    connect() {}
  }
  class FakeSourceNode {
    constructor() { FakeSourceNode.instances.push(this); }
    connect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }
  class FakeAudioContext {
    constructor() { this.destination = {}; this.state = 'running'; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
    createBufferSource() { return new FakeSourceNode(); }
    createGain() { return new FakeGain(); }
    createAnalyser() { return new FakeAnalyser(); }
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

  function mountHandoff() {
    TestRenderer.act(() => {
      root = TestRenderer.create(
        <StaticRouter location="/academy/network/lesson/net-security">
          <MissionHandoff missionId="op-broken-shield" lessonId="net-security" />
        </StaticRouter>,
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

  beforeEach(() => {
    FakeSourceNode.instances = [];
    globalThis.window = { AudioContext: FakeAudioContext };
    __clearVoiceCache(); // the cache is a module singleton — isolate each test
    fetchGate = deferred();
    globalThis.fetch = vi.fn(() => fetchGate.promise);
  });

  afterEach(() => {
    if (root) TestRenderer.act(() => { root.unmount(); });
    root = null;
    delete globalThis.window;
    vi.clearAllMocks();
  });

  it('auto-plays the line when the handoff appears — no Hear click — and hides the text while the voice is being made', async () => {
    mountHandoff();
    await flush();
    // Auto-play: the speak fetch fired with Spencer's exact line, untouched.
    const speakCalls = globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak');
    expect(speakCalls.length).toBe(1);
    expect(JSON.parse(speakCalls[0][1].body).text).toBe(EXACT_LINE);
    // While the fetch is pending the button says so, and the full line is
    // nowhere on screen (listen-first: it is not a readable block).
    expect(treeText()).toContain('Loading voice…');
    expect(treeText()).not.toContain(EXACT_LINE);
    expect(treeText()).not.toContain(SPOKEN);
    expect(treeText()).toContain('Launch Mission');
  });

  it('is voice-only while audio plays — no subtitle paragraph — and the Read message toggle reveals the line', async () => {
    mountHandoff();
    await flush();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(audioEnvelope)); });
    await flush();
    expect(treeText()).toContain('Speaking…');
    expect(treeText()).not.toContain(SPOKEN); // voice-only: no subtitle
    expect(treeText()).not.toContain(EXACT_LINE); // full line hidden
    const toggle = findButton('Read message');
    expect(toggle).toBeTruthy();
    TestRenderer.act(() => { toggle.props.onClick(); });
    expect(treeText()).toContain(EXACT_LINE);
    expect(findButton('Hide message')).toBeTruthy();
  });

  it('replays with "Hear again" once playback finishes', async () => {
    mountHandoff();
    await flush();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(audioEnvelope)); });
    await flush();
    expect(treeText()).toContain('Speaking…');
    expect(findButton('Hear again')).toBeFalsy();
    // End the audio: the hook's onended clears playing.
    TestRenderer.act(() => { FakeSourceNode.instances[0].onended(); });
    expect(treeText()).not.toContain('Speaking…');
    const replay = findButton('Hear again');
    expect(replay).toBeTruthy();
    expect(findButton('Read message')).toBeTruthy();
    // The exact same line was already heard this visit, so "Hear again" is
    // served from the in-tab cache: no new fetch to /voice/speak (no
    // ElevenLabs cost, no network round trip), and it starts right away —
    // no "Loading voice…" step.
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    await TestRenderer.act(async () => { await replay.props.onClick(); });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(treeText()).toContain('Speaking…');
    expect(FakeSourceNode.instances[1].started).toBe(true);
  });

  it('falls back to showing the line as text with the Hear button when voice is unavailable', async () => {
    mountHandoff();
    await flush();
    await TestRenderer.act(async () => { fetchGate.resolve(jsonResponse(fallbackEnvelope)); });
    await flush();
    // No audio: the student gets the words to read, as before — while
    // Cypher "talks" silently (Speaking…), then the Hear button appears.
    expect(treeText()).toContain(EXACT_LINE);
    expect(treeText()).not.toContain(SPOKEN); // the subtitle is not rendered
    expect(treeText()).toContain('Speaking…');
    expect(findButton('Read message')).toBeFalsy();
    // The silent talk lasts 2.8 s for this text (7 words at 2.5 words/s);
    // afterwards the Hear button is the control.
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 3000)); });
    expect(treeText()).not.toContain('Speaking…');
    expect(findButton('Hear Cipher say it')).toBeTruthy();
    expect(findButton('Read message')).toBeFalsy();
  });
});
