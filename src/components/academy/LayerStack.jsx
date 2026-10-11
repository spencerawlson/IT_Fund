import React from 'react';
import RichText from '@/components/academy/RichText';

// Tones 1–7 run cool at the wire (1) to warm at the top of a stack (7). OSI layer n uses tone n,
// so other models can borrow the same colours where they map onto OSI layers.
export const TONES = {
  1: '#38bdf8', 2: '#4ade80', 3: '#facc15', 4: '#fb923c', 5: '#fb7185', 6: '#f472b6', 7: '#c084fc',
};

/** Spreads tones across a stack, first item warmest, unless an item names its own. */
const toneOf = (item, i, count) => item.tone ?? (count === 1 ? 4 : Math.round(7 - (i * 6) / (count - 1)));

/**
 * A colour-coded, column-aligned stack: protocol layers, process steps or maturity levels,
 * listed in reading order. See the LessonStack typedef in data/catalog/schema.js.
 */
export default function LayerStack({ stack }) {
  const { items, title, mnemonic } = stack;
  const hasTag = items.some((it) => it.tag);
  const cols = hasTag ? 'sm:grid-cols-[3rem_9rem_9.5rem_1fr]' : 'sm:grid-cols-[3rem_12rem_1fr]';
  const rows = items.map((it, i) => ({ ...it, color: TONES[toneOf(it, i, items.length)] }));
  const words = mnemonic && rows.every((r) => r.word) && (mnemonic.fromBottom ? [...rows].reverse() : rows);

  return (
    <figure className="space-y-5 pt-1">
      {title && <figcaption className="text-small font-semibold text-ink-2">{title}</figcaption>}
      <ol className="overflow-hidden rounded-control border border-white/10" aria-label={title}>
        {rows.map((r) => (
          <li
            key={r.name}
            className={`grid grid-cols-[3rem_1fr] items-start gap-x-4 gap-y-1 border-b border-white/[0.06] px-4 py-3 last:border-b-0 ${cols}`}
            style={{ background: `${r.color}14`, boxShadow: `inset 4px 0 0 ${r.color}` }}
          >
            <span
              className={`flex h-9 w-12 items-center justify-center rounded-md font-mono text-small font-bold ${hasTag ? 'row-span-2' : ''} sm:row-span-1`}
              style={{ background: `${r.color}26`, color: r.color, border: `1px solid ${r.color}55` }}
            >
              {r.badge}
            </span>
            <span className="font-semibold text-ink-1 sm:pt-1.5">{r.name}</span>
            {hasTag && (
              <span className="text-small text-ink-2 sm:pt-2">
                {r.tag && (
                  <span className="inline-block rounded-full px-2 py-0.5 font-mono text-[0.75rem]" style={{ color: r.color, border: `1px solid ${r.color}44` }}>
                    {r.tag}
                  </span>
                )}
              </span>
            )}
            <span className="col-start-2 text-small text-ink-2 sm:col-start-auto sm:pt-1.5">
              <RichText text={r.does} />
              {r.examples && <span className="text-ink-3"> · {r.examples}</span>}
            </span>
          </li>
        ))}
      </ol>
      {words && (
        <div className="max-w-reading">
          <p className="text-lesson text-ink-1">{mnemonic.lead}</p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-lesson font-semibold">
            {words.map((r) => (
              <span key={r.name} className="flex flex-col items-center leading-tight">
                <span>
                  <span style={{ color: r.color }}>{r.word[0]}</span>
                  <span className="text-ink-1">{r.word.slice(1)}</span>
                </span>
                <span className="mt-1 text-[0.7rem] font-normal text-ink-3">{r.name}</span>
              </span>
            ))}
          </p>
        </div>
      )}
    </figure>
  );
}
