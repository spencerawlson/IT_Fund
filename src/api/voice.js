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
 * play(text) -> the spoken text (or '' on error): fetches the audio, decodes
 * it to an Audio element, and drives the analyser that feeds voiceRef.level.
 * A fallback envelope (no audio) still returns the text — the caller shows
 * it as subtitles and Cypher talks silently (text-only fallback).
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
  const audioRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);

  const stopLevelLoop = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (voiceRef) voiceRef.current = { talking: false, level: 0 };
  }, [voiceRef]);

  const stop = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
    if (audioRef.current) audioRef.current.muted = next;
  }, []);

  const setVolume = React.useCallback((next) => {
    const v = Math.max(0, Math.min(1, next));
    setVolumeState(v);
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* ignore */ }
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const play = React.useCallback(async (text) => {
    stop();
    setError('');
    setFallback(false);
    if (!text || !text.trim()) return '';
    // The speak fetch (ElevenLabs synthesis) can take ~25 s for a long
    // answer. `loading` is true for exactly that window, so callers can
    // show "Loading voice…" instead of silence.
    setLoading(true);
    let envelope;
    try {
      envelope = await speakVoice({ character: 'cypher', text });
    } catch (e) {
      setLoading(false);
      setFallback(true);
      setError(e.message || 'Cipher’s voice isn’t available right now.');
      setSubtitle('');
      return '';
    }
    // The subtitle is the backend's cleaned text (Markdown stripped for
    // speech), not the raw answer — so the words on screen match the
    // words Cipher speaks, with no "###" or "**" ever showing.
    setSubtitle(envelope.text || '');
    if (!envelope.audio_b64 || muted) {
      // Text-only fallback (voice not configured, or muted): Cypher still
      // "talks" — the talk clip plays while the subtitles show, so the
      // experience degrades to silent speech, never to nothing.
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
    try {
      const bytes = Uint8Array.from(atob(envelope.audio_b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: envelope.mime || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.muted = muted;
      audio.volume = volume;
      audioRef.current = audio;
      // Analyser for the audio-reactive face: the level feeds voiceRef.
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          const level = data.reduce((a, b) => a + b, 0) / data.length / 255;
          if (voiceRef) voiceRef.current = { talking: true, level };
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        // Analyser unavailable (older browser): still talk, flat level.
        if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      }
      setPlaying(true);
      if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      audio.onended = () => {
        URL.revokeObjectURL(url);
        stopLevelLoop();
        setPlaying(false);
        setSubtitle('');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        stopLevelLoop();
        setPlaying(false);
        setSubtitle('');
      };
      await audio.play();
      setLoading(false);
      return envelope.text;
    } catch {
      setLoading(false);
      setFallback(true);
      stopLevelLoop();
      setPlaying(false);
      setSubtitle('');
      setError('Cipher’s voice couldn’t play here — the subtitles above still have the words.');
      return envelope.text;
    }
  }, [muted, volume, voiceRef, stop, stopLevelLoop]);

  React.useEffect(() => stop, [stop]);

  return { play, stop, playing, loading, fallback, error, subtitle, muted, setMuted, volume, setVolume };
}
