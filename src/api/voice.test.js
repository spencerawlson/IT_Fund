import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { speakVoice, fetchVoiceStatus, useCypherVoice } from './voice';

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
    expect(JSON.parse(calls[0].opts.body)).toEqual({ character: 'cypher', text: 'Hello.' });
    expect(envelope.fallback).toBe(true);
    expect(envelope.audio_b64).toBeNull();
  });

  it('turns a 401 into a learner-friendly sign-in message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Unauthorized' }, 401));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Sign in to hear Cipher speak.');
  });

  it('turns a 402 into a subscription message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Subscription required' }, 402));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('active subscription');
  });

  it('never puts key material in the error message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'ELEVENLABS_API_KEY is missing' }, 500));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Cipher’s voice isn’t available right now.');
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
  let root;

  function Probe() {
    const voiceRef = React.useRef({ talking: false, level: 0 });
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
    constructor() { FakeAudioContext.instances.push(this); this.destination = {}; this.state = 'running'; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
    createBufferSource() { return new FakeSourceNode(); }
    createGain() { return new FakeGain(); }
    createAnalyser() { return new FakeAnalyser(); }
  }

  const audioEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: 'QUJD', mime: 'audio/mpeg', cached: false, fallback: false, reason: null };
  const fallbackEnvelope = { character: 'cypher', text: 'Hello.', audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' };

  beforeEach(() => {
    FakeAudioContext.instances = [];
    FakeSourceNode.instances = [];
    globalThis.window = { AudioContext: FakeAudioContext };
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
});
