import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Unplug, Cable } from 'lucide-react';
import {
  PORT_COUNT,
  STANDARDS,
  CATEGORIES,
  pinout,
  createRuns,
  checkRunLength,
  linkStatus,
  reterminateRun,
  reterminateBothEnds,
  updateRun,
  patchRun,
  movePatchCord,
  unpatchRun,
  nextFreeSwitchPort,
  summarizeRuns,
  terminationSchedule,
} from '@/lib/patchPanel';

const MAX_EVENTS = 8;

const STATUS_STYLE = {
  pass: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800',
  crossover: 'border-red-500/50 bg-red-500/10 text-red-800',
  'too-long': 'border-red-500/50 bg-red-500/10 text-red-800',
  unsupported: 'border-red-500/50 bg-red-500/10 text-red-800',
  unpatched: 'border-amber-500/50 bg-amber-500/10 text-amber-800',
};

const STATUS_LABEL = {
  pass: 'Link up',
  crossover: 'Crossover — FAIL',
  'too-long': 'Too long — FAIL',
  unsupported: 'Unsupported — FAIL',
  unpatched: 'Unpatched',
};

const EXERCISES = [
  {
    title: 'Find the crossover',
    body: 'Port 6 fails its link test. Read the pinout on the right: the outlet is T568A and the panel is T568B, so the green and orange pairs are swapped end to end. Re-terminate one end to match the other and watch the link come up.',
  },
  {
    title: 'Check the long run',
    body: 'Port 5 is a 72 m Cat 6 run asked to carry 10 Gbps. The length checker says it fails the ~55 m Cat 6 limit. Fix it two ways: drop the run to 1 Gbps, or re-pull it as Cat 6a — then confirm the link passes.',
  },
  {
    title: 'Move a device without touching the run',
    body: 'The printer on port 6 needs to move to another switch port. Move its patch cord — the permanent run behind the panel stays exactly as it is. That is the whole point of structured cabling.',
  },
  {
    title: 'Patch in the camera',
    body: 'Port 7 is a good run with no patch cord. Patch it into the next free switch port and confirm the panel shows 8 patched and 6 links up.',
  },
];

const CHECK_YOURSELF = [
  {
    q: 'A run is terminated T568A at the wall jack and T568B at the panel. What does the link tester report, and what is the fix?',
    a: 'It reports a crossover and the link fails — the green and orange pairs are swapped end to end. Re-terminate one end to match the other; the standard itself does not matter, only that both ends agree.',
  },
  {
    q: 'A 72 m Cat 6 run must carry 10 Gbps. Does it pass? If not, name two fixes.',
    a: 'No — Cat 6 carries 10 Gbps only to about 55 m. Either drop the link to 1 Gbps, where the 100 m copper limit applies, or re-pull the run as Cat 6a, which carries 10 Gbps the full 100 m.',
  },
  {
    q: 'Why is the patch panel the permanent end of every copper run?',
    a: 'The horizontal cable is fixed in the building — punched down once on the rear 110 blocks and never moved. Changes happen at the front: moving a device means moving one short patch cord to another switch port, not re-pulling cable.',
  },
  {
    q: 'What is the maximum copper run length, and what does the 100 m cover?',
    a: '100 m for the whole channel: 90 m of horizontal cable plus the patch cords at both ends. Past that, the link fails the length check whatever the cable category.',
  },
];

export default function PatchPanelSimulator() {
  const [runs, setRuns] = useState(() => createRuns());
  const [selectedPort, setSelectedPort] = useState(6);
  const [houseStandard, setHouseStandard] = useState('T568B');
  const [events, setEvents] = useState([]);
  const [revealed, setRevealed] = useState({});

  const summary = summarizeRuns(runs);
  const selected = runs.find((r) => r.port === selectedPort) || runs[0];
  const selectedStatus = linkStatus(selected);
  const runByPort = new Map(runs.map((r) => [r.port, r]));

  const logEvent = (nextEvents, text) => {
    const entry = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text };
    return [entry, ...nextEvents].slice(0, MAX_EVENTS);
  };

  const applyRuns = (nextRuns, text) => {
    setRuns(nextRuns);
    if (text) setEvents((prev) => logEvent(prev, text));
  };

  const updateSelected = (patch, text) => {
    applyRuns(runs.map((r) => (r.port === selected.port ? updateRun(r, patch) : r)), text);
  };

  const fixSelected = () => {
    applyRuns(
      runs.map((r) => (r.port === selected.port ? reterminateBothEnds(r, houseStandard) : r)),
      `Port ${selected.port} (${selected.device}) re-terminated to ${houseStandard} at both ends — link up.`,
    );
  };

  const patchSelected = () => {
    const free = nextFreeSwitchPort(runs);
    if (free == null) return;
    applyRuns(
      runs.map((r) => (r.port === selected.port ? patchRun(r, free) : r)),
      `Port ${selected.port} (${selected.device}) patched into switch port ${free}.`,
    );
  };

  const moveSelectedCord = (switchPort) => {
    applyRuns(
      runs.map((r) => (r.port === selected.port ? movePatchCord(r, Number(switchPort)) : r)),
      `Port ${selected.port} (${selected.device}) patch cord moved to switch port ${switchPort}. Run untouched.`,
    );
  };

  const unpatchSelected = () => {
    applyRuns(
      runs.map((r) => (r.port === selected.port ? unpatchRun(r) : r)),
      `Port ${selected.port} (${selected.device}) patch cord pulled — run unpatched.`,
    );
  };

  const loadScenario = (name) => {
    const base = createRuns();
    if (name === 'crossover') {
      const next = base.map((r) => (r.port === 6 ? { ...r, outletStandard: 'T568A', panelStandard: 'T568B' } : r));
      setSelectedPort(6);
      applyRuns(next, 'Scenario: mixed-standard trap — port 6 is T568A at the outlet, T568B at the panel.');
    } else if (name === 'long-run') {
      const next = base.map((r) => (r.port === 5 ? { ...r, category: 'Cat6', lengthM: 72, speedGbps: 10 } : r));
      setSelectedPort(5);
      applyRuns(next, 'Scenario: long run — port 5 is 72 m of Cat 6 asked to carry 10 Gbps.');
    }
  };

  const reset = () => {
    applyRuns(createRuns(), 'Panel reset to the shipped layout.');
    setSelectedPort(6);
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  const outletPins = pinout(selected.outletStandard);
  const panelPins = pinout(selected.panelStandard);

  return (
    <div>
      <p className="mb-4 text-sm text-ink-2">
        Drive the panel yourself. Terminate T568A/B, catch the mixed-standard crossover, check your run
        lengths — and move a device by moving one patch cord, never the permanent run.
      </p>

      {/* One screen on desktop: termination controls on the left, the panel
          and metrics in the middle, the pinout on the right. The longest run
          sits directly under the primary counters. On narrow screens the
          rails stack in reading order. */}
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: house standard + selected-run controls */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">House standard</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label="House wiring standard">
            {STANDARDS.map((standard) => (
              <button
                key={standard}
                type="button"
                onClick={() => setHouseStandard(standard)}
                aria-pressed={houseStandard === standard}
                title="T568A and T568B differ only in which pair is green vs orange — pick one everywhere."
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold transition ${
                  houseStandard === standard ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
                }`}
              >
                {standard}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-ink-2">
            One standard everywhere. A run with {houseStandard === 'T568A' ? 'T568B' : 'T568A'} at one end is a crossover.
          </p>

          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Cable — {selected.category}</span>
              <select
                value={selected.category}
                onChange={(e) => updateSelected({ category: e.target.value }, `Port ${selected.port} re-pulled as ${e.target.value}.`)}
                aria-label="Cable category for the selected run"
                className="mt-0.5 w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Run length — {selected.lengthM} m</span>
              <input
                type="range"
                min="5"
                max="120"
                value={selected.lengthM}
                onChange={(e) => updateSelected({ lengthM: Number(e.target.value) })}
                className="mt-0.5 w-full accent-[#7C3AED]"
                aria-label="Run length in metres"
              />
              <span className="text-[11px] leading-snug text-ink-3">
                {checkRunLength(selected).reason}.
              </span>
            </label>
            <div className="flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Link speed">
              {[1, 10].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => updateSelected({ speedGbps: speed }, `Port ${selected.port} set to ${speed} Gbps.`)}
                  aria-pressed={selected.speedGbps === speed}
                  className={`flex-1 px-2.5 py-1 text-[13px] font-semibold ${selected.speedGbps === speed ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                >
                  {speed} Gbps
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={fixSelected} className="rounded-lg glass-btn px-2 py-1.5 text-xs font-semibold">
              Fix: re-terminate to {houseStandard}
            </button>
            <button type="button" onClick={patchSelected} disabled={selected.switchPort != null} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-xs font-semibold text-ink-1 disabled:opacity-40">
              Patch in
            </button>
            <button type="button" onClick={unpatchSelected} disabled={selected.switchPort == null} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-xs font-semibold text-ink-1 disabled:opacity-40">
              Pull patch cord
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-xs font-semibold text-ink-1">
              Reset panel
            </button>
          </div>

          <p className="mt-3 text-caption font-semibold uppercase tracking-wider text-ink-2">Scenarios</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => loadScenario('crossover')} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-xs font-semibold text-ink-1">
              Mixed-standard trap
            </button>
            <button type="button" onClick={() => loadScenario('long-run')} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-xs font-semibold text-ink-1">
              Long Cat 6 run
            </button>
          </div>
        </div>

        {/* Middle: counters, longest run, the 48-port panel, selected run */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="grid grid-cols-3 gap-2">
            {metric('patched', `${summary.patched}/${summary.total}`)}
            {metric('links up', summary.passing)}
            {metric('failing', summary.failing)}
          </div>
          <div className="mt-2 rounded-xl border border-black/10 glass-1 px-3 py-1.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Longest run</p>
            <p className="text-sm font-bold text-ink-1">
              {summary.longestRunM} m · Port {summary.longestRun.port} · {summary.longestRun.device} ({summary.longestRun.category}, {summary.longestRun.speedGbps} Gbps)
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Front — 48 RJ45 ports</p>
              <p className="text-[11px] text-ink-3">Click a patched port to select its run</p>
            </div>
            <div className="grid grid-cols-12 gap-1" role="group" aria-label="Patch panel ports">
              {Array.from({ length: PORT_COUNT }, (_, i) => {
                const port = i + 1;
                const run = runByPort.get(port);
                if (!run) {
                  return (
                    <div key={port} className="flex h-7 items-center justify-center rounded border border-black/5 text-[10px] tabular-nums text-ink-3" aria-hidden="true">
                      {port}
                    </div>
                  );
                }
                const status = linkStatus(run);
                return (
                  <button
                    key={port}
                    type="button"
                    onClick={() => setSelectedPort(port)}
                    aria-pressed={selectedPort === port}
                    aria-label={`Port ${port} — ${run.device} — ${STATUS_LABEL[status.code]}`}
                    title={`${run.device} — ${status.message}`}
                    className={`flex h-7 items-center justify-center rounded border text-[10px] font-bold tabular-nums ${STATUS_STYLE[status.code]} ${selectedPort === port ? 'ring-2 ring-[#7C3AED]' : ''}`}
                  >
                    {port}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/60" /> Link up</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/60" /> Failing</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/60" /> Unpatched</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-black/10" /> Empty</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-ink-1">
                Port {selected.port} — {selected.device}
              </p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${selectedStatus.code === 'pass' ? 'bg-emerald-500/10 text-emerald-700' : selectedStatus.code === 'unpatched' ? 'bg-amber-500/10 text-amber-700' : 'bg-red-500/10 text-red-700'}`}>
                {selectedStatus.code === 'pass' ? <CheckCircle2 size={12} /> : selectedStatus.code === 'unpatched' ? <Unplug size={12} /> : <AlertTriangle size={12} />}
                {STATUS_LABEL[selectedStatus.code]}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink-2">{selectedStatus.message}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-ink-2 sm:grid-cols-3">
              <span>Cable: <strong className="text-ink-1">{selected.category}</strong></span>
              <span>Length: <strong className="text-ink-1">{selected.lengthM} m</strong> (limit {selectedStatus.limitM} m)</span>
              <span>Speed: <strong className="text-ink-1">{selected.speedGbps} Gbps</strong></span>
              <span>Outlet: <strong className="text-ink-1">{selected.outletStandard}</strong></span>
              <span>Panel: <strong className="text-ink-1">{selected.panelStandard}</strong></span>
              <span>
                Patch cord:{' '}
                {selected.switchPort == null ? (
                  <strong className="text-ink-1">none</strong>
                ) : (
                  <label className="inline-flex items-center gap-1">
                    <span className="sr-only">Switch port for port {selected.port}</span>
                    <select
                      value={selected.switchPort}
                      onChange={(e) => moveSelectedCord(e.target.value)}
                      aria-label={`Switch port for port ${selected.port}`}
                      className="rounded border border-black/10 glass-1 px-1 py-0.5 text-[13px] font-bold text-ink-1"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>switch {p}</option>
                      ))}
                    </select>
                  </label>
                )}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => updateSelected({ outletStandard: selected.outletStandard === 'T568A' ? 'T568B' : 'T568A' }, `Port ${selected.port} outlet re-terminated.`)}
                className="rounded-lg border border-black/10 glass-1 px-2 py-1 text-xs font-semibold text-ink-1"
              >
                Re-terminate outlet ({selected.outletStandard} → {selected.outletStandard === 'T568A' ? 'T568B' : 'T568A'})
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = reterminateRun(selected, 'panel', selected.panelStandard === 'T568A' ? 'T568B' : 'T568A');
                  applyRuns(runs.map((r) => (r.port === selected.port ? next : r)), `Port ${selected.port} panel end re-terminated to ${next.panelStandard}.`);
                }}
                className="rounded-lg border border-black/10 glass-1 px-2 py-1 text-xs font-semibold text-ink-1"
              >
                Re-terminate panel ({selected.panelStandard} → {selected.panelStandard === 'T568A' ? 'T568B' : 'T568A'})
              </button>
            </div>
          </div>
        </div>

        {/* Right rail: the pinout — where the crossover lives */}
        <div className="flex flex-col gap-2.5 lg:col-start-3 lg:row-start-1">
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">
              Rear 110 blocks — port {selected.port} pinout
            </p>
            <p className="mt-1 text-xs leading-snug text-ink-2">
              T568A and T568B differ only in the green vs orange pair. When the two ends disagree, those
              pins are crossed and the link fails.
            </p>
            <table className="mt-2 w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <th className="py-0.5 pr-1 font-semibold">Pin</th>
                  <th className="py-0.5 pr-1 font-semibold">Outlet ({selected.outletStandard})</th>
                  <th className="py-0.5 font-semibold">Panel ({selected.panelStandard})</th>
                </tr>
              </thead>
              <tbody>
                {outletPins.map((colour, i) => {
                  const crossed = colour !== panelPins[i];
                  return (
                    <tr key={i} className={crossed ? 'bg-red-500/10 font-semibold text-red-800' : 'text-ink-2'}>
                      <td className="py-0.5 pr-1 tabular-nums">{i + 1}</td>
                      <td className="py-0.5 pr-1">{colour}</td>
                      <td className="py-0.5">{panelPins[i]}{crossed ? '  ✕ crossed' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
              <Cable size={13} /> Patch cords — panel → switch
            </p>
            <ul className="mt-2 space-y-1">
              {runs.filter((r) => r.switchPort != null).map((r) => (
                <li key={r.port} className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
                  <button type="button" onClick={() => setSelectedPort(r.port)} className="text-left font-semibold text-ink-1 underline-offset-2 hover:underline">
                    Port {r.port} · {r.device}
                  </button>
                  <span className="shrink-0 font-mono text-[12px]">→ sw {r.switchPort}</span>
                </li>
              ))}
              {runs.filter((r) => r.switchPort != null).length === 0 && (
                <li className="text-[13px] text-ink-3">No patch cords plugged in.</li>
              )}
            </ul>
            <p className="mt-2 text-xs leading-snug text-ink-3">
              Moving a device means moving one patch cord. The permanent run behind the panel never moves.
            </p>
          </div>
        </div>

        {/* Termination schedule, under the controls rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Termination schedule — updates live</p>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[10px] leading-relaxed text-[#859900]">{terminationSchedule(runs)}</pre>
        </div>

        {/* Event log, under the pinout rail */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Panel log</p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No panel events yet. Fix the crossover on port 6, or patch in the camera on port 7.</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((event) => (
                  <li key={event.id} className="text-[13px] text-ink-2">
                    <span className="font-mono text-[11px] text-ink-3">{event.time}</span> — {event.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Below the fold: the Visual Lab sections. */}
      <div className="mt-6 space-y-4">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the patch panel</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            A patch panel is the permanent end of every copper run in a building. The horizontal cable is
            punched down once on the rear 110 blocks and never moves again; the front shows 48 numbered
            RJ45 ports, and short patch cords connect each port to the switch. T568A and T568B differ only
            in which pair is green vs orange — pick one standard everywhere. Copper runs max out at 100 m;
            Cat 6 carries 10 Gbps only to about 55 m, while Cat 6a carries 10 Gbps the full 100 m.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                <li>Read a termination schedule and spot a mixed-standard run.</li>
                <li>Re-terminate a run so both ends use the same standard.</li>
                <li>Apply the 100 m copper limit and the Cat 6 ~55 m limit at 10 Gbps.</li>
                <li>Move a device by moving one patch cord — never the permanent run.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                <li><strong className="text-ink-1">T568A vs T568B:</strong> only the green and orange pairs swap.</li>
                <li><strong className="text-ink-1">Crossover:</strong> mixed standards fail the link test.</li>
                <li><strong className="text-ink-1">100 m:</strong> the copper maximum for the whole channel.</li>
                <li><strong className="text-ink-1">Structured cabling:</strong> moves happen at the patch cord.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            {EXERCISES.map((ex) => (
              <li key={ex.title}>
                <strong className="text-ink-1">{ex.title}.</strong> {ex.body}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>The mixed-standard run fails as a crossover, not as a length problem — the pinout shows exactly which pins are crossed.</li>
            <li>The 72 m Cat 6 run passes at 1 Gbps and fails at 10 Gbps: the length limit depends on the speed, not just the cable.</li>
            <li>Cat 6a is the only copper in this panel that carries 10 Gbps to 100 m; Cat 5e cannot carry 10 Gbps at all.</li>
            <li>Moving the printer&apos;s patch cord changes nothing about its run — port, length and terminations stay identical.</li>
            <li>The longest run on the panel is 88 m, inside the 100 m copper limit — but it only passes because it is Cat 6a at 10 Gbps.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <div className="mt-2 space-y-2">
            {CHECK_YOURSELF.map((item, i) => (
              <div key={item.q} className="rounded-lg border border-black/10 glass-1 p-3">
                <p className="text-sm font-semibold text-ink-1">{item.q}</p>
                {revealed[i] ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.a}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed((prev) => ({ ...prev, [i]: true }))}
                    className="mt-1.5 rounded-lg glass-btn px-2.5 py-1 text-xs font-semibold"
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
