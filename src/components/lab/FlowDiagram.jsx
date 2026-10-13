import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ArrowRight, Check } from 'lucide-react';

// An animated, step-through flow diagram. Replaces the old text-only step cards: a rail of icon
// nodes with a progress line and a traveling pulse, plus a focus card that narrates the active
// step. Data-driven so any "flow" subject (system architecture, cloud migration, capacity planning)
// is just a list of nodes. Keep it visual — this is the Visual Lab, not a wall of words.

const ACCENTS = {
  slate: { ring: 'ring-ink-3/60', text: 'text-ink-1', dot: 'bg-ink-2', line: 'bg-ink-3', glow: 'shadow-[0_0_22px_-2px_rgba(142,142,147,0.7)]', chip: 'border-ink-3/30 bg-ink-3/10 text-ink-1' },
  blue: { ring: 'ring-blue-400/70', text: 'text-blue-700', dot: 'bg-blue-400', line: 'bg-blue-400', glow: 'shadow-[0_0_22px_-2px_rgba(96,165,250,0.8)]', chip: 'border-blue-400/30 bg-blue-400/10 text-blue-700' },
  teal: { ring: 'ring-teal-400/70', text: 'text-teal-700', dot: 'bg-teal-400', line: 'bg-teal-400', glow: 'shadow-[0_0_22px_-2px_rgba(45,212,191,0.8)]', chip: 'border-teal-400/30 bg-teal-400/10 text-teal-700' },
  amber: { ring: 'ring-amber-400/70', text: 'text-amber-700', dot: 'bg-amber-400', line: 'bg-amber-400', glow: 'shadow-[0_0_22px_-2px_rgba(251,191,36,0.8)]', chip: 'border-amber-400/30 bg-amber-400/10 text-amber-700' },
  rose: { ring: 'ring-rose-400/70', text: 'text-rose-700', dot: 'bg-rose-400', line: 'bg-rose-400', glow: 'shadow-[0_0_22px_-2px_rgba(251,113,133,0.8)]', chip: 'border-rose-400/30 bg-rose-400/10 text-rose-700' },
};
const accentOf = (name) => ACCENTS[name] || ACCENTS.slate;

const STEP_MS = 2600;

export default function FlowDiagram({ nodes, tags = [] }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = nodes.length - 1;

  useEffect(() => {
    if (!playing || step >= last) return undefined;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, playing, last]);

  const active = nodes[step];
  const a = accentOf(active.accent);
  const progress = useMemo(() => (last === 0 ? 100 : (step / last) * 100), [step, last]);

  const toggle = () => {
    if (step >= last) { setStep(0); setPlaying(true); return; }
    setPlaying((p) => !p);
  };
  const restart = () => { setStep(0); setPlaying(true); };

  return (
    <div>
      {/* Rail */}
      <div className="relative rounded-2xl border border-black/10 bg-gradient-to-b from-white to-violet-50 px-4 py-8 sm:px-8">
        <div className="relative mx-auto flex max-w-3xl items-start justify-between">
          {/* Base track + animated progress fill, centered on the node icons (top-7 = icon center). */}
          <div className="pointer-events-none absolute left-[7%] right-[7%] top-7 h-0.5 -translate-y-1/2 rounded-full bg-black/[0.04]" />
          <motion.div
            className={`pointer-events-none absolute left-[7%] top-7 h-0.5 -translate-y-1/2 rounded-full ${a.line}`}
            initial={false}
            animate={{ width: `${progress * 0.86}%` }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />

          {nodes.map((n, i) => {
            const na = accentOf(n.accent);
            const done = i < step;
            const isActive = i === step;
            const Icon = n.icon;
            return (
              <button
                key={n.title}
                type="button"
                onClick={() => { setStep(i); setPlaying(false); }}
                className="relative z-10 flex w-0 flex-1 flex-col items-center gap-2 text-center outline-none"
                aria-label={n.title}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full border bg-white transition-all duration-300 ${
                    isActive ? `${na.ring} ring-2 ${na.glow} scale-110 border-transparent`
                      : done ? 'border-black/20' : 'border-black/10 opacity-55'
                  }`}
                >
                  {done ? <Check size={20} className={na.text} aria-hidden="true" />
                    : Icon ? <Icon size={20} className={isActive ? na.text : 'text-ink-3'} aria-hidden="true" />
                      : <span className={`text-sm font-bold ${isActive ? na.text : 'text-ink-3'}`}>{i + 1}</span>}

                  {/* Traveling pulse leaving the active node toward the next one. */}
                  {isActive && i < last && (
                    <motion.span
                      className={`absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${na.dot}`}
                      initial={{ x: 0, opacity: 0 }}
                      animate={{ x: 28, opacity: [0, 1, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </span>
                <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${isActive ? 'text-ink-1' : done ? 'text-ink-2' : 'text-ink-3'}`}>
                  {n.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus card + controls */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`rounded-xl border ${a.chip} px-5 py-4`}
        >
          <div className="flex items-center gap-2">
            {active.icon ? <active.icon size={16} className={a.text} aria-hidden="true" /> : null}
            <p className={`text-sm font-bold ${a.text}`}>{active.title}</p>
            <span className="ml-auto text-[11px] text-ink-3">Step {step + 1} / {nodes.length}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-1">{active.body}</p>
        </motion.div>

        <div className="flex items-center gap-2 sm:flex-col">
          <button onClick={toggle} className="flex w-full items-center justify-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2 text-xs font-semibold text-ink-1 transition hover:bg-black/[0.05]">
            {step >= last ? <RotateCcw size={14} /> : playing ? <Pause size={14} /> : <Play size={14} />}
            {step >= last ? 'Replay' : playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={restart} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink-2 transition hover:bg-black/[0.03]">
            <RotateCcw size={14} /> Restart
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
          <ArrowRight size={12} className="text-ink-3" aria-hidden="true" />
          {tags.map((t) => (
            <span key={t} className="rounded-md border border-black/10 bg-black/[0.03] px-2 py-1">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
