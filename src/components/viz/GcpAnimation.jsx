import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle } from 'lucide-react';

const STEPS = [
  { label: 'User Request', badge: 'Browser', note: 'A user requests an app on Google Cloud. Google Cloud DNS resolves the domain to a global load balancer.' },
  { label: 'Global Load Balancer', badge: 'GLB', note: 'Global load balancer routes the user to the closest healthy region using latency-based or anycast routing.' },
  { label: 'Regional Ingress', badge: 'Cloud Load Balancing', note: 'Regional HTTP(S) load balancing terminates TLS and forwards traffic to the internal service mesh or GKE.' },
  { label: 'Compute & Data', badge: 'Cloud SQL / Spanner / Firestore', note: 'GCE VMs, GKE pods, or Cloud Run serve requests. Data services provide SQL/NoSQL/Document stores.' },
  { label: 'IAM & Observability', badge: 'Cloud Monitoring / Trace / Logging', note: 'Cloud Monitoring collects metrics. Cloud Trace visualizes latency. Cloud Logging stores structured logs.' },
];

const LANES = ['DNS', 'Global LB', 'Regional', 'Compute', 'Data'].map((label, i) => ({ label, x: 10 + i * 22, y: 50 }));

export default function GcpAnimation() {
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

  const visibleCount = Math.min(step + 1, 5);

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          {LANES.map((lane, idx) => (
            <div key={lane.label} className="relative h-full w-1/5 border-r border-white/5 last:border-none">
              <div className="absolute inset-x-0 top-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">{lane.label}</div>
              {idx < visibleCount && (
                <div className="absolute bottom-3 inset-x-2 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-2">
                  <p className="text-[10px] font-bold text-white">{current.badge}</p>
                  <p className="text-[9px] text-slate-400">{current.label}</p>
                </div>
              )}
            </div>
          ))}
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
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1"><HelpCircle size={10}/> Global → regional → compute/data</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">IAM + KMS + Security Command Center</span>
      </div>
    </div>
  );
}
