// Client for the backend character-voice service (backend/voice.py).
// The ElevenLabs key and voice IDs never reach the browser: the client
// sends {character, text} and gets audio back (base64 MP3) or a text-only
// fallback ({audio_b64: null, fallback: true}).
import React from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchVoiceStatus() {
  try {
    const res = await fetch(`${API_BASE}/voice/status`);
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('application/json')) {
      return { configured: false, characters: {} };
    }
    return res.json();
  } catch {
    // Status is best-effort: no backend, no network — voice is simply
    // unconfigured, and the UI falls back to text.
    return { configured: false, characters: {} };
  }
}

/**
 * Ask the backend to speak `text` as `character`. Resolves with the
 * envelope {character, text, audio_b64, mime, cached, fallback, reason?}.
 * Throws a learner-friendly Error on auth/paywall/rate-limit failures;
 * a fallback envelope is NOT an error — the caller shows the subtitles.
 */
export async function speakVoice({ character, text }) {
  const res = await fetch(`${API_BASE}/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // session cookie: voice requires a signed-in learner
    body: JSON.stringify({ character, text }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).detail;
    } catch {
      // non-JSON error body
    }
    // Only validation errors (400/422) surface the server's detail: a 500's
    // detail can contain internal text (env var names, stack fragments) and
    // must never reach the learner. The voice endpoint is designed to
    // return a fallback envelope instead of a 500 for voice failures.
    const message =
      res.status === 401
        ? 'Sign in to hear Cipher speak.'
        : res.status === 402
          ? 'Character voices need an active subscription.'
          : res.status === 429
            ? 'You’ve hit the voice limit for now. Try again a bit later.'
            : (res.status === 400 || res.status === 422) && typeof detail === 'string' && detail
              ? detail
              : 'Cipher’s voice isn’t available right now.';
    throw new Error(message);
  }
  return res.json();
}

const MUTE_KEY = 'rtc-cypher-voice-muted';
const VOLUME_KEY = 'rtc-cypher-voice-volume';

// In-tab cache of {character, text} -> {envelope, audioBuffer}, so asking
// Cypher to repeat something already heard this visit (a lesson he already
// explained, "Hear again") never re-fetches or re-downloads: no request to
// /voice/speak at all, and no re-decoding once the AudioBuffer is cached.
// Module-level (not per-hook-instance) so it survives remounting the panel
// while navigating between lessons in the same tab. Capped and FIFO-evicted
// — this is a speed/bandwidth cache for the current visit, not meant to
// grow without bound; the backend's own disk cache is what makes a lesson
// "cached forever" across visits and restarts.
const MAX_CLIENT_VOICE_CACHE = 40;
const voiceCache = new Map();

function cacheVoice(key, value) {
  voiceCache.set(key, value);
  if (voiceCache.size > MAX_CLIENT_VOICE_CACHE) {
    voiceCache.delete(voiceCache.keys().next().value);
  }
}

// Test-only: the cache is a module singleton, so tests must reset it
// between cases (otherwise one test's cached text leaks into the next).
export function __clearVoiceCache() {
  voiceCache.clear();
}

function readStored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

/**
 * Cypher voice playback. `voiceRef` is a shared mutable ref
 * { talking, level } the 3D character reads every frame: while audio plays
 * the character talks (talk clip + audio-reactive head bob); when it stops
 * he goes back to idle. Mute + volume persist in localStorage.
 *
 * play(text) -> the spoken text (or '' on error): fetches the audio and
 * plays it through a Web Audio AudioBufferSourceNode, feeding an analyser
 * that drives voiceRef.level. Playback goes through the Web Audio API
 * rather than an <audio> element on purpose: the speak fetch (ElevenLabs
 * synthesis) can take ~25s, long past the window browsers honor a click's
 * gesture for a cold `audio.play()` call (Safari/iOS always reject it;
 * Chrome does under stricter autoplay policies). An AudioContext resumed
 * synchronously at the top of play() — before that fetch — stays "unlocked"
 * for as long as it's open, so starting the real audio on it once the
 * fetch resolves needs no fresh gesture. A fallback envelope (no audio)
 * still returns the text — the caller shows it as text and Cypher talks
 * silently (text-only fallback).
 */
export function useCypherVoice(voiceRef) {
  const [muted, setMutedState] = React.useState(() => readStored(MUTE_KEY, '0') === '1');
  const [volume, setVolumeState] = React.useState(() => {
    const v = parseFloat(readStored(VOLUME_KEY, '0.9'));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.9;
  });
  const [playing, setPlaying] = React.useState(false);
  // True only while the speak fetch is in flight. Synthesis of a long
  // answer can take ~25 s, and until now the button gave no feedback in
  // that window — the silence read as "voice isn't available". While
  // loading, callers show "Loading voice…" and disable the button.
  const [loading, setLoading] = React.useState(false);
  // True when the most recent play() ended without audio — voice not
  // configured, muted, or errored — so callers show the text instead of
  // leaving the student with nothing to listen to.
  const [fallback, setFallback] = React.useState(false);
  const [error, setError] = React.useState('');
  const [subtitle, setSubtitle] = React.useState('');
  const rafRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);
  const sourceNodeRef = React.useRef(null);
  const gainNodeRef = React.useRef(null);

  const stopLevelLoop = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (voiceRef) voiceRef.current = { talking: false, level: 0 };
  }, [voiceRef]);

  const stop = React.useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }
    gainNodeRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    stopLevelLoop();
    setPlaying(false);
    setLoading(false);
    setSubtitle('');
  }, [stopLevelLoop]);

  const setMuted = React.useCallback((next) => {
    setMutedState(next);
    try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    if (gainNodeRef.current) gainNodeRef.current.gain.value = next ? 0 : volume;
  }, [volume]);

  const setVolume = React.useCallback((next) => {
    const v = Math.max(0, Math.min(1, next));
    setVolumeState(v);
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* ignore */ }
    if (gainNodeRef.current && !muted) gainNodeRef.current.gain.value = v;
  }, [muted]);

  const play = React.useCallback(async (text) => {
    stop();
    setError('');
    setFallback(false);
    if (!text || !text.trim()) return '';
    // Resume the AudioContext here, synchronously, before the speak fetch:
    // this is still inside the click's user gesture. Once resumed, the
    // context stays unlocked for as long as it's open, so the real audio
    // can start on it later — after the fetch — with no fresh gesture.
    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      ctx.resume().catch(() => {});
    } catch {
      ctx = null;
    }
    const cacheKey = `cypher|${text}`;
    const cached = voiceCache.get(cacheKey);
    let envelope;
    let audioBuffer = null;
    if (cached) {
      // Already heard this exact text this visit: skip the fetch (and the
      // ElevenLabs/OpenAI cost it could trigger server-side) entirely.
      envelope = cached.envelope;
      audioBuffer = cached.audioBuffer;
    } else {
      // The speak fetch (ElevenLabs synthesis) can take ~25 s for a long
      // answer. `loading` is true for exactly that window, so callers can
      // show "Loading voice…" instead of silence.
      setLoading(true);
      try {
        envelope = await speakVoice({ character: 'cypher', text });
      } catch (e) {
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        setLoading(false);
        setFallback(true);
        setError(e.message || 'Cipher’s voice isn’t available right now.');
        setSubtitle('');
        return '';
      }
      cacheVoice(cacheKey, { envelope, audioBuffer: null });
    }
    // The subtitle is the backend's cleaned text (Markdown stripped for
    // speech), not the raw answer — so the words on screen match the
    // words Cipher speaks, with no "###" or "**" ever showing.
    setSubtitle(envelope.text || '');
    if (!envelope.audio_b64 || muted) {
      // Text-only fallback (voice not configured, or muted): Cypher still
      // "talks" — the talk clip plays while the words are shown, so the
      // experience degrades to silent speech, never to nothing.
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setLoading(false);
      setFallback(true);
      if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      setPlaying(true);
      const words = envelope.text.trim().split(/\s+/).length;
      const ms = Math.min(30000, Math.max(2500, (words / 2.5) * 1000));
      setTimeout(() => {
        stopLevelLoop();
        setPlaying(false);
        setSubtitle('');
      }, ms);
      return envelope.text;
    }
    if (!ctx) {
      // No AudioContext available at all (very old or locked-down browser):
      // degrade to text, same as any other playback failure below.
      setLoading(false);
      setFallback(true);
      setError('Cipher’s voice couldn’t play here — the words are shown as text.');
      setSubtitle('');
      return envelope.text;
    }
    try {
      if (!audioBuffer) {
        const bytes = Uint8Array.from(atob(envelope.audio_b64), (c) => c.charCodeAt(0));
        audioBuffer = await ctx.decodeAudioData(bytes.buffer);
        // An AudioBuffer isn't tied to the AudioContext that decoded it, so
        // it's safe to replay later through a different (future) context.
        const entry = voiceCache.get(cacheKey);
        if (entry) entry.audioBuffer = audioBuffer;
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
      sourceNodeRef.current = source;
      // Analyser for the audio-reactive face: the level feeds voiceRef. This
      // is cosmetic — if it's unavailable (no requestAnimationFrame, e.g. an
      // older or non-browser environment), Cypher still talks at a flat
      // level and the real audio still plays.
      try {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        gain.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          const level = data.reduce((a, b) => a + b, 0) / data.length / 255;
          if (voiceRef) voiceRef.current = { talking: true, level };
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      }
      source.onended = () => {
        stopLevelLoop();
        setPlaying(false);
        setSubtitle('');
      };
      setPlaying(true);
      if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      source.start();
      setLoading(false);
      return envelope.text;
    } catch {
      setLoading(false);
      setFallback(true);
      stopLevelLoop();
      setPlaying(false);
      setSubtitle('');
      setError('Cipher’s voice couldn’t play here — the words are shown as text.');
      return envelope.text;
    }
  }, [muted, volume, voiceRef, stop, stopLevelLoop]);

  React.useEffect(() => stop, [stop]);

  return { play, stop, playing, loading, fallback, error, subtitle, muted, setMuted, volume, setVolume };
}
