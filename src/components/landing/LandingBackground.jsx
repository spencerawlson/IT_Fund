import React from 'react';

// Static decorative vector background for the landing page: soft brand-colour
// gradient blobs plus a few line-art IT devices (server, router, switch, laptop,
// database, cloud, shield) scattered around the edges. No animation. Purely
// decorative (aria-hidden, pointer-events-none); low opacity keeps text readable
// and the devices sit clear of the centred hero copy.

// Each device is drawn centred on (0,0) in roughly a 48×48 box, as line art.
// `c`/`o` are the accent colour/opacity for solid bits (LEDs).
function Device({ type, c, o }) {
  const led = { fill: c, fillOpacity: o, stroke: 'none' };
  switch (type) {
    case 'server':
      return (
        <g>
          <rect x="-15" y="-21" width="30" height="42" rx="3" />
          <line x1="-9" y1="-12" x2="9" y2="-12" />
          <line x1="-9" y1="-2" x2="9" y2="-2" />
          <line x1="-9" y1="8" x2="9" y2="8" />
          <circle cx="-11" cy="-12" r="1.4" style={led} />
          <circle cx="-11" cy="-2" r="1.4" style={led} />
        </g>
      );
    case 'router':
      return (
        <g>
          <rect x="-20" y="-4" width="40" height="16" rx="3" />
          <path d="M-8 -4 V-16 M-8 -16 l-4 -4 M-8 -16 l4 -4" />
          <path d="M8 -4 V-16 M8 -16 l-4 -4 M8 -16 l4 -4" />
          <circle cx="-12" cy="4" r="1.6" style={led} />
          <circle cx="-5" cy="4" r="1.6" style={led} />
        </g>
      );
    case 'switch':
      return (
        <g>
          <rect x="-22" y="-8" width="44" height="16" rx="2.5" />
          {[-16, -10, -4, 2, 8, 14].map((x) => (
            <rect key={x} x={x} y="1" width="4" height="4" rx="0.8" />
          ))}
          <circle cx="-18" cy="-4" r="1.4" style={led} />
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

// type, position, scale, colour, opacity — all kept to the edges, clear of the hero.
const PLACEMENTS = [
  { type: 'server', x: 150, y: 170, s: 1.9, c: '#2563eb', o: 0.16 },
  { type: 'router', x: 1285, y: 150, s: 1.9, c: '#0ea5a4', o: 0.16 },
  { type: 'cloud', x: 1180, y: 330, s: 1.7, c: '#2563eb', o: 0.14 },
  { type: 'laptop', x: 120, y: 470, s: 1.7, c: '#334155', o: 0.13 },
  { type: 'database', x: 240, y: 770, s: 2.0, c: '#2563eb', o: 0.15 },
  { type: 'switch', x: 1250, y: 760, s: 2.0, c: '#0ea5a4', o: 0.16 },
  { type: 'shield', x: 1320, y: 470, s: 1.6, c: '#0ea5a4', o: 0.14 },
];

export default function LandingBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        <defs>
          <radialGradient id="lb-blue" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lb-emerald" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#0ea5a4" stopOpacity="0.16" />
            <stop offset="1" stopColor="#0ea5a4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft colour blobs */}
        <circle cx="1240" cy="140" r="430" fill="url(#lb-blue)" />
        <circle cx="180" cy="820" r="460" fill="url(#lb-emerald)" />

        {/* line-art IT devices, drawn at the edges, clear of the hero */}
        {PLACEMENTS.map(({ type, x, y, s, c, o }, i) => (
          <g
            key={`${type}-${i}`}
            transform={`translate(${x} ${y}) scale(${s})`}
            fill="none"
            stroke={c}
            strokeOpacity={o}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Device type={type} c={c} o={o} />
          </g>
        ))}
      </svg>
    </div>
  );
}
