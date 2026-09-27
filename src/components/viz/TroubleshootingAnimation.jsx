import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, Search, ShieldAlert, Gauge, Wrench } from 'lucide-react';

const STEPS = [
  { label: 'Symptom', badge: 'Alert', note: 'You see an alert or user report: latency is high or a feature is broken.', icon: Search },
  { label: 'Reproduce', badge: 'Test', note: 'Reproduce the issue in a controlled way. Keep the blast radius small and the experiment isolated.', icon: Search },
  { label: 'Isolate Layer', badge: 'Diagnose', note: 'Ask: is this app code, config, dependency, data, networking, or platform? Use logs, metrics, and traces to localize.', icon: ShieldAlert },
  { label: 'Mitigate', badge: 'Fix now', note: 'Rollback, throttle, flag off, or route around. Restore service first while you continue investigating.', icon: Wrench },
  { label: 'Root Cause', badge: 'Why', note: 'Find the underlying cause, not just the symptom. Use the 5 Whys or a timeline to avoid stopping too early.', icon: Search },
  { label: 'Remediate', badge: 'Fix', note: 'Apply a permanent fix with tests, runbook updates, and automation. Update monitoring so this returns faster next time.', icon: Gauge },
];

const STAGES = ['Alert', 'Reproduce', 'Diagnose', 'Mitigate', 'Root Cause', 'Remediate'].map((label, i) => ({ label, x: 8 + i * 17, y: 50 }));

export default function TroubleshootingAnimation() {
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
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/80">
            {current.badge}
          </span>
        </div>

        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          <line x1="8%" y1="50%" x2="93%" y2="50%" stroke="#ffffff12" strokeWidth="1" strokeDasharray="2 3" />
          {STAGES.slice(0, step + 1).map((s, idx) => {
            const prev = idx > 0 ? STAGES[idx - 1] : null;
            const isActive = idx === step;
            return (
              <g key={s.label}>
                {prev && (
                  <line x1={`${prev.x}%`} y1="50%" x2={`${s.x}%`} y2="50%" stroke={isActive ? '#f43f5e' : '#ffffff12'} strokeWidth="1" />
                )}
                <circle cx={`${s.x}%`} cy="50%" r={isActive ? '1.6' : '1.1'} fill={isActive ? '#f43f5e' : '#ffffff22'} />
                {isActive && (
                  <circle cx={`${s.x}%`} cy="50%" r="1.6" fill="#f43f5e" opacity="0">
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
                <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border ${isCurrent ? 'border-rose-300 bg-rose-500/20 shadow-lg shadow-rose-500/20' : active ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                  <current.icon size={12} className={isCurrent ? 'text-rose-200' : active ? 'text-slate-200' : 'text-slate-400'} />
                </div>
                <div className={`text-[9px] leading-tight ${isCurrent ? 'text-rose-200' : active ? 'text-slate-200' : 'text-slate-400'}`}>{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="absolute left-1/2 top-[14px] -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
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
            <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="flex h-8 items-center px-0.5"><span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-rose-400' : 'w-1.5 bg-white/20'}`} /></button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1"><HelpCircle size={10}/> Symptom → reproduce → isolate</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">Mitigate first, then root cause</span>
      </div>
    </div>
  );
}
