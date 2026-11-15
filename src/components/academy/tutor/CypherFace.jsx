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

// The talking mouth — ONE mouth, not two (PR #77 fixes PR #75's split).
// PR #75 drew a dark ellipse INSIDE the white smile "u": at the smile's
// ends the ellipse tapers to nothing, so the whole white smile showed
// around it — a second mouth. Spencer's photo (Nov 15, lesson 3.3,
// "Speaking..." active) shows it plainly: the white "u" unchanged, the
// dark oval nested inside it like a tongue. The fix: the mouth IS the
// white line. One SVG shape morphs from the smile (closed) into the
// Excited face's open "D" — flat top, bowl bottom, white outline, visor
// showing through — Spencer's own art language for an open mouth,
// measured from cypher-face-excited.png (D: x 131-189, top y 182-187,
// bottom bowl to y 210-215, outline ~5-6 px). The shape is two paths: a
// white outer mouth and a visor-coloured inner mouth drawn on top of it.
// Closed, the inner path is a zero-area line on the smile's centreline
// (invisible) and the outer path is a crescent tracing the smile — the
// resting face looks exactly as before. As it opens, the outer path
// flattens on top and drops into a bowl, and the inner path grows from
// nothing into the D's interior, so the white line itself opens: there
// is never a second mouth, and the white smile is never visible beside
// the animated one. Nothing about the art itself changes: the PNGs are
// untouched.
export const MOUTH_XS = [131, 140, 150, 160, 170, 180, 189];

// Smile centreline, measured from the 320x320 Happy PNG (Nov 15, PIL):
// the white "u" is x 133-188, centreline y 191 at the ends, 208 in the
// middle, stroke ~7 px. The closed mouth covers it with ~1 px to spare
// on each side (top = centreline - 6, bottom = centreline + 6, pointed
// ends on the centreline so the rounded caps are covered too).
export const MOUTH_SMILE_Y = [192, 199, 206.5, 208, 206, 198.5, 191];
const MOUTH_CLOSED_TOP = [192, 193, 200.5, 202, 200, 192.5, 191];
const MOUTH_CLOSED_BOTTOM = [192, 205, 212.5, 214, 212, 204.5, 191];
// The open D, measured from cypher-face-excited.png (see above).
const MOUTH_OPEN_TOP = [182, 182, 182, 182, 182, 182, 182];
const MOUTH_OPEN_BOTTOM = [192, 205, 213, 215, 213, 205, 192];
const MOUTH_INNER_OPEN_TOP = [187, 187, 187, 187, 187, 187, 187];
const MOUTH_INNER_OPEN_BOTTOM = [187, 199, 207, 209, 207, 199, 187];

// Visor colour in the mouth band, measured from the Happy PNG (mean
// 59.7/59.2/59.4, std 3.4 — the visor is nearly flat there). The inner
// mouth is surrounded by the white outline, so it never meets the real
// visor edge-on; it only needs to read as the visor showing through.
export const MOUTH_VISOR_FILL = '#3B3A3B';

// Mouth geometry at openness `open` (0 = resting smile, 1 = full D):
// the y of each edge at each x in MOUTH_XS, linearly interpolated. Pure,
// so tests and the render harness can assert on it directly.
//
// The three edges do NOT all move at the same rate — that is what keeps
// the mouth one shape instead of two stacked arcs (the first render of
// this fix showed the failure: at intermediate open the dark interior
// cut the white crescent into a top arc and a bottom arc, a double
// smile). The top edge flattens fast (topOpen = open * 1.6, clamped),
// so by half-open the mouth already reads as a D taking shape; the
// bottom drops at the base rate; and the dark interior stays shut until
// the mouth is genuinely open (innerOpen = 0 below open 0.5, then up to
// 1), so the white shape is never split by a dark slit while it is
// still essentially a smile.
export function mouthGeometry(open) {
  const o = Number.isFinite(open) ? Math.max(0, Math.min(1, open)) : 0;
  const topOpen = Math.min(1, o * 1.6);
  const innerOpen = Math.max(0, Math.min(1, (o - 0.5) / 0.5));
  const lerp = (a, b, t) => a + (b - a) * t;
  return {
    outerTop: MOUTH_XS.map((_, i) => lerp(MOUTH_CLOSED_TOP[i], MOUTH_OPEN_TOP[i], topOpen)),
    outerBottom: MOUTH_XS.map((_, i) => lerp(MOUTH_CLOSED_BOTTOM[i], MOUTH_OPEN_BOTTOM[i], o)),
    innerTop: MOUTH_XS.map((_, i) => lerp(MOUTH_SMILE_Y[i], MOUTH_INNER_OPEN_TOP[i], innerOpen)),
    innerBottom: MOUTH_XS.map((_, i) => lerp(MOUTH_SMILE_Y[i], MOUTH_INNER_OPEN_BOTTOM[i], innerOpen)),
  };
}

// Smooth closed loop through the top edge (left->right) and the bottom
// edge (right->left): Catmull-Rom -> cubic Bezier, so the mouth reads as
// hand-drawn, not a polygon. The pointed ends are single points (top and
// bottom meet on the centreline), so the end points are not duplicated.
function smoothClosedPath(topYs, bottomYs) {
  const pts = [
    ...MOUTH_XS.map((x, i) => [x, topYs[i]]),
    ...MOUTH_XS.slice(1, -1)
      .reverse()
      .map((x, j) => [x, bottomYs[MOUTH_XS.length - 2 - j]]),
  ];
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

export function mouthOuterPath(open) {
  const g = mouthGeometry(open);
  return smoothClosedPath(g.outerTop, g.outerBottom);
}

export function mouthInnerPath(open) {
  const g = mouthGeometry(open);
  return smoothClosedPath(g.innerTop, g.innerBottom);
}

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
  // and the mouth only renders for Happy (the other mouths are shaped
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
        <svg
          data-testid="cypher-mouth"
          aria-hidden={true}
          viewBox="0 0 320 320"
          className="absolute inset-0 z-10 h-full w-full"
        >
          <path d={mouthOuterPath(open)} fill="#FFFFFF" />
          <path d={mouthInnerPath(open)} fill={MOUTH_VISOR_FILL} />
        </svg>
      )}
    </div>
  );
}
