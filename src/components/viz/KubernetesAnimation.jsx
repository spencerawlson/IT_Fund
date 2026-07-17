import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, AlertTriangle } from 'lucide-react';
import BreakItControls from '@/components/lab/BreakItControls';

const STEPS = [
  {
    label: 'Git Push → CI Lint/Build',
    badge: 'Pipeline',
    note: 'Developer pushes code. CI pipeline runs lint, unit tests, and builds the container image.',
    log: ['➜ git push origin main', 'remote: CI build #4821 started', '➜ pipeline run --image web-app', 'lint .............. PASS', 'test .............. 124 passed', 'build ............. ok | 1.2s'],
    statusColor: 'text-emerald-400',
    statusLabel: 'build.succeeded',
    metric: { cpu: '124m/500m', mem: '210Mi/1Gi', restarts: 0 },
    scenarioNote: { 'ci-fail': 'lint/test fails; image never built.', 'registry-down': 'Image build succeeds but registry push fails.', 'rollback-needed': 'Post-deploy alerts detect regression immediately.' },
  },
  {
    label: 'Image pushed to registry',
    badge: 'Registry',
    note: 'Image is tagged and pushed to the registry. Deployment references new immutable tag.',
    log: ['➜ ko build --tag v2.4.1-3-gabc1234', 'Pushed registry.internal/web-app:v2.4.1-3', 'Digest: sha256:9e7c3...defa2', 'Policy: image signed + SBOM attached'],
    statusColor: 'text-sky-400',
    statusLabel: 'image.pushed',
    metric: { cpu: '98m/500m', mem: '186Mi/1Gi', restarts: 0 },
    scenarioNote: { 'ci-fail': 'No image to push due to earlier CI failure.', 'registry-down': 'Push times out; promotion halted.', 'rollback-needed': 'Image exists but is later found to be bad.' },
  },
  {
    label: 'Rollout: old → new ReplicaSets',
    badge: 'ReplicaSet',
    note: 'New ReplicaSet is created. Pods are rolled with maxSurge/maxUnavailable, progress monitored per pod.',
    log: ['➜ kubectl rollout status deploy/web-app -w', 'deployment.apps/web-app rolling out', 'ReplicaSet web-app-5d8b9 scaled up to 1', 'ReplicaSet web-app-7d4f scaled up to 2', 'ReplicaSet web-app-7d4f scaled up to 3'],
    statusColor: 'text-amber-400',
    statusLabel: 'RollingUpdate',
    metric: { cpu: '243m/500m', mem: '410Mi/1Gi', restarts: 1 },
    scenarioNote: { 'ci-fail': 'Not reached; upstream image missing.', 'registry-down': 'Pod creation blocked by image pull backoff.', 'rollback-needed': 'New ReplicaSet is stable until traffic shift.' },
  },
  {
    label: 'Service routing + readiness',
    badge: 'Service',
    note: 'Service endpoints include only ready pods. Readiness probe passes; traffic is shifted gradually.',
    log: ['➜ kubectl get endpoints web-app', 'NAME       ENDPOINTS            PORTS', 'web-app    #####                name=port', '➜ kubectl describe pod web-app-7d4f', 'readiness probe succeeded on tcp socket 8080', 'Endpoints now 1/1 healthy'],
    statusColor: 'text-emerald-400',
    statusLabel: 'Serving traffic',
    metric: { cpu: '243m/500m', mem: '410Mi/1Gi', restarts: 1 },
    scenarioNote: { 'ci-fail': 'Not reached.', 'registry-down': 'Pods stuck at ImagePullBackOff; no endpoints.', 'rollback-needed': 'Endpoints update succeeds, but SLO degrades.' },
  },
  {
    label: 'Health failure + rollout pause',
    badge: 'Failure',
    note: 'New pod crashes repeatedly. Liveness probe restarts pod; after threshold the rollout is paused and traffic stays on old pods.',
    log: ['➜ kubectl get pods -w', 'NAME                READY   STATUS         RESTARTS   AGE', 'web-app-5d8b9      1/1     Running        0          5m', 'web-app-7d4f       0/1     CrashLoopBackOff  3         90s', 'Rollout paused: 3 restarts exceeded threshold', 'Endpoints preserved on ReplicaSet web-app-5d8b9'],
    statusColor: 'text-red-400',
    statusLabel: 'paused: CrashLoopBackOff',
    metric: { cpu: '170m/500m', mem: '290Mi/1Gi', restarts: 3 },
    scenarioNote: { 'ci-fail': 'Not reached.', 'registry-down': 'CrashLoopBackOff from invalid image digest.', 'rollback-needed': 'Rollout undo is exactly the mitigation.' },
  },
  {
    label: 'Autoscaler + rollout undo',
    badge: 'HPA',
    note: 'HPA sees elevated latency anomaly and proposes +1 replica, but ops performs kubectl rollout undo to last stable.',
    log: ['➜ kubectl get hpa web-app', 'NAME       REF              MIN   MAX   REPLICAS', 'web-app    Deployment/web-app 3    6     5', '➜ kubectl rollout undo deploy/web-app', 'deployment.apps/web-app rolled back', 'All pods Ready — healthy state restored.'],
    statusColor: 'text-indigo-400',
    statusLabel: 'healthy',
    metric: { cpu: '387m/500m', mem: '520Mi/1Gi', restarts: 0 },
    scenarioNote: { 'ci-fail': 'Not reached.', 'registry-down': 'HPA raises count; unschedulable pods queue.', 'rollback-needed': 'Undo completes; old ReplicaSet scales back up.' },
  },
];

const LANES = ['Build', 'Registry', 'Rollout', 'Service', 'Health', 'Ops'].map((label, i) => ({ label, x: 6 + i * 17.5, y: 50 }));

const SCENARIOS = [
  { id: 'none', label: 'Normal', icon: null, description: 'Baseline operation' },
  { id: 'ci-fail', label: 'CI Fail', icon: AlertTriangle, description: 'Tests fail; image promotion stops.' },
  { id: 'registry-down', label: 'Registry Down', icon: AlertTriangle, description: 'Registry unreachable; image pull fails.' },
  { id: 'rollback-needed', label: 'Rollback', icon: AlertTriangle, description: 'Bad deployment requires immediate rollback.' },
];

export default function KubernetesAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scenario, setScenario] = useState('none');
  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2600);
    return () => clearTimeout(t);
  }, [step, playing, scenario]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);
  const visibleCount = Math.min(step + 1, LANES.length);
  const note = current.scenarioNote?.[scenario];

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/80">{current.badge}</span>
        </div>

        <div className="absolute inset-y-0 left-0 right-0">
          {LANES.map((lane, idx) => (
            <div key={lane.label} className="relative h-full border-r border-white/5 last:border-none" style={{ width: `${100/LANES.length}%` }}>
              <div className="absolute inset-x-0 top-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">{lane.label}</div>
              {idx < visibleCount && <div className="absolute right-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3 text-[10px] text-slate-400">
          <span className={`inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 ${current.statusColor}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {current.statusLabel}
          </span>
          <span>Step {step + 1} / {STEPS.length}</span>
        </div>
      </div>

      {note && (
        <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2.5 text-xs text-rose-200">
          <span className="mr-1 inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]"><span className="text-rose-400">⚠</span> Failure mode</span>
          <span className="text-slate-300">{note}</span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      <BreakItControls scenarios={SCENARIOS} scenario={scenario} onScenarioChange={(id) => { setScenario(id); setStep(0); setPlaying(true); }} />

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
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-[#05080f] px-3 py-2.5 text-[11px] leading-5 text-slate-300">
        <div className="flex items-center gap-2 text-slate-500">
          <Terminal size={12} />
          <span className="text-[10px] uppercase tracking-wider">terminal</span>
        </div>
        <div className="mt-2 space-y-0.5">
          {current.log.map((line, i) => (
            <div key={i} className={i === 0 ? 'text-emerald-400/90' : 'text-slate-400'}>{line}</div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-1 text-slate-400"><Cpu size={10} /> cpu: {current.metric.cpu}</span>
          <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-1 text-slate-400"><MemoryStick size={10} /> mem: {current.metric.mem}</span>
          <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-1 text-slate-400"><Activity size={10} /> restarts: {current.metric.restarts}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><HelpCircle size={10}/> Deploy ↔ Service ↔ Probe</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><AlertTriangle size={10}/> CrashLoopBackOff + HPA</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1">kubectl rollout undo</span>
      </div>
    </div>
  );
}
