import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle } from 'lucide-react';

const STEPS = [
  { label: 'User Request', badge: 'Browser', note: 'A user requests a web app. DNS resolves the domain to a CloudFront edge or ALB address.' },
  { label: 'Edge / Frontend', badge: 'CloudFront', note: 'AWS CDN caches static assets close to the user for speed. Dynamic requests are forwarded to the origin.' },
  { label: 'Load Balancer', badge: 'ALB', note: 'The Application Load Balancer distributes traffic across healthy targets in multiple Availability Zones.' },
  { label: 'Compute Layer', badge: 'EC2 / ECS / Lambda', note: 'Traffic reaches compute: EC2 instances, ECS containers, or Lambda functions. Autoscaling adds/removes capacity.' },
  { label: 'Storage & Data', badge: 'S3 / RDS / DynamoDB', note: 'S3 stores objects; RDS provides SQL; DynamoDB provides NoSQL.' },
  { label: 'Security Boundary', badge: 'IAM / WAF / GuardDuty', note: 'IAM controls access; WAF filters web attacks; GuardDuty and Inspector alert on threats and vulnerabilities.' },
  { label: 'Monitoring', badge: 'CloudWatch / X-Ray / CloudTrail', note: 'Metrics, traces, and audit logs stream to CloudWatch and X-Ray for debugging and compliance review.' },
];

const LANES = ['Browser', 'Edge', 'ALB', 'Compute', 'Data'].map((label, i) => ({ label, x: 10 + i * 22, y: 50 }));

export default function AwsAnimation() {
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
      <div className="relative h-64 overflow-hidden rounded-xl border border-black/10 bg-gradient-to-b from-white to-violet-50 sm:h-72">
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          {LANES.map((lane, idx) => (
            <div key={lane.label} className="relative h-full w-1/5 border-r border-black/5 last:border-none">
              <div className="absolute inset-x-0 top-2 text-center text-[9px] font-semibold uppercase tracking-wider text-ink-3">{lane.label}</div>
              {idx < visibleCount && (
                <div className="absolute bottom-3 inset-x-2 rounded-lg border border-black/15 bg-black/[0.06] px-2 py-2">
                  <p className="text-[10px] font-bold text-ink-1">{current.badge}</p>
                  <p className="text-[9px] text-ink-3">{current.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 top-[14px] -translate-x-1/2 text-[11px] text-ink-3">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.06] px-4 py-3 text-sm">
        <p className="font-semibold text-ink-1">{current.label}</p>
        <p className="text-ink-3">{current.note}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={toggle} className="flex items-center gap-2 rounded-lg bg-black/[0.04] px-4 py-2 text-sm font-semibold text-ink-1 transition hover:bg-black/[0.05]">
          {playing && step < STEPS.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < STEPS.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-black/[0.03]">
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto flex gap-1.5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="flex h-8 items-center px-0.5"><span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-orange-400' : 'w-1.5 bg-black/[0.06]'}`} /></button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-ink-3">
        <span className="inline-flex items-center gap-1 rounded border border-black/10 bg-black/[0.06] px-2 py-1"><HelpCircle size={10}/> Edge → ALB → compute</span>
        <span className="inline-flex items-center gap-1 rounded border border-black/10 bg-black/[0.06] px-2 py-1">IAM + WAF + GuardDuty</span>
      </div>
    </div>
  );
}
