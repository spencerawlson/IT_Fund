import React from 'react';
import { cn } from '@/lib/utils';

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

/**
 * Progress bar. Amber while in progress, green when complete: the fill is the only
 * coloured element. `label` is required for screen readers; `showValue` prints the percentage.
 */
export function ProgressBar({ value, label, showValue = true, size = 'md', className }) {
  const v = clamp(value);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('flex-1 overflow-hidden rounded-full bg-white/10', size === 'sm' ? 'h-1.5' : 'h-2')}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', v === 100 ? 'bg-success' : 'bg-action')} style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="w-10 shrink-0 text-right text-small font-semibold tabular-nums text-ink-2">{v}%</span>}
    </div>
  );
}

/** Circular progress for compact spots (course tiles, headers). */
export function ProgressRing({ value, label, size = 48, stroke = 4 }) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500', v === 100 ? 'stroke-success' : 'stroke-action')}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-caption font-semibold tabular-nums text-ink-1">{v}%</span>
    </div>
  );
}
