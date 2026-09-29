// Small building blocks shared by the Academy pages, now thin adapters over the design-system
// kit (@/components/ui-glass) so older call sites get the same look as new code.
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, Info, Circle } from 'lucide-react';
import { iconFor } from '@/components/academy/icons';
import {
  Badge,
  Breadcrumbs as KitBreadcrumbs,
  EmptyState as KitEmptyState,
  IconTile as KitIconTile,
  ProgressBar as KitProgressBar,
  SectionHeader,
  StatusBadge as KitStatusBadge,
} from '@/components/ui-glass';

/** Progress bar. `color` is ignored: progress is always amber, green when complete. */
// eslint-disable-next-line no-unused-vars
export function ProgressBar({ color, ...props }) {
  return <KitProgressBar {...props} />;
}

export const StatusBadge = KitStatusBadge;
export const Breadcrumbs = KitBreadcrumbs;

/** Neutral fact badge (difficulty, counts, duration). */
export function Pill({ children }) {
  return <Badge>{children}</Badge>;
}

/** Course/path icon by name. The colour tints the glyph only, never the tile. */
export function IconTile({ icon, color, size = 'md' }) {
  return <KitIconTile icon={iconFor(icon)} color={color} size={size} />;
}

export function SectionHeading({ children, action }) {
  return <SectionHeader title={children} action={action} />;
}

const PREREQ_KIND = {
  required: { label: 'Required', icon: Lock, note: 'Must be completed first.' },
  recommended: { label: 'Recommended', icon: Info, note: 'Strongly advised, but not locked.' },
  optional: { label: 'Optional', icon: Circle, note: 'Helpful background.' },
};

/**
 * Prerequisites grouped by kind, as a plain list. items: { required: [{label, to, met}], recommended, optional }
 */
export function Prerequisites({ items }) {
  const kinds = Object.keys(PREREQ_KIND).filter((k) => items[k]?.length);
  if (!kinds.length) return <p className="text-body text-ink-2">None. You can start right away.</p>;
  return (
    <div className="space-y-5">
      {kinds.map((kind) => {
        const { label, note } = PREREQ_KIND[kind];
        return (
          <div key={kind}>
            <p className="text-small font-semibold text-ink-1">
              {label} <span className="font-normal text-ink-2">· {note}</span>
            </p>
            <ul className="mt-2 space-y-1.5">
              {items[kind].map((p) => (
                <li key={p.label} className="flex items-start gap-2.5 text-body">
                  {p.met ? (
                    <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <Lock size={16} className="mt-1 shrink-0 text-ink-2" aria-hidden="true" />
                  )}
                  <Link to={p.to} className="text-ink-1 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                    {p.label}
                  </Link>
                  <span className="sr-only">{p.met ? '(completed)' : '(not completed)'}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Not-found / empty state with a way back. */
export function EmptyState({ title, text, to = '/', action = 'Back to Home' }) {
  return <KitEmptyState title={title} text={text} to={to} action={action} />;
}
