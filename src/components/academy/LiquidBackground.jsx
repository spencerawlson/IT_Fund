import React, { useEffect } from 'react';

const DEFAULT_TINT = '#6366F1';

/**
 * Tints the app-wide liquid background for the current page. Rendered once in App,
 * so pages call this hook instead of mounting their own (the blurred blobs are costly).
 */
export function useBgTint(color) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-tint', color || DEFAULT_TINT);
    return () => root.style.setProperty('--bg-tint', DEFAULT_TINT);
  }, [color]);
}

/** Slowly morphing colour blobs behind the glass panels. Mount once, at the app root. */
export default function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070A12]">
      <div
        className="liquid-blob -left-24 -top-24 h-[55vmax] w-[55vmax]"
        style={{ background: `var(--bg-tint, ${DEFAULT_TINT})`, transition: 'background 0.8s ease' }}
      />
      <div className="liquid-blob -right-32 top-1/4 h-[45vmax] w-[45vmax] bg-fuchsia-600" style={{ animationDelay: '-6s', animationDuration: '22s' }} />
      <div className="liquid-blob -bottom-40 left-1/4 h-[50vmax] w-[50vmax] bg-cyan-500" style={{ animationDelay: '-12s', animationDuration: '26s', opacity: 0.4 }} />
      {/* Fine grain keeps the blur from banding. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:3px_3px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
    </div>
  );
}
