import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';
import CypherLessonPanel, { presetQuestion, formatPlayerTime } from './CypherLessonPanel';
import { __clearVoiceCache } from '@/api/voice';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mounted tests drive the real panel (tutor + voice) with the network
// stubbed: the tutor API module, analytics, and the 3D viewer (WebGL has
// no DOM here). The fetch mock routes by URL: /voice/status answers at
// once (configurable per test), /voice/speak resolves at once with the
// configured envelope — the speak fetch is never the thing under test
// here (src/api/voice.test.js covers its loading states); the panel
// tests gate the TUTOR stream when they need a loading state.
const tutorMocks = vi.hoisted(() => ({
  fetchTutorStatus: vi.fn(async () => ({ enabled: true })),
  streamTutor: vi.fn(),
}));
vi.mock('@/api/tutor', () => ({
  fetchTutorStatus: (...args) => tutorMocks.fetchTutorStatus(...args),
  streamTutor: (...args) => tutorMocks.streamTutor(...args),
}));
vi.mock('@/api/analytics', () => ({ logCypherEvent: vi.fn() }));
// Sign-in state: null = no auth context (state unknown, treated as signed in).
const authState = vi.hoisted(() => ({ value: null }));
vi.mock('@/lib/AuthContext', () => ({ useOptionalAuth: () => authState.value }));

// SSR: effects (analytics, tutor status) do not run, so the panel renders
// its first paint — greeting, difficulty selector, and the three
// explanation buttons — without any network. The tutor hooks need a
// QueryClientProvider (same pattern as Seo.test.jsx).
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
  it('renders the depth levels as a segmented control, the follow-up box, and no mission section, no greeting, and no Read answer', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
    });
    // No greeting paragraph anymore (and no "Stuck on a concept?" subtitle —
    // that lived in the lesson page, which now shows just the "Cypher"
    // heading): the panel opens straight onto the level selector.
    expect(html).not.toContain('Hi, I’m Cypher');
    expect(html).not.toContain('Stuck on a concept');
    expect(html).not.toContain('Read answer');
    // The depth selector is a segmented control (radiogroup), not a select.
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('data-level="beginner"');
    expect(html).toContain('data-level="intermediate"');
    expect(html).toContain('data-level="advanced"');
    expect(html).not.toContain('<select');
    expect(html).toContain('Explanation difficulty level');
    // The three explanation buttons render only once the tutor-status
    // query resolves (client-side) — in SSR the tutor is not yet known to
    // be enabled, so the panel shows the unavailable fallback instead.
    // The mounted test asserts the three exact labels and no fourth button.
    expect(html).toContain('The AI tutor isn’t available on this server right now.');
    // Until the tutor is known to be enabled there is no follow-up box and
    // no floating pill either (both need a working tutor).
    expect(html).not.toContain('<input');
    expect(html).not.toContain('data-testid="cypher-launcher"');
    // The panel itself is rendered (closed: hidden + inert) so the voice can
    // keep playing after the learner closes it.
    expect(html).toContain('data-testid="cypher-panel"');
    expect(html).toContain('data-open="false"');
    expect(html).toContain('inert=""');
    // No mission section at all: the mission opens only from the handoff's
    // Launch Mission button after practice — nothing about Operation
    // Broken Shield shows on the lesson page.
    expect(html).not.toContain('Operation Broken Shield');
    expect(html).not.toContain('Launch Mission');
    expect(html).not.toContain('/missions/op-broken-shield');
    expect(html).not.toContain('Show a practical application');
    expect(html).not.toContain('A live incident in the SOC');
    expect(html).not.toContain('Start Mission');
    expect(html).not.toContain('Why are these still open?');
    // Listen-only: no answers card and no Hear again, in any render.
    expect(html).not.toContain('CYPHER ANSWERS');
    expect(html).not.toContain('Hear again');
  });

  it('renders the 2D face on its dark chip instead of the video, with the tutor caption', () => {
    const html = renderPanel({
      lesson: { id: 'net-security', title: 'Network Security', trackId: 'net' },
      missionId: 'op-broken-shield',
    });
    // The face replaces the background video: the 2D Happy face on its
    // dark chip (#0D1B2A), served from public/images.
    expect(html).not.toContain('<video');
    expect(html).not.toContain('/videos/');
    expect(html).toContain('/images/cypher-face-happy.png');
    expect(html).toContain('bg-[#0D1B2A]');
    expect(html).toContain('Cypher — your AI tutor');
    // No 3D viewer at all anymore: no manipulation hints, no model slot.
    expect(html).not.toContain('Drag to rotate');
    expect(html).not.toContain('Scroll to zoom');
    expect(html).not.toContain('Click parts for info');
  });
});

describe('presetQuestion', () => {
  // The presets are the questions each button sends: there is no input box
  // anymore, so each button builds its own real question about this lesson
  // and sends it with its mode (the backend answers 400 "question is
  // required" for explain/example/simplify without one).
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

describe('formatPlayerTime', () => {
  it('formats elapsed / total as m:ss', () => {
    expect(formatPlayerTime(0)).toBe('0:00');
    expect(formatPlayerTime(24)).toBe('0:24');
    expect(formatPlayerTime(84)).toBe('1:24');
    expect(formatPlayerTime(236)).toBe('3:56');
    expect(formatPlayerTime(0.5)).toBe('0:00'); // floors — no partial seconds
    expect(formatPlayerTime(NaN)).toBe('0:00');
  });
});

describe('CypherLessonPanel listen-only play experience (mounted)', () => {
  // The tutor's answer and the voice's spoken text are deliberately
  // DIFFERENT strings, so the test can tell the hidden full answer apart
  // from the spoken words: the backend strips Markdown before speaking,
  // so envelope.text is never the raw tutor text. Listen-only: NEITHER
  // string is ever on screen — the answer is heard, not read.
  const answerFor = (mode) => `Answer for ${mode}.`;
  const SPOKEN = 'The spoken words are cleaned and different.';
  const audioEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: SPOKEN, audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  // Minimal stand-in for the Web Audio API (see src/api/voice.test.js for
  // the same fakes, used for the same reason: this test environment has no
  // `window`/AudioContext, and useCypherVoice now plays through one).
  // Each decoded buffer is 2 s long and currentTime is mutable, so
  // pause/resume offsets are exact; the analyser fills a ramp so the
  // waveform bars actually move with the audio.
  class FakeAnalyser {
    constructor() { this.fftSize = 0; this.frequencyBinCount = 48; }
    connect() {}
    getByteFrequencyData(data) { for (let i = 0; i < data.length; i++) data[i] = i * 5; }
  }
  class FakeGain {
    constructor() { this.gain = { value: 1 }; }
    connect() {}
  }
  class FakeSourceNode {
    constructor() { FakeSourceNode.instances.push(this); this.buffer = null; this.startWhen = null; this.startOffset = null; }
    connect() {}
    start(when = 0, offset = 0) { this.started = true; this.startWhen = when; this.startOffset = offset; }
    stop() { this.stopped = true; }
  }
  class FakeAudioContext {
    constructor() { FakeAudioContext.instances.push(this); this.destination = {}; this.state = 'running'; this.currentTime = 0; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 2 }); }
    createBufferSource() { return new FakeSourceNode(); }
    createGain() { return new FakeGain(); }
    createAnalyser() { return new FakeAnalyser(); }
  }

  let root;
  let speakEnvelope;
  let voiceStatusResponse;
  let slowTutorGate;
  let tutorSignals;

  // The lesson's own text (Overview + body) the panel sends so the tutor
  // explains only what this lesson covers.
  const LESSON_TEXT = 'Attackers who get onto a network, even as a guest, often start at Layer 2.';

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

  function makeLocalStorage(initial = {}) {
    const store = { ...initial };
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      _store: store,
    };
  }

  async function flush(times = 5) {
    for (let i = 0; i < times; i++) {
      await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    }
  }

  function mountPanel(lessonText = LESSON_TEXT, muted = false, furtherReading = undefined) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // The hook reads the mute flag from the BARE localStorage global (as
    // '1'/'0'), not window.localStorage — so the fake goes there.
    globalThis.localStorage = makeLocalStorage(muted ? { 'rtc-cypher-voice-muted': '1' } : {});
    TestRenderer.act(() => {
      root = TestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <StaticRouter location="/academy/lessons/net-security">
            <CypherLessonPanel lesson={{ id: 'net-security', title: 'Network Security', trackId: 'net' }} missionId="op-broken-shield" lessonText={lessonText} furtherReading={furtherReading} />
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

  function panelNode() {
    return root.root.findByProps({ 'data-testid': 'cypher-panel' });
  }

  // Scoped to the panel: while Cypher talks with the panel closed, the
  // floating pill shows its own Pause / Stop with the same labels.
  function findButtonByAria(label) {
    return panelNode().findAllByType('button').find((b) => b.props['aria-label'] === label);
  }

  function launcher() {
    return root.root.findAllByProps({ 'data-testid': 'cypher-launcher' })[0];
  }

  function findLauncherButton(label) {
    const l = launcher();
    return l ? l.findAllByType('button').find((b) => b.props['aria-label'] === label) : undefined;
  }

  function playerCard() {
    return root.root.findByProps({ 'data-testid': 'cypher-player-card' });
  }

  function presetsRow() {
    return root.root.findByProps({ 'data-testid': 'cypher-presets' });
  }

  function waveformBars() {
    return root.root.findAllByProps({ 'data-testid': 'cypher-waveform-bar' }).map((n) => n.props.style.height);
  }

  async function askPreset(label = 'Explain this concept') {
    await flush();
    const preset = findButton(label);
    expect(preset).toBeTruthy();
    TestRenderer.act(() => { preset.props.onClick(); });
    await flush();
  }

  beforeEach(() => {
    FakeSourceNode.instances = [];
    FakeAudioContext.instances = [];
    globalThis.window = {
      AudioContext: FakeAudioContext,
      localStorage: makeLocalStorage(),
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    };
    __clearVoiceCache(); // the cache is a module singleton — isolate each test
    speakEnvelope = audioEnvelope;
    voiceStatusResponse = { configured: true, characters: { cypher: true } };
    slowTutorGate = null;
    tutorSignals = [];
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/api/voice/status') return jsonResponse(voiceStatusResponse);
      return jsonResponse(speakEnvelope); // /api/voice/speak resolves at once
    });
    tutorMocks.streamTutor.mockImplementation((body, { onToken, signal } = {}) => {
      const text = answerFor(body.mode);
      const gate = slowTutorGate;
      slowTutorGate = null; // only the next call is slow
      tutorSignals.push(signal);
      return new Promise((resolve, reject) => {
        const onAbort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        signal?.addEventListener?.('abort', onAbort);
        const finish = () => {
          signal?.removeEventListener?.('abort', onAbort);
          if (signal?.aborted) { reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })); return; }
          onToken?.('tok', text);
          resolve(text);
        };
        if (gate) gate.promise.then(finish, (e) => { signal?.removeEventListener?.('abort', onAbort); reject(e); });
        else finish();
      });
    });
  });

  afterEach(() => {
    if (root) TestRenderer.act(() => { root.unmount(); });
    root = null;
    delete globalThis.window;
    delete globalThis.localStorage;
    vi.clearAllMocks();
  });

  it('has no answers card, no Hear again, and no answer text anywhere — in any state', async () => {
    mountPanel();
    await flush();
    expect(treeText()).not.toContain('CYPHER ANSWERS');
    expect(treeText()).not.toContain('Hear again');
    expect(treeText()).not.toContain('Hear Cypher say it');
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain(SPOKEN);
    // …and still none after an answer has been heard.
    await askPreset();
    await flush();
    expect(treeText()).not.toContain('CYPHER ANSWERS');
    expect(treeText()).not.toContain('Hear again');
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain(SPOKEN);
  });

  it('each preset requests its tutor mode directly, without typing', async () => {
    mountPanel();
    await flush();
    // The play button plus exactly three presets — and no fourth preset:
    // no "Quiz me" (the tutor has no quiz mode).
    expect(findButton('Explain this concept')).toBeTruthy();
    expect(findButton('Give me an example')).toBeTruthy();
    expect(findButton('Explain it more simply')).toBeTruthy();
    expect(findButton('Quiz me')).toBeFalsy();
    expect(findButtonByAria('Play Cypher’s explanation')).toBeTruthy();
    // The presets ask directly — the only input is the follow-up box.
    expect(root.root.findAllByType('input').length).toBe(1);
    // Each button sends its own mode plus the question the mode needs,
    // built from the lesson context — no typing involved.
    const cases = [
      ['Explain this concept', 'explain'],
      ['Give me an example', 'example'],
      ['Explain it more simply', 'simplify'],
    ];
    for (const [label, mode] of cases) {
      const button = findButton(label);
      expect(button).toBeTruthy();
      TestRenderer.act(() => { button.props.onClick(); });
      await flush();
      const lastCall = tutorMocks.streamTutor.mock.calls.at(-1)[0];
      expect(lastCall.mode).toBe(mode);
      expect(lastCall.question).toBe(presetQuestion(mode, 'Network Security', 'intermediate'));
      expect(lastCall.track).toBe('net');
      expect(lastCall.topic).toBe('Network Security');
      // Grounding: the lesson's own text travels with every preset ask.
      expect(lastCall.lesson_text).toBe(LESSON_TEXT);
    }
  });

  it('omits lesson_text when the page has no reading body to ground on', async () => {
    mountPanel(null);
    await flush();
    const button = findButton('Explain this concept');
    expect(button).toBeTruthy();
    TestRenderer.act(() => { button.props.onClick(); });
    await flush();
    const lastCall = tutorMocks.streamTutor.mock.calls.at(-1)[0];
    expect(lastCall.mode).toBe('explain');
    expect(lastCall.lesson_text).toBeUndefined();
  });

  it('sends the lesson’s further-reading links with every preset ask and with the warm-up', async () => {
    const LINKS = [
      { title: 'The Python Tutorial', url: 'https://docs.python.org/3/tutorial/' },
      { title: 'More Control Flow Tools', url: 'https://docs.python.org/3/tutorial/controlflow.html' },
    ];
    mountPanel(LESSON_TEXT, false, LINKS);
    await flush();
    // The warm-up already ran: all three preset generations carry the links,
    // so a warmed answer is generated under the same prompt as the tap.
    const warmBodies = tutorMocks.streamTutor.mock.calls.map(([b]) => b);
    expect(warmBodies.map((b) => b.mode)).toEqual(['explain', 'example', 'simplify']);
    for (const body of warmBodies) expect(body.further_reading).toEqual(LINKS);
    // And the tap's own ask carries them too.
    const button = findButton('Explain this concept');
    TestRenderer.act(() => { button.props.onClick(); });
    await flush();
    expect(tutorMocks.streamTutor.mock.calls.at(-1)[0].further_reading).toEqual(LINKS);
  });

  it('omits further_reading when the lesson lists no links', async () => {
    mountPanel();
    await flush();
    const button = findButton('Explain this concept');
    TestRenderer.act(() => { button.props.onClick(); });
    await flush();
    expect(tutorMocks.streamTutor.mock.calls.at(-1)[0].further_reading).toBeUndefined();
  });

  it('auto-plays the answer when it arrives — no play press first — and shows the loading caption while it is being made', async () => {
    mountPanel();
    await flush();
    // Warm-up already ran (see below); arm the slow gate for the tap's
    // own tutor call so the loading state is observable. The gate is
    // consumed by the mock on the call, so the test keeps its own
    // reference to resolve it.
    const gate = deferred();
    slowTutorGate = gate;
    const preset = findButton('Explain this concept');
    TestRenderer.act(() => { preset.props.onClick(); });
    await flush(2);
    // While the answer is being made the caption says so, the play
    // button is disabled, and the full answer text is nowhere on screen.
    expect(treeText()).toContain('Getting your explanation ready…');
    expect(findButtonByAria('Play Cypher’s explanation').props.disabled).toBe(true);
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain(SPOKEN);
    // The answer arrives: it plays straight away, no separate play press.
    await TestRenderer.act(async () => { gate.resolve(); });
    await flush();
    expect(treeText()).toContain('Playing — tap to pause.');
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain(SPOKEN);
    expect(FakeSourceNode.instances[0].started).toBe(true);
  });

  it('is voice-only while audio plays — the caption says Playing, Pause and Stop show, the waveform moves', async () => {
    mountPanel();
    await askPreset();
    expect(treeText()).toContain('Playing — tap to pause.');
    expect(treeText()).not.toContain(SPOKEN); // voice-only: no subtitle
    expect(treeText()).not.toContain(answerFor('explain')); // full text hidden
    // No way to read the answer while voice works: the toggle is gone.
    expect(findButton('Read answer')).toBeFalsy();
    expect(findButton('Hide answer')).toBeFalsy();
    // Playing: the Play button became Pause, and Stop appears beside it.
    expect(findButtonByAria('Pause Cypher')).toBeTruthy();
    expect(findButtonByAria('Stop Cypher')).toBeTruthy();
    // The waveform is present and driven by the audio — its bars are not
    // all the same height (the fake analyser ramps up).
    const heights = waveformBars();
    expect(heights).toHaveLength(24);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  it('pauses freeze playback at the exact spot, resume continues from there, and Stop resets to the start', async () => {
    mountPanel();
    await askPreset();
    expect(findButtonByAria('Pause Cypher')).toBeTruthy();
    // 0.5 s into the answer (each decoded segment is 2 s).
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 0.5;
    // Pause: playback freezes — it does not stop, it does not reset.
    TestRenderer.act(() => { findButtonByAria('Pause Cypher').props.onClick(); });
    expect(treeText()).toContain('Paused — tap to continue.');
    expect(FakeSourceNode.instances[0].stopped).toBe(true);
    // The Pause button turned back into a Play (resume) and Stop stays.
    expect(findButtonByAria('Resume Cypher')).toBeTruthy();
    expect(findButtonByAria('Stop Cypher')).toBeTruthy();
    // Resume: a new source starts in the SAME segment at 0.5 s — not
    // from the start.
    TestRenderer.act(() => { findButtonByAria('Resume Cypher').props.onClick(); });
    expect(treeText()).toContain('Playing — tap to pause.');
    expect(FakeSourceNode.instances.length).toBe(2);
    expect(FakeSourceNode.instances[1].startOffset).toBe(0.5);
    expect(FakeSourceNode.instances[1].buffer).toBe(FakeSourceNode.instances[0].buffer);
    // Stop: playback ends completely and the position resets to the start;
    // the controls go back to Play only.
    TestRenderer.act(() => { findButtonByAria('Stop Cypher').props.onClick(); });
    expect(treeText()).toContain('Tap to hear it again.');
    expect(findButtonByAria('Play Cypher’s explanation')).toBeTruthy();
    expect(findButtonByAria('Pause Cypher')).toBeFalsy();
    expect(findButtonByAria('Stop Cypher')).toBeFalsy();
    // Play again: replays from the start, from the in-tab cache — no new
    // speak fetch.
    const speakBefore = globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak').length;
    TestRenderer.act(() => { findButtonByAria('Play Cypher’s explanation').props.onClick(); });
    await flush();
    expect(FakeSourceNode.instances[2].startOffset).toBe(0);
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak').length).toBe(speakBefore);
  });

  it('Stop while an answer is still being made cancels the generation', async () => {
    mountPanel();
    await flush();
    const gate = deferred();
    slowTutorGate = gate;
    const preset = findButton('Explain this concept');
    TestRenderer.act(() => { preset.props.onClick(); });
    await flush(2);
    expect(treeText()).toContain('Getting your explanation ready…');
    // Stop is there while generating, and ends it: the partial text is
    // cleared, so there is nothing half-made to play.
    expect(findButtonByAria('Stop Cypher')).toBeTruthy();
    TestRenderer.act(() => { findButtonByAria('Stop Cypher').props.onClick(); });
    await TestRenderer.act(async () => { gate.resolve(); });
    await flush();
    expect(treeText()).toContain('Tap an explanation above to hear Cypher.');
    expect(findButtonByAria('Stop Cypher')).toBeFalsy();
    expect(treeText()).not.toContain(answerFor('explain'));
  });

  it('warms the three preset answers on lesson load, so a tap plays from the cache with no new fetch', async () => {
    mountPanel();
    await flush();
    // On load, the three preset answers were generated (tutor) and their
    // audio warmed (voice) — in order, for this lesson and level.
    const warmCalls = tutorMocks.streamTutor.mock.calls.map(([b]) => b.mode);
    expect(warmCalls).toEqual(['explain', 'example', 'simplify']);
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak').length).toBe(3);
    // Tapping a preset now plays straight from the warmed cache: the
    // tutor runs once for the tap, but no new voice fetch happens.
    await askPreset();
    expect(treeText()).toContain('Playing — tap to pause.');
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/voice/speak').length).toBe(3);
    expect(FakeSourceNode.instances[0].started).toBe(true);
  });

  it('a tap before warm-up finishes still plays — the tap wins and warm-up stops', async () => {
    const gate = deferred(); // the warm-up's first tutor call stalls
    slowTutorGate = gate;
    mountPanel();
    await flush();
    // Warm-up is in flight (its first call hasn't resolved).
    expect(tutorMocks.streamTutor.mock.calls.length).toBe(1);
    // The tap runs its own generation at once — it is not blocked by the
    // warm-up — and the warm-up's remaining modes never run.
    const preset = findButton('Explain this concept');
    TestRenderer.act(() => { preset.props.onClick(); });
    await flush();
    expect(tutorMocks.streamTutor.mock.calls.length).toBe(2);
    expect(tutorSignals[0].aborted).toBe(true); // the warm-up was aborted
    expect(treeText()).toContain('Playing — tap to pause.');
    // Letting the stalled warm-up call resolve changes nothing: no more
    // warm-up calls happen for the other modes.
    await TestRenderer.act(async () => { gate.resolve(); });
    await flush();
    expect(tutorMocks.streamTutor.mock.calls.length).toBe(2);
  });

  it('the panel holds, in order: depth selector, presets, the neon player card, then the follow-up box', async () => {
    mountPanel();
    await flush();
    const order = ['Explanation difficulty level', 'cypher-presets', 'cypher-player-card', 'cypher-follow-up'];
    for (let i = 1; i < order.length; i++) {
      expect(treeText().indexOf(order[i - 1])).toBeLessThan(treeText().indexOf(order[i]));
    }
    // Everything lives inside the floating panel, not in the lesson flow.
    expect(() => panelNode().findByProps({ 'data-testid': 'cypher-player-card' })).not.toThrow();
    expect(() => panelNode().findByProps({ 'data-testid': 'cypher-presets' })).not.toThrow();
    expect(panelNode().props.className).toContain('fixed');
    // The player is part of the panel's light surface — no black card.
    expect(playerCard().props.className).not.toContain('bg-black');
    expect(playerCard().props.className).toContain('bg-slate-50');
    expect(treeText()).not.toContain('cypher-play-area');
  });

  it('hides the waveform until it talks, and the player card shows real progress and time', async () => {
    mountPanel();
    await flush();
    // Before playback: no waveform at all (no flat bars, no placeholder),
    // but the player card is there with the progress bar at 0 and 0:00.
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(0);
    expect(root.root.findByProps({ 'data-testid': 'cypher-progress' }).props['aria-valuenow']).toBe(0);
    expect(treeText()).toContain('0:00');
    // 0.5 s into the answer (a single decoded segment of 2 s).
    await askPreset();
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(1);
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 0.5;
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(root.root.findByProps({ 'data-testid': 'cypher-progress' }).props['aria-valuenow']).toBe(25); // 0.5 / 2 = 25%
    expect(treeText()).toContain('0:00 / 0:02');
    // Pause: the waveform stays visible but frozen, and the bar/time freeze.
    TestRenderer.act(() => { findButtonByAria('Pause Cypher').props.onClick(); });
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(1);
    const frozenHeights = waveformBars();
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(waveformBars()).toEqual(frozenHeights);
    expect(root.root.findByProps({ 'data-testid': 'cypher-progress' }).props['aria-valuenow']).toBe(25);
    // Stop: the waveform hides again and the bar resets to the start.
    TestRenderer.act(() => { findButtonByAria('Stop Cypher').props.onClick(); });
    expect(root.root.findAllByProps({ 'data-testid': 'cypher-waveform' })).toHaveLength(0);
    expect(root.root.findByProps({ 'data-testid': 'cypher-progress' }).props['aria-valuenow']).toBe(0);
  });

  it('the player buttons are circular, Play in the indigo-violet gradient — not all three at once', async () => {
    mountPanel();
    await flush();
    const play = findButtonByAria('Play Cypher’s explanation');
    expect(play.props.className).toContain('rounded-full');
    expect(play.props.className).toContain('from-indigo-600');
    expect(play.props.className).not.toContain('bg-black');
    // Idle: only Play shows — no Pause, no Stop (the mockup's still shows
    // all three at once; Spencer's confirmed behaviour shows Play only).
    expect(findButtonByAria('Pause Cypher')).toBeFalsy();
    expect(findButtonByAria('Stop Cypher')).toBeFalsy();
    await askPreset();
    // Playing: Play turned into Pause, and Stop appears beside it.
    expect(findButtonByAria('Pause Cypher')).toBeTruthy();
    const stop = findButtonByAria('Stop Cypher');
    expect(stop).toBeTruthy();
    expect(stop.props.className).toContain('rounded-full');
    expect(stop.props.className).toContain('bg-white');
    // No download button anywhere in the panel.
    expect(treeText()).not.toContain('Download');
  });

  it('when voice is not configured, the play button is disabled and the caption says why — no text fallback', async () => {
    voiceStatusResponse = { configured: false, characters: { cypher: false } };
    mountPanel();
    await flush();
    expect(treeText()).toContain('Cypher’s voice isn’t available on this server.');
    expect(findButtonByAria('Play Cypher’s explanation').props.disabled).toBe(true);
    // The presets are disabled too: generating answers nobody can hear
    // would waste tutor calls.
    expect(findButton('Explain this concept').props.disabled).toBe(true);
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain('CYPHER ANSWERS');
  });

  it('when the voice comes back with no audio, the caption says why — still no answer text', async () => {
    speakEnvelope = fallbackEnvelope;
    mountPanel();
    await askPreset();
    // The speak returned no audio: Cypher "talks" silently, and the
    // caption says the voice is unavailable instead of showing the words.
    expect(treeText()).toContain('Voice unavailable — check your sound.');
    expect(treeText()).not.toContain(answerFor('explain'));
    expect(treeText()).not.toContain(SPOKEN);
    expect(findButtonByAria('Play Cypher’s explanation').props.disabled).toBe(true);
    expect(treeText()).not.toContain('CYPHER ANSWERS');
  });

  it('when voice is muted, the caption says so with an Unmute button — still no answer text', async () => {
    mountPanel(LESSON_TEXT, true);
    await flush();
    expect(treeText()).toContain('Voice is muted.');
    expect(findButton('Unmute')).toBeTruthy();
    expect(findButtonByAria('Play Cypher’s explanation').props.disabled).toBe(true);
    expect(treeText()).not.toContain(answerFor('explain'));
    // Unmuting restores the panel: the caption goes back to the idle line
    // and the presets enable.
    TestRenderer.act(() => { findButton('Unmute').props.onClick(); });
    await flush();
    expect(treeText()).toContain('Tap an explanation above to hear Cypher.');
    expect(findButton('Explain this concept').props.disabled).toBe(false);
  });

  it('shows the 2D face (Happy, on its dark chip) in the panel, with no video element', () => {
    mountPanel();
    expect(root.root.findAllByType('video').length).toBe(0);
    const imgs = root.root.findAllByType('img');
    const face = imgs.find((i) => i.props.src === '/images/cypher-face-happy.png');
    expect(face).toBeTruthy();
    // The chip is the near-black card behind the white art.
    expect(treeText()).toContain('bg-[#0D1B2A]');
  });

  it('shows the same face under prefers-reduced-motion (the CSS fade is disabled, the swap is instant)', () => {
    globalThis.window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    mountPanel();
    expect(root.root.findAllByType('video').length).toBe(0);
    const imgs = root.root.findAllByType('img');
    expect(imgs.find((i) => i.props.src === '/images/cypher-face-happy.png')).toBeTruthy();
  });
});

describe('CypherLessonPanel floating panel (mounted)', () => {
  let root;
  let voiceStatus;
  let keyListeners = [];

  beforeEach(() => {
    globalThis.window = globalThis.window || {};
    globalThis.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    // The open panel listens for Escape on window.
    keyListeners = [];
    globalThis.window.addEventListener = (type, fn) => keyListeners.push([type, fn]);
    globalThis.window.removeEventListener = (type, fn) => { keyListeners = keyListeners.filter(([t, f]) => t !== type || f !== fn); };
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    voiceStatus = { configured: true, characters: { cypher: true } };
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('/voice/status')) return { ok: true, json: async () => voiceStatus };
      return { ok: false, status: 503, json: async () => ({}) };
    });
    tutorMocks.fetchTutorStatus.mockResolvedValue({ enabled: true });
    tutorMocks.streamTutor.mockReset();
    tutorMocks.streamTutor.mockImplementation(async () => '');
    authState.value = null;
  });

  afterEach(() => {
    TestRenderer.act(() => root?.unmount());
    root = null;
  });

  async function flush(times = 5) {
    for (let i = 0; i < times; i++) {
      await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    }
  }

  function mount() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    TestRenderer.act(() => {
      root = TestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <StaticRouter location="/academy/lessons/net-security">
            <CypherLessonPanel lesson={{ id: 'net-security', title: 'Network Security', trackId: 'net' }} lessonText="Firewalls filter traffic." />
          </StaticRouter>
        </QueryClientProvider>,
      );
    });
  }

  const panel = () => root.root.findByProps({ 'data-testid': 'cypher-panel' });
  const launcher = () => root.root.findAllByProps({ 'data-testid': 'cypher-launcher' })[0];
  const byAria = (node, label) => node.findAllByType('button').find((b) => b.props['aria-label'] === label);

  it('starts closed with an "Ask Cypher" pill; the pill opens the panel and Close shuts it', async () => {
    mount();
    await flush();
    expect(panel().props['data-open']).toBe('false');
    expect(panel().props.inert).toBe('');
    const ask = byAria(launcher(), 'Ask Cypher');
    expect(ask).toBeTruthy();
    TestRenderer.act(() => ask.props.onClick());
    expect(panel().props['data-open']).toBe('true');
    expect(panel().props.inert).toBeUndefined();
    // The pill hides while the panel is open.
    expect(launcher()).toBeUndefined();
    TestRenderer.act(() => byAria(panel(), 'Close Cypher').props.onClick());
    expect(panel().props['data-open']).toBe('false');
    expect(launcher()).toBeTruthy();
    // Escape closes it too.
    TestRenderer.act(() => byAria(launcher(), 'Ask Cypher').props.onClick());
    expect(panel().props['data-open']).toBe('true');
    const onKey = keyListeners.find(([t]) => t === 'keydown')[1];
    TestRenderer.act(() => onKey({ key: 'Escape' }));
    expect(panel().props['data-open']).toBe('false');
  });

  it('is a side panel on a computer and a bottom sheet on a phone', async () => {
    mount();
    await flush();
    const cls = panel().props.className;
    expect(cls).toContain('bottom-0');
    expect(cls).toContain('rounded-t-3xl');
    expect(cls).toContain('max-h-[85dvh]');
    expect(cls).toContain('sm:right-3');
    expect(cls).toContain('sm:w-[440px]');
  });

  it('the follow-up box asks in chat mode, at the chosen depth, about this lesson', async () => {
    mount();
    await flush();
    TestRenderer.act(() => panel().findByProps({ 'data-level': 'advanced' }).props.onClick());
    const input = panel().findByType('input');
    TestRenderer.act(() => input.props.onChange({ target: { value: 'Why does order matter in firewall rules?' } }));
    const form = panel().findByProps({ 'data-testid': 'cypher-follow-up' });
    TestRenderer.act(() => form.props.onSubmit({ preventDefault: () => {} }));
    await flush();
    const call = tutorMocks.streamTutor.mock.calls.at(-1)[0];
    expect(call.mode).toBe('chat');
    expect(call.level).toBe('advanced');
    expect(call.track).toBe('Network Security');
    expect(call.messages).toEqual([{ role: 'user', content: 'Why does order matter in firewall rules?' }]);
    // The box clears after sending.
    expect(panel().findByType('input').props.value).toBe('');
  });

  it('the depth selector is a radiogroup with one checked level', async () => {
    mount();
    await flush();
    const radios = panel().findAllByProps({ role: 'radio' }).filter((n) => n.type === 'button');
    expect(radios.map((r) => r.props['data-level'])).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(radios.filter((r) => r.props['aria-checked']).map((r) => r.props['data-level'])).toEqual(['intermediate']);
    TestRenderer.act(() => radios[0].props.onClick());
    const after = panel().findAllByProps({ role: 'radio' }).filter((n) => n.type === 'button');
    expect(after.filter((r) => r.props['aria-checked']).map((r) => r.props['data-level'])).toEqual(['beginner']);
  });

  it('signed-out learners see "Sign in to ask Cypher" instead of the controls, and nothing is generated', async () => {
    authState.value = { authChecked: true, isAuthenticated: false };
    mount();
    await flush();
    expect(() => panel().findByProps({ 'data-testid': 'cypher-signin' })).not.toThrow();
    expect(JSON.stringify(root.toJSON())).toContain('Sign in to ask Cypher');
    expect(panel().findAllByProps({ 'data-testid': 'cypher-presets' })).toHaveLength(0);
    expect(panel().findAllByType('input')).toHaveLength(0);
    // No background warm-up for a learner the backend would refuse.
    expect(tutorMocks.streamTutor).not.toHaveBeenCalled();
  });

  it('shows the tutor error in the caption (e.g. the backend refused the request)', async () => {
    // Every tutor call fails as the backend does for a 401 (the silent
    // warm-up swallows its failure; the tapped preset surfaces it).
    tutorMocks.streamTutor.mockImplementation(async () => { throw new Error('Sign in to use the AI tutor.'); });
    mount();
    await flush();
    const btn = panel().findAllByType('button').find((b) => b.children?.some((c) => typeof c === 'string' && c.includes('Explain this concept')));
    TestRenderer.act(() => btn.props.onClick());
    await flush();
    expect(JSON.stringify(root.toJSON())).toContain('Sign in to use the AI tutor.');
  });
});
