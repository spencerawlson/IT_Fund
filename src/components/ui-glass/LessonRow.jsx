import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_TEXT = { completed: 'Completed', 'in-progress': 'In progress', available: 'Ready to start', locked: 'Locked' };

function Marker({ status }) {
  const base = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border';
  if (status === 'completed') return <span className={cn(base, 'border-success/40 bg-success/15 text-success')}><Check size={16} aria-hidden="true" /></span>;
  if (status === 'locked') return <span className={cn(base, 'border-white/10 text-ink-2')}><Lock size={14} aria-hidden="true" /></span>;
  if (status === 'in-progress') return <span className={cn(base, 'border-action bg-action/10')}><span className="h-2.5 w-2.5 rounded-full bg-action" /></span>;
  return <span className={cn(base, 'border-white/30')} />;
}

/**
 * One lesson in a syllabus: marker, "1.2 · Title", status and time. Links only when open.
 * `current` highlights the learner's next lesson.
 */
export function LessonRow({ number, title, status, minutes, to, current = false }) {
  const locked = status === 'locked';
  const body = (
    <>
      <Marker status={status} />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body font-semibold', locked ? 'text-ink-2' : 'text-ink-1')}>
          <span className="tabular-nums text-ink-2">{number}</span>
          <span aria-hidden="true"> · </span>
          {title}
        </span>
        <span className="block text-small text-ink-2">
          {STATUS_TEXT[status]}
          {minutes ? ` · ${minutes} min` : ''}
        </span>
      </span>
      {!locked && <ChevronRight size={18} className="shrink-0 text-ink-2" aria-hidden="true" />}
    </>
  );
  const classes = cn(
    'flex items-center gap-4 rounded-control px-3 py-3',
    current && 'bg-action/[0.08] ring-1 ring-inset ring-action/30',
  );

  if (locked || !to) return <div className={classes} aria-disabled={locked || undefined}>{body}</div>;
  return (
    <Link to={to} className={cn(classes, 'transition-colors hover:bg-white/[0.05]')} aria-current={current ? 'step' : undefined}>
      {body}
    </Link>
  );
}
