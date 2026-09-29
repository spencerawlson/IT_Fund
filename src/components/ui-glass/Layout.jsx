import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/** Standard content column inside the app shell. `wide` for grids, default for reading pages. */
export function PageContainer({ wide = false, className, children }) {
  return <div className={cn('mx-auto w-full px-4 pt-6 sm:px-8 lg:pt-10', wide ? 'max-w-6xl' : 'max-w-5xl', className)}>{children}</div>;
}

/** Top of every page: optional breadcrumbs/eyebrow, one h1, a short description, actions. */
export function PageHeader({ eyebrow, title, description, actions, breadcrumbs, className }) {
  return (
    <header className={cn('mb-8', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {eyebrow && <p className="text-small font-semibold text-ink-2">{eyebrow}</p>}
      <h1 className={cn('text-title text-ink-1', eyebrow && 'mt-1')}>{title}</h1>
      {description && <p className="mt-3 max-w-reading text-body text-ink-2">{description}</p>}
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/** Section title inside a page (h2), with an optional link or control on the right. */
export function SectionHeader({ title, description, action, id, className }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-heading text-ink-1">{title}</h2>
        {description && <p className="mt-1 text-small text-ink-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-small text-ink-2">
        {items.map((item, i) => (
          <li key={item.label} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} aria-hidden="true" className="text-ink-2/60" />}
            {item.to ? (
              <Link to={item.to} className="rounded-sm hover:text-ink-1">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink-1">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Empty, not-found or locked state: what happened, and one way forward. */
export function EmptyState({ icon: Icon, title, text, action, to, className }) {
  return (
    <div className={cn('glass-2 mx-auto max-w-md rounded-card p-8 text-center', className)}>
      {Icon && (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-control border border-white/10 bg-white/[0.04] text-ink-2">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="text-heading text-ink-1">{title}</p>
      {text && <p className="mt-2 text-small text-ink-2">{text}</p>}
      {action && to && (
        <Button to={to} variant="secondary" className="mt-6">
          {action}
        </Button>
      )}
    </div>
  );
}

/** A labelled figure: "9 lessons", "1 h 50 min". Neutral by design. */
export function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon size={18} className="shrink-0 text-ink-2" aria-hidden="true" />}
      <div>
        <p className="text-heading tabular-nums text-ink-1">{value}</p>
        <p className="text-caption text-ink-2">{label}</p>
      </div>
    </div>
  );
}

/** Neutral square behind an icon (course, tool, section). Colour stays on the icon only. */
export function IconTile({ icon: Icon, color, size = 'md' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-control border border-white/10 bg-white/[0.06] text-ink-1', box)}>
      <Icon size={size === 'lg' ? 26 : 20} style={color ? { color } : undefined} aria-hidden="true" />
    </span>
  );
}

/**
 * A clickable row in a list (search results, resources): title, supporting text, meta line.
 * `to` for in-app routes, `href` for external links (new tab, marked with an icon).
 */
export function ListLink({ to, href, title, text, meta }) {
  const classes = 'block rounded-control px-3 py-3 transition-colors hover:bg-white/[0.05]';
  const body = (
    <>
      <span className="flex items-center gap-2 text-body font-semibold text-ink-1">
        {title}
        {href && <ExternalLink size={15} className="shrink-0 text-ink-2" aria-hidden="true" />}
      </span>
      {text && <span className="mt-0.5 block text-small text-ink-2">{text}</span>}
      {meta && <span className="mt-1 block text-caption text-ink-3">{meta}</span>}
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {body}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return <Link to={to} className={classes}>{body}</Link>;
}
