import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, RotateCw } from 'lucide-react';
import { gradeCard, cardState, useAcademy, MAX_BOX } from '@/lib/academy';
import RichText from './RichText';

// Cards answered "Again" come back this many cards later in the same session.
const REQUEUE_GAP = 3;

/** Spaced-repetition flashcards. Calls onDone({ known, total }) when the queue is empty. */
export default function FlashDeck({ cards, color = '#3B82F6', onGrade, onDone }) {
  const state = useAcademy();
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [firstTry, setFirstTry] = useState({});
  const current = queue[0];

  const answer = useCallback(
    (known) => {
      if (!current || !flipped) return;
      gradeCard(current.id, known);
      onGrade?.(current, known);
      const tries = { ...firstTry };
      if (!(current.id in tries)) tries[current.id] = known;
      setFirstTry(tries);
      const rest = queue.slice(1);
      if (!known) rest.splice(Math.min(REQUEUE_GAP, rest.length), 0, current);
      setFlipped(false);
      setQueue(rest);
      if (!rest.length) {
        onDone({ known: Object.values(tries).filter(Boolean).length, total: cards.length });
      }
    },
    [current, flipped, firstTry, queue, cards.length, onDone, onGrade]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === '1') answer(false);
      else if (e.key === '2') answer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  if (!current) return null;

  const box = cardState(state, current.id).box;
  const done = cards.length - new Set(queue.map((c) => c.id)).size;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {done} / {cards.length} cleared
        </span>
        <span className="inline-flex items-center gap-1.5">
          Box
          {Array.from({ length: MAX_BOX }, (_, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: i < box ? color : 'rgba(255,255,255,0.12)' }} />
          ))}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${(done / cards.length) * 100}%`, backgroundColor: color }} />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flip-card block h-80 w-full text-left"
        aria-label={flipped ? 'Show question' : 'Reveal answer'}
      >
        <div className={`flip-inner relative h-full w-full ${flipped ? 'flipped' : ''}`}>
          <div className="flip-front absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-7 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Question</p>
            <h3 className="text-xl font-bold leading-snug text-white sm:text-2xl">
              <RichText text={current.q} />
            </h3>
            <p className="inline-flex items-center gap-1 text-xs text-slate-500">
              <RotateCw size={12} /> Tap or press Space to flip
            </p>
          </div>
          <div
            className="flip-back absolute inset-0 flex flex-col justify-center gap-3 overflow-y-auto rounded-2xl border p-7"
            style={{ borderColor: `${color}55`, background: `linear-gradient(135deg, ${color}1f, transparent)` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Answer</p>
            <p className="text-xl font-bold leading-snug text-white">
              <RichText text={current.a} />
            </p>
            {current.x && (
              <p className="text-sm leading-relaxed text-slate-300">
                <RichText text={current.x} />
              </p>
            )}
          </div>
        </div>
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          disabled={!flipped}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-slate-200 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={16} /> Again <kbd className="ml-1 text-[10px] text-slate-500">1</kbd>
        </button>
        <button
          onClick={() => answer(true)}
          disabled={!flipped}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          <Check size={16} /> Got it <kbd className="ml-1 text-[10px] text-white/60">2</kbd>
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Be honest: "Again" brings the card back soon; "Got it" pushes it to a later review day.
      </p>
    </div>
  );
}
