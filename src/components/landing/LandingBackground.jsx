import React from 'react';

// Static decorative vector background for the landing page: soft brand-colour
// gradient blobs, a faint dot grid, and subtle IT/network line motifs (nodes +
// connections, a circuit trace). No animation. Purely decorative, so it is
// aria-hidden and ignores pointer events; low opacity keeps text readable.
export default function LandingBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      {/* soft colour blobs */}
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
          <pattern id="lb-dots" width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#1e293b" fillOpacity="0.05" />
          </pattern>
        </defs>

        {/* dot grid across the whole canvas */}
        <rect width="1440" height="900" fill="url(#lb-dots)" />
        {/* blobs, top-right (blue) and bottom-left (emerald) */}
        <circle cx="1240" cy="140" r="430" fill="url(#lb-blue)" />
        <circle cx="180" cy="820" r="460" fill="url(#lb-emerald)" />

        {/* subtle network motif, top-left */}
        <g stroke="#2563eb" strokeOpacity="0.14" strokeWidth="1.5" fill="none">
          <path d="M90 180 L250 120 L410 200 M250 120 L300 270 L410 200 M90 180 L300 270" />
          {[[90, 180], [250, 120], [410, 200], [300, 270]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#2563eb" fillOpacity="0.12" stroke="none" />
          ))}
        </g>

        {/* subtle circuit trace, bottom-right */}
        <g stroke="#0ea5a4" strokeOpacity="0.16" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M1360 660 H1180 V760 H1040 M1180 660 V560 H1300" />
          {[[1360, 660], [1040, 760], [1300, 560], [1180, 760]].map(([cx, cy]) => (
            <rect key={`${cx}-${cy}`} x={cx - 4} y={cy - 4} width="8" height="8" rx="1.5"
              fill="#0ea5a4" fillOpacity="0.14" stroke="none" />
          ))}
        </g>
      </svg>
    </div>
  );
}
