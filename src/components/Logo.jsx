import React, { useId } from 'react';

const PINS = [11.5, 16, 20.5];

/** Brand mark: a CPU chip with a terminal prompt (>_) on its die. Matches public/favicon.svg. */
export function LogoMark({ size = 32, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-die`} x1="7" y1="7" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="16" y1="7" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="#67E8F9" strokeWidth="1.8" strokeLinecap="round">
        {PINS.map((p) => (
          <React.Fragment key={p}>
            <path d={`M${p} 3.5V7`} />
            <path d={`M${p} 25v3.5`} />
            <path d={`M3.5 ${p}H7`} />
            <path d={`M25 ${p}h3.5`} />
          </React.Fragment>
        ))}
      </g>
      <rect x="7" y="7" width="18" height="18" rx="4.5" fill={`url(#${id}-die)`} />
      <rect x="7" y="7" width="18" height="9" rx="4.5" fill={`url(#${id}-shine)`} />
      <rect x="7.5" y="7.5" width="17" height="17" rx="4" fill="none" stroke="#fff" strokeOpacity="0.35" />
      <path d="M11.8 12.6 15.2 16l-3.4 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 19.4h3.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus the "Road to CISSP" wordmark. */
export default function Logo({ size = 34 }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} className="drop-shadow-[0_4px_12px_rgba(20,184,166,0.45)]" />
      <span className="text-sm font-bold tracking-tight text-ink-1">
        Road to{' '}
        <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">CISSP</span>
      </span>
    </span>
  );
}
