import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const SERVER_TOPS = [20, 40, 60, 80];

const SERVER_NAMES = ['Web-01', 'API-01', 'App-02', 'Worker-03'];

const STEPS = [
  { to: 0, label: 'Request #1', note: 'Client hits the load balancer. Round-robin selects Web-01 and forwards the request.' },
  { to: 1, label: 'Request #2', note: 'Next request goes to API-01. Traffic is spread across healthy nodes.' },
  { to: 2, label: 'Request #3', note: 'App-02 receives request #3. Latency stays low under distribution.' },
  { to: 3, label: 'Request #4', note: 'Worker-03 takes request #4. The active set is balanced across AZ1 and AZ2.' },
  { to: 0, fail: 2, label: 'Health Check Failure', note: 'App-02 fails its health check. The load balancer marks it unhealthy and drains connections.' },
  { to: 1, label: 'Request #5', note: 'App-02 is removed from rotation. Requests flow only through healthy servers.' },
  { to: 3, label: 'Auto-Recover', note: 'App-02 passes a later health check and rejoins the pool — traffic resumes automatically.' },
];

export default function LoadBalancerAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(null);
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    const cur = STEPS[step];
    if (cur?.fail !== undefined) setFailed(cur.fail);
  }, [step]);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 3200);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); setFailed(null); setPackets([]); };
  const toggle = () => setPlaying((p) => !p);

  const targetTop = SERVER_TOPS[current.to];
  const targetServer = SERVER_NAMES[current.to];

  return (
    <div>
      <div className="relative h-80 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#080d18] via-[#0c1220] to-[#070b14] sm:h-96">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.06)_1px,transparent_0)] bg-[length:22px_22px]" />

        {/* Availability zone labels */}
        <div className="absolute inset-x-0 top-2 flex justify-between px-4 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          <span>AZ-1a</span>
          <span>AZ-1b</span>
        </div>

        {/* Client */}
        <div className="absolute left-[3%] top-1/2 -translate-y-1/2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center backdrop-blur">
          <p className="text-xs font-bold text-sky-300">CLIENT</p>
          <p className="mt-0.5 text-[10px] text-slate-500">internet / app</p>
        </div>

        {/* Load Balancer */}
        <div className="absolute left-[38%] top-[14%] -translate-x-1/2 rounded-xl border border-indigo-500/60 bg-indigo-500/15 px-4 py-3 text-center shadow-2xl shadow-indigo-500/20 backdrop-blur">
          <p className="text-[11px] font-bold text-indigo-200 tracking-wide">LOAD BALANCER</p>
          <p className="mt-1 text-[10px] text-indigo-300/80">round-robin</p>
        </div>

        {/* Servers */}
        {SERVER_TOPS.map((top, i) => {
          const isFailed = failed === i;
          const isTarget = current.to === i;
          return (
            <div
              key={i}
              className={`absolute right-[5%] -translate-y-1/2 rounded-xl border px-3 py-2.5 text-center backdrop-blur transition-all duration-500 ${
                isFailed
                  ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.15)]'
                  : isTarget
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                    : 'border-white/10 bg-white/[0.03]'
              }`}
              style={{ top: `${top}%` }}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isFailed ? 'bg-red-500 animate-pulse' : isTarget ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/30'}`} />
                <p className={`text-[11px] font-bold ${isFailed ? 'text-red-300' : 'text-slate-200'}`}>{SERVER_NAMES[i]}</p>
              </div>
              <p className={`mt-0.5 text-[10px] ${isFailed ? 'text-red-400/80' : 'text-slate-500'}`}>
                {isFailed ? 'unhealthy' : isTarget ? 'handling' : 'idle'}
              </p>
            </div>
          );
        })}

        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <line x1="40%" y1="14%" x2="90%" y2="20%" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          <line x1="40%" y1="14%" x2="90%" y2="40%" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          <line x1="40%" y1="14%" x2="90%" y2="60%" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          <line x1="40%" y1="14%" x2="90%" y2="80%" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
        </svg>

        {/* Moving request packet */}
        <motion.div
          key={step}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          initial={{ left: '10%', top: '14%', opacity: 0 }}
          animate={{
            left: ['10%', '38%', '90%'],
            top: ['14%', '14%', `${targetTop}%`],
            opacity: [0, 1, 1, 1],
          }}
          transition={{ duration: 2, times: [0, 0.15, 0.6, 1], ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center rounded-lg border border-amber-500/70 bg-amber-500/20 px-2.5 py-1 text-center shadow-[0_10px_25px_rgba(245,158,11,0.25)] backdrop-blur">
            <span className="text-[10px] font-bold text-amber-200">REQ</span>
            <span className="text-[9px] text-amber-300/70">{targetServer}</span>
          </div>
        </motion.div>

        {/* Step indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="mt-1 text-sm text-slate-400">{current.note}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span>Servers: {SERVER_NAMES.filter((_, i) => failed !== i).length}/{SERVER_NAMES.length} healthy</span>
          <span>Strategy: Round Robin</span>
          <span>Health interval: 10s</span>
        </div>
      </div>

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
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}