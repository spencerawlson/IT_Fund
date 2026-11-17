import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { speakVoice, fetchVoiceStatus, useCypherVoice, warmVoice, __clearVoiceCache } from './voice';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let calls;

function jsonResponse(body, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => body,
  };
}

beforeEach(() => {
  calls = [];
  globalThis.fetch = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    return jsonResponse({ character: 'cypher', text: 'Hello.', audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('speakVoice', () => {
  it('posts {character, text} to /api/voice/speak with the session cookie', async () => {
    const envelope = await speakVoice({ character: 'cypher', text: 'Hello.' });
    expect(calls[0].url).toBe('/api/voice/speak');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.credentials).toBe('include');
    expect(JSON.parse(calls[0].opts.body)).toEqual({ character: 'cypher', text: 'Hello.', purpose: 'lesson' });
    expect(envelope.fallback).toBe(true);
    expect(envelope.audio_b64).toBeNull();
  });

  it('turns a 401 into a learner-friendly sign-in message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Unauthorized' }, 401));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Sign in to hear Cypher speak.');
  });

  it('turns a 402 into a subscription message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Subscription required' }, 402));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('active subscription');
  });

  it('never puts key material in the error message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'ELEVENLABS_API_KEY is missing' }, 500));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Cypher’s voice isn’t available right now.');
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.not.toThrow(/ELEVENLABS/);
  });
});

describe('fetchVoiceStatus', () => {
  it('returns the status envelope when the backend answers JSON', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ configured: false, characters: { cypher: false } }));
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: { cypher: false } });
  });

  it('returns an unconfigured envelope for a non-JSON or failed response', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse('<html/>', 200, 'text/html'));
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: {} });
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: {} });
  });
});

// The hook needs a mounted component (no DOM here — react-test-renderer
// mounts without one). The probe captures the latest hook return on every
// render, so the test can drive play() and read loading/playing/fallback.
describe('useCypherVoice loading', () => {
  let latest;
  let voiceRefOut;
  let root;

  function Probe() {
    const voiceRef = React.useRef({ talking: false, level: 0 });
    voiceRefOut = voiceRef;
    latest = useCypherVoice(voiceRef);
    return null;
  }

  function mount() {
    TestRenderer.act(() => { root = TestRenderer.create(React.createElement(Probe)); });
  }

  function deferred() {
    let resolve; let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  // Minimal stand-in for the Web Audio API: decodeAudioData resolves at
  // once (no real decoder), and start()/stop() just track calls — this
  // Node environment has no `window`, so play() resolves ctx via this fake.
  // Each decoded buffer is 2 s long, and currentTime is a plain mutable
  // property the test can advance, so pause/resume offsets are exact.
  // The analyser fills a ramp (48 bins, 0..235) so the frequency bands
  // the waveform reads actually vary with the audio.
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
    close() { this.closed = true; this.state = 'closed'; return Promise.resolve(); }
    createBuffer() { return { duration: 0 }; }
    decodeAudioData() { FakeAudioContext.decodeCount += 1; return Promise.resolve({ duration: 2 }); }
    createBufferSource() { return new FakeSourceNode(); }
    createGain() { return new FakeGain(); }
    createAnalyser() { return new FakeAnalyser(); }
  }

  const audioEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  beforeEach(() => {
    FakeAudioContext.instances = [];
    FakeAudioContext.decodeCount = 0;
    FakeSourceNode.instances = [];
    globalThis.window = { AudioContext: FakeAudioContext };
    __clearVoiceCache(); // the cache is a module singleton — isolate each test
  });

  afterEach(() => {
    if (root) TestRenderer.act(() => { root.unmount(); });
    root = null;
    latest = null;
    delete globalThis.window;
  });

  it('is idle before play(), loads while the speak fetch is pending, and clears when audio starts', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(false);
    expect(latest.fallback).toBe(false);

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    expect(latest.loading).toBe(true);
    expect(latest.playing).toBe(false);
    // The AudioContext must be created+resumed synchronously here, before
    // the speak fetch resolves: on a real browser this is the only way
    // audio started later (ElevenLabs synthesis can take ~25s) still counts
    // as gesture-initiated. See scripts/_voice_autoplay_repro*.mjs.
    expect(FakeAudioContext.instances.length).toBe(1);

    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(audioEnvelope));
      await playPromise;
    });
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(true);
    expect(latest.fallback).toBe(false);
    expect(latest.subtitle).toBe('Hello.');
    // Played through the already-unlocked AudioContext, not a cold
    // HTMLMediaElement.play() call made after the fetch.
    expect(FakeSourceNode.instances[0].started).toBe(true);
  });

  it('unlock() opens the audio inside the tap, and a later play() reuses that same context (phones)', async () => {
    // Phones only let an AudioContext make sound if a tap started it. The
    // lesson panel's answer auto-plays seconds after the tap (when the
    // tutor's text arrives), so the tap calls unlock() and play() must
    // reuse THAT context instead of creating a new, suspended one.
    globalThis.fetch = vi.fn(async () => jsonResponse(audioEnvelope));
    mount();
    TestRenderer.act(() => { latest.unlock(); });
    expect(FakeAudioContext.instances.length).toBe(1);
    const unlocked = FakeAudioContext.instances[0];
    // The silent one-sample buffer was started on it (the iOS unlock).
    expect(FakeSourceNode.instances.some((n) => n.started)).toBe(true);
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(FakeAudioContext.instances.length).toBe(1);
    expect(latest.playing).toBe(true);
    // stop() keeps the unlocked context open for the next answer...
    TestRenderer.act(() => { latest.stop(); });
    expect(unlocked.closed).toBeUndefined();
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(FakeAudioContext.instances.length).toBe(1);
    // ...and it is closed only when the component goes away.
    TestRenderer.act(() => { root.unmount(); });
    root = null;
    expect(unlocked.closed).toBe(true);
  });

  it('unlock() asks iOS to treat the audio as media playback (not muted by the silent switch)', () => {
    const audioSession = { type: 'auto' };
    vi.stubGlobal('navigator', { audioSession });
    mount();
    TestRenderer.act(() => { latest.unlock(); });
    expect(audioSession.type).toBe('playback');
    vi.unstubAllGlobals();
  });

  it('replaying the same text this visit skips the fetch and the decode entirely', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(audioEnvelope));
      await playPromise;
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(1);
    expect(latest.playing).toBe(true);

    // Same text again: already cached in this tab, so no second fetch to
    // /voice/speak (no ElevenLabs cost, no network) and no re-decoding —
    // it plays straight through the same (still-open) AudioContext.
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(1);
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(true);
    expect(latest.subtitle).toBe('Hello.');
    expect(FakeSourceNode.instances[1].started).toBe(true);
  });

  it('play(text, character) speaks as that character and caches per character', async () => {
    // The mission briefing passes each turn's speaker; the same text
    // spoken by two robots is two cache entries (and two fetches), and
    // replaying one reuses its own entry. play(text) with no character
    // still speaks as Cypher (the lesson panel + debrief call it so).
    const sentinelEnvelope = { character: 'sentinel', text: 'Hello.', audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
    const gate = deferred();
    const fetchMock = vi.fn(() => gate.promise);
    globalThis.fetch = fetchMock;
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.', 'sentinel'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(sentinelEnvelope));
      await playPromise;
    });
    expect(latest.playing).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ character: 'sentinel', text: 'Hello.', purpose: 'lesson' });

    // Same text as Cypher is a different cache entry: a second fetch,
    // posted as cypher — and the no-character call still defaults so.
    const cypherEnvelope = { ...sentinelEnvelope, character: 'cypher' };
    globalThis.fetch = vi.fn(async () => jsonResponse(cypherEnvelope));
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ character: 'cypher', text: 'Hello.', purpose: 'lesson' });

    // Replaying the Sentinel turn reuses its cache: no third fetch.
    await TestRenderer.act(async () => { await latest.play('Hello.', 'sentinel'); });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(latest.playing).toBe(true);
  });

  it('clears loading and reports fallback when the envelope has no audio', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    expect(latest.loading).toBe(true);

    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(fallbackEnvelope));
      await playPromise;
    });
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(true); // silent talk while the subtitles show
    expect(latest.fallback).toBe(true);
    expect(latest.subtitle).toBe('Hello.');
  });

  it('clears loading and surfaces an error when the speak request fails', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'boom' }, 500));
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    expect(latest.loading).toBe(true);

    await TestRenderer.act(async () => { await playPromise; });
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(false);
    expect(latest.fallback).toBe(true);
    expect(latest.error).toMatch(/isn’t available/);
  });

  it('clears loading when the fetch itself rejects', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    expect(latest.loading).toBe(true);

    await TestRenderer.act(async () => {
      gate.reject(new Error('network down'));
      await playPromise;
    });
    expect(latest.loading).toBe(false);
    expect(latest.playing).toBe(false);
    expect(latest.fallback).toBe(true);
    expect(latest.error).toBeTruthy();
  });

  it('plays multi-segment audio in order and ends after the last segment', async () => {
    // A long answer arrives as segments (one base64 MP3 per synthesis
    // chunk, in order): each segment's end starts the next, and the last
    // segment's end stops playback — the whole answer is heard, not just
    // the first chunk.
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    expect(FakeAudioContext.decodeCount).toBe(2);
    expect(latest.playing).toBe(true);
    expect(FakeSourceNode.instances.length).toBe(1);
    expect(FakeSourceNode.instances[0].started).toBe(true);

    // The first segment ends: the second starts, still playing.
    TestRenderer.act(() => { FakeSourceNode.instances[0].onended(); });
    expect(FakeSourceNode.instances.length).toBe(2);
    expect(FakeSourceNode.instances[1].started).toBe(true);
    expect(latest.playing).toBe(true);

    // The last segment ends: playback stops.
    TestRenderer.act(() => { FakeSourceNode.instances[1].onended(); });
    expect(latest.playing).toBe(false);
    expect(latest.subtitle).toBe('');
  });

  it('replaying a multi-segment text reuses the decoded buffers', async () => {
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(2);
    // Finish the chain so the replay starts clean.
    TestRenderer.act(() => { FakeSourceNode.instances[0].onended(); });
    TestRenderer.act(() => { FakeSourceNode.instances[1].onended(); });
    expect(latest.playing).toBe(false);

    // Same text again: no second fetch, no re-decoding of either segment.
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(2);
    expect(latest.playing).toBe(true);
    expect(FakeSourceNode.instances.length).toBe(3);
    expect(FakeSourceNode.instances[2].started).toBe(true);
  });

  it('falls back to silent speech when the AudioContext stays suspended (Safari auto-play)', async () => {
    // The mission opening auto-plays with no user gesture, so Safari
    // leaves the AudioContext suspended: source.start() on a suspended
    // context never advances and onended never fires, so without this
    // fallback playing would stay true forever and the opening would
    // hang on the briefing step. The hook races resume() against 1 s,
    // then degrades to the silent word-count timer — the sequence
    // always advances, and playing still ends.
    class SuspendedAudioContext extends FakeAudioContext {
      constructor() {
        super();
        this.state = 'suspended';
      }
      // resume() never resolves (no gesture): the 1 s race must win.
      resume() { return new Promise(() => {}); }
    }
    globalThis.window = { AudioContext: SuspendedAudioContext };
    vi.useFakeTimers();
    try {
      const gate = deferred();
      globalThis.fetch = vi.fn(() => gate.promise);
      mount();

      let playPromise;
      TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
      await TestRenderer.act(async () => {
        gate.resolve(jsonResponse(audioEnvelope));
        // The 1 s resume race must win before play() can return.
        await vi.advanceTimersByTimeAsync(1000);
        await playPromise;
      });
      expect(latest.loading).toBe(false);
      expect(latest.playing).toBe(true); // silent talk while the subtitles show
      expect(latest.fallback).toBe(true);
      expect(latest.subtitle).toBe('Hello.');
      expect(FakeSourceNode.instances.length).toBe(0); // no audio started

      // The silent timer ends playback (1 word -> 2500 ms minimum).
      await TestRenderer.act(async () => { await vi.advanceTimersByTimeAsync(2500); });
      expect(latest.playing).toBe(false);
      expect(latest.subtitle).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses freeze playback at the exact spot and resume continues from there, not the start', async () => {
    // A two-segment answer; each segment decodes to 2 s. Pause 0.5 s into
    // the first segment: the source stops and the position is kept.
    // Resume must start a new source in the SAME segment at 0.5 s — not
    // from the start, and not in the next segment.
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    expect(latest.playing).toBe(true);
    expect(latest.paused).toBe(false);

    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 0.5;
    TestRenderer.act(() => { latest.pause(); });
    expect(latest.playing).toBe(false);
    expect(latest.paused).toBe(true);
    expect(FakeSourceNode.instances[0].stopped).toBe(true);

    TestRenderer.act(() => { latest.resume(); });
    expect(latest.playing).toBe(true);
    expect(latest.paused).toBe(false);
    expect(FakeSourceNode.instances.length).toBe(2);
    expect(FakeSourceNode.instances[1].startOffset).toBe(0.5);
    expect(FakeSourceNode.instances[1].buffer).toBe(FakeSourceNode.instances[0].buffer);
  });

  it('pausing at a segment end resumes in the next segment', async () => {
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 2; // exactly the end of the first 2 s segment
    TestRenderer.act(() => { latest.pause(); });
    TestRenderer.act(() => { latest.resume(); });
    expect(FakeSourceNode.instances.length).toBe(2);
    expect(FakeSourceNode.instances[1].startOffset).toBe(0);
    expect(FakeSourceNode.instances[1].buffer).not.toBe(FakeSourceNode.instances[0].buffer);
  });

  it('stop after a pause discards the position, so the next play starts from the beginning', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(audioEnvelope));
      await playPromise;
    });
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 1;
    TestRenderer.act(() => { latest.pause(); });
    expect(latest.paused).toBe(true);

    TestRenderer.act(() => { latest.stop(); });
    expect(latest.paused).toBe(false);
    expect(latest.playing).toBe(false);

    // A resume after stop is a no-op (nothing paused); a fresh play
    // starts at offset 0.
    TestRenderer.act(() => { latest.resume(); });
    expect(FakeSourceNode.instances.length).toBe(1);
    await TestRenderer.act(async () => { await latest.play('Hello.'); });
    expect(FakeSourceNode.instances[1].startOffset).toBe(0);
    expect(latest.playing).toBe(true);
  });

  it('pause and resume are no-ops when nothing is playing or paused', async () => {
    mount();
    expect(latest.playing).toBe(false);
    TestRenderer.act(() => { latest.pause(); });
    expect(latest.paused).toBe(false);
    TestRenderer.act(() => { latest.resume(); });
    expect(FakeSourceNode.instances.length).toBe(0);
  });

  it('writes 24 frequency bands into the shared voice ref while playing', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(audioEnvelope));
      await playPromise;
    });
    const { bands, level } = voiceRefOut.current;
    expect(bands).toHaveLength(24);
    expect(bands[0]).toBeGreaterThanOrEqual(0);
    expect(bands[23]).toBeGreaterThan(bands[0]); // the fake analyser ramps up
    expect(level).toBeGreaterThan(0);
  });

  it('reports playback progress — total from the decoded durations, elapsed from the segment clock', async () => {
    // A two-segment answer; each segment decodes to 2 s, so the whole
    // answer is 4 s. The player card reads this for its progress bar and
    // elapsed / total time — the total is the real audio length, never a
    // guess.
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    expect(latest.progress).toEqual({ elapsed: 0, total: 4 });

    // 0.5 s into the first segment: the position advances with the clock
    // (the 250 ms tick picks it up).
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    ctx.currentTime = 0.5;
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(latest.progress).toEqual({ elapsed: 0.5, total: 4 });

    // Pause: the position freezes at the paused spot — it does not drift
    // while paused, and the tick is off.
    TestRenderer.act(() => { latest.pause(); });
    expect(latest.progress).toEqual({ elapsed: 0.5, total: 4 });
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(latest.progress).toEqual({ elapsed: 0.5, total: 4 });

    // Resume: the tick restarts and the position advances from the paused
    // spot, not from the start.
    TestRenderer.act(() => { latest.resume(); });
    ctx.currentTime = 1;
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(latest.progress).toEqual({ elapsed: 1, total: 4 });

    // Stop: the position resets to the start.
    TestRenderer.act(() => { latest.stop(); });
    expect(latest.progress).toEqual({ elapsed: 0, total: 0 });
  });

  it('resets progress to zero when the last segment ends', async () => {
    const multiEnvelope = {
      character: 'cypher', text: 'Hello.', audio_b64: 'QUJDREVG', audio_segments: ['QUJD', 'REVG'],
      mime: 'audio/mpeg', cached: false, fallback: false, reason: null,
    };
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(multiEnvelope));
      await playPromise;
    });
    expect(latest.progress).toEqual({ elapsed: 0, total: 4 });
    TestRenderer.act(() => { FakeSourceNode.instances[0].onended(); });
    expect(latest.playing).toBe(true);
    TestRenderer.act(() => { FakeSourceNode.instances[1].onended(); });
    expect(latest.playing).toBe(false);
    expect(latest.progress).toEqual({ elapsed: 0, total: 0 });
  });

  it('reports no total when there is no audio — the player shows elapsed only, never a fake total', async () => {
    const gate = deferred();
    globalThis.fetch = vi.fn(() => gate.promise);
    mount();

    let playPromise;
    TestRenderer.act(() => { playPromise = latest.play('Hello.'); });
    await TestRenderer.act(async () => {
      gate.resolve(jsonResponse(fallbackEnvelope));
      await playPromise;
    });
    expect(latest.fallback).toBe(true);
    expect(latest.progress).toEqual({ elapsed: 0, total: 0 });
  });
});

describe('warmVoice', () => {
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
    constructor() { FakeSourceNode.instances.push(this); this.buffer = null; }
    connect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }
  class FakeAudioContext {
    constructor() { FakeAudioContext.instances.push(this); this.destination = {}; this.state = 'running'; this.currentTime = 0; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    decodeAudioData() { FakeAudioContext.decodeCount += 1; return Promise.resolve({ duration: 2 }); }
    createBufferSource() { return new FakeSourceNode(); }
    createGain() { return new FakeGain(); }
    createAnalyser() { return new FakeAnalyser(); }
  }

  const audioEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  beforeEach(() => {
    FakeAudioContext.instances = [];
    FakeAudioContext.decodeCount = 0;
    FakeSourceNode.instances = [];
    globalThis.window = { AudioContext: FakeAudioContext };
    __clearVoiceCache();
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('fetches and decodes the audio into the in-tab cache without playing anything', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(audioEnvelope));
    await expect(warmVoice('Hello.')).resolves.toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(1);
    expect(FakeSourceNode.instances.length).toBe(0); // warmed, not played

    // A later play() of the same text finds the decoded buffers and
    // starts at once: no second fetch, no re-decode.
    let latest;
    function Probe() {
      const voiceRef = React.useRef({ talking: false, level: 0 });
      latest = useCypherVoice(voiceRef);
      return null;
    }
    let root;
    TestRenderer.act(() => { root = TestRenderer.create(React.createElement(Probe)); });
    try {
      await TestRenderer.act(async () => { await latest.play('Hello.'); });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(FakeAudioContext.decodeCount).toBe(1);
      expect(latest.playing).toBe(true);
      expect(FakeSourceNode.instances.length).toBe(1);
    } finally {
      TestRenderer.act(() => { root.unmount(); });
    }
  });

  it('returns true immediately when the text is already warmed', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(audioEnvelope));
    await expect(warmVoice('Hello.')).resolves.toBe(true);
    await expect(warmVoice('Hello.')).resolves.toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(FakeAudioContext.decodeCount).toBe(1);
  });

  it('returns false on a fallback envelope and on a fetch failure', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(fallbackEnvelope));
    await expect(warmVoice('Hello.')).resolves.toBe(false);
    expect(FakeAudioContext.decodeCount).toBe(0);

    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    await expect(warmVoice('Hello.')).resolves.toBe(false);
  });
});
