import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ProgressRing({ percent, size = 56, stroke = 5, color = '#3B82F6' }) {
  const [shown, setShown] = useState(percent);
  const prevRef = useRef(percent);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (shown / 100) * circumference;
  const complete = shown >= 100;

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = percent;
    if (from === percent) return undefined;
    const reduced =
      typeof window === 'undefined' ||
      !window.matchMedia ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof window.requestAnimationFrame !== 'function';
    if (reduced) {
      setShown(percent);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const duration = 650;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (percent - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', color }}
          className={cn(complete && 'ring-complete')}
        />
      </svg>
      <span className="absolute text-caption font-bold tabular-nums text-ink-1">{shown}%</span>
    </div>
  );
}
