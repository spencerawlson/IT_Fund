import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, HelpCircle } from 'lucide-react';

const STEPS = [
  { dir: 'right', label: 'Datagram #1', badge: 'UDP', state: 'Unconnected', size: '12 bytes', note: 'analogy: "Message 1 — no receipt needed."', explain: 'UDP sends without setup. Each datagram stands alone. Fast and lightweight, but delivery, ordering, and duplication protection are not guaranteed.' },
  { dir: 'right', label: 'Datagram #2', badge: 'UDP', state: 'Unconnected', size: '12 bytes', note: 'analogy: "Message 2 — still no receipt."', explain: 'Applications using UDP often tolerate occasional loss for speed and simplicity. Common examples: DNS queries, streaming media, and game state packets.' },
  { dir: 'right', label: 'Datagram #3', badge: 'UDP', state: 'Unconnected', size: '12 bytes', note: 'analogy: "Message 3 — if it arrives, great."', explain: 'Datagrams can be lost, reordered, duplicated, or delayed. UDP does nothing to fix that; it deliberately avoids extra headers and retransmission logic.' },
  { dir: 'none', label: 'No Connection State', badge: 'Socket optional', state: '—', size: 'minimal header', note: 'analogy: "No relationship — just packets."', explain: 'UDP is not connectionless because it is broken; it is a design choice for simple, fast, stateless delivery when the application handles reliability itself.' },
];

const colorMap = {
  amber: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  purple: 'border-purple-500/50 bg-purple-500/15 text-purple-300',
  red: 'border-red-500/50 bg-red-500/15 text-red-300',
  slate: 'border-white/10 bg-white/[0.08] text-slate-300',
};

export default function UdpAnimation() {
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

  // Centered packet (-translate-x-1/2) with travel kept inside the stage padding, so it never clips.
  const startLeft = '20%';
  const endLeft = '80%';
  const accent = step === 2 ? 'red' : step === 3 ? 'slate' : 'amber';

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-[11px] font-bold text-amber-300">SENDER</p>
          <p className="mt-0.5 text-[10px] text-slate-400">10.0.0.5</p>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-center">
          <p className="text-[11px] font-bold text-purple-300">RECEIVER</p>
          <p className="mt-0.5 text-[10px] text-slate-400">10.0.0.9</p>
        </div>

        <div className="absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {current.dir !== 'none' && (
          <motion.div
            key={step}
            className="absolute -translate-x-1/2"
            style={{ top: 'calc(50% - 30px)', left: startLeft }}
            animate={{ left: endLeft, opacity: [0, 1, 1] }}
            transition={{ duration: 1.4, times: [0, 0.15, 1], ease: 'easeInOut' }}
          >
            <div className={`flex flex-col items-center rounded-lg border px-3 py-1.5 text-center shadow-lg min-w-[110px] ${colorMap[accent]}`}>
              <span className="text-[11px] font-bold tracking-wide">{current.badge}</span>
              <span className="text-[10px] opacity-80">{current.state}</span>
              <span className="mt-0.5 text-[10px] opacity-90">{current.size}</span>
            </div>
            {step === 2 && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-red-400" style={{ top: 38 }}>
                ✗ LOST
              </motion.span>
            )}
          </motion.div>
        )}

        {current.dir === 'none' && (
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/[0.08] px-5 py-2 text-center"
          >
            <p className="text-sm font-bold text-slate-200">{current.label}</p>
            <p className="text-[10px] text-slate-400">{current.sub}</p>
          </motion.div>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
          <p className="font-semibold text-white">{current.label}</p>
          <p className="text-slate-400">{current.note}</p>
          <p className="mt-1.5 text-slate-300">{current.explain}</p>
        </div>
        <div className="flex sm:flex-col items-center gap-2">
          <button onClick={toggle} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
            {playing && step < STEPS.length - 1 ? <Pause size={14} /> : <Play size={14} />}
            {playing && step < STEPS.length - 1 ? 'Pause' : 'Play'}
          </button>
          <button onClick={reset} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5">
            <RotateCcw size={14} /> Restart
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1"><HelpCircle size={10}/> No handshake before sending</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">Minimal header = low overhead</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">Loss is acceptable for some apps</span>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="flex h-8 items-center px-0.5"><span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/20'}`} /></button>
        ))}
      </div>
    </div>
  );
}
