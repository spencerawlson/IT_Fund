import React from 'react';

/**
 * What a 3D viewer shows when WebGL cannot start (no hardware acceleration
 * or no WebGL support). With an image, the matching equipment blueprint
 * sheet stands in for the scene; without one it is the plain text notice
 * ModelViewer always showed.
 */
export default function WebglFallback({ image, imageAlt }) {
  return (
    <div className="glass-1 absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-auto rounded-xl p-6">
      {image && (
        <img
          src={image}
          alt={imageAlt || 'Equipment blueprint reference'}
          loading="lazy"
          className="max-h-[70%] w-auto max-w-full rounded-lg border border-black/10 object-contain"
        />
      )}
      <div className="text-center text-sm text-ink-3">
        <p className="font-semibold text-ink-1">Visual preview unavailable</p>
        <p className="mt-2">This lab requires hardware acceleration or WebGL support.</p>
      </div>
    </div>
  );
}
