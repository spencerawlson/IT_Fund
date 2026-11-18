import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, HardDrive, Power, RefreshCw, Thermometer, Zap } from 'lucide-react';
import {
  DRIVE_BAYS,
  PSU_COUNT,
  FAN_COUNT,
  REBUILD_MS,
  BOOT_MS,
  THERMAL_LIMIT_C,
  createRackServer,
  onlineDrives,
  workingPsus,
  workingFans,
  powerDrawW,
  thermalHeadroomC,
  healthStatus,
  tick,
  failDrive,
  pullDrive,
  insertDrive,
  failPsu,
  replacePsu,
  failFan,
  replaceFan,
  bmcPowerOn,
  bmcPowerOff,
  restartOs,
  bmcConsole,
} from '@/lib/rackServer';

const TICK_MS = 250;
const MAX_EVENTS = 8;

const HEALTH_STYLE = {
  healthy: 'bg-emerald-500/10 text-emerald-700',
  degraded: 'bg-amber-500/10 text-amber-700',
  critical: 'bg-red-500/10 text-red-700',
  off: 'bg-black/5 text-ink-2',
};

const DRIVE_STYLE = {
  online: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700',
  failed: 'border-red-500/50 bg-red-500/10 text-red-700',
  rebuilding: 'border-amber-500/50 bg-amber-500/10 text-amber-700',
  empty: 'border-black/10 glass-1 text-ink-3',
};

const EXERCISES = [
  {
    title: 'Drill 1 — Hot-swap a drive',
    steps: [
      'Fail the drive in bay 3 (right rail, Drives).',
      'Pull it out — the server keeps serving while the bay is empty.',
      'Insert a replacement and watch the rebuild finish; the bay comes back online.',
    ],
  },
  {
    title: 'Drill 2 — Out-of-band management',
    steps: [
      'Power the server off from the BMC (left rail) — the OS goes down with it.',
      'Power it back on from the BMC. No keyboard, no monitor, no OS needed.',
      'Watch the boot finish and the OS come back up.',
    ],
  },
  {
    title: 'Drill 3 — PSU failure',
    steps: [
      'Fail PSU 1. The redundant PSU carries the full load — nothing goes down.',
      'Check the event log, then replace PSU 1 to restore redundancy.',
      'Now fail both PSUs: the server loses power, and the BMC refuses to power it on until a PSU is replaced.',
    ],
  },
];

const DEBRIEF = [
  'A failed drive is replaced without downtime: pull, insert, rebuild, online.',
  'One PSU can fail with no interruption; two failures mean power loss.',
  'The BMC powers the box on and off with the OS down — that is what iLO / iDRAC / IPMI is for.',
  'Fans are hot-swappable, but lose too many and heat trips a thermal shutdown.',
];

const CHECK_YOURSELF = [
  {
    q: 'How tall is 1U, and how tall is a 2U server?',
    a: '1U is 44.45 mm, so a 2U server is 88 mm tall (482 mm wide, 710 mm deep).',
  },
  {
    q: 'Why can you pull a failed drive while the server keeps serving?',
    a: 'The 8 bays are hot-swap: the drive slides out live and the replacement rebuilds without a shutdown.',
  },
  {
    q: 'The OS has crashed and the screen is black. How do you power the server back on?',
    a: 'Through the management port — iLO, iDRAC or IPMI gives out-of-band power and console even with the OS down.',
  },
  {
    q: 'One PSU fails. Why does nothing go down?',
    a: 'The two PSUs are redundant: the survivor carries the full load until you swap the failed one.',
  },
];

function freshSim() {
  return { server: createRackServer(), events: [], nextId: 1 };
}

export default function RackServerSimulator() {
  const [load, setLoad] = useState(45);
  const [paused, setPaused] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const settingsRef = useRef({ load });
  settingsRef.current = { load };

  const bump = () => setVersion((v) => v + 1);

  const logEvents = (sim, texts) => {
    for (const text of texts) {
      sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
      sim.nextId += 1;
    }
  };

  const act = (fn) => {
    const sim = simRef.current;
    const text = fn(sim.server);
    if (text) logEvents(sim, [text]);
    bump();
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      sim.server.load = settingsRef.current.load;
      const events = tick(sim.server, TICK_MS);
      if (events.length > 0) logEvents(sim, events);
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const server = sim.server;
  const health = healthStatus(server);
  const draw = powerDrawW(server);
  const headroom = thermalHeadroomC(server);

  const reset = () => {
    simRef.current = freshSim();
    setLoad(45);
    bump();
  };

  const toggleReveal = (index) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  // One screen on desktop: BMC controls on the left, the chassis and
  // metrics in the middle, the swappable parts on the right. Power draw and
  // thermal headroom sit directly under the primary counters. On narrow
  // screens the rails stack in reading order.
  return (
    <div>
      <p className="mb-4 text-sm text-ink-2">
        Drive a live 2U rack server on one screen — hot-swap a drive, fail a PSU, manage it out-of-band while
        the OS is down. Same CPU, RAM and storage as a desktop, repackaged in a flat 19-inch chassis.
      </p>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          {/* Left rail: out-of-band management + workload */}
          <div className="rounded-xl glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Out-of-band management</p>
            <p className="mt-1 text-xs leading-snug text-ink-2">
              The BMC (iLO / iDRAC / IPMI) has power and console even with the OS down.
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => act(bmcPowerOn)}
                disabled={server.power === 'on'}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold disabled:opacity-40 glass-btn"
              >
                <Power size={14} /> Power on (BMC)
              </button>
              <button
                type="button"
                onClick={() => act(bmcPowerOff)}
                disabled={server.power !== 'on'}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1 disabled:opacity-40"
              >
                <Power size={14} /> Power off (BMC)
              </button>
              <button
                type="button"
                onClick={() => act(restartOs)}
                disabled={server.power !== 'on' || server.os === 'booting'}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1 disabled:opacity-40"
              >
                <RefreshCw size={14} /> Restart OS
              </button>
            </div>

            <label className="mt-3 block">
              <span className="text-[13px] font-semibold text-ink-1">Workload — {load}%</span>
              <input type="range" min="0" max="100" step="5" value={load} onChange={(e) => setLoad(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Workload percent" />
              <span className="text-[11px] leading-snug text-ink-3">More load draws more power and makes more heat.</span>
            </label>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setPaused((p) => !p)} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={reset} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Reset
              </button>
            </div>
          </div>

          {/* Health / event log */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Health-check log</p>
            <div className="rounded-xl border border-black/10 glass-1 p-3 lg:flex-1">
              {sim.events.length === 0 ? (
                <p className="text-[13px] text-ink-3">No health events yet. Fail a drive, a PSU or a fan — or power the server off from the BMC.</p>
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
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">

          {/* Middle: counters, derived metrics, chassis front */}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap justify-center gap-2">
              {[
                { label: 'power', value: server.power },
                { label: 'OS', value: server.os },
                { label: 'drives', value: `${onlineDrives(server)}/${DRIVE_BAYS}` },
                { label: 'PSUs', value: `${workingPsus(server)}/${PSU_COUNT}` },
                { label: 'fans', value: `${workingFans(server)}/${FAN_COUNT}` },
              ].map(({ label, value }) => (
                <span key={label} className="rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink-1">
                  {label} <span className="text-ink-2">{value}</span>
                </span>
              ))}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${HEALTH_STYLE[health]}`}>
                {health === 'healthy' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {health}
              </span>
            </div>

            {/* Derived metrics directly */}
            <div className="grid grid-cols-3 gap-2">
              {metric('power draw', `${draw} W`)}
              {metric('thermal headroom', `${headroom} °C`)}
              {metric('requests served', server.served)}
            </div>

            {/* Chassis front: 8 hot-swap bays, PSUs, fans. */}
            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">2U chassis — front</p>
                <p className="text-[11px] text-ink-3">88 × 482 × 710 mm · 1U = 44.45 mm</p>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {server.drives.map((drive) => (
                  <div key={drive.id} className={`rounded-lg border px-1 py-1.5 text-center ${DRIVE_STYLE[drive.status]}`}>
                    <HardDrive size={14} className="mx-auto" />
                    <p className="mt-0.5 text-[11px] font-bold leading-none">Bay {drive.bay}</p>
                    <p className="mt-0.5 text-[10px] leading-none">
                      {drive.status === 'rebuilding' ? `rebuilding ${Math.min(99, Math.round((drive.rebuildMs / REBUILD_MS) * 100))}%` : drive.status}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {server.psus.map((psu) => (
                  <span key={psu.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${psu.status === 'ok' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                    <Zap size={11} /> {psu.label} {psu.status === 'ok' ? 'OK' : 'FAILED'}
                  </span>
                ))}
                {server.fans.map((fan) => (
                  <span key={fan.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${fan.status === 'ok' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                    {fan.label} {fan.status === 'ok' ? 'OK' : 'FAILED'}
                  </span>
                ))}
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                  <Thermometer size={11} /> {server.tempC.toFixed(1)} °C / {THERMAL_LIMIT_C} °C limit
                </span>
              </div>
            </div>
          </div>

          {/* BMC console */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">BMC console — updates live</p>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900] lg:flex-1">{bmcConsole(server)}</pre>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-3">

          {/* Right rail: the swappable parts */}
          <div className="flex flex-col gap-2.5 lg:flex-1">
            <div className="rounded-xl border border-black/10 glass-1 p-2.5">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Drives — 8 hot-swap bays</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {server.drives.map((drive, i) => (
                  <div key={drive.id} className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-0.5 ${DRIVE_STYLE[drive.status]}`}>
                    <span className="text-[11px] font-bold">Bay {drive.bay}</span>
                    {drive.status === 'online' && (
                      <button type="button" onClick={() => act((s) => failDrive(s, i))} aria-label={`Fail drive in bay ${drive.bay}`} className="rounded px-1.5 py-0.5 text-[11px] font-semibold underline">Fail</button>
                    )}
                    {drive.status === 'failed' && (
                      <button type="button" onClick={() => act((s) => pullDrive(s, i))} aria-label={`Pull drive in bay ${drive.bay}`} className="rounded px-1.5 py-0.5 text-[11px] font-semibold underline">Pull</button>
                    )}
                    {drive.status === 'empty' && (
                      <button type="button" onClick={() => act((s) => insertDrive(s, i))} aria-label={`Insert drive in bay ${drive.bay}`} className="rounded px-1.5 py-0.5 text-[11px] font-semibold underline">Insert</button>
                    )}
                    {drive.status === 'rebuilding' && <span className="text-[11px]">rebuilding…</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-2.5">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Power supplies — redundant</p>
              <div className="mt-2 space-y-1.5">
                {server.psus.map((psu, i) => (
                  <div key={psu.id} className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink-1">{psu.label} <span className={psu.status === 'ok' ? 'text-emerald-700' : 'text-red-700'}>· {psu.status === 'ok' ? 'OK' : 'FAILED'}</span></span>
                    {psu.status === 'ok' ? (
                      <button type="button" onClick={() => act((s) => failPsu(s, i))} aria-label={`Fail ${psu.label}`} className="rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-700">Fail {psu.label}</button>
                    ) : (
                      <button type="button" onClick={() => act((s) => replacePsu(s, i))} aria-label={`Replace ${psu.label}`} className="rounded-lg px-2 py-1 text-xs font-semibold glass-btn">Replace {psu.label}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-2.5">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Fans — hot-swap</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {server.fans.map((fan, i) => (
                  <div key={fan.id} className="flex items-center justify-between gap-1 rounded-lg border border-black/10 glass-1 px-2 py-1">
                    <span className="text-[11px] font-bold text-ink-1">{fan.label}</span>
                    {fan.status === 'ok' ? (
                      <button type="button" onClick={() => act((s) => failFan(s, i))} aria-label={`Fail ${fan.label}`} className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-red-700 underline">Fail</button>
                    ) : (
                      <button type="button" onClick={() => act((s) => replaceFan(s, i))} aria-label={`Replace ${fan.label}`} className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 underline">Replace</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below the fold: lab brief, exercises, debrief, check yourself. */}
      <div className="mt-6 space-y-4">
        <section className="rounded-xl glass-1 p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Lab brief — Rack Server</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-1">
            A rack server is a desktop&apos;s parts in a flat 19-inch chassis: 2U tall, 8 hot-swap drive bays,
            redundant power, hot-swap fans, and a management port that stays reachable when the OS is down.
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-1">Objectives</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Hot-swap a drive while the server keeps serving.</li>
            <li>Manage power out-of-band through the BMC (iLO / iDRAC / IPMI).</li>
            <li>Survive a PSU failure on redundancy — and see what two failures do.</li>
          </ul>
          <p className="mt-2 text-sm font-semibold text-ink-1">Exam lens</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Know the 2U numbers (88 × 482 × 710 mm, 1U = 44.45 mm), what hot-swap means for drives, PSUs and
            fans, and that the management port gives power + console with the OS down. Domains D2 / D3.
          </p>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exercises — in order</p>
          <ol className="mt-2 space-y-3">
            {EXERCISES.map((exercise) => (
              <li key={exercise.title}>
                <p className="text-sm font-semibold text-ink-1">{exercise.title}</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-ink-2">
                  {exercise.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Debrief — what you should have seen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
            {DEBRIEF.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-ink-1">Check yourself</p>
          <div className="mt-1.5 space-y-2">
            {CHECK_YOURSELF.map((item, index) => (
              <div key={item.q} className="rounded-lg border border-black/10 glass-1 p-2.5">
                <p className="text-sm font-semibold text-ink-1">{item.q}</p>
                {revealed.has(index) ? (
                  <p className="mt-1 text-sm text-ink-2">{item.a}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleReveal(index)}
                    className="mt-1 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1"
                  >
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

// Referenced in tests so the boot/rebuild durations stay honest.
export const SIM_TIMINGS = { BOOT_MS, REBUILD_MS };
