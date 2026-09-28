// Small building blocks shared by the Academy pages.
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleDot, Circle, Lock, Clock, Info, ChevronRight } from 'lucide-react';
import { STATUS } from '@/lib/progress/engine';
import { iconFor } from '@/components/academy/icons';

/** Accessible progress bar: announces its value, and shows it as text too. */
export function ProgressBar({ value, color = '#F59E0B', label, showValue = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      {showValue && <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-200">{value}%</span>}
    </div>
  );
}

const STATUS_ICON = {
  completed: Check,
  'in-progress': CircleDot,
  'not-started': Circle,
  available: Circle,
  locked: Lock,
  'coming-soon': Clock,
};
const STATUS_TONE = {
  completed: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  'in-progress': 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  'not-started': 'border-white/15 bg-white/5 text-slate-300',
  available: 'border-white/15 bg-white/5 text-slate-200',
  locked: 'border-white/10 bg-white/[0.03] text-slate-400',
  'coming-soon': 'border-white/10 bg-white/[0.03] text-slate-400',
};

/** Status pill: icon + text, so status never depends on colour alone. */
export function StatusBadge({ status }) {
  const Icon = STATUS_ICON[status] || Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] || STATUS_TONE['not-started']}`}>
      <Icon size={12} aria-hidden="true" /> {STATUS[status] || status}
    </span>
  );
}

export function Pill({ children }) {
  return <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-300">{children}</span>;
}

export function IconTile({ icon, color, size = 'md' }) {
  const Icon = iconFor(icon);
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  return (
    <div className={`flex shrink-0 items-center justify-center border border-white/20 ${box}`} style={{ backgroundColor: `${color}33`, color }}>
      <Icon size={size === 'lg' ? 28 : 22} aria-hidden="true" />
    </div>
  );
}

export function SectionHeading({ children, action }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-400">
        {items.map((item, i) => (
          <li key={item.label} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-white">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-slate-200">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const PREREQ_KIND = {
  required: { label: 'Required', icon: Lock, note: 'Must be completed first.' },
  recommended: { label: 'Recommended', icon: Info, note: 'Strongly advised, but not locked.' },
  optional: { label: 'Optional', icon: Circle, note: 'Helpful background.' },
};

/**
 * Prerequisites grouped by kind. items: { required: [{label, to, met}], recommended: [...], optional: [...] }
 */
export function Prerequisites({ items }) {
  const kinds = Object.keys(PREREQ_KIND).filter((k) => items[k]?.length);
  if (!kinds.length) return <p className="text-sm text-slate-400">None. You can start right away.</p>;
  return (
    <div className="space-y-4">
      {kinds.map((kind) => {
        const { label, icon: Icon, note } = PREREQ_KIND[kind];
        return (
          <div key={kind}>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Icon size={14} aria-hidden="true" /> {label}
              <span className="font-normal text-slate-500">· {note}</span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {items[kind].map((p) => (
                <li key={p.label}>
                  <Link
                    to={p.to}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-white/10 ${
                      p.met ? 'border-emerald-400/40 text-emerald-200' : 'border-white/15 text-slate-300'
                    }`}
                  >
                    {p.met ? <Check size={12} aria-hidden="true" /> : null}
                    {p.label}
                    <span className="sr-only">{p.met ? '(completed)' : '(not completed)'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Friendly not-found / empty state with a way back. */
export function EmptyState({ title, text, to = '/academy', action = 'Back to the Academy' }) {
  return (
    <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      {text && <p className="mt-2 text-sm text-slate-300">{text}</p>}
      <Link to={to} className="mt-5 inline-block text-sm font-semibold text-amber-300 hover:underline">{action}</Link>
    </div>
  );
}
