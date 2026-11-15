import React, { useEffect, useState } from 'react';

// The listening waveform: what Cypher is saying, drawn — it replaces the
// old "Cypher answers" card in the lesson panel. While audio plays the
// bars move with the real analyser data (the hook writes 24 frequency
// bands into the shared voiceRef every animation frame).
//
// Neon look (from Spencer's mockup): thin closely-spaced vertical bars,
// white/silver-grey at the ends rising to bright violet-purple with a
// soft neon glow in the centre. The COLOURS are positional (ends silver,
// centre violet); the HEIGHTS are the live audio — never the mockup's
// static symmetrical shape.
//
// Hidden until it talks: the component renders nothing before playback
// starts (no flat bars, no placeholder) and hides again on stop. While
// paused it stays visible but frozen at the last heights — paused is
// not stopped, the position is kept.
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

// Bar style by position: silver-white at the ends, bright violet-purple
// at the centre, with a soft neon glow on the central bars. The height
// is the live audio; the colour is the mockup.
export function waveformBarStyle(index, heightPct) {
  const centre = (WAVEFORM_BARS - 1) / 2;
  const t = Math.min(1, Math.abs(index - centre) / centre); // 0 centre → 1 ends
  // Violet #A855F7 at the centre → silver #E5E7EB at the ends.
  const r = Math.round(168 + (229 - 168) * t);
  const g = Math.round(85 + (231 - 85) * t);
  const b = Math.round(247 + (235 - 247) * t);
  const style = { height: `${heightPct}%`, backgroundColor: `rgb(${r}, ${g}, ${b})` };
  if (t < 0.5) {
    style.boxShadow = `0 0 ${Math.round(10 * (1 - t * 2))}px rgba(168, 85, 247, ${(0.7 - t * 0.6).toFixed(2)})`;
  }
  return style;
}

// Decorative: the play button's caption says what is playing, so the
// waveform itself is hidden from assistive tech.
export default function VoiceWaveform({ levelRef, active, paused = false, className = '' }) {
  const [heights, setHeights] = useState(() => new Array(WAVEFORM_BARS).fill(0));

  useEffect(() => {
    if (!active || paused) return undefined; // paused: freeze at the last heights
    if (prefersReducedMotion()) return undefined;
    setHeights(waveformHeights(levelRef));
    const id = setInterval(() => setHeights(waveformHeights(levelRef)), WAVEFORM_TICK_MS);
    return () => clearInterval(id);
  }, [active, paused, levelRef]);

  // Nothing before it talks, and nothing again once it stops: the
  // waveform only exists while audio is playing or paused.
  if (!active && !paused) return null;

  return (
    <div data-testid="cypher-waveform" aria-hidden={true} className={`flex h-16 items-center gap-[3px] ${className}`}>
      {heights.map((h, i) => {
        // One decimal place: the bands are float32, and the raw product
        // (e.g. 20.000000298023224%) would otherwise leak into the style.
        const pct = Math.round(Math.max(8, h * 100) * 10) / 10;
        return (
          <span
            key={i}
            data-testid="cypher-waveform-bar"
            className="w-1 rounded-full transition-[height] duration-100"
            style={waveformBarStyle(i, pct)}
          />
        );
      })}
    </div>
  );
}
