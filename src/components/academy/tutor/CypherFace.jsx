import React, { useEffect, useState } from 'react';

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
export default function CypherFace({ emotion = 'happy', className = '' }) {
  const [current, setCurrent] = useState(emotion);
  const [previous, setPrevious] = useState(null);

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
    </div>
  );
}
