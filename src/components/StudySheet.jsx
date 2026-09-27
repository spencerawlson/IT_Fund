import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb, Target } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import RichText from './academy/RichText';
import TutorAssist from './academy/tutor/TutorAssist';
import { getNote } from '@/data/moduleNotes';

/** Full study notes for one concept, with prev/next through the module. */
export default function StudySheet({ concepts, index, moduleTitle, color, onClose, onNavigate }) {
  const concept = concepts[index];
  const note = getNote(concept);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < concepts.length - 1) onNavigate(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, concepts.length, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <article
        role="dialog"
        aria-modal="true"
        aria-label={concept.term}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong animate-rise flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {moduleTitle} · {index + 1} / {concepts.length}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-white sm:text-2xl">{concept.term}</h2>
            <div className="mt-2">
              <CategoryBadge category={concept.category} />
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </header>

        <div key={concept.id} className="animate-rise flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="text-base font-semibold leading-relaxed text-white">{concept.summary}</p>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-200">
            {note.body.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>
                <RichText text={para} />
              </p>
            ))}
          </div>
          {note.example && (
            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: `${color}55`, background: `${color}14` }}>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
                <Target size={13} /> Real-world example
              </p>
              <p className="text-sm leading-relaxed text-slate-100">
                <RichText text={note.example} />
              </p>
            </div>
          )}
          {note.tip && (
            <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] p-4">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
                <Lightbulb size={13} /> Exam tip
              </p>
              <p className="text-sm leading-relaxed text-slate-100">
                <RichText text={note.tip} />
              </p>
            </div>
          )}
          <TutorAssist
            key={concept.id}
            actions={[{ mode: 'simplify', label: 'Explain simply' }, { mode: 'example', label: 'Another example' }]}
            context={{ track: moduleTitle, topic: concept.term, question: concept.term, answer: concept.summary, explanation: note.body.slice(0, 780) }}
            className="mt-5"
          />
        </div>

        <footer className="flex gap-2 border-t border-white/10 px-5 py-3 pb-safe sm:px-7">
          <button
            type="button"
            onClick={() => onNavigate(index - 1)}
            disabled={index === 0}
            className="inline-flex items-center gap-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-35"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button
            type="button"
            onClick={() => (index < concepts.length - 1 ? onNavigate(index + 1) : onClose())}
            className="glass-btn inline-flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 text-sm font-bold"
            style={{ '--tint': color }}
          >
            {index < concepts.length - 1 ? (
              <>
                Next: <span className="max-w-[45vw] truncate">{concepts[index + 1].term}</span> <ChevronRight size={16} />
              </>
            ) : (
              'Done'
            )}
          </button>
        </footer>
      </article>
    </div>
  );
}
