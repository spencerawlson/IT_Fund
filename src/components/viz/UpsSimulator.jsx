import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, BatteryCharging, CheckCircle2, PlugZap } from 'lucide-react';
import {
  RATED_VA,
  RATED_WATTS,
  POWER_FACTOR,
  MODULE_VA,
  MAX_EXTRA_LOAD_VA,
  TOPOLOGIES,
  topologyById,
  transferTimeMs,
  sineWave,
  createUps,
  loadVa,
  loadPercent,
  loadWatts,
  activeModules,
  activeCapacityVa,
  isOverloaded,
  powerSource,
  runtimeMinutes,
  trySetExtraLoad,
  failModule,
  restoreModule,
  toggleServer,
  restartServers,
  hotSwapBattery,
  triggerEpo,
  stepUps,
  upsConf,
} from '@/lib/ups';

const TICK_MS = 100;
/** Simulated seconds per tick: demo time runs 100x, so a blackout drill finishes in under a minute. */
const SIM_SECONDS_PER_TICK = 10;
const MAX_EVENTS = 6;

function freshSim() {
  return {
    ups: createUps('online'),
    events: [],
    nextId: 1,
  };
}

export default function UpsSimulator() {
  const [topology, setTopology] = useState('online');
  const [extraLoad, setExtraLoad] = useState(0);
  const [overloadNote, setOverloadNote] = useState(null);
  const [paused, setPaused] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    if (!text) return;
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const events = stepUps(sim.ups, SIM_SECONDS_PER_TICK);
      for (const event of events) logEvent(sim, event);
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const { ups } = sim;
  const source = powerSource(ups);
  const va = loadVa(ups);
  const pct = loadPercent(ups);
  const watts = loadWatts(ups);
  const runtime = runtimeMinutes(ups);
  const overloaded = isOverloaded(ups);
  const serversOff = ups.servers.filter((s) => !s.on).length;
  const activeMods = activeModules(ups);

  const changeTopology = (id) => {
    const topo = topologyById(id);
    ups.topology = topo.id;
    setTopology(topo.id);
    logEvent(sim, `Topology → ${topo.label} (${topo.detail}): ${topo.transferMs} ms transfer, ${topo.sine.toLowerCase()}.`);
    bump();
  };

  const changeExtraLoad = (value) => {
    const serversVa = va - ups.extraLoadVa;
    if (!trySetExtraLoad(ups, value)) {
      setOverloadNote(`Overload blocked — ${serversVa + value} VA would pass the ${RATED_VA.toLocaleString('en-US')} VA rating.`);
      bump();
      return;
    }
    setOverloadNote(null);
    setExtraLoad(ups.extraLoadVa);
    bump();
  };

  const toggleMains = () => {
    ups.mains = !ups.mains;
    if (!ups.mains) {
      const topo = topologyById(ups.topology);
      logEvent(sim, `Mains failed — ${topo.label}: ${topo.transferMs} ms transfer, load on battery. ${runtimeMinutes(ups)} min of runtime at the current load.`);
    } else {
      logEvent(sim, 'Mains restored — load back on mains power, battery recharging.');
    }
    bump();
  };

  const toggleGenerator = () => {
    ups.generator = !ups.generator;
    logEvent(sim, ups.generator
      ? 'Generator started — load transferred to the generator, battery recharging to 100%.'
      : 'Generator stopped — the UPS is back on mains or battery.');
    bump();
  };

  const epo = () => {
    logEvent(sim, triggerEpo(ups));
    bump();
  };

  const hotSwap = () => {
    logEvent(sim, hotSwapBattery(ups));
    bump();
  };

  const reset = () => {
    simRef.current = freshSim();
    setTopology('online');
    setExtraLoad(0);
    setOverloadNote(null);
    bump();
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
      q: 'The LCD shows 32% load and 58 minutes of runtime. You add servers until the load hits 64%. What happens to the runtime — and why?',
      a: 'It roughly halves, to about 29 minutes. Runtime is battery energy divided by load, so doubling the load drains the same battery twice as fast. The runtime buys a graceful shutdown, not a workday.',
    },
    {
      q: 'Mains fails. Why does the online (double-conversion) UPS switch in 0 ms while the standby UPS takes about 10 ms?',
      a: 'The online UPS always runs the load off its inverter, from the battery — there is nothing to switch. The standby UPS sits idle on mains power and has to detect the failure, then switch the load over to battery, which takes milliseconds.',
    },
    {
      q: 'Why is the UPS runtime for a graceful shutdown, not for working through the outage — and what takes over for a long outage?',
      a: 'The lesson sizes it at 10–120 minutes at 50% load: long enough for the UPS to signal the servers (SNMP) and shut them down cleanly. For a long outage a generator takes over and recharges the battery.',
    },
    {
      q: 'One UPS module fails in an N+1 pair at 32% load. Why does nothing go down — and when would it?',
      a: 'The surviving module carries the full 720 VA load, well inside its 1,500 VA rating. It only fails if the load is past one module’s rating — try it above 1,500 VA and the survivor overloads.',
    },
  ];

  const batteryBarColor = ups.batteryPct > 50 ? '#16A34A' : ups.batteryPct > 20 ? '#D97706' : '#DC2626';
  const flowColor = source === 'mains' ? '#16A34A' : source === 'generator' ? '#7C3AED' : source === 'battery' ? '#D97706' : '#9CA3AF';

  // One screen on desktop: topology + power controls on the left, counters +
  // power flow in the middle, the UPS front panel and server rack on the
  // right. The derived metrics (runtime, watts, transfer) sit directly
  // under the primary counters. On narrow screens the rails stack in
  // reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          {/* Left rail: topology + power controls */}
          <div className="rounded-xl glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">UPS topology</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="UPS topology">
              {TOPOLOGIES.map((topo) => (
                <button
                  key={topo.id}
                  type="button"
                  onClick={() => changeTopology(topo.id)}
                  aria-pressed={topology === topo.id}
                  title={topo.blurb}
                  className={`rounded-lg px-1 py-1.5 text-[12px] font-semibold leading-tight transition ${
                    topology === topo.id ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
                  }`}
                >
                  {topo.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-snug text-ink-2">{topologyById(topology).blurb}</p>

            <div className="mt-3 border-t border-black/10 pt-3">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Extra load — {extraLoad} VA</span>
                <input
                  type="range"
                  min="0"
                  max={MAX_EXTRA_LOAD_VA}
                  step="10"
                  value={extraLoad}
                  onChange={(e) => changeExtraLoad(Number(e.target.value))}
                  className="mt-0.5 w-full accent-[#7C3AED]"
                  aria-label="Extra load in volt-amps"
                />
                <span className="text-[11px] leading-snug text-ink-3">
                  Total load {va.toLocaleString('en-US')} VA ({pct}%) of the {RATED_VA.toLocaleString('en-US')} VA rating.
                  Push past the rating and the overload is blocked.
                </span>
              </label>
              {overloadNote && (
                <p className="mt-1.5 rounded-lg border border-red-500/40 bg-red-500/5 px-2 py-1 text-[12px] font-semibold leading-snug text-red-700" role="alert">
                  {overloadNote}
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-black/10 pt-3">
              <button
                type="button"
                onClick={toggleMains}
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight ${ups.mains ? 'border border-black/10 glass-1 text-ink-1' : 'bg-amber-500/15 text-amber-700'}`}
              >
                {ups.mains ? 'Simulate blackout' : 'Restore mains'}
              </button>
              <button
                type="button"
                onClick={toggleGenerator}
                aria-pressed={ups.generator}
                className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight ${ups.generator ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-1'}`}
              >
                {ups.generator ? 'Stop generator' : 'Start generator'}
              </button>
              <button
                type="button"
                onClick={hotSwap}
                className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold leading-tight text-ink-1"
              >
                Hot-swap battery
              </button>
              <button
                type="button"
                onClick={() => { logEvent(sim, restartServers(ups)); bump(); }}
                disabled={serversOff === 0 || ups.epo}
                className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold leading-tight text-ink-1 disabled:opacity-40"
              >
                Restart servers
              </button>
              <button
                type="button"
                onClick={epo}
                disabled={ups.epo}
                className="col-span-2 rounded-lg border border-red-500/40 bg-red-500/5 px-2 py-1.5 text-[13px] font-semibold leading-tight text-red-700 disabled:opacity-40"
              >
                Emergency power off
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Reset
              </button>
            </div>
          </div>

          {/* UPS config */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">UPS config — updates live</p>
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900] lg:min-h-32 lg:max-h-none lg:flex-1 lg:basis-0">{upsConf(ups)}</pre>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">

          {/* Middle: counters, power flow, derived metrics */}
          <div className="min-w-0">
            {ups.epo && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" />
                <p className="text-[13px] leading-snug text-red-700">
                  <strong>Emergency power off.</strong> Power was cut to everything at once — no graceful shutdown.
                  Reset the UPS before restarting anything.
                </p>
              </div>
            )}
            {overloaded && !ups.epo && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" />
                <p className="text-[13px] leading-snug text-red-700">
                  <strong>Overload.</strong> The load is {va.toLocaleString('en-US')} VA but the {activeMods.length} module{activeMods.length === 1 ? '' : 's'} up can only carry {activeCapacityVa(ups).toLocaleString('en-US')} VA.
                  Shed load or restore a module.
                </p>
              </div>
            )}
            {source === 'battery' && !ups.epo && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3" role="alert">
                <BatteryCharging size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-[13px] leading-snug text-amber-700">
                  <strong>On battery power</strong> — {runtime === Infinity ? 'no load to drain it' : `${runtime} min of runtime left`}.
                  The UPS is buying time for a graceful shutdown, not for working through the outage.
                </p>
              </div>
            )}
            {ups.shuttingDown && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3" role="alert">
                <PlugZap size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-[13px] leading-snug text-amber-700">
                  <strong>Graceful shutdown in progress</strong> — the UPS is signalling the servers to power off cleanly, one by one.
                </p>
              </div>
            )}
            {source === 'generator' && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-violet-500/40 bg-violet-500/5 p-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-violet-700" />
                <p className="text-[13px] leading-snug text-violet-700">
                  <strong>On generator power</strong> — the generator carries the load and the battery is recharging to 100%.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {metric('load', `${va.toLocaleString('en-US')} VA`, overloaded ? 'text-red-700' : 'text-ink-1')}
              {metric('load %', `${pct}%`)}
              {metric('battery', `${Math.round(ups.batteryPct)}%`, ups.batteryPct <= 20 ? 'text-red-700' : 'text-ink-1')}
            </div>
            {/* Derived metrics, directly */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {metric('runtime left', runtime === Infinity ? '—' : `${runtime} min`, ups.batteryPct <= 20 && source === 'battery' ? 'text-red-700' : 'text-ink-1')}
              {metric('watts', `${watts.toLocaleString('en-US')} W`)}
              {metric('transfer time', `${transferTimeMs(topology)} ms`)}
            </div>

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Mains → UPS → PDU → servers</p>
                <p className="text-[11px] text-ink-3">power source: {source}</p>
              </div>
              <svg viewBox="0 0 640 240" className="w-full" role="img" aria-label="Power flow: mains and generator feed the UPS, which feeds the PDU and seven servers">
                {/* Mains feed */}
                <line x1="118" y1="120" x2="240" y2="120" stroke={ups.mains ? '#16A34A' : '#9CA3AF'} strokeWidth="3" strokeDasharray={ups.mains ? undefined : '5 4'} />
                {/* Generator feed */}
                <line x1="118" y1="185" x2="240" y2="150" stroke={ups.generator ? '#7C3AED' : '#D1D5DB'} strokeWidth="3" strokeDasharray={ups.generator ? undefined : '5 4'} />
                {/* UPS to PDU */}
                <line x1="400" y1="120" x2="452" y2="120" stroke={flowColor} strokeWidth="3" />
                {/* PDU to servers */}
                {ups.servers.map((server, i) => (
                  <line key={server.id} x1="500" y1="120" x2="548" y2={24 + i * 30} stroke={server.on ? flowColor : '#D1D5DB'} strokeWidth="1.5" />
                ))}
                {/* Mains box */}
                <g>
                  <rect x="18" y="95" width="100" height="50" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                  <text x="68" y="115" textAnchor="middle" fontSize="13" fontWeight="800" fill="#111827">MAINS</text>
                  <text x="68" y="133" textAnchor="middle" fontSize="10" fill={ups.mains ? '#16A34A' : '#DC2626'} fontWeight="700">{ups.mains ? 'live' : 'FAILED'}</text>
                </g>
                {/* Generator box */}
                <g>
                  <rect x="18" y="160" width="100" height="50" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                  <text x="68" y="180" textAnchor="middle" fontSize="13" fontWeight="800" fill="#111827">GENERATOR</text>
                  <text x="68" y="198" textAnchor="middle" fontSize="10" fill={ups.generator ? '#7C3AED' : '#5B6472'} fontWeight="700">{ups.generator ? 'running' : 'standby'}</text>
                </g>
                {/* UPS box */}
                <g>
                  <rect x="240" y="70" width="160" height="100" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                  <text x="320" y="92" textAnchor="middle" fontSize="13" fontWeight="800" fill="#111827">UPS · 2U</text>
                  <text x="320" y="109" textAnchor="middle" fontSize="10" fill="#5B6472">{topologyById(topology).label} · {sineWave(topology)}</text>
                  <rect x="258" y="120" width="124" height="12" rx="6" fill="rgba(0,0,0,0.08)" />
                  <rect x="258" y="120" width={Math.max(0, (124 * ups.batteryPct) / 100)} height="12" rx="6" fill={batteryBarColor} />
                  <text x="320" y="150" textAnchor="middle" fontSize="10" fill="#5B6472">
                    battery {Math.round(ups.batteryPct)}% · {runtime === Infinity ? 'no load' : `${runtime} min left`}
                  </text>
                  <text x="320" y="163" textAnchor="middle" fontSize="10" fill="#5B6472">
                    modules {activeMods.map((m) => m.id).join(' + ') || 'none'} up · N+1
                  </text>
                </g>
                {/* PDU strip */}
                <g>
                  <rect x="452" y="88" width="48" height="64" rx="8" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                  <text x="476" y="108" textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">PDU</text>
                  <text x="476" y="124" textAnchor="middle" fontSize="9" fill="#5B6472">8 x C13</text>
                  <text x="476" y="138" textAnchor="middle" fontSize="9" fill="#5B6472">{ups.servers.filter((s) => s.on).length}/7 on</text>
                </g>
                {/* Servers */}
                {ups.servers.map((server, i) => (
                  <g key={server.id}>
                    <rect x="548" y={10 + i * 30} width="74" height="26" rx="6" fill={server.on ? '#FFFFFF' : '#F3F4F6'} stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                    <circle cx="560" cy={23 + i * 30} r="4" fill={server.on ? '#16A34A' : '#9CA3AF'} />
                    <text x="570" y={27 + i * 30} fontSize="10" fontWeight="700" fill="#111827">{server.id}</text>
                    <text x="612" y={27 + i * 30} textAnchor="end" fontSize="9" fill="#5B6472">{server.va} VA</text>
                  </g>
                ))}
              </svg>
              <p className="mt-1 text-xs leading-snug text-ink-2">
                The UPS cleans the power (sags and brownouts never reach the servers) and switches to battery
                the instant the mains fails — in {transferTimeMs(topology)} ms on the {topologyById(topology).label.toLowerCase()} topology.
                The PDU splits the protected output across 8 IEC C13 outlets.
              </p>
            </div>
          </div>

          {/* Event log */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
              <Activity size={13} /> Event log
            </p>
            <div className="rounded-xl border border-black/10 glass-1 p-3 lg:flex-1">
              {sim.events.length === 0 ? (
                <p className="text-[13px] text-ink-3">No events yet. Simulate a blackout, fail a module, or push the load past the rating.</p>
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
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-3">

          {/* Right rail: the UPS front panel + the protected servers */}
          <div className="flex flex-col gap-2.5 lg:flex-1">
            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">UPS front panel</p>
              <div className="mt-2 rounded-lg border border-black/10 bg-white p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-ink-1">2U rack UPS · {RATED_VA.toLocaleString('en-US')} VA / {RATED_WATTS.toLocaleString('en-US')} W</p>
                  <BatteryCharging size={14} className="text-ink-3" />
                </div>
                {/* LCD, as in the lesson example: load + battery. */}
                <div className="mt-2 rounded-lg bg-[#002B36] px-3 py-2 font-mono text-[#859900]">
                  <p className="text-[13px] font-bold">LOAD {pct}% · {va.toLocaleString('en-US')} VA</p>
                  <p className="text-[13px] font-bold">BATT {Math.round(ups.batteryPct)}% · {runtime === Infinity ? '—' : `${runtime} MIN`}</p>
                  <p className="mt-0.5 text-[11px]">{ups.epo ? 'EPO — OUTPUT OFF' : source.toUpperCase()} · {sineWave(topology).toUpperCase()}</p>
                </div>
                <div className="mt-2 space-y-1.5">
                  {ups.modules.map((module) => (
                    <div key={module.id} className="rounded-lg border border-black/10 px-2 py-1.5">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${module.up ? 'bg-emerald-600' : 'bg-red-500'}`} />
                        <span className="whitespace-nowrap font-bold text-ink-1">Module {module.id}</span>
                        <span className="text-ink-2">{MODULE_VA.toLocaleString('en-US')} VA</span>
                        <button
                          type="button"
                          onClick={() => {
                            logEvent(sim, module.up ? failModule(ups, module.id) : restoreModule(ups, module.id));
                            bump();
                          }}
                          className="ml-auto shrink-0 rounded-lg border border-black/10 px-2 py-0.5 text-[11px] font-semibold text-ink-1"
                        >
                          {module.up ? 'Fail module' : 'Restore module'}
                        </button>
                      </div>
                      <p className="mt-0.5 pl-4 text-[11px] leading-snug text-ink-2">{module.up ? 'carrying load' : 'FAILED — the survivor carries everything'}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 border-t border-black/10 pt-2 text-[11px] leading-snug text-ink-3">
                  Hot-swappable VRLA 12 V battery modules (LiFePO4 option). EPO port kills power to everything.
                  Signals servers over SNMP / web / SSH to shut down cleanly.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <div className="flex items-baseline justify-between">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Protected servers</p>
                <p className="text-[11px] text-ink-3">{ups.servers.filter((s) => s.on).length} of 7 on</p>
              </div>
              <div className="mt-1.5 space-y-1">
                {ups.servers.map((server) => (
                  <div key={server.id} className="flex items-center gap-2 text-[12px]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${server.on ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                    <span className="font-bold text-ink-1">{server.id}</span>
                    <span className="text-ink-2">{server.va} VA · {server.on ? 'on' : 'off'}</span>
                    <button
                      type="button"
                      onClick={() => { logEvent(sim, toggleServer(ups, server.id)); bump(); }}
                      aria-label={`${server.on ? 'Power off' : 'Power on'} ${server.id}`}
                      className="ml-auto rounded-lg border border-black/10 px-2 py-0.5 text-[11px] font-semibold text-ink-1"
                    >
                      {server.on ? 'Power off' : 'Power on'}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">
                {RATED_VA.toLocaleString('en-US')} VA at PF {POWER_FACTOR} is {RATED_WATTS.toLocaleString('en-US')} W of real power —
                watts, not VA, is what the servers actually draw.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Below the fold: the lab itself — brief, exercises, debrief. */}
      <div className="mt-8 space-y-6">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the rack UPS</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            A 2U rack UPS sits between the mains and seven servers, with a PDU splitting the protected output
            across 8 IEC C13 outlets. Drive it above: load it up, cut the mains, and watch the runtime shrink —
            then hand off to the generator before the battery dies.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Watch the runtime shrink as the load rises — runtime is battery energy divided by load.</li>
                <li>Compare transfer times across online, line-interactive and standby topologies.</li>
                <li>Run a blackout drill: battery drain, then a graceful shutdown that preserves charge.</li>
                <li>Prove N+1 redundancy: lose one module and the survivor carries the load.</li>
                <li>Hand off to the generator for a long outage, and see EPO kill everything at once.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li><strong className="text-ink-1">Topologies</strong> — online / double-conversion (0 ms), line-interactive with AVR, standby / offline.</li>
                <li><strong className="text-ink-1">VA vs watts</strong> — watts = VA × power factor; 2,250 VA at PF 0.8 is 1,800 W.</li>
                <li><strong className="text-ink-1">Runtime</strong> — 10–120 min at 50% load, for graceful shutdown, not working through the outage.</li>
                <li><strong className="text-ink-1">Sine wave</strong> — pure sine vs simulated / stepped sine on the output.</li>
                <li><strong className="text-ink-1">N+1, PDU, EPO</strong> — redundant modules, power distribution, emergency power off.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Read the LCD.</strong> It starts at the lesson example: 32% load, 58 min.
              Push the extra load to 405 VA (50% load) and watch the runtime fall to about 37 min; at full load it is 18 min.
            </li>
            <li>
              <strong className="text-ink-1">Try the overload.</strong> Push the extra load toward 1,700 VA — the total would pass
              2,250 VA, so the overload is blocked and the load stays where it was.
            </li>
            <li>
              <strong className="text-ink-1">Compare transfer times.</strong> Switch the topology between online, line-interactive
              and standby and read the transfer time: 0 ms, 4 ms, 10 ms — and note the standby output is a simulated sine wave.
            </li>
            <li>
              <strong className="text-ink-1">Run the blackout drill.</strong> Cut the mains and watch the battery drain. At 20% the
              graceful shutdown starts: all 7 servers power off one by one, cleanly, and the battery is preserved at about 17%.
            </li>
            <li>
              <strong className="text-ink-1">Prove N+1.</strong> Fail module A at 32% load — nothing drops, module B carries the full
              720 VA. Then raise the load past 1,500 VA, fail a module again, and watch the overload alarm.
            </li>
            <li>
              <strong className="text-ink-1">Hand off to the generator.</strong> During a blackout, start the generator: the load
              transfers and the battery recharges to 100%. Hot-swap the battery instead and the runtime is restored at once.
            </li>
            <li>
              <strong className="text-ink-1">Feel the EPO.</strong> Hit emergency power off and everything dies at once — no graceful
              shutdown. That is why it is the last resort, and why the runtime exists.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Runtime falls as load rises: 58 min at 32%, about 37 min at 50%, 18 min at full load — same battery, faster drain.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The overload past 2,250 VA is blocked; the load never exceeds the rating.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Online transfers in 0 ms, line-interactive in 4 ms, standby in 10 ms with a simulated sine wave.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> On battery the graceful shutdown starts at 20% and all 7 servers power off cleanly, preserving about 17% of the charge.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Losing one module at 32% load changes nothing; past 1,500 VA the survivor overloads.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> The generator takes the load and recharges the battery to 100%; EPO kills everything with no clean shutdown.</li>
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
