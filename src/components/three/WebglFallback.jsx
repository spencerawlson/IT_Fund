import React from 'react';

/**
 * What a 3D viewer shows when WebGL cannot start (no hardware acceleration
 * or no WebGL support). With an image, the matching equipment blueprint
 * sheet stands in for the scene and fills the card (scaled to fit, never
 * cropped), with the notice as one compact line beneath it; without one it
 * is the plain text notice ModelViewer always showed.
 */
export default function WebglFallback({ image, imageAlt }) {
  if (image) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl bg-[#0D1B2A]">
        <img
          src={image}
          alt={imageAlt || 'Equipment blueprint reference'}
          loading="lazy"
          className="min-h-0 w-full flex-1 object-contain"
        />
        <p className="border-t border-white/10 px-3 py-2 text-center text-xs text-white/80">
          <span className="font-semibold text-white">Visual preview unavailable</span>
          {' — '}this lab requires hardware acceleration or WebGL support. Showing the blueprint instead.
        </p>
      </div>
    );
  }
  return (
    <div className="glass-1 absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-auto rounded-xl p-6">
      <div className="text-center text-sm text-ink-3">
        <p className="font-semibold text-ink-1">Visual preview unavailable</p>
        <p className="mt-2">This lab requires hardware acceleration or WebGL support.</p>
      </div>
    </div>
  );
}
