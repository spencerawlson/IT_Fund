import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Pause, Play, RotateCcw } from 'lucide-react';

const STEPS = [
  { label: 'Phishing Email', badge: 'Social', note: 'An attacker sends a convincing email with a malicious link or attachment.' },
  { label: 'Malware Landing', badge: 'Endpoint', note: 'The attachment executes or the browser loads a malicious site. Endpoint protection may detect it.' },
  { label: 'C2 Attempt', badge: 'Network', note: 'Malware tries to call home. Network controls and DNS filtering can block command-and-control traffic.' },
  { label: 'Lateral Movement', badge: 'Identity', note: 'Attackers harvest credentials and move across systems. MFA and Zero Trust limit blast radius.' },
  { label: 'Detection', badge: 'SOC', note: 'SIEM, EDR, and behavior analytics raise alerts. Responders contain, investigate, and remediate.' },
];

const NODES = [
  { id: 'email', label: 'Email', x: 0.12, y: 0.22 },
  { id: 'endpoint', label: 'Endpoint', x: 0.34, y: 0.22 },
  { id: 'network', label: 'Network', x: 0.58, y: 0.22 },
  { id: 'identity', label: 'Identity', x: 0.58, y: 0.52 },
  { id: 'response', label: 'Response', x: 0.12, y: 0.82 },
  { id: 'detect', label: 'Detect', x: 0.58, y: 0.82 },
];

const PATHS = [
  ['email', 'endpoint'],
  ['endpoint', 'network'],
  ['network', 'identity'],
  ['identity', 'response'],
  ['response', 'detect'],
];

export default function SecurityIncidentAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const pxRef = useRef(0);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2600);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  const activePathIndex = step + 1;

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <svg ref={pxRef} className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {PATHS.map((fromTo, idx) => {
            const a = NODES.find((n) => n.id === fromTo[0]);
            const b = NODES.find((n) => n.id === fromTo[1]);
            const active = idx < activePathIndex;
            const glow = idx === activePathIndex - 1;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            return (
              <g key={idx}>
                <line x1={`${a.x * 100}`} y1={`${a.y * 100}`} x2={`${b.x * 100}`} y2={`${b.y * 100}`} stroke={active ? '#f43f5e' : '#ffffff12'} strokeWidth={glow ? '0.5' : '0.3'} strokeDasharray={active ? 'none' : '1 1.2'} />
                {active && (
                  <circle cx={`${midX * 100}`} cy={`${midY * 100}`} r={glow ? '1.8' : '1.2'} fill="#f43f5e" opacity={glow ? '0.9' : '0.4'}>
                    <animate attributeName="opacity" values="0.3;0.95;0.3" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {NODES.map((node, idx) => {
            const isActive = idx <= step;
            const isCurrent = idx === step;
            return (
              <div
                key={node.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                  isCurrent ? 'border-rose-300 bg-rose-500/20' : isActive ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/5'
                }`}
                style={{
                  left: `${node.x * 100}%`,
                  top: `${node.y * 100}%`,
                  width: isCurrent ? '14px' : '10px',
                  height: isCurrent ? '14px' : '10px',
                }}
              >
                <div className="relative -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-slate-300 sm:text-[10px]">
                  {node.label}
                </div>
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
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1"><HelpCircle size={10}/> Phishing → endpoint → C2</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">Identity + Zero Trust + SOC response</span>
      </div>
    </div>
  );
}
