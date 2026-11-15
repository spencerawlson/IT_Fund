import React, { useCallback, useEffect, useRef, useState } from 'react';

// The approved background loop for the lesson panel:
// public/videos/cypher-bg-pilot-v2.mp4 — Cypher seated at his desk in the
// server room, traffic waves flowing into the racks. 12 s seamless loop,
// 1280x720, 1.34 MB, no audio track. v2: bolder traffic (14 px underlay +
// 5 px saturated-cyan core, vs v1's single 4 px faint line) with a glowing
// cyan diamond hub on the floor where one trunk splits into two branches
// into the racks — the load-balancer beat, readable in a still frame.
// It replaces the 3D model viewport — the video already shows Cypher, so
// keeping the model would duplicate him. Served from public/ like the
// blueprint sheets and GLB models.
export const CYPHER_BG_VIDEO_SRC = '/videos/cypher-bg-pilot-v2.mp4';

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

// Background video for the "Cypher" lesson panel. Motion is calm by
// design (slow drift + traffic pulses); under prefers-reduced-motion the
// video is shown paused on its first frame instead of playing, so the
// panel stays still — same matchMedia pattern as MissionWorkspace. The
// clip is decorative — the caption below it names Cypher — so the video
// itself is hidden from assistive tech.
export default function CypherBgVideo() {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const videoRef = useRef(null);

  // The muted property (not just the attribute) is what the autoplay
  // policy reads, so set it on the element itself.
  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el) el.muted = true;
  }, []);

  // Keep reduced-motion in step with the OS while the panel is open, and
  // pause/resume the video when the preference flips mid-visit.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reducedMotion) video.pause();
    else video.play().catch(() => { /* autoplay blocked — stays paused */ });
  }, [reducedMotion]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-control bg-white">
      <video
        ref={setVideoRef}
        className="h-full w-full object-cover"
        src={CYPHER_BG_VIDEO_SRC}
        aria-hidden={true}
        muted
        playsInline
        preload={reducedMotion ? 'metadata' : 'auto'}
        {...(reducedMotion ? {} : { loop: true, autoPlay: true })}
      />
      {/* Light bottom fade: the clip is bright white overall, so the fade
          keeps the frame from hard-edging against the caption below it. No
          panel text sits over the video, so this is the whole scrim. */}
      <div
        aria-hidden={true}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/70 to-transparent"
      />
    </div>
  );
}
