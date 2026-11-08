import React from 'react';

// Static decorative background for the landing page: soft brand-colour blobs
// plus a dense field of small line-art IT devices, randomly scattered across the
// whole page. The scatter is seeded (computed once, deterministic) so it is
// stable across renders and SSR. Purely decorative: aria-hidden,
// pointer-events-none, no animation.

// Device glyph, drawn centred in a -26..26 box.
function Glyph({ type }) {
  switch (type) {
    case 'server':
      return (
        <g>
          <rect x="-15" y="-21" width="30" height="42" rx="3" />
          <line x1="-9" y1="-12" x2="9" y2="-12" />
          <line x1="-9" y1="-2" x2="9" y2="-2" />
          <line x1="-9" y1="8" x2="9" y2="8" />
          <circle cx="-11" cy="-12" r="1.6" fill="currentColor" stroke="none" />
        </g>
      );
    case 'router':
      return (
        <g>
          <rect x="-20" y="-4" width="40" height="16" rx="3" />
          <path d="M-8 -4 V-16 M-8 -16 l-4 -4 M-8 -16 l4 -4" />
          <path d="M8 -4 V-16 M8 -16 l-4 -4 M8 -16 l4 -4" />
          <circle cx="-12" cy="4" r="1.8" fill="currentColor" stroke="none" />
        </g>
      );
    case 'switch':
      return (
        <g>
          <rect x="-22" y="-8" width="44" height="16" rx="2.5" />
          {[-16, -10, -4, 2, 8, 14].map((x) => (
            <rect key={x} x={x} y="1" width="4" height="4" rx="0.8" />
          ))}
          <circle cx="-18" cy="-4" r="1.6" fill="currentColor" stroke="none" />
        </g>
      );
    case 'laptop':
      return (
        <g>
          <rect x="-17" y="-15" width="34" height="22" rx="2" />
          <line x1="-13" y1="-11" x2="13" y2="-11" />
          <path d="M-22 12 h44 l-3 -5 H-19 Z" />
        </g>
      );
    case 'database':
      return (
        <g>
          <ellipse cx="0" cy="-15" rx="15" ry="5.5" />
          <path d="M-15 -15 V13 c0 3 6.7 5.5 15 5.5 s15 -2.5 15 -5.5 V-15" />
          <path d="M-15 -4 c0 3 6.7 5.5 15 5.5 S15 -1 15 -4" />
        </g>
      );
    case 'cloud':
      return <path d="M-14 8 a8 8 0 0 1 1 -16 10 10 0 0 1 19 3 A7 7 0 0 1 4 8 Z" />;
    case 'shield':
      return (
        <g>
          <path d="M0 -20 -16 -13 V-2 C-16 9 -9 15 0 19 9 15 16 9 16 -2 V-13 Z" />
          <path d="M-7 -1 -2 4 8 -7" />
        </g>
      );
    default:
      return null;
  }
}

const TYPES = ['server', 'router', 'switch', 'laptop', 'database', 'cloud', 'shield'];
const COLORS = ['#2563eb', '#0ea5a4', '#334155'];

// Seeded PRNG (mulberry32): a fixed scatter, computed once at module load.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCATTER = (() => {
  const rand = mulberry32(20260707);
  return Array.from({ length: 170 }, (_, i) => ({
    type: TYPES[i % TYPES.length],
    top: rand() * 99,              // %
    left: rand() * 99,             // %
    size: 24 + Math.round(rand() * 14), // ~24–38px (about half the old 60–80)
    color: COLORS[Math.floor(rand() * COLORS.length)],
    opacity: 0.22 + rand() * 0.2,  // 0.22–0.42
    rot: Math.round((rand() - 0.5) * 24), // slight tilt
  }));
})();

export default function LandingBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      {/* soft colour blobs */}
      <div
        className="absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.20), rgba(37,99,235,0) 70%)' }}
      />
      <div
        className="absolute -left-32 top-[40rem] h-[38rem] w-[38rem] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(14,165,164,0.18), rgba(14,165,164,0) 70%)' }}
      />

      {/* scattered line-art IT devices */}
      {SCATTER.map(({ type, top, left, size, color, opacity, rot }, i) => (
        <svg
          key={`${type}-${i}`}
          className="absolute"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: size,
            height: size,
            color,
            opacity,
            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          }}
          viewBox="-26 -26 52 52"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <Glyph type={type} />
        </svg>
      ))}
    </div>
  );
}
