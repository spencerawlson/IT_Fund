import React from 'react';
import RichText from '@/components/academy/RichText';
import { LessonVisual } from './visuals';

// Structured reading blocks for lesson sections (see LessonPart in data/catalog/schema.js).
// Every string is rendered as text through RichText, never as HTML.

/** A learn section: lead paragraphs, then optional visual, table, key points and callout. */
export function LessonPart({ part, index }) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-baseline gap-3 text-heading text-ink-1">
        <span aria-hidden="true" className="w-6 shrink-0 font-mono text-small font-semibold tabular-nums text-ink-3">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span>{part.heading}</span>
      </h3>
      <div className="space-y-4 sm:pl-9">
        {part.body.map((p) => <Para key={p} text={p} />)}
        {part.visual && <LessonVisual id={part.visual} />}
        {part.table && <LessonTable {...part.table} />}
        {part.points?.length > 0 && <KeyPoints points={part.points} />}
        {part.note && <Callout {...part.note} />}
      </div>
    </div>
  );
}

export const Para = ({ text }) => (
  <p className="max-w-reading text-lesson text-ink-1">
    <RichText text={text} />
  </p>
);

/**
 * Aligned comparison table. The first column reads as the row label. On phones each row becomes
 * a small card (label, then "Column: value" lines) so no column hides behind a sideways scroll.
 */
export function LessonTable({ columns, rows, caption }) {
  return (
    <figure className="max-w-reading">
      <ul className="divide-y divide-ink-3/15 rounded-control border border-ink-3/20 sm:hidden">
        {rows.map((row) => (
          <li key={row[0]} className="space-y-1.5 px-4 py-3 text-small">
            <p className="font-semibold text-ink-1"><RichText text={row[0]} /></p>
            {row.slice(1).map((cell, i) => (
              <p key={columns[i + 1]} className="text-ink-2">
                <span className="text-caption font-semibold uppercase tracking-wider text-ink-3">{columns[i + 1]}</span>
                <span className="block"><RichText text={cell} /></span>
              </p>
            ))}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-control border border-ink-3/20 sm:block">
        <table className="w-full border-collapse text-left text-small">
          <thead className="bg-ink-1/[0.04]">
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className="px-4 py-2.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-3/15">
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="whitespace-nowrap px-4 py-3 align-top font-semibold text-ink-1">
                      <RichText text={cell} />
                    </th>
                  ) : (
                    <td key={i} className="px-4 py-3 align-top text-ink-2">
                      <RichText text={cell} />
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="mt-2 text-small text-ink-2">{caption}</figcaption>}
    </figure>
  );
}

/** Bulleted key points. A short lead before the first colon ("Design: ...") is set in bold. */
export function KeyPoints({ points }) {
  return (
    <ul className="max-w-reading space-y-2.5">
      {points.map((point) => {
        const cut = point.indexOf(': ');
        const lead = cut > 0 && cut <= 32 ? point.slice(0, cut) : null;
        return (
          <li key={point} className="flex gap-3 text-lesson text-ink-1">
            <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />
            <span>
              {lead && <strong className="font-semibold">{lead}: </strong>}
              <RichText text={lead ? point.slice(cut + 2) : point} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A short aside: an exam tip, a memory aid, a common mistake. */
export function Callout({ label, text }) {
  return (
    <aside className="max-w-reading rounded-control border border-info/20 border-l-4 border-l-info bg-info/[0.05] px-4 py-3">
      <p className="text-caption font-semibold uppercase tracking-wider text-info">{label}</p>
      <p className="mt-1 text-body text-ink-1"><RichText text={text} /></p>
    </aside>
  );
}
