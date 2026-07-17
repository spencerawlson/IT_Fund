import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, GitBranch, GitCommit, GitPullRequest, Tag } from 'lucide-react';

const STEPS = [
  { label: 'Workspace', badge: 'git init', note: 'A Git repository is initialized. Commits are stored locally until you push them to a remote.', icon: GitCommit },
  { label: 'Branch', badge: 'feature branch', note: 'You branch off main to isolate work. Branches enable parallel development without destabilizing the shared history.', icon: GitBranch },
  { label: 'Commit', badge: 'commit', note: 'You create snapshots of work. Each commit has metadata and a parent hash, forming an immutable history chain.', icon: GitCommit },
  { label: 'Push & PR', badge: 'Pull request', note: 'You push the branch and open a pull request for review. CI runs; teammates review logic, tests, and security.', icon: GitPullRequest },
  { label: 'Merge', badge: 'merge', note: 'Merged changes join the main line of development. Rebase creates clean linear history; merge preserves exact branch context.', icon: GitBranch },
  { label: 'Release', badge: 'tag', note: 'You tag the release commit with a version. Deployment, changelog, and artifact promotion follow.', icon: Tag },
];

const STAGES = [
  { label: 'Workspace', x: 10 },
  { label: 'Branch', x: 28 },
  { label: 'Commit', x: 46 },
  { label: 'Push/PR', x: 64 },
  { label: 'Merge', x: 82 },
  { label: 'Release', x: 94 },
];

export default function GitFlowAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2400);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/80">
            {current.badge}
          </span>
        </div>

        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          <line x1="10%" y1="50%" x2="94%" y2="50%" stroke="#ffffff12" strokeWidth="1" strokeDasharray="2 3" />
          {STAGES.slice(0, step + 1).map((s, idx) => {
            const prev = idx > 0 ? STAGES[idx - 1] : null;
            const isActive = idx === step;
            return (
              <g key={s.label}>
                {prev && (
                  <line x1={`${prev.x}%`} y1="50%" x2={`${s.x}%`} y2="50%" stroke={isActive ? '#818cf8' : '#ffffff12'} strokeWidth="1" />
                )}
                <circle cx={`${s.x}%`} cy="50%" r={isActive ? '1.6' : '1.1'} fill={isActive ? '#818cf8' : '#ffffff22'} />
                {isActive && (
                  <circle cx={`${s.x}%`} cy="50%" r="1.6" fill="#818cf8" opacity="0">
                    <animate attributeName="opacity" values="0;0.4;0" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {STAGES.map((s, idx) => {
            const active = idx <= step;
            const isCurrent = idx === step;
            return (
              <div key={s.label} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${s.x}%`, top: '50%' }}>
                <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border ${isCurrent ? 'border-indigo-300 bg-indigo-500/20 shadow-lg shadow-indigo-500/20' : active ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                  <current.icon size={12} className={isCurrent ? 'text-indigo-200' : active ? 'text-slate-200' : 'text-slate-500'} />
                </div>
                <div className={`text-[9px] ${isCurrent ? 'text-indigo-200' : active ? 'text-slate-200' : 'text-slate-500'}`}>{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="absolute left-1/2 top-[14px] -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={toggle} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
          {playing && step < STEPS.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < STEPS.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5">
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto flex gap-1.5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><HelpCircle size={10}/> Workspace → branch → commit</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1">PR/merge/release workflow</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><Tag size={10}/> Versioned releases</span>
      </div>
    </div>
  );
}
