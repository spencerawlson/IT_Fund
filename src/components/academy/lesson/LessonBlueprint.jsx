import React from 'react';

/**
 * One equipment blueprint sheet inside a lesson's Architecture section.
 * The sheets are full-page technical drawings (1206 px wide), so they load
 * lazily and scale to the reading column without breaking mobile widths.
 */
export default function LessonBlueprint({ src, alt, caption }) {
  return (
    <figure className="mt-6">
      <img src={src} alt={alt} loading="lazy" className="h-auto w-full rounded-control border border-black/10" />
      {caption && <figcaption className="mt-3 text-small text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
