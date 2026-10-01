import React from 'react';

const blob = (n) => ({ background: `var(--blob-${n})`, opacity: `var(--blob-${n}-opacity)` });

/**
 * Slowly morphing colour blobs behind the glass panels. Mount once, at the app root.
 * Colours and opacities are design tokens (--blob-*) in src/index.css.
 */
export default function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg-base)]">
      <div className="liquid-blob -left-24 -top-24 h-[55vmax] w-[55vmax]" style={blob(1)} />
      <div className="liquid-blob -right-32 top-1/4 h-[45vmax] w-[45vmax]" style={{ ...blob(2), animationDelay: '-12s', animationDuration: '48s' }} />
      <div className="liquid-blob -bottom-40 left-1/4 h-[50vmax] w-[50vmax]" style={{ ...blob(3), animationDelay: '-24s', animationDuration: '56s' }} />
      {/* Fine grain keeps the blur from banding. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(124,58,237,0.06)_1px,transparent_1px)] [background-size:3px_3px] opacity-40" />
      {/* Light wash so white prevails: the soft violet blobs read only as a tint near the top. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/60 to-white/85" />
    </div>
  );
}
