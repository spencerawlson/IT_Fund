import React from 'react';

/**
 * Calm, static page background tuned for focus. Mount once, at the app root.
 *
 * Focus rationale: peripheral motion is an attention tax during study sessions,
 * and saturated colour competes with content for the eye. So this is a
 * warm-neutral paper base with two ultra-subtle static radial tints for depth,
 * fine grain to prevent banding, and a gentle top light. Nothing moves.
 * Colours are design tokens (--bg-base, --bg-tint-*) in src/index.css.
 */
export default function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg-base)]">
      <div className="absolute -left-32 -top-32 h-[60vmax] w-[60vmax] rounded-full" style={{ background: 'var(--bg-tint-1)' }} />
      <div className="absolute -bottom-48 -right-24 h-[55vmax] w-[55vmax] rounded-full" style={{ background: 'var(--bg-tint-2)' }} />
      {/* Fine grain keeps the gradient from banding. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:3px_3px] opacity-40" />
      {/* Gentle top light so the page reads as sitting under a soft skylight. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/[0.025]" />
    </div>
  );
}
