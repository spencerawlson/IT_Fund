import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const STEPS = [
  { count: 1, load: 25, label: 'Low Traffic', note: '1 instance handles the quiet period. CPU usage is low.' },
  { count: 1, load: 78, label: 'Traffic Spikes', note: 'CPU crosses the scale-out threshold (70%). Time to grow.' },
  { count: 2, load: 52, label: 'Scale Out', note: 'The auto-scaler launches a 2nd instance — load is shared.' },
  { count: 3, load: 38, label: 'Scale Out Again', note: 'Still above threshold → a 3rd instance joins the fleet.' },
  { count: 3, load: 22, label: 'Traffic Drops', note: 'Load falls below the scale-in threshold (30%).' },
  { count: 2, load: 30, label: 'Scale In', note: 'An idle instance is terminated to cut cost.' },
];

const MAX = 3;

function loadColor(load) {
  if (load >= 70) return 'bg-red-500';
  if (load >= 50) return 'bg-amber-500';
  return 'bg-green-500';
}

export default function AutoScalingAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2800);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  return (
    <div>
      {/* Stage */}
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] p-5 sm:h-72">
        {/* Load meter */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">CPU LOAD</span>
            <span className="font-bold text-white">{current.load}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={`h-full rounded-full ${loadColor(current.load)}`}
              animate={{ width: `${current.load}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* threshold markers */}
            <div className="absolute top-0 h-full w-px bg-amber-400/60" style={{ left: '30%' }} />
            <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: '70%' }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-400">
            <span>scale-in 30%</span>
            <span>scale-out 70%</span>
          </div>
        </div>

        {/* Instances */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">INSTANCES</span>
            <span className="font-bold text-white">{current.count} running</span>
          </div>
          <div className="flex items-end gap-3">
            <AnimatePresence>
              {Array.from({ length: current.count }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.4, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.4, y: 20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex h-24 w-20 flex-col items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/10"
                >
                  <div className="h-7 w-7 rounded-full border border-green-500/50 bg-green-500/20" />
                  <p className="mt-2 text-[11px] font-bold text-blue-300">Srv {i + 1}</p>
                  <p className="text-[9px] text-green-400">active</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {/* empty slots */}
            {Array.from({ length: MAX - current.count }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex h-24 w-20 items-center justify-center rounded-xl border border-dashed border-white/10"
              >
                <span className="text-[10px] text-slate-500">idle</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      {/* Note */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          {playing && step < STEPS.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < STEPS.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
        >
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto flex gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className="flex h-8 items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/20'}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}