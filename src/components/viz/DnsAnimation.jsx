import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const NODES = {
  browser: { x: 8, y: 50 },
  resolver: { x: 42, y: 50 },
  root: { x: 86, y: 18 },
  tld: { x: 86, y: 50 },
  auth: { x: 86, y: 82 },
};

const STEPS = [
  { from: 'browser', to: 'resolver', label: 'Query', note: 'The browser asks the recursive resolver (usually from your ISP) for www.example.com.' },
  { from: 'resolver', to: 'root', label: '→ Root', note: 'The resolver asks a root nameserver: "where is .com?"' },
  { from: 'root', to: 'resolver', label: 'TLD hint', note: 'Root replies: "I don\'t know, but ask the .com TLD servers."' },
  { from: 'resolver', to: 'tld', label: '→ TLD', note: 'The resolver asks the .com TLD nameserver: "where is example.com?"' },
  { from: 'tld', to: 'resolver', label: 'Auth hint', note: '.com TLD replies: "ask example.com\'s authoritative servers."' },
  { from: 'resolver', to: 'auth', label: '→ Authoritative', note: 'The resolver asks the authoritative server for www.example.com.' },
  { from: 'auth', to: 'resolver', label: '93.184.216.34', note: 'The authoritative server returns the IP address.' },
  { from: 'resolver', to: 'browser', label: 'Answer', note: 'The resolver caches the IP and returns it to the browser. The connection can now begin.' },
];

export default function DnsAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2400);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const from = NODES[current.from];
  const to = NODES[current.to];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  const Node = ({ id, label, sub }) => {
    const active = current.from === id || current.to === id;
    return (
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-3 py-2 text-center transition-colors ${
          active ? 'border-blue-500/60 bg-blue-500/15 shadow-lg shadow-blue-500/20' : 'border-white/15 bg-white/[0.08]'
        }`}
        style={{ left: `${NODES[id].x}%`, top: `${NODES[id].y}%` }}
      >
        <p className={`text-[11px] font-bold ${active ? 'text-blue-300' : 'text-slate-300'}`}>{label}</p>
        <p className="text-[9px] text-slate-400">{sub}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="relative h-72 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14]">
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          <line x1="8%" y1="50%" x2="42%" y2="50%" stroke="rgba(255,255,255,0.08)" />
          <line x1="42%" y1="50%" x2="86%" y2="18%" stroke="rgba(255,255,255,0.06)" />
          <line x1="42%" y1="50%" x2="86%" y2="50%" stroke="rgba(255,255,255,0.08)" />
          <line x1="42%" y1="50%" x2="86%" y2="82%" stroke="rgba(255,255,255,0.06)" />
        </svg>

        <Node id="browser" label="BROWSER" sub="www.example.com" />
        <Node id="resolver" label="RECURSIVE" sub="resolver" />
        <Node id="root" label="ROOT" sub="." />
        <Node id="tld" label="TLD" sub=".com" />
        <Node id="auth" label="AUTHORITATIVE" sub="example.com" />

        <motion.div
          key={step}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0 }}
          animate={{ left: `${to.x}%`, top: `${to.y}%`, opacity: [0, 1, 1, 1] }}
          transition={{ duration: 1.8, times: [0, 0.1, 0.5, 1], ease: 'easeInOut' }}
        >
          <div className="rounded-md border border-amber-500/60 bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300 shadow">
            {current.label}
          </div>
        </motion.div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
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
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}