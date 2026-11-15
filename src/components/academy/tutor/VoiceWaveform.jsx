import React, { useEffect, useState } from 'react';

// The listening waveform: what Cypher is saying, drawn — it replaces the
// old "Cipher answers" card in the lesson panel. While audio plays the
// bars move with the real analyser data (the hook writes 24 frequency
// bands into the shared voiceRef every animation frame); when nothing
// plays they sit as a flat line. It is never a static decoration: the
// heights come from the audio, sampled here at 10 Hz like the mouth.
export const WAVEFORM_BARS = 24;
export const WAVEFORM_TICK_MS = 100;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Bar heights (0..1) from the shared voice ref. Not talking (or no ref)
// is a flat line; without band data every bar follows the single level.
export function waveformHeights(levelRef) {
  const cur = levelRef?.current;
  if (!cur || !cur.talking) return new Array(WAVEFORM_BARS).fill(0);
  const bands = cur.bands;
  if (bands && bands.length) {
    return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const b = bands[i % bands.length];
      return Number.isFinite(b) ? Math.max(0, Math.min(1, b)) : 0;
    });
  }
  const l = Number.isFinite(cur.level) ? Math.max(0, Math.min(1, cur.level)) : 0;
  return new Array(WAVEFORM_BARS).fill(l);
}

// Decorative: the play button's caption says what is playing, so the
// waveform itself is hidden from assistive tech.
export default function VoiceWaveform({ levelRef, active, className = '' }) {
  const [heights, setHeights] = useState(() => new Array(WAVEFORM_BARS).fill(0));

  useEffect(() => {
    if (!active) {
      setHeights(new Array(WAVEFORM_BARS).fill(0));
      return undefined;
    }
    if (prefersReducedMotion()) return undefined;
    setHeights(waveformHeights(levelRef));
    const id = setInterval(() => setHeights(waveformHeights(levelRef)), WAVEFORM_TICK_MS);
    return () => clearInterval(id);
  }, [active, levelRef]);

  return (
    <div data-testid="cypher-waveform" aria-hidden={true} className={`flex h-10 items-center gap-[3px] ${className}`}>
      {heights.map((h, i) => {
        // One decimal place: the bands are float32, and the raw product
        // (e.g. 20.000000298023224%) would otherwise leak into the style.
        const pct = Math.round(Math.max(8, h * 100) * 10) / 10;
        return (
          <span
            key={i}
            data-testid="cypher-waveform-bar"
            className="w-1 rounded-full bg-action transition-[height] duration-100"
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}
