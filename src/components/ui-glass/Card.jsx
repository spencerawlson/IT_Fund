import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PAD = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

const LINKED = 'block transition-[border-color,background-color] hover:border-white/20 hover:bg-white/[0.04]';

/**
 * Glass panel. `level` 1 = card/nav, 2 = reading surface, 3 = menu/dialog.
 * Pass `to` (in-app) or `href` (external, new tab) to make the whole card a link; only then
 * does it react to hover.
 */
export function Card({ level = 1, padding = 'md', to, href, as: Tag = 'div', className, children, ...rest }) {
  const classes = cn(`glass-${level} rounded-card`, PAD[padding], className);
  if (to) {
    return (
      <Link to={to} className={cn(classes, LINKED)} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn(classes, LINKED)} {...rest}>
        {children}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

/** Title row for a card: heading, optional supporting text, optional trailing element (e.g. a badge). */
export function CardHeader({ title, description, eyebrow, trailing, as: Heading = 'h3' }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">{eyebrow}</p>}
        <Heading className={cn('text-heading text-ink-1', eyebrow && 'mt-1')}>{title}</Heading>
        {description && <p className="mt-1 text-small text-ink-2">{description}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** Bottom row of a card, separated by a hairline. */
export function CardFooter({ className, children }) {
  return <div className={cn('mt-5 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4', className)}>{children}</div>;
}
