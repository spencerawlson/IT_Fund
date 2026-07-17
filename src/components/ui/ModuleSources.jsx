import React from 'react';
import { getSourcesForModule } from '@/data/courseKnowledgeMap';

export default function ModuleSources({ moduleId }) {
  const sources = getSourcesForModule(moduleId);
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
      <span className="text-slate-500">Source:</span>
      {sources.map((s) => (
        <span key={s.source} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1">
          <span className="text-white/70">{s.source}</span>
          <span className="text-slate-500">{s.pages}p</span>
        </span>
      ))}
    </div>
  );
}
