// The visual half of a lesson slide (redesigned 2026-11-23).
//
// Every word drawn here is lesson text, chosen by the exporter
// (scripts/export-content-lib.mjs deriveLessonSlides): the deck's own section
// headings (roadmap), a section's LayerStack names (layers), the two sides a
// "X vs Y" heading names (compare), the lesson cheat-sheet rows the section
// teaches (terms), or the section's own inline code (keywords). A slide with
// nothing to draw ("text") renders no visual at all — never a placeholder
// shape that says nothing.
//
// Plain HTML (not SVG) so text wraps and stays readable at phone width.

import React from 'react';
import RichText from '../RichText';

/** Short code-like terms (brackets, operators, dots, underscores) are set in mono. */
const looksLikeCode = (s) => /[()[\]{}=<>_.\/#$:;"'`*+|&]/.test(String(s)) && String(s).split(/\s+/).length <= 4;

function Roadmap({ labels, current }) {
  if (!labels.length) return null;
  return (
    <ol className="grid gap-2 sm:grid-cols-2" aria-label="What this lesson covers">
      {labels.map((label, i) => (
        <li
          key={label}
          className={`flex items-center gap-3 rounded-control border bg-white/80 px-3 py-2.5 ${
            i + 1 === current ? 'border-action' : 'border-violet-700/15'
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-action-surface text-small font-bold tabular-nums text-action-surface-ink">
            {i + 1}
          </span>
          <span className="text-small font-semibold leading-snug text-ink-1">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Layers({ labels }) {
  const n = labels.length;
  return (
    <ol className="space-y-1.5" aria-label="Layers, top to bottom">
      {labels.map((label, i) => (
        <li
          key={label}
          className="flex items-center justify-center rounded-control px-3 py-1.5 text-center text-small font-semibold text-action-surface-ink sm:py-2"
          style={{ backgroundColor: `rgba(196, 181, 253, ${(0.4 + (0.6 * (n - i)) / n).toFixed(2)})` }}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

function Compare({ labels }) {
  const [a, b] = labels;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-3">
      <div className="flex items-center justify-center rounded-control bg-action-surface/70 px-3 py-6 text-center text-body font-bold text-action-surface-ink sm:py-8">
        {a}
      </div>
      <span className="flex items-center text-caption font-bold uppercase tracking-wider text-action">vs</span>
      <div className="flex items-center justify-center rounded-control border-2 border-action/40 bg-white px-3 py-6 text-center text-body font-bold text-ink-1 sm:py-8">
        {b}
      </div>
    </div>
  );
}

function Terms({ items }) {
  const cols = items.length >= 3 ? 'sm:grid-cols-3' : items.length === 2 ? 'sm:grid-cols-2' : '';
  return (
    <dl className={`grid gap-2 sm:gap-3 ${cols}`}>
      {items.map(({ term, def }) => (
        <div key={term} className="flex flex-col rounded-control border border-violet-700/15 bg-white/85 p-3 shadow-sm">
          <dt
            className={`text-small font-bold leading-snug text-violet-800 ${looksLikeCode(term) ? 'font-mono' : ''}`}
          >
            {term}
          </dt>
          <dd className="mt-1 text-small leading-snug text-ink-2">
            <RichText text={def} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Keywords({ labels }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Key terms in this section">
      {labels.map((label) => (
        <li
          key={label}
          className="rounded-full border border-violet-700/20 bg-white/85 px-3 py-1.5 font-mono text-small font-semibold text-violet-800"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

/** True when the slide has a visual to show (the carousel lays out a text-only slide differently). */
export function hasVisual(diagram) {
  const t = diagram?.template;
  if (t === 'terms') return Array.isArray(diagram.items) && diagram.items.length > 0;
  if (t === 'compare') return Array.isArray(diagram.labels) && diagram.labels.length === 2;
  if (t === 'roadmap' || t === 'layers' || t === 'keywords') return (diagram.labels || []).length > 0;
  return false;
}

export default function SlideDiagram({ diagram, current = 0 }) {
  if (!hasVisual(diagram)) return null;
  const labels = diagram.labels || [];
  switch (diagram.template) {
    case 'roadmap':
      return <Roadmap labels={labels} current={current} />;
    case 'layers':
      return <Layers labels={labels} />;
    case 'compare':
      return <Compare labels={labels} />;
    case 'terms':
      return <Terms items={diagram.items} />;
    case 'keywords':
      return <Keywords labels={labels} />;
    default:
      return null;
  }
}
