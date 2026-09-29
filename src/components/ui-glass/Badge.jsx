import React from 'react';
import { Check, CircleDot, Circle, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS } from '@/lib/progress/engine';

// Badges carry a fixed meaning. Tone is never decorative: neutral for facts (difficulty,
// duration), the status tones only for state.
const TONE = {
  neutral: 'border-white/15 bg-white/[0.06] text-ink-2',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-info/30 bg-info/10 text-info',
  current: 'border-action/40 bg-action/10 text-action-hover',
};

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption font-semibold', TONE[tone], className)}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS_BADGE = {
  completed: { tone: 'success', icon: Check },
  'in-progress': { tone: 'current', icon: CircleDot },
  'not-started': { tone: 'neutral', icon: Circle },
  available: { tone: 'neutral', icon: Circle },
  locked: { tone: 'neutral', icon: Lock },
  'coming-soon': { tone: 'neutral', icon: Clock },
};

/** Progress status (completed, in-progress, locked...): icon + word, never colour alone. */
export function StatusBadge({ status, className }) {
  const { tone, icon } = STATUS_BADGE[status] || STATUS_BADGE['not-started'];
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {STATUS[status] || status}
    </Badge>
  );
}
