// Lesson slide deck (2026-11-23; restyled the same day to Spencer's
// slide concept, r2c-slide-redesign.html — layout only; the colours stay
// the site's own violet/ink tokens, as Spencer asked).
//
// One shared deck used everywhere a lesson is presented as slides (the
// academy lesson view's Slides mode and the guided lesson intro). Each slide
// pairs a visual drawn from the lesson's own text (SlideDiagram) with a
// caption that IS lesson text — derived in scripts/export-content-lib.mjs and
// carried inside the lesson object, so the existing lesson gating applies:
// premium decks only render where the lesson body itself renders. Nothing
// here is demo copy.
//
// Layout: a presentation stage plus a lesson outline. By default the stage
// comes first (outline beside it on wide screens, below it on phones), with
// the Cypher "Explain this slide" block divided off under the outline in the
// same panel. `outlineFirst` flips that order — the outline renders first
// (left on wide screens, above the stage on phones), the slide card sits
// directly under it, and the Explain card follows the slide as its own
// panel — used by the lesson view's Slides mode (Spencer, 2026-11-26: the
// outline belongs before the lesson, the slide under it, the tutor after
// the slide). The stage is ADAPTIVE: only the slide on screen is in the
// layout flow (the rest are display:none), so the stage fits the current
// slide instead of the tallest slide in the deck — a short slide no longer
// shows the tallest slide's empty space underneath. The outline column is
// top-aligned for the same reason. The slide on screen fades in (300ms,
// disabled under prefers-reduced-motion). Hidden slides stay in the DOM,
// aria-hidden + inert. Keyboard arrows, touch swipe (50px), labelled
// Previous/Next (44px targets), a segmented progress bar, and a short fade
// that respects prefers-reduced-motion. Colours: .slide-deck (index.css)
// maps onto the site's own tokens, so light and dark themes both apply.
//
// `renderExplain(slide, { standalone })` is an optional integration point
// for the Cypher tutor ("Explain this slide"); the deck renders nothing for
// it by itself. `standalone` is true when the explain block renders as its
// own card under the slide (outline-first mode) instead of a divided
// section under the outline in the same panel.

import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      className={`col-start-1 row-start-1 ${active ? 'sd-slide-active flex flex-col' : 'hidden'}`}
    >
      <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-[var(--sd-text)] sm:text-[2rem]">
        {slide.title}
      </h3>
      {visual && (
        <div className="mt-5">
          <SlideDiagram diagram={slide.diagram} />
        </div>
      )}
      <div
        className={`rounded-r-xl border-l-4 border-[var(--sd-accent)] bg-[var(--sd-panel-2)] px-4 py-3.5 text-[var(--sd-text)] sm:px-5 ${
          visual ? 'mt-5 text-body leading-relaxed' : 'mt-6 text-body leading-relaxed sm:text-lg'
        }`}
      >
        <RichText text={slide.caption} />
      </div>
    </div>
  );
}

function Outline({ slides, index, goTo }) {
  const pct = ((index + 1) / slides.length) * 100;
  return (
    <nav aria-label="Lesson outline">
      <p className="text-caption font-bold uppercase tracking-[0.14em] text-[var(--sd-muted)]">Lesson outline</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--sd-border)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[var(--sd-accent)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 space-y-1">
        {slides.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <button
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => goTo(i)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-small transition-colors ${
                i === index
                  ? 'border-[var(--sd-accent-line)] bg-[var(--sd-accent-soft)] font-semibold text-[var(--sd-text)]'
                  : 'border-transparent text-[var(--sd-muted)] hover:bg-[var(--sd-panel)] hover:text-[var(--sd-text)]'
              }`}
            >
              <span className="font-mono text-caption font-bold tabular-nums text-[var(--sd-accent)]">{pad2(i + 1)}</span>
              <span className="leading-snug">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function LessonSlideCarousel({ slides, id, eyebrow = 'Lesson slides', renderExplain, outlineFirst = false }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = Array.isArray(slides) ? slides.length : 0;
  const goTo = useCallback(
    (next) => setIndex((current) => Math.min(Math.max(next, 0), count - 1)),
    [count],
  );
  if (count === 0) return null;

  const onKeyDown = (event) => {
    if (event.target?.closest?.('input, textarea, select')) return;
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
    'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-4 text-small font-bold transition disabled:cursor-not-allowed disabled:opacity-35';
  const explain = typeof renderExplain === 'function' ? renderExplain(slides[index], { standalone: outlineFirst }) : null;

  // The two columns, in DOM order. `outlineFirst` (Slides mode) puts the
  // outline before the stage — first in the DOM, first visually, first in
  // tab order — on every viewport, with the Explain card directly under the
  // slide in the same column; the guided intro keeps the default
  // stage-first order (outline + explain together in the second column).
  // On wide screens the outline stays the narrow 17rem column, so only its
  // side changes, never its size.
  const stage = (
    <div key="stage" className="sd-stage flex min-w-0 flex-col rounded-2xl border border-[var(--sd-border)] p-4 shadow-sm sm:p-7">
      <header className="flex items-center justify-between gap-3 text-caption">
        <p className="truncate font-bold uppercase tracking-[0.14em] text-[var(--sd-accent)]">{eyebrow}</p>
        <p className="shrink-0 font-mono tabular-nums text-[var(--sd-muted)]" aria-live="polite">
          <span className="sr-only">Slide {index + 1} of {count}</span>
          <span aria-hidden="true">{pad2(index + 1)} / {pad2(count)}</span>
        </p>
      </header>

      <div className="mt-5 grid sm:mt-6">
        {slides.map((slide, i) => (
          <Slide key={`${slide.title}-${i}`} slide={slide} index={i} count={count} active={i === index} />
        ))}
      </div>

      <footer className="mt-6 flex items-center gap-3 border-t border-[var(--sd-border)] pt-4 sm:mt-8">
        <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
          {slides.map((s, i) => (
            <span
              key={`${s.title}-${i}`}
              className={`block h-1.5 flex-1 rounded-full transition-colors ${
                i === index ? 'bg-[var(--sd-accent)]' : i < index ? 'bg-[var(--sd-accent-line)]' : 'bg-[var(--sd-border)]'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Previous slide"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className={`${navBtn} border-[var(--sd-border)] bg-[var(--sd-panel)] text-[var(--sd-text)] hover:border-[var(--sd-muted)]`}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          disabled={index === count - 1}
          onClick={() => goTo(index + 1)}
          className={`${navBtn} border-transparent bg-[var(--sd-cta)] text-[var(--sd-cta-ink)] hover:brightness-105`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
  const outlinePanel = (
    <aside key="outline" className="flex flex-col gap-3 rounded-2xl border border-[var(--sd-border)] bg-[var(--sd-panel)] p-4">
      <Outline slides={slides} index={index} goTo={goTo} />
      {!outlineFirst && explain}
    </aside>
  );
  // Outline-first (Slides mode): outline panel, then the slide card with
  // the Explain card directly under it — the tutor follows the slide it
  // explains, in the same column. Default: stage first, outline panel
  // (outline + explain) second, as before.
  const columns = outlineFirst
    ? [outlinePanel, <div key="main" className="flex min-w-0 flex-col gap-3">{stage}{explain}</div>]
    : [stage, outlinePanel];

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
      className="slide-deck scroll-mt-28 overflow-hidden rounded-card p-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-action sm:p-3"
    >
      <div className={`grid items-start gap-3 ${outlineFirst ? 'lg:grid-cols-[17rem_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_17rem]'}`}>
        {columns}
      </div>
    </section>
  );
}
