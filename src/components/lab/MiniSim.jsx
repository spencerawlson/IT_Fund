import React from 'react';

const chipBase = 'rounded-md border border-white/10 bg-white/[0.03] px-2 py-1';
const accentMap = {
  white: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-slate-300', title: 'text-white' },
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-200', title: 'text-blue-200' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-100', title: 'text-rose-200' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-100', title: 'text-amber-200' },
  teal: { border: 'border-teal-500/30', bg: 'bg-teal-500/10', text: 'text-teal-200', title: 'text-teal-200' },
};

export default function MiniSim({ title, steps, tags, accent }) {
  const titleAccent = accentMap[accent] ?? accentMap.white;
  const colKey = steps.length === 4 ? 'sm:grid-cols-4' : steps.length >= 5 ? 'sm:grid-cols-2' : 'sm:grid-cols-2';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      {title ? <div className={`mb-3 text-xs font-bold ${titleAccent.title}`}>{title}</div> : null}
      <div className={`grid grid-cols-1 gap-3 ${colKey}`}>
        {steps.map((step) => {
          const a = accentMap[step.accent] ?? accentMap.white;
          return (
            <div key={step.title} className={`${a.border} rounded-lg ${a.bg} p-3 text-xs ${a.text}`}>
              <div className={`font-bold ${a.title}`}>{step.title}</div>
              <div className="mt-1 leading-relaxed opacity-90">{step.body}</div>
            </div>
          );
        })}
      </div>
      {tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
          {tags.map((tag) => (
            <span key={tag} className={chipBase}>{tag}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
