import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Zap, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import LoadBalancerDiagram, { LoadBalancerCounters } from './LoadBalancerDiagram';
import {
  ALGORITHMS,
  SERVER_CAPACITY,
  MAX_FAILS,
  FAIL_TIMEOUT_MS,
  createServers,
  createRoutingState,
  pickServer,
  requestLatencyMs,
  requestHoldMs,
  summarizeLatencies,
  nginxConf,
} from '@/lib/loadBalancer';

const TICK_MS = 100;
const MAX_LATENCIES = 200;
const MAX_HISTORY = 60;
const MAX_EVENTS = 8;

function serverRowTop(index, count) {
  return ((index + 0.5) / count) * 100;
}

/** Dot position along client → balancer → server, from progress 0..1.
 * Failed requests never reach a server: they stop at the balancer. */
function dotPosition(dot, serverCount) {
  const progress = dot.type === 'failed' ? Math.min(dot.progress, 0.35) : dot.progress;
  const leg1End = 0.35;
  if (progress <= leg1End) {
    const t = progress / leg1End;
    return { x: 10 + (40 - 10) * t, y: 50 + (22 - 50) * t };
  }
  const t = (dot.progress - leg1End) / (1 - leg1End);
  return { x: 40 + (78 - 40) * t, y: 22 + (serverRowTop(dot.serverIndex, serverCount) - 22) * t };
}

function freshSim(serverCount) {
  return {
    servers: createServers(serverCount),
    routing: createRoutingState(),
    dots: [],
    latencies: [],
    p95History: [],
    sent: 0,
    completed: 0,
    failed503: 0,
    events: [],
    spawnAcc: 0,
    spawnTimes: [],
    tickCount: 0,
    nextId: 1,
  };
}

function P95Chart({ history }) {
  const width = 600;
  const height = 120;
  const max = 1000;
  const points = history.map((v, i) => {
    const x = history.length <= 1 ? 0 : (i / (MAX_HISTORY - 1)) * width;
    const y = height - Math.min(v, max) / max * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">p95 response time</p>
        <p className="text-[11px] text-ink-3">last {MAX_HISTORY} s · ms</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" role="img" aria-label="p95 response time over the last minute">
        {[100, 400, 900].map((v) => {
          const y = height - (v / max) * height;
          return (
            <g key={v}>
              <line x1="0" x2={width} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
              <text x="4" y={y - 3} fontSize="10" fill="#5B6472">{v}</text>
            </g>
          );
        })}
        {points && <polyline points={points} fill="none" stroke="#7C3AED" strokeWidth="2" />}
        {history.length === 0 && (
          <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="12" fill="#5B6472">waiting for completed requests…</text>
        )}
      </svg>
    </div>
  );
}

export default function LoadBalancerSimulator() {
  const [algorithm, setAlgorithm] = useState('round-robin');
  const [traffic, setTraffic] = useState(6);
  const [pattern, setPattern] = useState('steady');
  const [checkoutMix, setCheckoutMix] = useState(20);
  const [serverCount, setServerCount] = useState(3);
  const [paused, setPaused] = useState(false);
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim(3));
  const settingsRef = useRef({ algorithm, traffic, pattern, checkoutMix });
  settingsRef.current = { algorithm, traffic, pattern, checkoutMix };

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  const markDown = (sim, index, reason) => {
    const server = sim.servers[index];
    if (!server.healthy) return;
    server.healthy = false;
    server.downUntil = Date.now() + FAIL_TIMEOUT_MS;
    server.consecutiveFails = 0;
    logEvent(sim, `${server.name} is DOWN — ${reason}. Skipped for 10 s.`);
  };

  const spawnRequest = (sim, now) => {
    const { algorithm: algo, checkoutMix: mix } = settingsRef.current;
    const type = Math.random() * 100 < mix ? 'checkout' : 'page';
    const ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const index = pickServer(algo, sim.servers, sim.routing, { ip });
    sim.sent += 1;
    sim.spawnTimes.push(now);
    if (index === -1) {
      sim.failed503 += 1;
      sim.dots.push({ id: sim.nextId, type: 'failed', serverIndex: -1, progress: 0, durationMs: 600 });
      sim.nextId += 1;
      return;
    }
    const server = sim.servers[index];
    if (server.active >= SERVER_CAPACITY) {
      server.failed += 1;
      server.consecutiveFails += 1;
      sim.failed503 += 1;
      sim.dots.push({ id: sim.nextId, type: 'failed', serverIndex: index, progress: 0, durationMs: 900 });
      sim.nextId += 1;
      if (server.consecutiveFails >= MAX_FAILS) markDown(sim, index, `${MAX_FAILS} consecutive 503s`);
      return;
    }
    server.active += 1;
    server.consecutiveFails = 0;
    const durationMs = requestHoldMs(type) / server.speed;
    sim.dots.push({ id: sim.nextId, type, serverIndex: index, progress: 0, durationMs });
    sim.nextId += 1;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const now = Date.now();
      const { traffic: rate, pattern: pat } = settingsRef.current;
      // Spawn: steady traffic is even; bursty traffic arrives in waves.
      const burstFactor = pat === 'bursty' ? (Math.random() < 0.22 ? 4 : 0.35) : 1;
      sim.spawnAcc += (rate * burstFactor * TICK_MS) / 1000;
      while (sim.spawnAcc >= 1) {
        sim.spawnAcc -= 1;
        spawnRequest(sim, now);
      }
      // Advance in-flight requests; a finished one records its latency.
      // Failed requests only travel as far as the balancer, then fade.
      const remaining = [];
      for (const dot of sim.dots) {
        dot.progress += TICK_MS / dot.durationMs;
        const doneAt = dot.type === 'failed' ? 0.5 : 1;
        if (dot.progress >= doneAt) {
          if (dot.type !== 'failed' && dot.serverIndex >= 0) {
            const server = sim.servers[dot.serverIndex];
            const latency = requestLatencyMs(server, dot.type);
            sim.latencies = [...sim.latencies, latency].slice(-MAX_LATENCIES);
            sim.completed += 1;
            server.completed += 1;
            server.active = Math.max(0, server.active - 1);
          }
        } else {
          remaining.push(dot);
        }
      }
      sim.dots = remaining;
      // Health checks: a down server rejoins after its fail timeout.
      sim.servers.forEach((server) => {
        if (!server.healthy && server.downUntil && now >= server.downUntil) {
          server.healthy = true;
          server.downUntil = null;
          logEvent(sim, `${server.name} passed its health check and rejoined the pool.`);
        }
      });
      // Once a second, sample p95 for the chart and prune the request rate.
      sim.tickCount += 1;
      if (sim.tickCount % 10 === 0) {
        const { p95 } = summarizeLatencies(sim.latencies);
        sim.p95History = [...sim.p95History, p95].slice(-MAX_HISTORY);
      }
      sim.spawnTimes = sim.spawnTimes.filter((t) => now - t <= 1000);
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const stats = summarizeLatencies(sim.latencies);
  const healthyCount = sim.servers.filter((s) => s.healthy).length;
  const reqPerSec = sim.spawnTimes.length;
  const diagramServers = sim.servers.map((s) => ({
    name: s.name,
    conns: s.active,
    max: SERVER_CAPACITY,
    status: !s.healthy ? 'down' : s.active >= SERVER_CAPACITY ? 'overloaded' : 'ok',
  }));
  const dots = sim.dots.map((dot) => {
    const pos = dot.type === 'failed' && dot.serverIndex === -1
      ? { x: 10 + (40 - 10) * Math.min(dot.progress / 0.35, 1), y: 50 + (22 - 50) * Math.min(dot.progress / 0.35, 1) }
      : dotPosition(dot, sim.servers.length);
    return { id: dot.id, type: dot.type, x: pos.x, y: pos.y };
  });

  const reset = (count = serverCount) => {
    simRef.current = freshSim(count);
    bump();
  };

  const changeServerCount = (count) => {
    setServerCount(count);
    reset(count);
  };

  const burst = () => {
    const simNow = simRef.current;
    for (let i = 0; i < 25; i += 1) spawnRequest(simNow, Date.now());
    bump();
  };

  const toggleServer = (index) => {
    const simNow = simRef.current;
    const server = simNow.servers[index];
    if (server.healthy) {
      markDown(simNow, index, 'killed by hand');
    } else {
      server.healthy = true;
      server.downUntil = null;
      server.consecutiveFails = 0;
      logEvent(simNow, `${server.name} was revived by hand.`);
    }
    bump();
  };

  const updateServer = (index, patch) => {
    Object.assign(simRef.current.servers[index], patch);
    bump();
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 rounded-xl glass-1 p-4">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Balancing strategy</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Balancing strategy">
          {ALGORITHMS.map((algo) => (
            <button
              key={algo.id}
              type="button"
              onClick={() => setAlgorithm(algo.id)}
              aria-pressed={algorithm === algo.id}
              title={algo.blurb}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                algorithm === algo.id ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
              }`}
            >
              {algo.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-2">{ALGORITHMS.find((a) => a.id === algorithm)?.blurb}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-ink-1">Traffic — {traffic} req/s</span>
            <input type="range" min="1" max="20" value={traffic} onChange={(e) => setTraffic(Number(e.target.value))} className="mt-1 w-full accent-[#7C3AED]" aria-label="Traffic in requests per second" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-1">Checkouts — {checkoutMix}% of requests</span>
            <input type="range" min="0" max="50" step="5" value={checkoutMix} onChange={(e) => setCheckoutMix(Number(e.target.value))} className="mt-1 w-full accent-[#7C3AED]" aria-label="Checkout share of requests" />
            <span className="text-xs text-ink-3">Checkouts hold a connection open for seconds; page views finish fast.</span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Traffic pattern">
            {['steady', 'bursty'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPattern(p)}
                aria-pressed={pattern === p}
                className={`px-3 py-1.5 text-sm font-semibold capitalize ${pattern === p ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1">
            <span className="text-sm font-semibold text-ink-1">Servers</span>
            <button type="button" onClick={() => changeServerCount(Math.max(2, serverCount - 1))} disabled={serverCount <= 2} aria-label="Fewer servers" className="rounded px-2 py-0.5 text-sm font-bold text-ink-1 disabled:opacity-40">−</button>
            <span className="w-4 text-center text-sm font-bold tabular-nums">{serverCount}</span>
            <button type="button" onClick={() => changeServerCount(Math.min(6, serverCount + 1))} disabled={serverCount >= 6} aria-label="More servers" className="rounded px-2 py-0.5 text-sm font-bold text-ink-1 disabled:opacity-40">+</button>
          </div>
          <button type="button" onClick={burst} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 glass-1 px-3 py-1.5 text-sm font-semibold text-ink-1">
            <Zap size={15} /> Burst ×25
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 glass-1 px-3 py-1.5 text-sm font-semibold text-ink-1">
            {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" onClick={() => reset()} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 glass-1 px-3 py-1.5 text-sm font-semibold text-ink-1">
            <RotateCcw size={15} /> Reset
          </button>
        </div>
      </div>

      <LoadBalancerCounters p95={stats.p95} errors503={sim.failed503} healthy={`${healthyCount}/${sim.servers.length}`} />
      <LoadBalancerDiagram
        servers={diagramServers}
        dots={dots}
        balancerLabel={ALGORITHMS.find((a) => a.id === algorithm)?.label || 'LOAD BALANCER'}
      />

      {/* Live metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {metric('req/s', reqPerSec)}
        {metric('completed', sim.completed)}
        {metric('503s', sim.failed503)}
        {metric('avg', `${stats.avg} ms`)}
        {metric('p95', `${stats.p95} ms`)}
        {metric('p99', `${stats.p99} ms`)}
      </div>

      <div className="mt-4 rounded-xl border border-black/10 glass-1 p-4">
        <P95Chart history={sim.p95History} />
      </div>

      {/* Per-server cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sim.servers.map((server, i) => (
          <div key={server.id} className={`rounded-xl border p-3 ${server.healthy ? 'border-black/10 glass-1' : 'border-red-500/40 bg-red-500/5'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-ink-1">{server.name} <span className="font-mono text-xs font-normal text-ink-3">{server.host}</span></p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${server.healthy ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                {server.healthy ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {server.healthy ? 'healthy' : 'DOWN'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-2">
              <Activity size={13} />
              <span>{server.active} / {SERVER_CAPACITY} conns</span>
              <span>· {server.completed} done</span>
              <span>· {server.failed} 503s</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
              <div className={`h-full rounded-full ${server.healthy ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (server.active / SERVER_CAPACITY) * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-ink-1">
                Weight
                <button type="button" onClick={() => updateServer(i, { weight: Math.max(1, server.weight - 1) })} disabled={server.weight <= 1} aria-label={`Lower weight of ${server.name}`} className="rounded border border-black/10 px-1.5 py-0.5 disabled:opacity-40">−</button>
                <span className="w-3 text-center tabular-nums">{server.weight}</span>
                <button type="button" onClick={() => updateServer(i, { weight: Math.min(3, server.weight + 1) })} disabled={server.weight >= 3} aria-label={`Raise weight of ${server.name}`} className="rounded border border-black/10 px-1.5 py-0.5 disabled:opacity-40">+</button>
              </span>
              <button
                type="button"
                onClick={() => updateServer(i, { speed: server.speed < 1 ? 1 : 0.5 })}
                aria-pressed={server.speed < 1}
                title="A slow server answers late and holds connections open."
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${server.speed < 1 ? 'bg-amber-500/15 text-amber-700' : 'border border-black/10 text-ink-2'}`}
              >
                {server.speed < 1 ? 'Slow server' : 'Normal speed'}
              </button>
              <button
                type="button"
                onClick={() => toggleServer(i)}
                className={`ml-auto rounded-lg px-2 py-1 text-xs font-semibold ${server.healthy ? 'border border-red-500/40 text-red-700' : 'glass-btn'}`}
              >
                {server.healthy ? 'Kill server' : 'Revive server'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* nginx.conf + event log */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">nginx.conf — updates live</p>
          <pre className="overflow-x-auto rounded-xl bg-[#002B36] p-3 font-mono text-xs leading-relaxed text-[#859900]">{nginxConf(algorithm, sim.servers)}</pre>
        </div>
        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Health-check log</p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-sm text-ink-3">No health events yet. Kill a server, or push traffic until one fails 3 health checks in a row.</p>
            ) : (
              <ul className="space-y-1.5">
                {sim.events.map((event) => (
                  <li key={event.id} className="text-sm text-ink-2">
                    <span className="font-mono text-xs text-ink-3">{event.time}</span> — {event.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
