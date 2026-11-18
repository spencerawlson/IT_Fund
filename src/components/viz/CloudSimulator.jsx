import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cloud, Database, HardDrive, Server } from 'lucide-react';
import {
  AZS,
  BURST_QUEUE,
  QUEUE_DRAIN_PER_S,
  SERVICE_MODELS,
  LAYERS,
  DEPLOYMENT_MODELS,
  ownerFor,
  checkResponsibility,
  desiredInstances,
  stepScaling,
  distributeAcrossAzs,
  createCloud,
  runningInstances,
  capacityFor,
  killAz,
  restoreAz,
  dbProbe,
  applyBurst,
  hourlyCost,
  monthlyCost,
  costPerThousandRequests,
  p95Ms,
  vpcConfig,
} from '@/lib/cloud';

const TICK_MS = 100;
const MAX_EVENTS = 6;

function freshSim() {
  return {
    ...createCloud(),
    events: [],
    tickCount: 0,
    nextId: 1,
  };
}

export default function CloudSimulator() {
  const [model, setModel] = useState('iaas');
  const [deployment, setDeployment] = useState('public');
  const [pricing, setPricing] = useState('on-demand');
  const [traffic, setTraffic] = useState(60);
  const [paused, setPaused] = useState(false);
  const [drillLayer, setDrillLayer] = useState('os');
  const [drillFeedback, setDrillFeedback] = useState(null);
  const [drillScore, setDrillScore] = useState({ correct: 0, total: 0 });
  const [probeNote, setProbeNote] = useState('');
  const [objects, setObjects] = useState(128);
  const [revealed, setRevealed] = useState({});
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const settingsRef = useRef({ traffic });
  settingsRef.current = { traffic };

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const { traffic: rate } = settingsRef.current;
      const running = runningInstances(sim);
      const capacity = capacityFor(running);
      // Serve what the running fleet can carry; the rest is dropped.
      sim.served += Math.min(rate, capacity) * (TICK_MS / 1000);
      sim.dropped += Math.max(0, rate - capacity) * (TICK_MS / 1000);
      // The queue drains at a fixed rate; each drained message is one
      // serverless invocation.
      const drained = Math.min(sim.queueDepth, QUEUE_DRAIN_PER_S * (TICK_MS / 1000));
      sim.queueDepth -= drained;
      sim.invocations += drained;
      // Once a second, the auto-scaling group steps one instance toward
      // what the traffic wants.
      sim.tickCount += 1;
      if (sim.tickCount % 10 === 0) {
        const wanted = desiredInstances(rate);
        const next = stepScaling(sim.instances, wanted);
        if (next !== sim.instances) {
          sim.instances = next;
          logEvent(sim, `Auto-scaling: fleet → ${next} instances (traffic wants ${wanted}).`);
        }
      }
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const running = runningInstances(sim);
  const wanted = desiredInstances(traffic);
  const dist = distributeAcrossAzs(sim.instances, sim.multiAz);
  const costHr = hourlyCost(sim.instances, pricing);
  const costMo = monthlyCost(sim.instances, pricing);
  const p95 = p95Ms(traffic, running, sim.queueDepth);
  const costPerK = costPerThousandRequests(sim.instances, pricing, traffic);
  const queuePct = Math.min(100, (sim.queueDepth / BURST_QUEUE) * 100);

  const reset = () => {
    simRef.current = freshSim();
    setProbeNote('');
    setDrillFeedback(null);
    bump();
  };

  const burst = () => {
    applyBurst(simRef.current);
    logEvent(simRef.current, `Burst: ${BURST_QUEUE} messages queued (SQS). Draining at ${QUEUE_DRAIN_PER_S}/s — p95 falls as it drains.`);
    bump();
  };

  const kill = (az) => {
    const result = killAz(simRef.current, az);
    result.events.forEach((text) => logEvent(simRef.current, text));
    bump();
  };

  const restore = (az) => {
    const result = restoreAz(simRef.current, az);
    result.events.forEach((text) => logEvent(simRef.current, text));
    bump();
  };

  const probe = () => {
    const result = dbProbe('internet');
    setProbeNote(result.reason);
    logEvent(simRef.current, `DB probe from the internet ${result.reason}`);
    bump();
  };

  const answerDrill = (owner) => {
    const correct = checkResponsibility(model, drillLayer, owner);
    const layer = LAYERS.find((l) => l.id === drillLayer);
    const rightOwner = ownerFor(model, drillLayer);
    setDrillFeedback({
      correct,
      text: correct
        ? `Correct — on ${SERVICE_MODELS.find((m) => m.id === model).label}, ${layer.label.toLowerCase()} is the ${rightOwner === 'provider' ? 'provider' : 'customer'}'s job.`
        : `Not quite — on ${SERVICE_MODELS.find((m) => m.id === model).label}, ${layer.label.toLowerCase()} belongs to the ${rightOwner}.`,
    });
    setDrillScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const toggleReveal = (key) => setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const metric = (label, value, tone) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${tone || 'text-ink-1'}`}>{value}</p>
    </div>
  );

  const checkYourself = [
    {
      q: 'You move an app from IaaS to SaaS. Who now patches the operating system — and what do you still own?',
      a: 'The provider patches the OS (and everything below the app) on SaaS. You still own your data and who can access it — those two never move to the provider, on any model.',
    },
    {
      q: 'Traffic triples at noon and drops back by 2 p.m. Do you scale vertically or horizontally — and what is elasticity?',
      a: 'Horizontally — add instances, then remove them. Scaling is the ability to grow; elasticity is growing AND shrinking automatically with demand, which is what the auto-scaling group does here.',
    },
    {
      q: 'The AZ holding your database primary fails. Why does the app stay up — and why can the read replica not take over instead?',
      a: 'The multi-AZ sync standby is promoted to primary automatically — synchronous replication means no data loss. A read replica is an async copy for offloading reads; it is not a standby and cannot fail over.',
    },
    {
      q: 'Your database sits in the private subnet 10.0.3.0/24. A probe from the internet hits it. What happens — and what enforces it?',
      a: 'Blocked. The DB has no public IP, and its security group only allows traffic from the app tier (10.0.2.0/24). Try the probe button — the config panel shows the rule that stops it.',
    },
  ];

  const instanceSquares = (az) => {
    const count = dist[az];
    const down = sim.azDown[az];
    return (
      <g>
        {Array.from({ length: Math.max(count, 1) }, (_, i) => (
          <rect
            key={`${az}-${i}`}
            x={az === 'AZ-A' ? 22 + i * 26 : 338 + i * 26}
            y={96}
            width="20"
            height="20"
            rx="4"
            fill={down ? '#FCA5A5' : i < count ? '#C4B5FD' : '#FFFFFF'}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1"
          />
        ))}
        <text x={az === 'AZ-A' ? 22 : 338} y={132} fontSize="11" fill="#5B6472">
          {down ? `${az} DOWN — ${count} instance(s) lost` : `${count} instance(s) · ${capacityFor(count)} req/s`}
        </text>
      </g>
    );
  };

  // One screen on desktop: service model + drill on the left, counters +
  // VPC diagram in the middle, AZs + DB + storage on the right. The cost
  // per hour (the derived metric) sits directly under the primary
  // counters. On narrow screens the rails stack in reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: service model, drill, deployment, pricing, traffic */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Service model</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Service model">
            {SERVICE_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setModel(m.id); setDrillFeedback(null); }}
                aria-pressed={model === m.id}
                title={m.blurb}
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight transition ${
                  model === m.id ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-ink-2">{SERVICE_MODELS.find((m) => m.id === model)?.blurb}</p>

          <div className="mt-2.5 border-t border-black/10 pt-2.5">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Shared responsibility drill</p>
            <p className="mt-1 text-xs leading-snug text-ink-2">
              On {SERVICE_MODELS.find((m) => m.id === model).label}, who runs this layer?
              {drillScore.total > 0 && (
                <span> Score: <strong className="text-ink-1">{`${drillScore.correct}/${drillScore.total}`}</strong></span>
              )}
            </p>
            <label className="mt-2 block">
              <span className="sr-only">Layer to assign</span>
              <select
                value={drillLayer}
                onChange={(e) => { setDrillLayer(e.target.value); setDrillFeedback(null); }}
                aria-label="Layer to assign"
                className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                {LAYERS.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.label}</option>
                ))}
              </select>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => answerDrill('provider')} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1">
                Provider
              </button>
              <button type="button" onClick={() => answerDrill('customer')} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1">
                Customer
              </button>
            </div>
            {drillFeedback && (
              <p className={`mt-1.5 text-xs leading-snug ${drillFeedback.correct ? 'text-emerald-700' : 'text-red-700'}`}>
                {drillFeedback.text}
              </p>
            )}
          </div>

          <div className="mt-2.5 border-t border-black/10 pt-2.5">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Deployment model</span>
              <select
                value={deployment}
                onChange={(e) => setDeployment(e.target.value)}
                aria-label="Deployment model"
                className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                {DEPLOYMENT_MODELS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] leading-snug text-ink-3">{DEPLOYMENT_MODELS.find((d) => d.id === deployment)?.blurb}</span>
            </label>
          </div>

          <div className="mt-2.5 border-t border-black/10 pt-2.5">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Pricing</p>
            <div className="mt-1.5 flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Pricing model">
              {['on-demand', 'reserved'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPricing(p)}
                  aria-pressed={pricing === p}
                  className={`flex-1 px-2 py-1.5 text-[13px] font-semibold ${pricing === p ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                >
                  {p === 'on-demand' ? 'Pay-as-you-go' : 'Reserved'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { sim.multiAz = !sim.multiAz; logEvent(sim, sim.multiAz ? 'Multi-AZ on — the fleet spreads across both AZs.' : 'Multi-AZ OFF — the whole fleet sits in AZ-A. One AZ failure is a total outage.'); bump(); }}
              aria-pressed={sim.multiAz}
              className={`mt-1.5 w-full rounded-lg px-2 py-1.5 text-[13px] font-semibold ${sim.multiAz ? 'glass-btn' : 'border border-red-500/40 bg-red-500/5 text-red-700'}`}
            >
              {`Multi-AZ ${sim.multiAz ? 'on' : 'OFF'}`}
            </button>
          </div>

          <div className="mt-2.5 border-t border-black/10 pt-2.5">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Traffic — {traffic} req/s</span>
              <input type="range" min="10" max="400" step="10" value={traffic} onChange={(e) => setTraffic(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Traffic in requests per second" />
              <span className="text-[11px] leading-snug text-ink-3">Fleet wants {wanted} instances at this traffic (1 per 45 req/s).</span>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={burst} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Burst +140
              </button>
              <button type="button" onClick={() => setPaused((p) => !p)} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={reset} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Middle: counters, VPC diagram, queue */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="grid grid-cols-3 gap-2">
            {metric('traffic', `${traffic} req/s`)}
            {metric('instances', `${running} / ${sim.instances}`)}
            {metric('queue depth', Math.round(sim.queueDepth))}
          </div>
          {/* Derived metrics, directly under the primary counters. */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {metric('cost / hour', `$${costHr.toFixed(2)}`)}
            {metric('p95', `${p95} ms`, p95 > 200 ? 'text-red-700' : 'text-ink-1')}
            {metric('serverless invocations', Math.round(sim.invocations))}
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">VPC 10.0.0.0/16 — two availability zones</p>
              <p className="text-[11px] text-ink-3">purple = running instance · pink = lost to an AZ failure</p>
            </div>
            <svg viewBox="0 0 640 250" className="w-full" role="img" aria-label="VPC diagram: public subnet with load balancer, app subnet with instances in two AZs, data subnet with database, queue and object storage">
              {/* Public subnet */}
              <rect x="8" y="8" width="624" height="56" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
              <text x="18" y="26" fontSize="12" fontWeight="700" fill="#111827">Public subnet 10.0.1.0/24</text>
              <text x="18" y="50" fontSize="12" fill="#111827">Internet → WAF → L7 load balancer (health checks)</text>
              <text x="470" y="50" fontSize="12" fill="#5B6472">TLS 1.3 in transit</text>
              {/* App subnet */}
              <rect x="8" y="72" width="624" height="72" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
              <text x="18" y="88" fontSize="12" fontWeight="700" fill="#111827">App subnet 10.0.2.0/24 — auto-scaling group (stateless tiers)</text>
              {instanceSquares('AZ-A')}
              {instanceSquares('AZ-B')}
              {/* Data subnet */}
              <rect x="8" y="152" width="624" height="90" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
              <text x="18" y="168" fontSize="12" fontWeight="700" fill="#111827">Data subnet 10.0.3.0/24 — private, no public IPs · AES-256 at rest</text>
              <g>
                <rect x="18" y="176" width="150" height="54" rx="8" fill={sim.db.primaryAz === 'AZ-A' ? '#DCFCE7' : '#FEF3C7'} stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <text x="28" y="194" fontSize="12" fontWeight="700" fill="#111827">{`DB primary · ${sim.db.primaryAz}`}</text>
                <text x="28" y="210" fontSize="11" fill="#5B6472">multi-AZ, sync standby</text>
                <text x="28" y="224" fontSize="11" fill="#5B6472">auto failover</text>
              </g>
              <g>
                <rect x="180" y="176" width="150" height="54" rx="8" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <text x="190" y="194" fontSize="12" fontWeight="700" fill="#111827">{`Sync standby · ${sim.db.standbyAz}`}</text>
                <text x="190" y="210" fontSize="11" fill="#5B6472">{sim.azDown[sim.db.standbyAz] ? 'rebuilding after restore' : 'promotes on failure'}</text>
                <text x="190" y="224" fontSize="11" fill="#5B6472">no data loss</text>
              </g>
              <g>
                <rect x="342" y="176" width="130" height="54" rx="8" fill={sim.db.replicaUp ? '#FFFFFF' : '#FEE2E2'} stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <text x="352" y="194" fontSize="12" fontWeight="700" fill="#111827">{`Read replica · ${sim.db.replicaAz}`}</text>
                <text x="352" y="210" fontSize="11" fill="#5B6472">{sim.db.replicaUp ? 'async — reads only' : 'LOST — cannot fail over'}</text>
                <text x="352" y="224" fontSize="11" fill="#5B6472">{sim.db.replicaUp ? 'never a standby' : 'reads → primary'}</text>
              </g>
              <g>
                <rect x="484" y="176" width="140" height="54" rx="8" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                <text x="494" y="194" fontSize="12" fontWeight="700" fill="#111827">{`SQS queue · ${Math.round(sim.queueDepth)}`}</text>
                <rect x="494" y="202" width="120" height="8" rx="4" fill="rgba(0,0,0,0.1)" />
                <rect x="494" y="202" width={`${Math.max(0, Math.min(120, (queuePct / 100) * 120))}`} height="8" rx="4" fill="#7C3AED" />
                <text x="494" y="224" fontSize="11" fill="#5B6472">drains {QUEUE_DRAIN_PER_S}/s</text>
              </g>
            </svg>
            <p className="mt-1 text-xs leading-snug text-ink-2">
              {Math.round(sim.served)} requests served · {Math.round(sim.dropped)} dropped past capacity ·
              ${costMo.toFixed(2)}/mo at this fleet · ${costPerK.toFixed(4)} per 1,000 requests.
            </p>
          </div>
        </div>

        {/* Right rail: AZs, database, storage */}
        <div className="flex flex-col gap-2.5 lg:col-start-3 lg:row-start-1">
          {AZS.map((az) => (
            <div key={az} className={`rounded-xl border p-2.5 ${sim.azDown[az] ? 'border-red-500/40 bg-red-500/5' : 'border-black/10 glass-1'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink-1">{az} <span className="font-mono text-[11px] font-normal text-ink-3">region us-east-1</span></p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sim.azDown[az] ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                  {sim.azDown[az] ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {sim.azDown[az] ? 'DOWN' : 'UP'}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-2">
                <Server size={13} /> {dist[az]} instance(s) · {sim.azDown[az] ? '0 running' : `${dist[az]} running`}
              </p>
              <button
                type="button"
                onClick={() => (sim.azDown[az] ? restore(az) : kill(az))}
                className={`mt-2 w-full rounded-lg px-2 py-1 text-xs font-semibold ${sim.azDown[az] ? 'glass-btn' : 'border border-red-500/40 text-red-700'}`}
              >
                {sim.azDown[az] ? `Restore ${az}` : `Kill ${az}`}
              </button>
            </div>
          ))}

          <div className="rounded-xl border border-black/10 glass-1 p-2.5">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
              <Database size={13} /> Database — multi-AZ
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-ink-2">
              <li><strong className="text-ink-1">Primary:</strong> {sim.db.primaryAz}</li>
              <li><strong className="text-ink-1">Sync standby:</strong> {sim.db.standbyAz} (auto failover)</li>
              <li><strong className="text-ink-1">Read replica:</strong> {sim.db.replicaAz} {sim.db.replicaUp ? '(async, reads only)' : '(LOST — cannot fail over)'}</li>
            </ul>
            <button
              type="button"
              onClick={probe}
              className="mt-2 w-full rounded-lg border border-black/10 glass-1 px-2 py-1 text-xs font-semibold text-ink-1"
            >
              Probe DB from the internet
            </button>
            {probeNote && (
              <p className="mt-1.5 text-[11px] leading-snug text-red-700">{probeNote}</p>
            )}
          </div>

          <div className="rounded-xl border border-black/10 glass-1 p-2.5">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
              <HardDrive size={13} /> Storage
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-ink-2">
              <li><strong className="text-ink-1">Object (S3-style):</strong> {`${objects} objects · unlimited, pay per GB, 11 9s durability.`}</li>
              <li><strong className="text-ink-1">Block (EBS gp3):</strong> 100 GB attached to the DB — survives an instance loss.</li>
            </ul>
            <button
              type="button"
              onClick={() => { setObjects((n) => n + 1); logEvent(simRef.current, 'Snapshot stored in object storage — objects are for files and backups, not for a running OS.'); bump(); }}
              className="mt-2 w-full rounded-lg border border-black/10 glass-1 px-2 py-1 text-xs font-semibold text-ink-1"
            >
              Store snapshot (object)
            </button>
          </div>
        </div>

        {/* VPC config, under the controls rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
            <Cloud size={13} /> VPC config — updates live
          </p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900]">{vpcConfig(sim, { model, deployment, pricing })}</pre>
        </div>

        {/* Event log, under the AZ rail */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
            <Activity size={13} /> Event log
          </p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No events yet. Raise the traffic, burst the queue, or kill an AZ.</p>
            ) : (
              <ul className="space-y-1.5">
                {sim.events.map((event) => (
                  <li key={event.id} className="text-[13px] text-ink-2">
                    <span className="font-mono text-[11px] text-ink-3">{event.time}</span> — {event.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Below the fold: the lab itself — brief, exercises, debrief. */}
      <div className="mt-8 space-y-6">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the cloud</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            One VPC, two availability zones, a fleet that scales itself and a database that must never go down.
            Drive the cloud above: pick a service model, push traffic, burst the queue, kill an AZ — and watch
            the bill move with the fleet.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Assign each layer to provider or customer under IaaS, PaaS and SaaS.</li>
                <li>Scale the fleet out under traffic and back in when it falls.</li>
                <li>Fail over across availability zones — including the database.</li>
                <li>Read the cost meter in both pricing models.</li>
                <li>Prove the database is unreachable from the internet.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li><strong className="text-ink-1">Shared responsibility</strong> — the customer always owns data + access.</li>
                <li><strong className="text-ink-1">IaaS / PaaS / SaaS</strong> — who runs which layer shifts per model.</li>
                <li><strong className="text-ink-1">Elasticity vs scalability</strong> — shrink automatically, not just grow.</li>
                <li><strong className="text-ink-1">Multi-AZ</strong> — sync standby fails over; async read replica never does.</li>
                <li><strong className="text-ink-1">VPC + security groups</strong> — one group per tier; DB only trusts the app tier.</li>
                <li><strong className="text-ink-1">Pay-as-you-go vs reserved</strong> — hourly rate vs committed discount.</li>
                <li><strong className="text-ink-1">Serverless</strong> — pay per invocation, not per hour.</li>
                <li><strong className="text-ink-1">Object vs block storage</strong> — files and backups vs a disk for one instance.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Run the responsibility drill.</strong> With IaaS selected, assign the
              operating system (customer) and the hypervisor (provider). Switch to PaaS, then SaaS, and watch
              the boundary move — while data and access stay yours every time.
            </li>
            <li>
              <strong className="text-ink-1">Surge the fleet.</strong> Raise traffic to 360 req/s and watch the fleet
              scale 2 → 8, one instance a second. Drop traffic back to 60 and watch it scale in — and the
              cost per hour fall with it.
            </li>
            <li>
              <strong className="text-ink-1">Kill AZ-A.</strong> Traffic moves to AZ-B and the database fails over to
              its sync standby with no data loss. Restore AZ-A, then kill AZ-B: the read replica is lost, and
              its failover fails as designed — reads fall back to the primary.
            </li>
            <li>
              <strong className="text-ink-1">Burst the queue.</strong> Hit Burst +140 and watch the queue drain at
              68/s while p95 falls as it drains. Each drained message is one serverless invocation.
            </li>
            <li>
              <strong className="text-ink-1">Price the same fleet twice.</strong> At 8 instances, flip pricing from
              pay-as-you-go to reserved and compare the cost per hour — then check the monthly figure in the
              config panel.
            </li>
            <li>
              <strong className="text-ink-1">Probe the database.</strong> Hit Probe DB from the internet and confirm
              it is blocked. Find the security-group rule in the VPC config panel that stops it.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The fleet scaled 2 → 8 at 360 req/s and back in when traffic fell — elasticity, not just scalability.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Killing AZ-A moved traffic and promoted the sync standby — no data loss, because replication is synchronous.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The read replica did not fail over — async copies never take over; reads fell back to the primary.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The 140-message burst drained at 68/s and p95 fell as it drained.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Reserved pricing cut the cost per hour at the same fleet size.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The internet probe to the database was blocked by the DB security group.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <div className="mt-2 space-y-2">
            {checkYourself.map((item, i) => (
              <div key={item.q} className="rounded-lg border border-black/10 p-3">
                <p className="text-sm font-semibold text-ink-1">{item.q}</p>
                {revealed[i] ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.a}</p>
                ) : (
                  <button type="button" onClick={() => toggleReveal(i)} className="mt-1.5 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1">
                    Reveal answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
