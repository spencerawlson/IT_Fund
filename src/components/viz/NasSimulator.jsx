import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import {
  BAY_COUNT,
  RAID_LEVELS,
  raidInfo,
  clampDiskCount,
  usableCapacityTb,
  faultTolerance,
  createNas,
  failedCount,
  arrayStatus,
  failDisk,
  hotSwapDisk,
  advanceRebuild,
  setRaid,
  setDiskCount,
  targetCacheHitRate,
  throughputMBps,
  nasConf,
} from '@/lib/nas';

const TICK_MS = 100;
const REBUILD_STEP = 1;
const MAX_HISTORY = 60;
const MAX_EVENTS = 8;

function freshSim() {
  return {
    nas: createNas('raid5', BAY_COUNT),
    hitRate: 0,
    throughputHistory: [],
    events: [],
    tickCount: 0,
    nextId: 1,
  };
}

function ThroughputChart({ history }) {
  const width = 600;
  const height = 120;
  const max = 1000;
  const points = history.map((v, i) => {
    const x = history.length <= 1 ? 0 : (i / (MAX_HISTORY - 1)) * width;
    const y = height - (Math.min(v, max) / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Throughput</p>
        <p className="text-[11px] text-ink-3">last {MAX_HISTORY} s · MB/s</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" role="img" aria-label="Throughput over the last minute">
        {[250, 500, 750].map((v) => {
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
          <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="12" fill="#5B6472">serving requests…</text>
        )}
      </svg>
    </div>
  );
}

function QuizQuestion({ question, answer }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <li className="rounded-xl border border-black/10 glass-1 p-3">
      <p className="text-[13px] font-semibold text-ink-1">{question}</p>
      {revealed ? (
        <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{answer}</p>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="mt-1.5 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1">
          Reveal answer
        </button>
      )}
    </li>
  );
}

export default function NasSimulator() {
  const [load, setLoad] = useState(60);
  const [readMix, setReadMix] = useState(80);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const settingsRef = useRef({ load, readMix, cacheEnabled });
  settingsRef.current = { load, readMix, cacheEnabled };
  const prevStatusRef = useRef('OPTIMAL');

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const nas = sim.nas;
      const was = arrayStatus(nas);
      advanceRebuild(nas, REBUILD_STEP);
      const now = arrayStatus(nas);
      if (was === 'REBUILDING' && now === 'OPTIMAL') {
        logEvent(sim, 'Rebuild finished — array is OPTIMAL again.');
      } else if (was === 'REBUILDING' && now === 'DEGRADED') {
        logEvent(sim, 'Rebuild finished, but a disk is still failed — hot-swap it too.');
      }
      prevStatusRef.current = now;
      const target = targetCacheHitRate(settingsRef.current.cacheEnabled, settingsRef.current.readMix);
      sim.hitRate += (target - sim.hitRate) * 0.08;
      sim.tickCount += 1;
      if (sim.tickCount % 10 === 0) {
        const t = throughputMBps(nas, settingsRef.current.load);
        sim.throughputHistory = [...sim.throughputHistory, t].slice(-MAX_HISTORY);
      }
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const nas = sim.nas;
  const status = arrayStatus(nas);
  const info = raidInfo(nas.raid);
  const capacity = usableCapacityTb(nas.raid, nas.diskCount, nas.diskSizeTb);
  const tolerance = faultTolerance(nas.raid);
  const throughput = throughputMBps(nas, load);
  const hitRate = Math.round(sim.hitRate);
  const failed = failedCount(nas);

  const reset = () => {
    simRef.current = freshSim();
    prevStatusRef.current = 'OPTIMAL';
    bump();
  };

  const changeRaid = (raidId) => {
    setRaid(sim.nas, raidId);
    logEvent(sim, `Switched to ${raidInfo(raidId).label} — array re-initialised, ${usableCapacityTb(raidId, sim.nas.diskCount)} TB usable.`);
    bump();
  };

  const changeDiskCount = (count) => {
    const clamped = clampDiskCount(nas.raid, count);
    if (clamped === nas.diskCount) return;
    setDiskCount(sim.nas, clamped);
    logEvent(sim, `Array rebuilt with ${clamped} disks — ${usableCapacityTb(nas.raid, clamped)} TB usable.`);
    bump();
  };

  const onFailDisk = (index) => {
    failDisk(sim.nas, index);
    const now = arrayStatus(sim.nas);
    logEvent(sim, now === 'LOST'
      ? `Bay ${index + 1} failed — the array is LOST.`
      : `Bay ${index + 1} failed — array is ${now}. Hot-swap it to rebuild.`);
    bump();
  };

  const onHotSwap = (index) => {
    hotSwapDisk(sim.nas, index);
    logEvent(sim, `Bay ${index + 1} hot-swapped — rebuild started while the NAS keeps serving.`);
    bump();
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  const statusTone = status === 'OPTIMAL'
    ? 'bg-emerald-500/10 text-emerald-700'
    : status === 'LOST'
      ? 'bg-red-500/10 text-red-700'
      : 'bg-amber-500/10 text-amber-700';

  // One screen on desktop: RAID controls on the left, counters + data flow
  // in the middle, the drive bays on the right. The cache hit rate sits
  // directly under the primary counters. On narrow screens the rails stack
  // in reading order. Lab brief, exercises and debrief sit below the fold.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: RAID level + workload controls */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">RAID level</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label="RAID level">
            {RAID_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => changeRaid(level.id)}
                aria-pressed={nas.raid === level.id}
                title={level.blurb}
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight transition ${
                  nas.raid === level.id ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-ink-2">{info.blurb} Switching RAID re-initialises the array.</p>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-1 text-[13px] font-semibold text-ink-1">
              Disks in array
              <button type="button" onClick={() => changeDiskCount(nas.diskCount - 1)} disabled={nas.diskCount <= info.minDisks} aria-label="Fewer disks" className="rounded border border-black/10 px-1.5 py-0.5 disabled:opacity-40">−</button>
              <span className="w-4 text-center tabular-nums">{nas.diskCount}</span>
              <button type="button" onClick={() => changeDiskCount(nas.diskCount + 1)} disabled={nas.diskCount >= BAY_COUNT} aria-label="More disks" className="rounded border border-black/10 px-1.5 py-0.5 disabled:opacity-40">+</button>
              <span className="text-[11px] font-normal text-ink-3">min {info.minDisks}</span>
            </div>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Client load — {load}%</span>
              <input type="range" min="0" max="100" step="5" value={load} onChange={(e) => setLoad(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Client load" />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Reads — {readMix}% of requests</span>
              <input type="range" min="0" max="100" step="5" value={readMix} onChange={(e) => setReadMix(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Read share of requests" />
              <span className="text-[11px] leading-snug text-ink-3">Repeated reads hit the NVMe cache; writes and cold reads go to disk.</span>
            </label>
            <button
              type="button"
              onClick={() => setCacheEnabled((c) => !c)}
              aria-pressed={cacheEnabled}
              className={`w-full rounded-lg px-2 py-1.5 text-[13px] font-semibold ${cacheEnabled ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'}`}
            >
              M.2 NVMe cache: {cacheEnabled ? 'on' : 'off'}
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => setPaused((p) => !p)} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={reset} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
              Reset
            </button>
          </div>
        </div>

        {/* Middle: counters, cache hit rate, data flow, throughput chart */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="grid grid-cols-3 gap-2">
            {metric('usable capacity', `${capacity} TB`)}
            {metric('fault tolerance', `${tolerance} disk${tolerance === 1 ? '' : 's'}`)}
            <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Array status</p>
              <p className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-base font-bold ${statusTone}`}>
                {status === 'OPTIMAL' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {status}
              </p>
            </div>
          </div>

          {/* Derived metric, directly under the primary counters. */}
          <div className="mt-2 rounded-xl border border-black/10 glass-1 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">NVMe cache hit rate</p>
              <p className="text-base font-bold tabular-nums text-ink-1">{hitRate}% <span className="text-xs font-normal text-ink-3">· {throughput} MB/s serving</span></p>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
              <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${hitRate}%` }} />
            </div>
            {status === 'REBUILDING' && (
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Rebuild progress</p>
                  <p className="text-sm font-bold tabular-nums text-ink-1">{nas.rebuildProgress}%</p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${nas.rebuildProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Data flow: clients → network → cache → RAID array. */}
          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">How a request flows</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-center text-[12px] font-semibold text-ink-1">
              <span className="rounded-lg border border-black/10 px-2 py-1.5">Clients<br /><span className="font-normal text-ink-3">SMB / NFS · iSCSI</span></span>
              <span aria-hidden="true">→</span>
              <span className="rounded-lg border border-black/10 px-2 py-1.5">4× 2.5/10 GbE<br /><span className="font-normal text-ink-3">file + VM storage</span></span>
              <span aria-hidden="true">→</span>
              <span className="rounded-lg border border-black/10 px-2 py-1.5">M.2 NVMe cache<br /><span className="font-normal text-ink-3">{cacheEnabled ? 'on' : 'off'}</span></span>
              <span aria-hidden="true">→</span>
              <span className="rounded-lg border border-black/10 px-2 py-1.5">{info.label} array<br /><span className="font-normal text-ink-3">{nas.diskCount} × {nas.diskSizeTb} TB</span></span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
              <Activity size={14} />
              {status === 'LOST'
                ? 'Array lost — nothing is being served. Reset to start over.'
                : `Serving ${throughput} MB/s at ${load}% load${status === 'REBUILDING' ? ' — slower while the rebuild runs' : status === 'DEGRADED' ? ' — slower with a disk down' : ''}.`}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <ThroughputChart history={sim.throughputHistory} />
          </div>
        </div>

        {/* Right rail: the appliance — 8 hot-swap bays */}
        <div className="flex flex-col gap-2.5 lg:col-start-3 lg:row-start-1">
          <div className="rounded-xl border border-black/10 glass-1 p-2.5">
            <p className="font-bold text-ink-1">NAS appliance</p>
            <p className="text-[11px] text-ink-3">8 hot-swap bays · redundant PSUs · 4× 2.5/10 GbE</p>
            <p className="mt-1 text-[11px] text-ink-2">
              <span className="font-semibold text-emerald-700">PSU A ✓</span> · <span className="font-semibold text-emerald-700">PSU B ✓</span>
              {' '}· {failed === 0 ? 'all bays healthy' : `${failed} bay${failed === 1 ? '' : 's'} failed`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: BAY_COUNT }, (_, i) => {
              const disk = nas.disks[i];
              const isEmpty = !disk;
              const state = isEmpty ? 'empty' : disk.status;
              return (
                <div key={i} className={`rounded-xl border p-2 ${state === 'failed' || status === 'LOST' ? 'border-red-500/40 bg-red-500/5' : state === 'rebuilding' ? 'border-amber-500/40 bg-amber-500/5' : 'border-black/10 glass-1'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <p className="flex items-center gap-1 text-[13px] font-bold text-ink-1">
                      <HardDrive size={13} /> Bay {i + 1}
                    </p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${state === 'online' ? 'bg-emerald-500/10 text-emerald-700' : state === 'rebuilding' ? 'bg-amber-500/10 text-amber-700' : state === 'failed' ? 'bg-red-500/10 text-red-700' : 'bg-black/5 text-ink-3'}`}>
                      {isEmpty ? 'Empty' : state === 'online' ? 'Online' : state === 'rebuilding' ? 'Rebuilding' : 'Failed'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-3">{isEmpty ? 'not in array' : `${nas.diskSizeTb} TB · ${info.label}`}</p>
                  {!isEmpty && (
                    <div className="mt-1.5">
                      {disk.status === 'failed' ? (
                        <button type="button" onClick={() => onHotSwap(i)} disabled={status === 'LOST'} className="w-full rounded-lg glass-btn px-2 py-1 text-xs font-semibold disabled:opacity-40">
                          Hot-swap disk
                        </button>
                      ) : (
                        <button type="button" onClick={() => onFailDisk(i)} disabled={status === 'LOST'} className="w-full rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40">
                          Fail disk
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-ink-3">Each row is one mirror pair — RAID 10 survives one failure per pair, but loses the array if both disks of a pair fail.</p>
        </div>

        {/* Storage config, under the RAID rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Storage config — updates live</p>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900]">{nasConf(nas, cacheEnabled)}</pre>
        </div>

        {/* Array event log, under the bays */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Array event log</p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No array events yet. Fail a disk, or switch RAID levels and watch the capacity move.</p>
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

      {/* Below the fold: lab brief, exercises, debrief */}
      <div className="mt-6 space-y-4">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — NAS storage</h3>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">
            A NAS is shared storage on the network: one appliance with hot-swap bays, redundant power and
            fast network ports, serving files over SMB/NFS and block storage over iSCSI to VMs. The RAID
            level decides what a disk failure costs you — and whether the array survives the rebuild.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink-2">
                <li>Explain what each RAID level protects against and what it costs in usable capacity.</li>
                <li>Hot-swap a failed disk and watch the array rebuild while it keeps serving files.</li>
                <li>Predict what a second failure during a rebuild does on RAID 5 versus RAID 6.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink-2">
                <li>RAID 0: no redundancy. RAID 1: mirror. RAID 5: one parity disk. RAID 6: two.</li>
                <li>RAID 5 survives one failure, RAID 6 survives two; RAID 10 needs at least 4 disks.</li>
                <li>Hot-swap rebuild happens while serving — slower, but no downtime.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-snug text-ink-2">
            <li>Switch through all five RAID levels. Note the usable capacity and fault tolerance of each on 8 × 4 TB disks.</li>
            <li>On RAID 5, fail one disk. The array goes DEGRADED but keeps serving. Hot-swap it and watch the rebuild return it to OPTIMAL.</li>
            <li>On RAID 5, fail a disk, hot-swap it, then fail a second disk while the rebuild is running. The array is LOST. Reset, switch to RAID 6, and repeat — this time the array survives and the rebuild finishes.</li>
            <li>On RAID 10, fail two disks in different mirror pairs (rows) — the array survives. Reset, then fail both disks of one pair — the array is lost.</li>
            <li>Turn the NVMe cache off and watch the hit rate and throughput fall; turn it back on and watch them recover.</li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-snug text-ink-2">
            <li>RAID 0 is the fastest and the most fragile: one disk loss loses everything.</li>
            <li>RAID 5 pays one disk for parity and survives one failure — but a second failure during the rebuild loses the array.</li>
            <li>RAID 6 pays two disks for parity and survives two failures, including one mid-rebuild.</li>
            <li>RAID 10 mirrors pairs: it survives one failure per pair, not two in the same pair.</li>
            <li>A hot-swap rebuild keeps serving files, slower, with no downtime — and the NVMe cache lifts hit rate for repeated reads without ever replacing redundancy.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <ul className="mt-2 space-y-2">
            <QuizQuestion
              question="An 8-disk RAID 5 array of 4 TB disks: how much usable capacity?"
              answer="(8 − 1) × 4 TB = 28 TB. One disk's worth of space holds the parity."
            />
            <QuizQuestion
              question="A RAID 5 array is rebuilding after a hot-swap when a second disk fails. What happens?"
              answer="The array is lost. RAID 5 tolerates only one failure, and the rebuild had not finished yet."
            />
            <QuizQuestion
              question="Why does RAID 6 survive that same scenario?"
              answer="Dual parity: RAID 6 tolerates two failures at once, so one failure mid-rebuild still leaves the array intact."
            />
            <QuizQuestion
              question="Which RAID level mirrors two disks, and what is its usable capacity with 4 TB disks?"
              answer="RAID 1. Two 4 TB disks mirror each other, so 4 TB is usable."
            />
          </ul>
        </section>
      </div>
    </div>
  );
}
