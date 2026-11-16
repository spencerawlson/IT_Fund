import React from 'react';

/**
 * One equipment blueprint sheet inside a lesson's Architecture section.
 * The sheets are full-page technical drawings, so they load lazily and scale
 * to fit the card: full column width, never taller than ~80% of the screen,
 * never cropped (object-contain on the sheet's dark navy).
 */
export default function LessonBlueprint({ src, alt, caption }) {
  return (
    <figure className="mt-6">
      <div className="overflow-hidden rounded-control border border-black/10 bg-[#0D1B2A]">
        <img src={src} alt={alt} loading="lazy" className="mx-auto block h-auto max-h-[80vh] w-full object-contain" />
      </div>
      {caption && <figcaption className="mt-3 text-small text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
