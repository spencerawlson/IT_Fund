// Client for the backend character-voice service (backend/voice.py).
// The ElevenLabs key and voice IDs never reach the browser: the client
// sends {character, text} and gets audio back (base64 MP3) or a text-only
// fallback ({audio_b64: null, fallback: true}). Long answers arrive as
// segments (audio_segments, one base64 MP3 per synthesis chunk, in order)
// and are played back to back; a short answer has one segment, and an
// older response shape with only audio_b64 is read as a single segment.
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
 * envelope {character, text, audio_b64, audio_segments, mime, cached,
 * fallback, reason?}. audio_segments is the audio in order (one base64
 * MP3 per synthesis chunk); audio_b64 is the same audio concatenated
 * for single-file consumers. Throws a learner-friendly Error on
 * auth/paywall/rate-limit failures; a fallback envelope is NOT an error
 * — the caller shows the subtitles.
 */
// Display name for a character, for learner-facing messages ("Sign in to
// hear Sentinel speak."). Unknown characters fall back to a capitalized id.
function voiceDisplayName(character) {
  if (character === 'cypher') return 'Cypher';
  if (character === 'sentinel') return 'Sentinel';
  if (character === 'patch') return 'Patch';
  return String(character || 'cypher').charAt(0).toUpperCase() + String(character || 'cypher').slice(1);
}

export async function speakVoice({ character, text, purpose = 'lesson' }) {
  const name = voiceDisplayName(character);
  const res = await fetch(`${API_BASE}/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // session cookie: voice requires a signed-in learner
    body: JSON.stringify({ character, text, purpose }),
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
        ? `Sign in to hear ${name} speak.`
        : res.status === 402
          ? 'Character voices need an active subscription.'
          : res.status === 429
            ? 'You’ve hit the voice limit for now. Try again a bit later.'
            : (res.status === 400 || res.status === 422) && typeof detail === 'string' && detail
              ? detail
              : `${name}’s voice isn’t available right now.`;
    throw new Error(message);
  }
  return res.json();
}

const MUTE_KEY = 'rtc-cypher-voice-muted';
const VOLUME_KEY = 'rtc-cypher-voice-volume';

// In-tab cache of {character, text} -> {envelope, audioBuffers}, so asking
// a character to repeat something already heard this visit (a lesson he already
// explained, "Hear again") never re-fetches or re-downloads: no request to
// /voice/speak at all, and no re-decoding once the AudioBuffers are cached.
// audioBuffers is one decoded buffer per segment, aligned with the
// envelope's segments. Module-level (not per-hook-instance) so it survives
// remounting the panel while navigating between lessons in the same tab.
// Capped and FIFO-evicted — this is a speed/bandwidth cache for the
// current visit, not meant to grow without bound; the backend's own disk
// cache is what makes a lesson "cached forever" across visits and restarts.
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

// Warm the voice caches for `text` without playing anything: fetch the
// audio (the backend disk cache serves repeats) and decode it into the
// in-tab cache, so a later play() of the same text starts at once with no
// fetch and no decode. Used by the lesson panel's warm-up: when a lesson
// opens, the three preset answers are warmed in the background so tapping
// one plays immediately. Returns true when audio is cached, false when
// there is nothing to warm (fallback envelope, fetch failure, rate limit)
// — never throws, so warm-up can stop quietly. It does spend voice budget
// (the backend checks the rate limit before the cache), so callers warm
// only a lesson at a time, never the catalog.
export async function warmVoice(text) {
  if (!text || !text.trim()) return false;
  if (typeof window === 'undefined') return false;
  const cacheKey = `cypher|${text}`;
  const cached = voiceCache.get(cacheKey);
  if (cached?.audioBuffers?.length) return true;
  let envelope;
  try {
    envelope = await speakVoice({ character: 'cypher', text });
  } catch {
    return false;
  }
  const segments = envelope.audio_segments && envelope.audio_segments.length
    ? envelope.audio_segments
    : (envelope.audio_b64 ? [envelope.audio_b64] : []);
  if (!segments.length) return false;
  cacheVoice(cacheKey, { envelope, audioBuffers: null });
  // Decode now (a suspended context decodes fine) so play() later finds
  // decoded buffers and starts at once. A fresh context per warm call,
  // closed afterwards — warm-ups run one at a time, so at most one is
  // ever open.
  let ctx = null;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await Promise.all(segments.map(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return ctx.decodeAudioData(bytes.buffer);
    }));
    const entry = voiceCache.get(cacheKey);
    if (entry) entry.audioBuffers = decoded;
    return true;
  } catch {
    return false;
  } finally {
    if (ctx) {
      try { await ctx.close(); } catch { /* ignore */ }
    }
  }
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
 * play(text, character = 'cypher') -> the spoken text (or '' on error):
 * fetches the audio and plays it through a Web Audio AudioBufferSourceNode,
 * feeding an analyser that drives voiceRef.level. The character is which
 * robot's voice reads it — the lesson panel and the debrief are Cypher-only
 * (they call play(text)), the mission briefing passes each turn's speaker
 * ('cypher' | 'sentinel' | 'patch') and the hook falls back to Cypher's
 * voice only when that character has none configured (the briefing decides
 * that from GET /voice/status; the hook itself just plays what it is asked). Playback goes through the Web Audio API
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
  // True only while playback is frozen by pause(): the audio stopped at
  // an exact spot (segment + offset) and resume() continues from there.
  // Distinct from playing=false after stop() or the natural end, where
  // the position is gone and the next play starts from the beginning.
  const [paused, setPaused] = React.useState(false);
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
  // Generation guard for the segment chain: stop() (and a new play(),
  // which calls stop() first) bumps it, so a segment's onended — or a
  // decode finishing after a stop — can never start audio for a play
  // that is no longer current.
  const playIdRef = React.useRef(0);
  const pauseRef = React.useRef(null); // { segmentIndex, offset } while paused
  const segmentRef = React.useRef({ index: 0, offset: 0, startedAt: 0 });
  const audioBuffersRef = React.useRef(null); // decoded buffers of the current play, for resume()
  const playSegmentRef = React.useRef(null); // playSegment of the current play (its closure)
  const bandsRef = React.useRef(null); // Float32Array(24) frequency bands, mutated in place
  const [progress, setProgress] = React.useState({ elapsed: 0, total: 0 });
  const progressTimerRef = React.useRef(null); // setInterval id ticking progress while playing
  const PROGRESS_TICK_MS = 250;

  // Playback position from the decoded buffers and the current segment
  // clock: total is the sum of the segment durations, elapsed is the
  // completed segments + the offset into the current one (+ the time
  // since it started, when given). Frozen at the paused spot, 0 after a
  // stop or the natural end. No audio (silent fallback) has no total —
  // callers show elapsed only, never a made-up total.
  const progressAt = React.useCallback((segmentIndex, offset, extra = 0) => {
    const bufs = audioBuffersRef.current;
    if (!bufs?.length) return { elapsed: 0, total: 0 };
    const dur = (b) => (Number.isFinite(b?.duration) ? b.duration : 0);
    const total = bufs.reduce((a, b) => a + dur(b), 0);
    let elapsed = 0;
    for (let i = 0; i < segmentIndex && i < bufs.length; i++) elapsed += dur(bufs[i]);
    elapsed += (offset || 0) + extra;
    return { elapsed: Math.round(Math.min(elapsed, total) * 10) / 10, total: Math.round(total * 10) / 10 };
  }, []);

  const computeProgress = React.useCallback(() => {
    const seg = segmentRef.current;
    const ctx = audioCtxRef.current;
    const extra = ctx ? Math.max(0, ctx.currentTime - seg.startedAt) : 0;
    return progressAt(seg.index, seg.offset, extra);
  }, [progressAt]);

  // Tick the position state while audio plays (rounded to 0.1 s, and
  // skipped when nothing changed, so the panel doesn't re-render 4x/s
  // for the same reading).
  const updateProgress = React.useCallback(() => {
    const next = computeProgress();
    setProgress((prev) => (prev.elapsed === next.elapsed && prev.total === next.total ? prev : next));
  }, [computeProgress]);

  const startProgressTick = React.useCallback(() => {
    if (progressTimerRef.current) return;
    updateProgress();
    progressTimerRef.current = setInterval(updateProgress, PROGRESS_TICK_MS);
  }, [updateProgress]);

  const stopProgressTick = React.useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const stopLevelLoop = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (voiceRef) voiceRef.current = { talking: false, level: 0 };
  }, [voiceRef]);

  // The analyser loop: reads the frequency data every animation frame and
  // writes { talking, level, bands } into voiceRef for the face's mouth
  // and the panel's waveform. `bands` is 24 averaged frequency bands
  // (0..1), mutated in place on one shared Float32Array so readers always
  // see the latest snapshot without a re-render. A no-op when no analyser
  // is live, and never starts a second loop while one runs. If
  // requestAnimationFrame is unavailable (a non-browser environment) the
  // first sample still lands and the loop simply doesn't continue — the
  // mouth and waveform stay at that one reading instead of animating.
  const startLevelLoop = React.useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || rafRef.current) return;
    if (!bandsRef.current) bandsRef.current = new Float32Array(24);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const bands = bandsRef.current;
      const per = data.length / bands.length;
      for (let b = 0; b < bands.length; b++) {
        const start = Math.floor(b * per);
        const end = Math.max(start + 1, Math.floor((b + 1) * per));
        let sum = 0;
        for (let i = start; i < end; i++) sum += data[i];
        bands[b] = sum / (end - start) / 255;
      }
      const level = data.reduce((a, b) => a + b, 0) / data.length / 255;
      if (voiceRef) voiceRef.current = { talking: true, level, bands };
      try {
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        rafRef.current = null;
      }
    };
    loop();
  }, [voiceRef]);

  const stop = React.useCallback(() => {
    playIdRef.current += 1;
    pauseRef.current = null;
    audioBuffersRef.current = null;
    playSegmentRef.current = null;
    stopProgressTick();
    setProgress({ elapsed: 0, total: 0 });
    setPaused(false);
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      try { gainNodeRef.current.disconnect(); } catch { /* already disconnected */ }
    }
    gainNodeRef.current = null;
    // The AudioContext stays OPEN across stop(): it is the one a tap
    // unlocked (see unlock()), and phones only let an AudioContext make
    // sound if it was started inside a user gesture. Closing it here
    // would make the next auto-played answer (started seconds after the
    // tap, when the tutor's text arrives) silent on iOS. It is closed on
    // unmount instead.
    analyserRef.current = null;
    stopLevelLoop();
    setPlaying(false);
    setLoading(false);
    setSubtitle('');
  }, [stopLevelLoop, stopProgressTick]);

  // Freeze playback at the exact spot: stop the current source and
  // remember which segment and how far into it (buffer sources cannot be
  // paused — the standard pattern is stop + resume from the offset).
  // The AudioContext and gain stay open, so resume() needs no fresh
  // gesture and no re-fetch. While paused the level goes flat (the mouth
  // settles, the waveform idles). A no-op when nothing is playing.
  const pause = React.useCallback(() => {
    const source = sourceNodeRef.current;
    const ctx = audioCtxRef.current;
    if (!source || !ctx || pauseRef.current) return;
    const started = segmentRef.current;
    const elapsed = Math.max(0, ctx.currentTime - started.startedAt);
    const dur = source.buffer?.duration;
    let offset = started.offset + elapsed;
    if (Number.isFinite(dur)) offset = Math.min(offset, dur);
    pauseRef.current = { segmentIndex: started.index, offset };
    source.onended = null;
    try { source.stop(); } catch { /* already stopped */ }
    sourceNodeRef.current = null;
    // Freeze the position display at the paused spot (the tick is off,
    // so the bar and time stay exactly where playback stopped).
    stopProgressTick();
    setProgress(progressAt(started.index, offset));
    stopLevelLoop();
    setPlaying(false);
    setPaused(true);
  }, [stopLevelLoop, stopProgressTick, progressAt]);

  // Continue from the paused spot: restart the analyser loop and the
  // segment chain at the remembered segment + offset — not from the
  // start. If the pause landed exactly at a segment's end, start the
  // next one instead. A no-op when nothing is paused.
  const resume = React.useCallback(() => {
    const pausedAt = pauseRef.current;
    const ctx = audioCtxRef.current;
    if (!pausedAt || !ctx) return;
    pauseRef.current = null;
    let { segmentIndex, offset } = pausedAt;
    const buf = audioBuffersRef.current?.[segmentIndex];
    if (buf && Number.isFinite(buf.duration) && offset >= buf.duration) {
      segmentIndex += 1;
      offset = 0;
    }
    startLevelLoop();
    playSegmentRef.current?.(segmentIndex, offset);
  }, [startLevelLoop]);

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

  // The hook's one AudioContext, created on first need and kept open for
  // the component's lifetime (a fresh context created outside a tap is
  // born suspended on iOS and stays silent).
  const ensureContext = React.useCallback(() => {
    let c = audioCtxRef.current;
    if (!c || c.state === 'closed') {
      c = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = c;
    }
    if (c.state !== 'running') c.resume().catch(() => {});
    return c;
  }, []);

  // Call synchronously inside a tap/click handler (before any await): it
  // creates/resumes the AudioContext while the gesture is live and plays a
  // one-sample silent buffer (the iOS unlock), and asks iOS to treat this
  // page's audio as media playback so the ring/silent switch doesn't mute
  // Web Audio (navigator.audioSession, Safari 16.4+; ignored elsewhere).
  // Safe to call repeatedly; never throws.
  const unlock = React.useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch { /* not supported */ }
    try {
      const c = ensureContext();
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch { /* no Web Audio: play() falls back to text */ }
  }, [ensureContext]);

  // Unlock on the first tap/click/key anywhere on the page, so audio that
  // starts later without a gesture of its own (the lesson panel's answer
  // when it arrives, a mission briefing that auto-plays) can still be
  // heard on phones. touchend, not touchstart: iOS only unlocks audio on
  // touchend. One-shot; listeners are removed after the first gesture.
  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const events = ['touchend', 'click', 'keydown'];
    const onGesture = () => {
      unlock();
      events.forEach((ev) => document.removeEventListener(ev, onGesture, true));
    };
    events.forEach((ev) => document.addEventListener(ev, onGesture, true));
    return () => events.forEach((ev) => document.removeEventListener(ev, onGesture, true));
  }, [unlock]);

  // Close the context when the component using the voice goes away.
  React.useEffect(() => () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // purpose: 'briefing' for mission briefing turns, which may spend the
  // ElevenLabs credits the backend keeps in reserve; everything else is
  // 'lesson' and gets text-only once the balance reaches that reserve.
  const play = React.useCallback(async (text, character = 'cypher', purpose = 'lesson') => {
    stop();
    // This play's generation: stop() (above) bumped the counter, and any
    // later stop() invalidates this play — checked after each await and
    // before each segment starts, so a stale onended or a decode finishing
    // after a stop never starts audio for a play that is no longer current.
    const playId = playIdRef.current;
    setError('');
    setFallback(false);
    if (!text || !text.trim()) return '';
    // Silent speech: Cypher "talks" (talk clip + subtitles) on a
    // word-count timer, no audio. Used when there is no audio (voice not
    // configured, muted) and when the AudioContext is suspended (Safari
    // auto-play block) — source.start() on a suspended context never
    // advances and onended never fires, so without this the opening
    // would hang on the briefing step with playing stuck true.
    const startSilentTimer = (spokenText) => {
      setLoading(false);
      setFallback(true);
      if (voiceRef) voiceRef.current = { talking: true, level: 0.25 };
      setPlaying(true);
      const words = spokenText.trim().split(/\s+/).length;
      const ms = Math.min(30000, Math.max(2500, (words / 2.5) * 1000));
      setTimeout(() => {
        stopLevelLoop();
        setPlaying(false);
        setSubtitle('');
      }, ms);
    };
    // Resume the AudioContext here, synchronously, before the speak fetch:
    // this is still inside the click's user gesture. Once resumed, the
    // context stays unlocked for as long as it's open, so the real audio
    // can start on it later — after the fetch — with no fresh gesture.
    // Reuse the context a tap already unlocked (unlock()), so an answer
    // auto-played after the tutor's text arrives — outside any gesture —
    // still has sound on phones.
    let ctx = null;
    try {
      ctx = ensureContext();
    } catch {
      ctx = null;
    }
    const cacheKey = `${character}|${text}`;
    const cached = voiceCache.get(cacheKey);
    let envelope;
    // Decoded audio, one AudioBuffer per segment, aligned with the
    // envelope's segments (see below). A replay reuses them all.
    let audioBuffers = null;
    if (cached) {
      // Already heard this exact text this visit: skip the fetch (and the
      // ElevenLabs/OpenAI cost it could trigger server-side) entirely.
      envelope = cached.envelope;
      audioBuffers = cached.audioBuffers;
    } else {
      // The speak fetch (ElevenLabs synthesis) can take ~25 s for a long
      // answer. `loading` is true for exactly that window, so callers can
      // show "Loading voice…" instead of silence.
      setLoading(true);
      try {
        envelope = await speakVoice({ character, text, purpose });
      } catch (e) {
        setLoading(false);
        setFallback(true);
        setError(e.message || `${voiceDisplayName(character)}’s voice isn’t available right now.`);
        setSubtitle('');
        return '';
      }
      cacheVoice(cacheKey, { envelope, audioBuffers: null });
    }
    // A stop() while the fetch was in flight ends this play here.
    if (playIdRef.current !== playId) return '';
    // The subtitle is the backend's cleaned text (Markdown stripped for
    // speech), not the raw answer — so the words on screen match the
    // words Cypher speaks, with no "###" or "**" ever showing.
    setSubtitle(envelope.text || '');
    // Long answers arrive as segments (the backend synthesizes them chunk
    // by chunk); a short answer has one. An older response shape carries
    // only audio_b64 — read it as a single segment.
    const segments = envelope.audio_segments && envelope.audio_segments.length
      ? envelope.audio_segments
      : (envelope.audio_b64 ? [envelope.audio_b64] : []);
    if (!segments.length || muted) {
      // Text-only fallback (voice not configured, or muted): Cypher still
      // "talks" — the talk clip plays while the words are shown, so the
      // experience degrades to silent speech, never to nothing.
      startSilentTimer(envelope.text);
      return envelope.text;
    }
    if (!ctx) {
      // No AudioContext available at all (very old or locked-down browser):
      // degrade to text, same as any other playback failure below.
      setLoading(false);
      setFallback(true);
      setError(`${voiceDisplayName(character)}’s voice couldn’t play here.`);
      setSubtitle('');
      return envelope.text;
    }
    try {
      if (!audioBuffers || audioBuffers.length !== segments.length || audioBuffers.some((b) => !b)) {
        const decoded = await Promise.all(segments.map(async (b64) => {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return ctx.decodeAudioData(bytes.buffer);
        }));
        // An AudioBuffer isn't tied to the AudioContext that decoded it, so
        // it's safe to replay later through a different (future) context.
        audioBuffers = decoded;
        const entry = voiceCache.get(cacheKey);
        if (entry) entry.audioBuffers = decoded;
      }
      // A stop() while decoding must not start audio for a play that is
      // no longer current.
      if (playIdRef.current !== playId) return '';
      // Safari auto-play: the context may still be suspended — the
      // opening auto-plays with no user gesture, so the resume() above
      // cannot unlock it. Give resume() 1 s, then fall back to silent
      // speech so the sequence always advances.
      if (ctx.state !== 'running') {
        try {
          await Promise.race([
            ctx.resume(),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        } catch { /* resume rejected: fall through to the check below */ }
      }
      if (ctx.state !== 'running') {
        startSilentTimer(envelope.text);
        return envelope.text;
      }
      // One shared gain for the whole answer: every segment connects to
      // it, so volume/mute and the analyser below keep working across
      // the joins between segments.
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : volume;
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
      // Analyser for the audio-reactive face and the panel waveform: the
      // level and the 24 frequency bands feed voiceRef (see
      // startLevelLoop). This is cosmetic — if it's unavailable (no
      // requestAnimationFrame, e.g. an older or non-browser environment),
      // Cypher still talks at a flat level and the real audio still plays.
      try {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        gain.connect(analyser);
        startLevelLoop();
      } catch {
        if (voiceRef) voiceRef.current = { talking: true, level: 0.25, bands: bandsRef.current };
      }
      // Play the segments in order: each source's onended starts the next,
      // and the last one's ends playback. The generation guard stops the
      // chain the moment stop() (or a new play()) invalidates this play.
      // `offset` is the resume point inside a segment (0 on a fresh play):
      // pause() stops the source and remembers it, resume() starts a new
      // source here — buffer sources cannot be paused.
      const playSegment = (index, offset = 0) => {
        if (playIdRef.current !== playId) return;
        if (index >= audioBuffers.length) {
          sourceNodeRef.current = null;
          stopProgressTick();
          setProgress({ elapsed: 0, total: 0 });
          stopLevelLoop();
          setPlaying(false);
          setSubtitle('');
          return;
        }
        const source = ctx.createBufferSource();
        source.buffer = audioBuffers[index];
        source.connect(gain);
        sourceNodeRef.current = source;
        source.onended = () => playSegment(index + 1, 0);
        segmentRef.current = { index, offset, startedAt: ctx.currentTime };
        setPlaying(true);
        setPaused(false);
        // The position display starts ticking with this segment (and
        // restarts on resume, which re-enters here at the paused spot).
        startProgressTick();
        // Flat level for the mouth while this segment plays; the analyser
        // loop (when it runs) overwrites it with the live level and bands
        // every frame. Keep the last band snapshot here too, so the
        // waveform still has something to draw in the one frame before
        // the loop's next write — and in environments with no rAF at all,
        // where the loop ran exactly once.
        if (voiceRef) voiceRef.current = { talking: true, level: 0.25, bands: bandsRef.current };
        source.start(0, offset);
      };
      playSegmentRef.current = playSegment;
      audioBuffersRef.current = audioBuffers;
      setLoading(false);
      playSegment(0);
      return envelope.text;
    } catch {
      setLoading(false);
      setFallback(true);
      stopLevelLoop();
      setPlaying(false);
      setSubtitle('');
      setError(`${voiceDisplayName(character)}’s voice couldn’t play here.`);
      return envelope.text;
    }
  }, [muted, volume, voiceRef, stop, stopLevelLoop, startLevelLoop, startProgressTick, stopProgressTick, ensureContext]);

  React.useEffect(() => stop, [stop]);

  return { play, stop, pause, resume, unlock, playing, paused, loading, fallback, error, subtitle, muted, setMuted, volume, setVolume, progress };
}
