// Swipeable per-lesson slide carousel (2026-11-23; redesigned the same day).
//
// One shared carousel used everywhere a lesson is read (the academy lesson
// view and the guided lesson intro). Each slide pairs a visual drawn from the
// lesson's own text (SlideDiagram: roadmap, layers, comparison, cheat-sheet
// terms, key code terms) with a caption that IS lesson text — a paragraph from
// that lesson's body, derived in scripts/export-content-lib.mjs and carried
// inside the lesson object, so the existing lesson gating applies: premium
// decks only render where the lesson body itself renders.
//
// Layout: every slide is rendered into the SAME grid cell and only the
// current one is visible, so the box is always as tall as the tallest slide —
// the controls never jump while paging. Hidden slides are aria-hidden + inert.
// Mobile-first: touch swipe (50px threshold), labelled prev/next, a segmented
// progress bar that doubles as slide buttons, keyboard arrows, no horizontal
// page scroll, and a short fade that respects prefers-reduced-motion.

import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import RichText from '../RichText';
import SlideDiagram, { hasVisual } from './SlideDiagram';

const SWIPE_THRESHOLD_PX = 50;
const pad2 = (n) => String(n).padStart(2, '0');

function Slide({ slide, index, count, active }) {
  const visual = hasVisual(slide.diagram);
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of ${count}: ${slide.title}`}
      aria-hidden={active ? undefined : true}
      inert={active ? undefined : ''}
      className={`col-start-1 row-start-1 flex flex-col transition-opacity duration-300 motion-reduce:transition-none ${
        active ? 'opacity-100' : 'invisible opacity-0'
      }`}
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-small font-bold tabular-nums text-action" aria-hidden="true">
          {pad2(index + 1)}
        </span>
        <h3 className="text-heading text-ink-1">{slide.title}</h3>
      </div>
      {visual && (
        <div className="mt-4">
          <SlideDiagram diagram={slide.diagram} current={index} />
        </div>
      )}
      <p
        className={`max-w-reading text-ink-1 ${
          visual ? 'mt-4 text-body' : 'mt-4 border-l-4 border-action-surface pl-4 text-body sm:text-lg sm:leading-relaxed'
        }`}
      >
        <RichText text={slide.caption} />
      </p>
    </div>
  );
}

export default function LessonSlideCarousel({ slides, id }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = Array.isArray(slides) ? slides.length : 0;
  const goTo = useCallback(
    (next) => setIndex((current) => Math.min(Math.max(next, 0), count - 1)),
    [count],
  );
  if (count === 0) return null;

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

  const navBtn =
    'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border border-violet-700/20 bg-white px-3 text-small font-semibold text-ink-1 transition hover:border-violet-700/40 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

  return (
    <section
      id={id}
      role="region"
      aria-roledescription="carousel"
      aria-label="Lesson slides"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="glass-1 scroll-mt-28 overflow-hidden rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
    >
      <header className="flex items-center justify-between gap-3 border-b border-violet-700/10 px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-2">
          <Presentation size={15} className="text-action" aria-hidden="true" />
          Slides
        </p>
        <p className="text-small tabular-nums text-ink-2" aria-live="polite">
          Slide {index + 1} of {count}
        </p>
      </header>

      <div className="bg-gradient-to-b from-violet-50/80 to-white/40 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid">
          {slides.map((slide, i) => (
            <Slide key={`${slide.title}-${i}`} slide={slide} index={i} count={count} active={i === index} />
          ))}
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-violet-700/10 px-4 py-3 sm:px-5">
        <button
          type="button"
          aria-label="Previous slide"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className={navBtn}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex flex-1 items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={`${s.title}-${i}`}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="group flex h-11 flex-1 items-center"
            >
              <span
                className={`block h-1.5 w-full rounded-full transition-colors ${
                  i === index ? 'bg-action' : i < index ? 'bg-action/40' : 'bg-black/10 group-hover:bg-black/20'
                }`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next slide"
          disabled={index === count - 1}
          onClick={() => goTo(index + 1)}
          className={navBtn}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
