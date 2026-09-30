import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

// Visual gallery for the Visual Lab. Replaces the old single dropdown: subjects are shown as
// premium cards grouped by category, with a kind filter. Selecting a card opens it in the stage.

export const KINDS = {
  '3d': { label: '3D model', dot: 'bg-teal-400', pill: 'border-teal-400/30 bg-teal-400/10 text-teal-300', grad: 'from-teal-500/30 to-cyan-500/10', icon: 'text-teal-300' },
  anim: { label: 'Animated', dot: 'bg-blue-400', pill: 'border-blue-400/30 bg-blue-400/10 text-blue-300', grad: 'from-blue-500/30 to-indigo-500/10', icon: 'text-blue-300' },
  tool: { label: 'Interactive', dot: 'bg-amber-400', pill: 'border-amber-400/30 bg-amber-400/10 text-amber-300', grad: 'from-amber-500/30 to-orange-500/10', icon: 'text-amber-300' },
  flow: { label: 'Walkthrough', dot: 'bg-violet-400', pill: 'border-violet-400/30 bg-violet-400/10 text-violet-300', grad: 'from-violet-500/30 to-fuchsia-500/10', icon: 'text-violet-300' },
};

const FILTERS = [['all', 'All'], ['3d', '3D'], ['anim', 'Animated'], ['tool', 'Interactive'], ['flow', 'Walkthroughs']];

function Tile({ subject, onSelect }) {
  const k = KINDS[subject.kind] || KINDS.anim;
  const Icon = subject.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(subject.id)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${k.grad} opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="relative flex items-center justify-between gap-2">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${k.grad}`}>
          {Icon ? <Icon size={20} className={k.icon} aria-hidden="true" /> : null}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${k.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} /> {k.label}
        </span>
      </div>
      <h3 className="relative mt-3 text-heading text-ink-1">{subject.label}</h3>
      <p className="relative mt-1 text-small leading-relaxed text-ink-2">{subject.blurb}</p>
      <span className="relative mt-3 inline-flex items-center gap-1 text-caption font-semibold text-ink-2 transition group-hover:gap-2 group-hover:text-ink-1">
        Open <ArrowRight size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

export default function LabGallery({ subjects, categories, onSelect }) {
  const [filter, setFilter] = useState('all');

  const shown = useMemo(
    () => (filter === 'all' ? subjects : subjects.filter((s) => s.kind === filter)),
    [subjects, filter],
  );
  const byCategory = useMemo(
    () => categories.map((cat) => [cat, shown.filter((s) => s.category === cat)]).filter(([, list]) => list.length),
    [categories, shown],
  );

  return (
    <div>
      {/* Kind filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3.5 py-1.5 text-small font-semibold transition ${
              filter === id ? 'border-white/25 bg-white/10 text-ink-1' : 'border-white/10 text-ink-2 hover:border-white/20 hover:text-ink-1'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-9">
        {byCategory.map(([cat, list]) => (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <div className="mb-3 flex items-center gap-3">
              <h2 id={`cat-${cat}`} className="text-caption font-semibold uppercase tracking-wider text-ink-2">{cat}</h2>
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-caption text-ink-3">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => <Tile key={s.id} subject={s} onSelect={onSelect} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
