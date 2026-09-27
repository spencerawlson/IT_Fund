import React from 'react';
import { BookOpen } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

/** Summary card for a concept; tapping opens the full study notes. */
export default function ConceptCard({ concept, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="glass glass-hover flex min-h-[13rem] w-full flex-col gap-2 rounded-xl p-4 text-left">
      <CategoryBadge category={concept.category} />
      <h3 className="text-lg font-bold text-white">{concept.term}</h3>
      <p className="text-sm leading-relaxed text-slate-300">{concept.summary}</p>
      <span className="mt-auto flex items-center gap-1 text-[11px] font-semibold text-slate-300">
        <BookOpen size={12} /> Read the full lesson
      </span>
    </button>
  );
}
