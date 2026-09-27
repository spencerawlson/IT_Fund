import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const STAGES = [
  { left: 10, label: 'COMMIT', sub: 'Git push', note: 'A developer commits code and pushes to the repo. The pipeline triggers automatically on every push.' },
  { left: 30, label: 'BUILD', sub: 'Compile & package', note: 'Source is compiled and packaged into an artifact — often a container image. A build failure stops the pipeline.' },
  { left: 50, label: 'TEST', sub: 'Automated tests', note: 'Unit, integration, and security tests run. Any failure halts promotion — bugs never reach production.' },
  { left: 70, label: 'DEPLOY', sub: 'To staging', note: 'The artifact is deployed to a staging environment for final verification before release.' },
  { left: 88, label: 'RELEASE', sub: 'To production', note: 'Promoted to production with monitoring and easy rollback if something goes wrong.' },
];

export default function CICDAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= STAGES.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2600);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STAGES[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  return (
    <div>
      {/* Stage */}
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        {/* Track line */}
        <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {/* Stage boxes */}
        {STAGES.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div
              key={i}
              className={`absolute top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-2 text-center transition-colors ${
                isActive
                  ? 'border-green-500/60 bg-green-500/15 shadow-lg shadow-green-500/20'
                  : isDone
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-white/10 bg-white/[0.06]'
              }`}
              style={{ left: `${s.left}%` }}
            >
              <p className={`text-[11px] font-bold ${isActive ? 'text-green-300' : isDone ? 'text-blue-300' : 'text-slate-400'}`}>{s.label}</p>
              <p className="text-[9px] text-slate-400">{s.sub}</p>
            </div>
          );
        })}

        {/* Moving commit packet */}
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-[140%]"
          animate={{ left: `${current.left}%` }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 shadow-lg">
            <span className="text-xs font-bold text-amber-300">v{step + 1}.0</span>
          </div>
        </motion.div>

        {/* Step indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Stage {step + 1} / {STAGES.length}
        </div>
      </div>

      {/* Note */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}: {current.sub}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          {playing && step < STAGES.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < STAGES.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
        >
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto flex gap-1.5">
          {STAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className="flex h-8 items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-400' : 'w-1.5 bg-white/20'}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}