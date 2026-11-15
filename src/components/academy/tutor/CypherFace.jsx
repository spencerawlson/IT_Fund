import React, { useEffect, useRef, useState } from 'react';

// Cypher's 2D face: the six emotions Spencer sent as JPGs (Nov 14), cropped
// from the sheet (heads only — the panel already says "Cypher", so the
// white labels under each face are not shipped) and cut out to transparent
// PNGs under public/images/. The face sits on a dark chip (#0D1B2A,
// Cypher's near-black) so the white art reads on the light-only panel —
// Spencer's 02:39 EST call, not an outline and not a recolour. The art
// itself is untouched.
export const CYPHER_EMOTIONS = ['happy', 'angry', 'surprised', 'sad', 'confused', 'excited'];

export const CYPHER_FACE_SRC = {
  happy: '/images/cypher-face-happy.png',
  angry: '/images/cypher-face-angry.png',
  surprised: '/images/cypher-face-surprised.png',
  sad: '/images/cypher-face-sad.png',
  confused: '/images/cypher-face-confused.png',
  excited: '/images/cypher-face-excited.png',
};

// The reference video morphs from Happy to the target in ~half a second
// while visible — no cut. Raster PNGs can't truly morph, so the change
// cross-fades between the two images over ~400 ms (honest equivalent, not
// a morph). Under prefers-reduced-motion the fade is disabled in
// index.css, so the swap is instant there.
export const CYPHER_FACE_FADE_MS = 400;

// The talking mouth: an overlay ellipse over the Happy face's smile, so
// Cypher's mouth opens and closes while he speaks instead of the face
// sitting still like an image. The box is MEASURED from the 320x320 Happy
// PNG (Nov 15, PIL): the smile curve itself is x 133-188, y 188-211
// (left 41.6%, top 58.8%, w 17.2%, h 7.2%, centre 50.2% / 62.3%); the
// visor it sits in spans x 25.0-75.3%, y 38.4-68.4%, colour #3B3A3B. The
// overlay is anchored on the smile's top edge and grows DOWN to the
// visor's bottom edge (68.4%), so an open mouth never pokes past the
// visor into the white chin. Its fill is the chip near-black (#0D1B2A) —
// darker than the visor, so it reads as an open mouth, not a smudge.
// Nothing about the art itself changes: the PNGs are untouched.
export const CYPHER_MOUTH_BOX = {
  left: 41.6,
  top: 58.8,
  width: 17.2,
  height: 9.6, // 58.8% + 9.6% = 68.4% = the visor's bottom edge
};

// The mouth is sampled at 10 Hz from the live audio level (see below):
// fast enough for a mouth, cheap, and testable in this repo's node test
// env (no DOM, no requestAnimationFrame). The 100 ms linear transition
// on the transform interpolates between samples so the motion reads
// smooth, not stepped.
export const MOUTH_TICK_MS = 100;

// How long the audio level must sit flat before the mouth falls back to
// a gentle rhythm (below): the silent-speech path (voice unavailable or
// muted) holds the level at a flat 0.25 for the whole answer, and a mouth
// frozen half-open for 30 s would look just as dead as a still image.
export const MOUTH_FLAT_MS = 600;

// Open amount (0..1) from the smoothed live audio level: a small floor
// so the mouth never fully snaps shut between syllables, up to fully
// open at full level. No true lip-sync: ElevenLabs returns audio only,
// no viseme data — this is amplitude-driven, not phonemes.
export function mouthOpenForLevel(level) {
  const l = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  return 0.12 + l * 0.88;
}

// Gentle open/close (~2.2 Hz, between 0.22 and 0.55) for when the level
// is flat — the silent-speech fallback. Deterministic in nowMs so tests
// can assert on it.
export function mouthOpenRhythm(nowMs) {
  return 0.385 + 0.165 * Math.sin((nowMs / 1000) * 2 * Math.PI * 2.2);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const faceSrc = (emotion) => CYPHER_FACE_SRC[emotion] || CYPHER_FACE_SRC.happy;

function preloadFaces() {
  if (typeof Image === 'undefined') return;
  CYPHER_EMOTIONS.forEach((e) => {
    const img = new Image();
    img.src = CYPHER_FACE_SRC[e];
  });
}

// The face is decorative: the panel caption names Cypher, and the quiz
// feedback text states the result in words — so it is hidden from
// assistive tech, like the background video it replaces.
export default function CypherFace({ emotion = 'happy', talking = false, levelRef = null, className = '' }) {
  const [current, setCurrent] = useState(emotion);
  const [previous, setPrevious] = useState(null);
  // Mouth opening, 0 (resting smile) to 1 (fully open). Driven by the
  // interval below while talking; React state, not a DOM write, so the
  // motion is testable with fake timers and costs one small subtree
  // re-render 10x/s — the panel itself never re-renders for it.
  const [open, setOpen] = useState(0);
  const smoothedRef = useRef(0);
  const lastLevelRef = useRef(0);
  const lastChangeRef = useRef(0);

  // Preload every emotion once, so a cross-fade never waits on the network
  // mid-morph (each file is ~40 KB).
  useEffect(() => {
    preloadFaces();
  }, []);

  useEffect(() => {
    if (emotion === current) return undefined;
    setPrevious(current);
    setCurrent(emotion);
    const t = setTimeout(() => setPrevious(null), CYPHER_FACE_FADE_MS);
    return () => clearTimeout(t);
    // `current` is deliberately read, not a dep: the effect fires when the
    // emotion prop changes, and swaps from whatever is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotion]);

  // Talking mouth: while `talking` is true, sample the live audio level
  // from `levelRef` (the same voiceRef useCypherVoice writes every frame:
  // { talking, level } from its analyser) and open the mouth with it.
  // When speech stops the mouth settles back to the resting smile.
  // Only the speaking face talks: the quiz faces never get talking=true,
  // and the overlay only renders for Happy (the other mouths are shaped
  // differently and are never the speaking face). Under
  // prefers-reduced-motion the mouth stays still, matching the cross-fade
  // behaviour.
  useEffect(() => {
    if (!talking) {
      setOpen(0);
      return undefined;
    }
    if (prefersReducedMotion()) return undefined;
    smoothedRef.current = 0;
    lastLevelRef.current = levelRef?.current?.level ?? 0;
    lastChangeRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const raw = levelRef?.current?.level;
      const level = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
      if (Math.abs(level - lastLevelRef.current) > 0.02) {
        lastLevelRef.current = level;
        lastChangeRef.current = now;
      }
      smoothedRef.current += (level - smoothedRef.current) * 0.4;
      const next =
        now - lastChangeRef.current > MOUTH_FLAT_MS
          ? mouthOpenRhythm(now)
          : mouthOpenForLevel(smoothedRef.current);
      setOpen(next);
    }, MOUTH_TICK_MS);
    return () => clearInterval(id);
  }, [talking, levelRef]);

  return (
    <div className={`relative aspect-square overflow-hidden rounded-control bg-[#0D1B2A] ${className}`} aria-hidden={true}>
      {previous && (
        <img src={faceSrc(previous)} alt="" aria-hidden={true} className="absolute inset-0 h-full w-full" draggable={false} />
      )}
      <img
        key={current}
        src={faceSrc(current)}
        alt=""
        aria-hidden={true}
        className="absolute inset-0 h-full w-full animate-face-fade"
        draggable={false}
      />
      {current === 'happy' && (
        <div
          data-testid="cypher-mouth"
          aria-hidden={true}
          className="absolute z-10 rounded-[50%] bg-[#0D1B2A]"
          style={{
            left: `${CYPHER_MOUTH_BOX.left}%`,
            top: `${CYPHER_MOUTH_BOX.top}%`,
            width: `${CYPHER_MOUTH_BOX.width}%`,
            height: `${CYPHER_MOUTH_BOX.height}%`,
            transform: `scale(${0.85 + open * 0.15}, ${open})`,
            transformOrigin: '50% 0%',
            transition: 'transform 100ms linear',
          }}
        />
      )}
    </div>
  );
}
