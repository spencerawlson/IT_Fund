// Swipeable per-lesson slide carousel (2026-11-23).
//
// One shared carousel used everywhere a lesson is read (the academy lesson
// view and the guided lesson intro). Each slide is a vector diagram from the
// kit (SlideDiagram) plus a caption that IS lesson text — a paragraph from
// that lesson's own body, derived in scripts/export-content-lib.mjs and
// carried inside the lesson object, so the existing lesson gating applies:
// premium decks only render where the lesson body itself renders.
//
// Mobile-first: touch swipe (50px threshold) + arrows + dots + keyboard,
// accessible labels, a fixed 16:9 diagram area so the slide never shifts
// layout, and no horizontal page scroll.

import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import RichText from '../RichText';
import SlideDiagram from './SlideDiagram';

const SWIPE_THRESHOLD_PX = 50;

export default function LessonSlideCarousel({ slides, id }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = Array.isArray(slides) ? slides.length : 0;
  const goTo = useCallback(
    (next) => setIndex((current) => Math.min(Math.max(next, 0), count - 1)),
    [count],
  );
  if (count === 0) return null;
  const slide = slides[index];

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    }
  };
  const onTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const dx = (event.changedTouches[0]?.clientX ?? start) - start;
    if (dx <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (dx >= SWIPE_THRESHOLD_PX) goTo(index - 1);
  };

  return (
    <div
      id={id}
      role="region"
      aria-roledescription="carousel"
      aria-label="Lesson slides"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="glass-1 scroll-mt-28 rounded-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Slides</p>
        <p className="text-small tabular-nums text-ink-2" aria-live="polite">
          Slide {index + 1} of {slides.length}
        </p>
      </div>
      <div
        key={index}
        role="group"
        aria-roledescription="slide"
        aria-label={`Slide ${index + 1} of ${slides.length}: ${slide.title}`}
      >
        <div className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-control">
          <SlideDiagram diagram={slide.diagram} title={slide.title} />
        </div>
        <h3 className="mt-4 text-heading text-ink-1">{slide.title}</h3>
        <p className="mt-2 max-w-reading text-body text-ink-1">
          <RichText text={slide.caption} />
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous slide"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-violet-700/20 bg-white text-ink-1 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={`${s.title}-${i}`}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === index ? 'bg-action' : 'bg-black/15 hover:bg-black/30'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next slide"
          disabled={index === slides.length - 1}
          onClick={() => goTo(index + 1)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-violet-700/20 bg-white text-ink-1 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
