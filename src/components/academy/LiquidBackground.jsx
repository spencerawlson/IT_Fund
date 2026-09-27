import React from 'react';

/** Slowly morphing colour blobs behind the glass panels. `tint` biases one blob toward the track colour. */
export default function LiquidBackground({ tint = '#6366F1' }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070A12]">
      <div className="liquid-blob -left-24 -top-24 h-[55vmax] w-[55vmax]" style={{ background: tint }} />
      <div className="liquid-blob -right-32 top-1/4 h-[45vmax] w-[45vmax] bg-fuchsia-600" style={{ animationDelay: '-6s', animationDuration: '22s' }} />
      <div className="liquid-blob -bottom-40 left-1/4 h-[50vmax] w-[50vmax] bg-cyan-500" style={{ animationDelay: '-12s', animationDuration: '26s', opacity: 0.4 }} />
      {/* Fine grain keeps the blur from banding. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:3px_3px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
    </div>
  );
}
