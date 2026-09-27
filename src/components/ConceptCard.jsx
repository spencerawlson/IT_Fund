import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

export default function ConceptCard({ concept }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flip-card h-52 cursor-pointer" onClick={() => setFlipped(!flipped)}>
      <div className={`flip-inner relative h-full w-full ${flipped ? 'flipped' : ''}`}>
        <div className="flip-front absolute inset-0 flex flex-col gap-2 rounded-xl glass p-4">
          <CategoryBadge category={concept.category} />
          <h3 className="text-lg font-bold text-white">{concept.term}</h3>
          <p className="text-sm leading-relaxed text-slate-300">{concept.summary}</p>
          <span className="mt-auto flex items-center gap-1 text-[11px] text-slate-400">
            <RotateCw size={11} /> Tap to flip
          </span>
        </div>
        <div className="flip-back absolute inset-0 flex flex-col gap-2 overflow-y-auto rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.08] to-teal-500/[0.05] p-4">
          <h3 className="text-base font-bold text-blue-300">{concept.term}</h3>
          <p className="text-[13px] leading-relaxed text-slate-200">{concept.detail}</p>
          <span className="mt-auto text-[11px] text-slate-400">Tap to flip back</span>
        </div>
      </div>
    </div>
  );
}