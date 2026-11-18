import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Fan, Thermometer, Zap } from 'lucide-react';
import {
  BREAKER_RATING_W,
  DEVICES,
  createRack,
  totalDrawW,
  feedDrawW,
  poweredLoadW,
  equilibriumTempC,
  stepTemperature,
  checkBreakers,
  resetBreaker,
  bindingFeed,
  setDeviceFeed,
  splitFeeds,
  shedLoad,
  restoreFullPower,
  moveAllToFeed,
  tempStatus,
  rackConfigText,
} from '@/lib/serverRack';

const TICK_MS = 100;
const MAX_HISTORY = 60;
const MAX_EVENTS = 8;

function freshSim() {
  return {
    rack: createRack(),
    events: [],
    tempHistory: [],
    tickCount: 0,
    nextId: 1,
  };
}

function TempChart({ history }) {
  const width = 600;
  const height = 120;
  const min = 20;
  const max = 50;
  const points = history.map((v, i) => {
    const x = history.length <= 1 ? 0 : (i / (MAX_HISTORY - 1)) * width;
    const y = height - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Cabinet temperature</p>
        <p className="text-[11px] text-ink-3">last {MAX_HISTORY} s · °C</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-label="Cabinet temperature over the last minute">
        {[25, 35, 45].map((v) => {
          const y = height - ((v - min) / (max - min)) * height;
          return (
            <g key={v}>
              <line x1="0" x2={width} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
              <text x="4" y={y - 3} fontSize="10" fill="#5B6472">{v}°</text>
            </g>
          );
        })}
        {points && <polyline points={points} fill="none" stroke="#7C3AED" strokeWidth="2" />}
        {history.length === 0 && (
          <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="12" fill="#5B6472">waiting for the first sample…</text>
        )}
      </svg>
    </div>
  );
}

export default function ServerRackSimulator() {
  const [paused, setPaused] = useState(false);
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const rack = sim.rack;
      for (const feed of checkBreakers(rack)) {
        logEvent(sim, `Feed ${feed} breaker TRIPPED — ${feedDrawW(rack, feed)} W on a ${BREAKER_RATING_W} W breaker.`);
      }
      stepTemperature(rack, TICK_MS / 1000);
      sim.tickCount += 1;
      if (sim.tickCount % 10 === 0) {
        sim.tempHistory = [...sim.tempHistory, rack.tempC].slice(-MAX_HISTORY);
      }
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const rack = sim.rack;
  const total = totalDrawW(rack);
  const loadA = feedDrawW(rack, 'A');
  const loadB = feedDrawW(rack, 'B');
  const binding = bindingFeed(rack);
  const anyTripped = rack.tripped.A || rack.tripped.B;
  const status = tempStatus(rack.tempC);
  const equilibrium = equilibriumTempC(rack);

  const reset = () => {
    simRef.current = freshSim();
    bump();
  };

  const doSplit = () => {
    splitFeeds(sim.rack);
    logEvent(sim, 'Load split across feeds A/B — Server 2 + Server 3 moved to feed B.');
    bump();
  };

  const doShed = () => {
    shedLoad(sim.rack);
    logEvent(sim, 'Shed 1,000 W — Server 3 + NAS powered off.');
    bump();
  };

  const doRestore = () => {
    restoreFullPower(sim.rack);
    logEvent(sim, 'Trip setup restored — everything powered, everything on feed A.');
    bump();
  };

  const doMoveAll = (feed) => {
    moveAllToFeed(sim.rack, feed);
    logEvent(sim, `All load moved to feed ${feed}.`);
    bump();
  };

  const doResetBreaker = (feed) => {
    const result = resetBreaker(sim.rack, feed);
    if (result.ok) {
      logEvent(sim, `Feed ${feed} breaker reset — load ${feedDrawW(sim.rack, feed)} W, under the ${BREAKER_RATING_W} W rating.`);
    } else if (result.reason === 'still-overloaded') {
      logEvent(sim, `Feed ${feed} reset refused — still ${feedDrawW(sim.rack, feed)} W on a ${BREAKER_RATING_W} W breaker. Move or shed load first.`);
    }
    bump();
  };

  const toggleFans = () => {
    rack.fansOn = !rack.fansOn;
    logEvent(sim, rack.fansOn ? 'Fans back on — cabinet will settle cooler.' : 'Fans off — cabinet will settle 6 °C hotter.');
    bump();
  };

  const toggleCabling = () => {
    rack.cablingMessy = !rack.cablingMessy;
    logEvent(sim, rack.cablingMessy ? 'Cabling messy — blocked airflow, cabinet will settle 3 °C hotter.' : 'Cabling tidied — airflow restored.');
    bump();
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  const breakerRow = (feed) => {
    const load = feed === 'A' ? loadA : loadB;
    const tripped = rack.tripped[feed];
    return (
      <div className={`rounded-lg border p-2 ${tripped ? 'border-red-500/40 bg-red-500/5' : 'border-black/10 glass-1'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-ink-1">Feed {feed} <span className="font-mono text-[11px] font-normal text-ink-3">{load} W</span></p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tripped ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
            {tripped ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {tripped ? 'TRIPPED' : 'OK'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => doResetBreaker(feed)}
          disabled={!tripped}
          className="mt-1.5 w-full rounded-lg border border-black/10 glass-1 px-2 py-1 text-xs font-semibold text-ink-1 disabled:opacity-40"
        >
          Reset breaker {feed}
        </button>
      </div>
    );
  };

  // One screen on desktop: power controls on the left, load + temperature in
  // the middle, the rack itself on the right. Breaker headroom sits directly
  // under the primary counters. On narrow screens the rails stack in
  // reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: power drill controls */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Power drill</p>
          <div className="mt-2 space-y-1.5">
            <button type="button" onClick={doRestore} className="w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-left text-[13px] font-semibold text-ink-1">
              Trip setup — all on feed A
            </button>
            <button type="button" onClick={doSplit} className="w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-left text-[13px] font-semibold text-ink-1">
              Split feeds A / B
            </button>
            <button type="button" onClick={doShed} className="w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-left text-[13px] font-semibold text-ink-1">
              Shed 1,000 W
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-3">2,575 W on feed A’s 1,840 W breaker — split, shed, then reset.</p>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => doMoveAll('A')} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">Move all → A</button>
            <button type="button" onClick={() => doMoveAll('B')} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">Move all → B</button>
          </div>

          <div className="mt-2.5 space-y-1.5">
            {breakerRow('A')}
            {breakerRow('B')}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleFans}
              aria-pressed={!rack.fansOn}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-semibold ${rack.fansOn ? 'border border-black/10 glass-1 text-ink-1' : 'bg-amber-500/15 text-amber-700'}`}
            >
              <Fan size={13} /> {rack.fansOn ? 'Fans on' : 'Fans off'}
            </button>
            <button
              type="button"
              onClick={toggleCabling}
              aria-pressed={rack.cablingMessy}
              className={`rounded-lg px-1 py-1.5 text-xs font-semibold ${rack.cablingMessy ? 'bg-amber-500/15 text-amber-700' : 'border border-black/10 glass-1 text-ink-1'}`}
            >
              {rack.cablingMessy ? 'Messy cabling' : 'Tidy cabling'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-3">Fans off +6 °C · messy cabling +3 °C to the settled temperature.</p>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
              Reset
            </button>
          </div>
        </div>

        {/* Middle: live metrics, breaker headroom, temperature, load by device */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="grid grid-cols-4 gap-2">
            {metric('Load', `${total} W`)}
            {metric('Feed A', `${loadA} W`)}
            {metric('Feed B', `${loadB} W`)}
            {metric('Temp', `${rack.tempC.toFixed(1)} °C`)}
          </div>

          {/* Derived metric, directly under the primary counters. */}
          <div className="mt-2 rounded-xl border border-black/10 glass-1 p-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-bold text-ink-1">
                <Zap size={13} className="mr-1 inline" />
                Breaker headroom — {anyTripped ? 'a feed is tripped' : `${binding.headroomW} W on feed ${binding.feed}`}
              </p>
              <p className="text-[11px] tabular-nums text-ink-3">rating {BREAKER_RATING_W} W per feed</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
              <div
                className={`h-full rounded-full ${anyTripped ? 'bg-red-500' : binding.headroomW < 0 ? 'bg-red-500' : binding.headroomW < 300 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${anyTripped ? 100 : Math.min(100, Math.max(0, (feedDrawW(rack, binding.feed) / BREAKER_RATING_W) * 100))}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-ink-2">
              {anyTripped
                ? 'Move load off the tripped feed (or shed it), then press Reset breaker — a reset only holds under the rating.'
                : `Feed ${binding.feed} is closest to tripping at ${feedDrawW(rack, binding.feed)} W of ${BREAKER_RATING_W} W.`}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <TempChart history={sim.tempHistory} />
            <p className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-ink-1">
              <Thermometer size={14} />
              {rack.tempC.toFixed(1)} °C — {status}
              <span className="font-normal text-ink-3">· settling toward {equilibrium.toFixed(1)} °C</span>
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Load by device</p>
            <ul className="mt-2 space-y-1">
              {rack.devices.map((device) => {
                const dark = !device.powered || rack.tripped[device.feed];
                const draw = device.powered && !rack.tripped[device.feed] ? device.watts : 0;
                return (
                  <li key={device.id} className="flex items-center gap-2 text-[12px]">
                    <span className="w-20 shrink-0 font-semibold text-ink-1">{device.name}</span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                      <span className={`block h-full rounded-full ${dark ? 'bg-zinc-400' : 'bg-violet-500'}`} style={{ width: `${(draw / 600) * 100}%` }} />
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums text-ink-2">{dark ? '0 W' : `${device.watts} W`}</span>
                    <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ink-3">feed {device.feed}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] leading-snug text-ink-3">Drawing {poweredLoadW(rack)} W of {total} W assigned — a tripped feed’s devices stay dark until reset.</p>
          </div>
        </div>

        {/* Right rail: the rack itself */}
        <div className="lg:col-start-3 lg:row-start-1">
          <div className="rounded-xl border border-black/10 glass-1 p-2.5">
            <p className="mb-2 flex items-baseline justify-between px-0.5">
              <span className="text-caption font-semibold uppercase tracking-wider text-ink-2">42U cabinet</span>
              <span className="font-mono text-[11px] text-ink-3">U42 ↑ · U1 ↓</span>
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-md border border-black/10 bg-zinc-200/60 px-2 py-0.5">
                <span className="font-mono text-[11px] text-ink-3">U41–42</span>
                <span className="text-[12px] font-semibold text-ink-1">Fan tray · 2 × 140 mm</span>
                <span className={`text-[11px] font-semibold ${rack.fansOn ? 'text-emerald-700' : 'text-amber-700'}`}>{rack.fansOn ? 'spinning' : 'OFF'}</span>
              </div>
              {[...rack.devices].reverse().map((device) => {
                const dark = !device.powered || rack.tripped[device.feed];
                const uLabel = device.units > 1 ? `U${device.startU}–${device.startU + device.units - 1}` : `U${device.startU}`;
                return (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between gap-1 rounded-md border px-2 py-0.5 ${
                      dark ? 'border-zinc-300 bg-zinc-200/60' : device.feed === 'A' ? 'border-violet-400/60 bg-violet-200/50' : 'border-amber-400/60 bg-amber-200/50'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-ink-3">{uLabel}</span>
                    <span className={`text-[12px] font-semibold ${dark ? 'text-ink-3' : 'text-ink-1'}`}>{device.name}</span>
                    <span className="text-[11px] tabular-nums text-ink-2">{device.powered ? `${device.watts} W` : 'off'}</span>
                    <span className="flex overflow-hidden rounded-md border border-black/10" role="group" aria-label={`${device.name} feed`}>
                      {['A', 'B'].map((feed) => (
                        <button
                          key={feed}
                          type="button"
                          onClick={() => { setDeviceFeed(rack, device.id, feed); bump(); }}
                          aria-pressed={device.feed === feed}
                          aria-label={`${device.name} on feed ${feed}`}
                          className={`px-1.5 py-0.5 text-[11px] font-bold ${device.feed === feed ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                        >
                          {feed}
                        </button>
                      ))}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between rounded-md border border-dashed border-black/20 px-2 py-0.5">
                <span className="font-mono text-[11px] text-ink-3">U14–40</span>
                <span className="text-[12px] text-ink-2">27U free for growth</span>
                <span className="text-[11px] text-ink-3">empty</span>
              </div>
            </div>
            <p className="mt-2 px-0.5 text-[11px] leading-snug text-ink-3">
              2,010 × 600 × 1,000 mm · 1,867 mm usable · 1,500 kg static · PDU 12 outlets, 0U vertical · {rack.devices.filter((d) => d.powered).length} of {DEVICES.length} devices powered
            </p>
          </div>
        </div>

        {/* PDU / feed config, under the power rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Rack config — updates live</p>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-2.5 font-mono text-[11px] leading-snug text-[#859900]">{rackConfigText(rack)}</pre>
        </div>

        {/* Event log, under the rack */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Power event log</p>
          <div className="max-h-36 overflow-y-auto rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No power events yet. Feed A trips as soon as the load passes its 1,840 W breaker.</p>
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

      {/* Below the fold: lab brief, exercises, debrief — the one-screen fit above is unaffected. */}
      <div className="mt-8 space-y-6">
        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the 42U rack</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            A rack cabinet is the furniture of the data centre: 42U tall, 19 inches wide, and the home of every
            server, switch and UPS in the room. One rack unit (1U) is 44.45 mm, so the cabinet stands 2,010 mm tall
            with 1,867 mm of usable height and a static load rating of 1,500 kg. Perforated doors and 2–4 fan trays
            (120/140 mm) push air front-to-back through the gear, and a PDU — 8, 12 or 24 outlets, as a 1U strip or
            a 0U vertical — feeds it all from two independent feeds, A and B.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                <li>Read a rack: units, rails, fan trays, PDU and feeds.</li>
                <li>Trip a breaker on purpose and recover from it safely.</li>
                <li>Split load across two feeds and shed load to fit a breaker.</li>
                <li>Connect load, airflow and temperature — and see all three move.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                <li><strong>1U = 44.45 mm</strong> — 42U ≈ 1,867 mm usable height.</li>
                <li><strong>PDU</strong> — power distribution unit; 1U strip or 0U vertical.</li>
                <li><strong>Dual feed (A/B)</strong> — two independent power paths per rack.</li>
                <li><strong>Front-to-back airflow</strong> — cold air in the front, hot air out the back.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Trip the breaker.</strong> The rack starts at 2,575 W, all on feed A.
              Watch feed A trip against its 1,840 W breaker and the cabinet go dark — then read the headroom bar.
            </li>
            <li>
              <strong className="text-ink-1">Split the feeds.</strong> Press “Split feeds A / B” (Server 2 + Server 3 move
              to feed B: A 1,375 W, B 1,200 W). Both feeds are under their breakers now — press “Reset breaker A” and
              power returns. Try resetting <em>before</em> splitting: the reset refuses while the feed is still overloaded.
            </li>
            <li>
              <strong className="text-ink-1">Shed load, watch the temperature fall.</strong> Press “Shed 1,000 W” (Server 3
              + NAS off) and the load drops to 1,575 W. The cabinet settles from 38.5 °C toward 32.4 °C — less power
              drawn, less heat to move.
            </li>
            <li>
              <strong className="text-ink-1">Break the cooling.</strong> Turn the fans off (+6 °C) and make the cabling
              messy (+3 °C). The temperature the cabinet settles at climbs even though the load never changed — airflow
              is part of the power budget.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Feed A trips the moment its load passes 1,840 W — breakers protect the circuit, they do not negotiate.</li>
            <li>A reset only holds once the load is under the rating; splitting the feeds is what makes the reset stick.</li>
            <li>Shedding 1,000 W (Server 3 + NAS) drops the load to 1,575 W and the temperature from 38.5 °C toward 32.4 °C.</li>
            <li>Fans off and messy cabling raise the settled temperature without touching the load — cooling is capacity too.</li>
            <li>27U of the cabinet sits empty: a rack is planned with growth space, not filled to the top on day one.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <div className="mt-2 space-y-2">
            <details className="rounded-lg border border-black/10 glass-1 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-1">A 42U cabinet is 2,010 mm tall. How tall is 1U, and how much of the cabinet is usable?</summary>
              <p className="mt-1 text-sm text-ink-2">1U is 44.45 mm — 42 × 44.45 mm = 1,866.9 mm, which is the 1,867 mm of usable height. The rest is frame, rails and doors.</p>
            </details>
            <details className="rounded-lg border border-black/10 glass-1 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-1">Feed A carries 2,575 W on a 1,840 W breaker. What happens, and what fixes it?</summary>
              <p className="mt-1 text-sm text-ink-2">The breaker trips and feed A goes dark. Move load to feed B (split the feeds) and shed load until feed A is under 1,840 W — only then does a reset hold.</p>
            </details>
            <details className="rounded-lg border border-black/10 glass-1 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-1">Why does the temperature fall when you shed load?</summary>
              <p className="mt-1 text-sm text-ink-2">Every watt drawn becomes heat the cabinet must move. Less load means a lower equilibrium temperature — here from 38.5 °C at 2,575 W toward 32.4 °C at 1,575 W.</p>
            </details>
            <details className="rounded-lg border border-black/10 glass-1 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-1">A PDU comes as a 1U strip or a 0U vertical. Which mounting leaves all 42U free for gear?</summary>
              <p className="mt-1 text-sm text-ink-2">The 0U vertical PDU — it mounts in the side channel of the cabinet and uses no rack units at all. The 1U strip costs one unit of gear space.</p>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}
