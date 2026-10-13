import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANT = {
  // One light-purple primary action per view, with near-black text for contrast.
  primary:
    'border border-violet-700/15 bg-action-surface text-action-surface-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_20px_-8px_rgb(var(--action-rgb)/0.45)] hover:bg-action-surface-hover',
  secondary: 'border border-black/10 bg-white/70 text-ink-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-violet-700/20 hover:bg-violet-50',
  ghost: 'text-ink-2 hover:bg-black/[0.04] hover:text-ink-1',
};

const SIZE = {
  sm: 'min-h-9 gap-1.5 px-3 text-small',
  md: 'min-h-11 gap-2 px-4 text-body',
  lg: 'min-h-12 gap-2 px-6 text-body',
};

/**
 * Button, or a link styled as one: pass `to` for an in-app route, `href` for an external URL.
 * Icons go in `icon` (before the label) or `iconAfter`.
 */
export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, icon: Icon, iconAfter: IconAfter, loading = false, disabled, className, children, ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 16 : 18;
  const classes = cn(
    'inline-flex select-none items-center justify-center rounded-control font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
    VARIANT[variant],
    SIZE[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" /> : Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children}
      {IconAfter && <IconAfter size={iconSize} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} target="_blank" rel="noreferrer" className={classes} {...rest}>
        {content}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});
