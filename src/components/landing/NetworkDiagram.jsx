import React from 'react';

// Animated IT network vector for the landing hero: a central security hub (the
// CISSP shield) wired to the pieces of an IT stack — cloud, servers, database,
// workstation, router. Connection lines "flow" (animated dashes) and data
// packets travel hub↔node, with gently pulsing node rings. Pure inline SVG +
// CSS, no deps; all motion is disabled under prefers-reduced-motion.
//
// Decorative, so the whole thing is aria-hidden.

const NODES = [
  // label glyph drawn as a small inline group; x/y is the node centre.
  { id: 'cloud', x: 120, y: 70 },
  { id: 'server', x: 600, y: 70 },
  { id: 'db', x: 90, y: 250 },
  { id: 'laptop', x: 360, y: 300 },
  { id: 'router', x: 630, y: 250 },
];
const HUB = { x: 360, y: 170 };

export default function NetworkDiagram({ className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-3xl ${className}`} aria-hidden="true">
      <svg viewBox="0 0 720 360" className="h-auto w-full" role="img">
        <defs>
          <linearGradient id="nd-hub" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563eb" />
            <stop offset="1" stopColor="#0ea5a4" />
          </linearGradient>
          <style>{`
            .nd-link { stroke: #93c5fd; stroke-width: 2; fill: none; stroke-dasharray: 6 8; opacity: .8;
              animation: nd-flow 1.6s linear infinite; }
            .nd-link.r { animation-direction: reverse; animation-duration: 2.1s; }
            @keyframes nd-flow { to { stroke-dashoffset: -28; } }
            .nd-packet { animation: nd-fade 2.4s ease-in-out infinite; }
            @keyframes nd-fade { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
            .nd-ring { transform-box: fill-box; transform-origin: center; animation: nd-pulse 3s ease-in-out infinite; }
            @keyframes nd-pulse { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.15); opacity: .15; } }
            .nd-hub-ring { transform-box: fill-box; transform-origin: center; animation: nd-hubpulse 2.6s ease-in-out infinite; }
            @keyframes nd-hubpulse { 0%,100% { transform: scale(1); opacity:.45;} 50% { transform: scale(1.25); opacity:0;} }
            @media (prefers-reduced-motion: reduce) {
              .nd-link, .nd-link.r, .nd-packet, .nd-ring, .nd-hub-ring { animation: none; }
              .nd-packet { opacity: .9; }
            }
          `}</style>
        </defs>

        {/* links + travelling packets */}
        {NODES.map((n, i) => {
          const mx = (HUB.x + n.x) / 2;
          const my = (HUB.y + n.y) / 2;
          return (
            <g key={n.id}>
              <path className={`nd-link ${i % 2 ? 'r' : ''}`} d={`M${HUB.x} ${HUB.y} L${n.x} ${n.y}`} />
              <circle className="nd-packet" r="3.5" fill="#0ea5a4" cx={mx} cy={my}
                style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          );
        })}

        {/* satellite nodes */}
        {NODES.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            <circle className="nd-ring" r="26" fill="#bfdbfe" />
            <circle r="22" fill="#fff" stroke="#dbe4f0" strokeWidth="1.5" />
            <g stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
               transform="translate(-9 -9)">
              {n.id === 'cloud' && <path d="M5 13a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 14 13Z" />}
              {n.id === 'server' && <>
                <rect x="2" y="2.5" width="14" height="5.5" rx="1.5" />
                <rect x="2" y="10" width="14" height="5.5" rx="1.5" />
                <circle cx="5" cy="5.25" r="0.9" fill="#0ea5a4" stroke="none" />
                <circle cx="5" cy="12.75" r="0.9" fill="#0ea5a4" stroke="none" />
              </>}
              {n.id === 'db' && <>
                <ellipse cx="9" cy="4" rx="7" ry="2.6" />
                <path d="M2 4v10c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V4" />
                <path d="M2 9c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
              </>}
              {n.id === 'laptop' && <>
                <rect x="2.5" y="3" width="13" height="9" rx="1.2" />
                <path d="M1 15h16" />
              </>}
              {n.id === 'router' && <>
                <rect x="2" y="9" width="14" height="6" rx="1.5" />
                <path d="M9 9V5M9 5l-2.5-2M9 5l2.5-2" />
                <circle cx="6" cy="12" r="0.9" fill="#0ea5a4" stroke="none" />
              </>}
            </g>
          </g>
        ))}

        {/* central security hub */}
        <g transform={`translate(${HUB.x} ${HUB.y})`}>
          <circle className="nd-hub-ring" r="40" fill="#0ea5a4" />
          <circle r="34" fill="url(#nd-hub)" />
          <g stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
             transform="translate(-13 -13)">
            <path d="M13 2 4 6v6c0 5 3.5 8 9 11 5.5-3 9-6 9-11V6l-9-4Z" />
            <path d="m9.5 13 2.3 2.3L17 10.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
