// The visual half of a lesson slide (redesigned 2026-11-23 after Spencer's
// slide concept — layout only; colours are the site's own tokens, mapped in
// index.css `.slide-deck`).
//
// Every word drawn here is lesson text, chosen by the exporter
// (scripts/export-content-lib.mjs deriveLessonSlides) — a template is used
// only when structured lesson data supports it:
//   roadmap  -> process flow: the lesson's own sections, in order
//   layers   -> layered architecture: a section's LayerStack names
//   compare  -> comparison: the two sides an "X vs Y" heading names
//   terms    -> term cards: the cheat-sheet rows the section teaches
//   keywords -> code panel: the section's own inline code terms
//   text     -> no visual; the carousel gives the caption the stage
// There is no network-topology template on purpose: no lesson carries
// structured topology data, and a decorative network would say nothing.
//
// Plain HTML (not SVG) so text wraps and stays readable at phone width.

import React from 'react';
import RichText from '../RichText';

/** Short code-like terms (brackets, operators, dots, underscores) are set in mono. */
const looksLikeCode = (s) => /[()[\]{}=<>_./\\#$:;"'`*+|&]/.test(String(s)) && String(s).split(/\s+/).length <= 4;
const pad2 = (n) => String(n).padStart(2, '0');

function Flow({ labels }) {
  if (!labels.length) return null;
  return (
    <ol
      aria-label="What this lesson covers, in order"
      className="grid gap-2 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))] sm:gap-3"
      style={{ '--n': labels.length }}
    >
      {labels.map((label, i) => (
        <li
          key={label}
          className="relative flex items-center gap-3 rounded-xl border border-[var(--sd-border)] bg-[var(--sd-panel)] px-4 py-3 sm:min-h-[132px] sm:flex-col sm:items-start sm:justify-between sm:py-4"
        >
          <span className="font-mono text-small font-bold tabular-nums text-[var(--sd-accent)]">{pad2(i + 1)}</span>
          <span className="text-small font-semibold leading-snug text-[var(--sd-text)]">{label}</span>
          {i < labels.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute -right-[11px] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--sd-accent-line)] bg-[var(--sd-stage-to)] text-[11px] text-[var(--sd-accent)] sm:flex"
            >
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Layers({ labels }) {
  const n = labels.length;
  return (
    <ol aria-label="Layers, top to bottom" className="space-y-1.5">
      {labels.map((label, i) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-lg border border-[var(--sd-border)] px-3 py-2"
          style={{ background: `linear-gradient(90deg, rgb(var(--action-rgb) / ${(0.08 + (0.22 * (n - i)) / n).toFixed(2)}), var(--sd-panel))` }}
        >
          <span className="w-6 shrink-0 text-right font-mono text-caption font-bold tabular-nums text-[var(--sd-accent)]" aria-hidden="true">
            {n - i}
          </span>
          <span className="text-small font-semibold text-[var(--sd-text)]">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Compare({ labels }) {
  const [a, b] = labels;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-4">
      {[a, b].map((side, i) => (
        <React.Fragment key={side}>
          {i === 1 && (
            <span className="flex items-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sd-cta)] text-caption font-bold uppercase text-[var(--sd-cta-ink)]">
                vs
              </span>
            </span>
          )}
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-[var(--sd-border)] bg-[var(--sd-panel)] px-3 py-6 text-center text-body font-bold text-[var(--sd-text)]">
            {side}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function Terms({ items }) {
  const cols = items.length >= 3 ? 'sm:grid-cols-3' : items.length === 2 ? 'sm:grid-cols-2' : '';
  return (
    <dl className={`grid gap-2 sm:gap-3 ${cols}`}>
      {items.map(({ term, def }) => (
        <div key={term} className="flex flex-col rounded-xl border border-[var(--sd-border)] bg-[var(--sd-panel)] p-4">
          <dt className={`text-small font-bold leading-snug text-[var(--sd-accent)] ${looksLikeCode(term) ? 'font-mono' : ''}`}>{term}</dt>
          <dd className="mt-1.5 text-small leading-snug text-[var(--sd-muted)]">
            <RichText text={def} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CodePanel({ labels }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-[var(--sd-border)] bg-[var(--sd-panel)]">
      <figcaption className="flex items-center gap-1.5 border-b border-[var(--sd-border)] px-3 py-2 text-caption font-semibold uppercase tracking-wider text-[var(--sd-muted)]">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--sd-accent)]" />
        Key syntax in this section
      </figcaption>
      <ul className="flex flex-wrap gap-2 p-3" aria-label="Key terms in this section">
        {labels.map((label) => (
          <li key={label} className="rounded-md border border-[var(--sd-border)] bg-[var(--sd-panel)] px-2.5 py-1 font-mono text-small text-[var(--sd-text)]">
            {label}
          </li>
        ))}
      </ul>
    </figure>
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

export default function SlideDiagram({ diagram }) {
  if (!hasVisual(diagram)) return null;
  const labels = diagram.labels || [];
  switch (diagram.template) {
    case 'roadmap':
      return <Flow labels={labels} />;
    case 'layers':
      return <Layers labels={labels} />;
    case 'compare':
      return <Compare labels={labels} />;
    case 'terms':
      return <Terms items={diagram.items} />;
    case 'keywords':
      return <CodePanel labels={labels} />;
    default:
      return null;
  }
}
