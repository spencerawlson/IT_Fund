import React from 'react';

// Static decorative background for the landing page: soft brand-colour blobs
// (CSS radial gradients) plus a few line-art IT devices placed with CSS so they
// land reliably regardless of page height. (A single sliced SVG over the whole
// tall page cropped them off the edges — that's why they weren't visible.)
// Purely decorative: aria-hidden, pointer-events-none, no animation.

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
          <circle cx="-11" cy="-2" r="1.6" fill="currentColor" stroke="none" />
        </g>
      );
    case 'router':
      return (
        <g>
          <rect x="-20" y="-4" width="40" height="16" rx="3" />
          <path d="M-8 -4 V-16 M-8 -16 l-4 -4 M-8 -16 l4 -4" />
          <path d="M8 -4 V-16 M8 -16 l-4 -4 M8 -16 l4 -4" />
          <circle cx="-12" cy="4" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="-5" cy="4" r="1.8" fill="currentColor" stroke="none" />
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

// One small SVG per device, positioned with CSS. `pos` = Tailwind position
// classes; `cls` hides some on small screens to avoid crowding the hero text.
const DEVICES = [
  { type: 'server', pos: 'left-4 top-28 sm:left-10', size: 74, color: '#2563eb', cls: '' },
  { type: 'router', pos: 'right-4 top-24 sm:right-10', size: 80, color: '#0ea5a4', cls: '' },
  { type: 'database', pos: 'left-4 top-[20rem] sm:left-10', size: 76, color: '#2563eb', cls: 'hidden sm:block' },
  { type: 'switch', pos: 'right-4 top-[21rem] sm:right-12', size: 80, color: '#0ea5a4', cls: 'hidden sm:block' },
  { type: 'cloud', pos: 'left-6 top-[34rem] sm:left-16', size: 72, color: '#0ea5a4', cls: 'hidden sm:block' },
  { type: 'laptop', pos: 'right-6 top-[35rem] sm:right-16', size: 72, color: '#334155', cls: 'hidden sm:block' },
  { type: 'shield', pos: 'right-5 top-[12rem]', size: 60, color: '#2563eb', cls: 'hidden lg:block' },
];

export default function LandingBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      {/* soft colour blobs (CSS gradients, so no SVG cropping) */}
      <div
        className="absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.22), rgba(37,99,235,0) 70%)' }}
      />
      <div
        className="absolute -left-32 top-[30rem] h-[38rem] w-[38rem] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(14,165,164,0.20), rgba(14,165,164,0) 70%)' }}
      />

      {/* line-art IT devices */}
      {DEVICES.map(({ type, pos, size, color, cls }, i) => (
        <svg
          key={`${type}-${i}`}
          className={`absolute ${pos} ${cls}`}
          style={{ width: size, height: size, color, opacity: 0.5 }}
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
