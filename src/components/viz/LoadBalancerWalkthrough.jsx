import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadBalancerDiagram, { LoadBalancerCounters } from './LoadBalancerDiagram';
import { WALKTHROUGH_STEPS } from '@/lib/loadBalancer';

const STEP_MS = 6000;
const DOT_TICK_MS = 350;
const DOT_MS = 1600;

function serverRowTop(index, count) {
  return ((index + 0.5) / count) * 100;
}

function dotPosition(dot, serverCount) {
  const leg1End = 0.35;
  if (dot.progress <= leg1End) {
    const t = dot.progress / leg1End;
    return { x: 10 + (40 - 10) * t, y: 50 + (22 - 50) * t };
  }
  const t = (dot.progress - leg1End) / (1 - leg1End);
  return { x: 40 + (78 - 40) * t, y: 22 + (serverRowTop(dot.serverIndex, serverCount) - 22) * t };
}

/** Which servers a step routes to, in order — the scripted traffic pattern. */
function routeFor(stepIndex, n) {
  switch (stepIndex) {
    case 0:
      return [0];
    case 3:
      return [0, 2];
    default:
      return Array.from({ length: n }, (_, i) => i);
  }
}

export default function LoadBalancerWalkthrough() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dots, setDots] = useState([]);
  const [p95, setP95] = useState(WALKTHROUGH_STEPS[0].p95);
  const counterRef = useRef(0);
  const routeRef = useRef(0);
  const idRef = useRef(1);

  const current = WALKTHROUGH_STEPS[step];

  // Auto-advance through the four beats, like the source Reel.
  useEffect(() => {
    if (!playing || step >= WALKTHROUGH_STEPS.length - 1) return undefined;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, playing]);

  // Keep the p95 headline alive: it wobbles a little around the step value.
  useEffect(() => {
    setP95(current.p95);
    const t = setInterval(() => {
      setP95(Math.max(40, Math.round(current.p95 * (0.92 + Math.random() * 0.16))));
    }, 1500);
    return () => clearInterval(t);
  }, [step, current.p95]);

  // Requests keep flowing inside the step, following its routing.
  useEffect(() => {
    const route = routeFor(step, current.servers.length);
    const t = setInterval(() => {
      counterRef.current += 1;
      routeRef.current += 1;
      const type = counterRef.current % 3 === 0 ? 'checkout' : 'page';
      const serverIndex = route[routeRef.current % route.length];
      const dotId = idRef.current;
      idRef.current += 1;
      setDots((prev) => {
        const advanced = prev
          .map((dot) => ({ ...dot, progress: dot.progress + DOT_TICK_MS / DOT_MS }))
          .filter((dot) => dot.progress < 1);
        return [...advanced, { id: dotId, type, serverIndex, progress: 0 }];
      });
    }, DOT_TICK_MS);
    return () => clearInterval(t);
  }, [step, current.servers.length]);

  const reset = () => {
    setStep(0);
    setPlaying(true);
    setDots([]);
  };

  const diagramServers = current.servers.map((s, i) => ({
    name: `Server ${i + 1}`,
    conns: s.conns,
    max: 8,
    status: s.status,
  }));

  const diagramDots = dots.map((dot) => {
    const pos = dotPosition(dot, current.servers.length);
    return { id: dot.id, type: dot.type, x: pos.x, y: pos.y };
  });

  return (
    <div>
      <LoadBalancerCounters p95={p95} errors503={current.errors503} healthy={current.healthy} />
      <LoadBalancerDiagram
        servers={diagramServers}
        dots={diagramDots}
        balancerLabel={current.algorithm === 'none' ? 'no balancer' : current.algorithm.replace('-', ' ')}
      />

      <div className="mt-4 rounded-xl border border-black/10 glass-1 p-4">
        <p className="font-semibold text-ink-1">{current.title}</p>
        <p className="mt-1 text-sm text-ink-3">{current.caption}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-3">
          <span>p95: {p95} ms</span>
          <span>503s: {current.errors503}</span>
          <span>Healthy: {current.healthy}</span>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">nginx.conf for this step</p>
        <pre className="overflow-x-auto rounded-xl bg-[#002B36] p-3 font-mono text-xs leading-relaxed text-[#859900]">{current.conf}</pre>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="Previous step"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-ink-1 disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex items-center gap-2 rounded-lg glass-1 px-4 py-2 text-sm font-semibold text-ink-1 transition"
        >
          {playing && step < WALKTHROUGH_STEPS.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < WALKTHROUGH_STEPS.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(WALKTHROUGH_STEPS.length - 1, s + 1))}
          disabled={step >= WALKTHROUGH_STEPS.length - 1}
          aria-label="Next step"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-ink-1 disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-ink-2 transition"
        >
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto flex gap-1.5">
          {WALKTHROUGH_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Go to ${s.title}`}
              className="flex h-8 items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : 'w-1.5 bg-black/20'}`} />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-3">
        After the thachdv.it Reel “How load balancer works” — round robin spreads requests evenly, but not
        necessarily the load. Step {step + 1} of {WALKTHROUGH_STEPS.length}.
      </p>
    </div>
  );
}
