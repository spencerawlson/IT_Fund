import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Network } from 'lucide-react';
import {
  BROADCAST_MAC,
  UNKNOWN_MAC,
  CAM_CAPACITY,
  HOSTS,
  hostById,
  createNetwork,
  switchById,
  electRootBridge,
  setLinkUp,
  setPriority,
  setStpEnabled,
  deliverFrame,
  isLoopActive,
  stormFramesPerSecond,
  camSize,
  blockedPortCount,
  switchCli,
} from '@/lib/networkSwitch';

const TICK_MS = 100;
const DOT_MS = 900;
const MAX_EVENTS = 6;
const MAX_CAM_ROWS = 5;

// Fixed diagram geometry (viewBox 0 0 640 240).
const PC_POS = { 'PC-A': [46, 32], 'PC-B': [46, 208], 'PC-C': [594, 32], 'PC-D': [594, 208] };
const SW_CENTER = { SW1: [235, 130], SW2: [405, 130] };
const SW_EDGE = { SW1: { P1: [170, 108], P2: [170, 152], P3: [300, 112], P4: [300, 148] }, SW2: { P1: [470, 108], P2: [470, 152], P3: [340, 112], P4: [340, 148] } };
const TRUNK_MID = { P3: [320, 112], P4: [320, 148] };

function pointAlong(waypoints, progress) {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  if (waypoints.length === 1 || progress <= 0) return { x: waypoints[0][0], y: waypoints[0][1] };
  if (progress >= 1) {
    const last = waypoints[waypoints.length - 1];
    return { x: last[0], y: last[1] };
  }
  const lengths = [];
  let total = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    const dx = waypoints[i][0] - waypoints[i - 1][0];
    const dy = waypoints[i][1] - waypoints[i - 1][1];
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }
  let target = progress * total;
  for (let i = 1; i < waypoints.length; i += 1) {
    if (target <= lengths[i - 1]) {
      const t = lengths[i - 1] === 0 ? 0 : target / lengths[i - 1];
      return {
        x: waypoints[i - 1][0] + (waypoints[i][0] - waypoints[i - 1][0]) * t,
        y: waypoints[i - 1][1] + (waypoints[i][1] - waypoints[i - 1][1]) * t,
      };
    }
    target -= lengths[i - 1];
  }
  const last = waypoints[waypoints.length - 1];
  return { x: last[0], y: last[1] };
}

function freshSim() {
  return {
    network: createNetwork(),
    dots: [],
    sent: 0,
    forwarded: 0,
    flooded: 0,
    dropped: 0,
    floodTimes: [],
    events: [],
    loopSince: null,
    spawnAcc: 0,
    nextId: 1,
  };
}

const DOT_FILL = { delivered: '#059669', flooded: '#D97706', dropped: '#DC2626' };

export default function SwitchSimulator() {
  const [traffic, setTraffic] = useState(4);
  const [paused, setPaused] = useState(false);
  const [srcHost, setSrcHost] = useState('PC-A');
  const [dstChoice, setDstChoice] = useState('00:1a:2b:00:00:0c');
  const [panelSwitch, setPanelSwitch] = useState('SW1');
  const [fanFault, setFanFault] = useState(false);
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

  const addDot = (sim, waypoints, kind) => {
    sim.dots.push({ id: sim.nextId, waypoints, progress: 0, kind });
    sim.nextId += 1;
  };

  const addDotsForResult = (sim, srcId, dstMac, result) => {
    const src = hostById(srcId);
    const dstHost = HOSTS.find((h) => h.mac === String(dstMac).toLowerCase());
    if (result.outcome === 'delivered' && dstHost) {
      const trunk = result.hops[0].outPorts.find((p) => p === 'P3' || p === 'P4') || 'P3';
      const waypoints = [PC_POS[srcId], SW_EDGE[src.switchId][src.portId], SW_CENTER[src.switchId]];
      if (result.hops.length > 1) {
        waypoints.push(
          TRUNK_MID[trunk],
          SW_CENTER[result.hops[1].switchId],
          SW_EDGE[result.hops[1].switchId][dstHost.portId],
        );
      }
      waypoints.push(PC_POS[dstHost.id]);
      addDot(sim, waypoints, 'delivered');
    } else if (result.outcome === 'flooded') {
      for (const hop of result.hops) {
        const swId = hop.switchId;
        for (const outPort of hop.outPorts) {
          const port = switchById(sim.network, swId).ports.find((p) => p.id === outPort);
          const farHost = HOSTS.find((h) => h.switchId === swId && h.portId === outPort);
          const end = port?.mode === 'trunk' ? TRUNK_MID[outPort] : farHost ? PC_POS[farHost.id] : SW_CENTER[swId];
          const start = hop === result.hops[0]
            ? PC_POS[srcId]
            : TRUNK_MID[result.hops[0].outPorts.find((p) => p === 'P3' || p === 'P4') || 'P3'];
          addDot(sim, [start, SW_CENTER[swId], end], 'flooded');
        }
      }
    } else {
      addDot(sim, [PC_POS[srcId], SW_CENTER[src.switchId]], 'dropped');
    }
  };

  const sendFrame = (sim, srcId, dstMac, quiet = false) => {
    const src = hostById(srcId);
    if (!src) return;
    const result = deliverFrame(sim.network, srcId, dstMac);
    sim.sent += 1;
    const dstHost = HOSTS.find((h) => h.mac === String(dstMac).toLowerCase());
    const dstLabel = dstMac === BROADCAST_MAC ? 'broadcast' : dstHost ? dstHost.id : 'unknown MAC';
    addDotsForResult(sim, srcId, dstMac, result);
    if (result.outcome === 'delivered') {
      sim.forwarded += 1;
      const floodedFirst = result.hops.some((hop) => hop.action === 'flood');
      if (!quiet) {
        logEvent(sim, floodedFirst
          ? `${srcId} → ${dstHost.id} delivered — flooded first (destination was unknown), both switches learned ${srcId}.`
          : `${srcId} → ${dstHost.id} delivered via ${result.hops[0].switchId} ${result.hops[0].outPorts[0]}${result.hops[1] ? ` → ${result.hops[1].switchId} ${dstHost.portId}` : ''} — one port, no flood.`);
      }
      // The host answers: its reply teaches the switches the reverse
      // path, so the next frame to it goes to one port instead of flooding.
      if (floodedFirst && dstHost) {
        const reply = deliverFrame(sim.network, dstHost.id, src.mac);
        addDotsForResult(sim, dstHost.id, src.mac, reply);
      }
    } else if (result.outcome === 'flooded') {
      sim.flooded += 1;
      sim.floodTimes.push(Date.now());
      if (!quiet) logEvent(sim, `${srcId} → ${dstLabel}: flooded in VLAN ${src.vlan} — no host answered.`);
    } else {
      sim.dropped += 1;
      if (!quiet) logEvent(sim, `${srcId} → ${dstLabel}: dropped — ${result.reason}.`);
    }
  };

  const autoFrame = (sim) => {
    const src = HOSTS[Math.floor(Math.random() * HOSTS.length)];
    const roll = Math.random();
    let dstMac;
    if (roll < 0.6) {
      const dst = HOSTS[Math.floor(Math.random() * HOSTS.length)];
      dstMac = dst.mac;
    } else if (roll < 0.8) {
      dstMac = UNKNOWN_MAC;
    } else {
      dstMac = BROADCAST_MAC;
    }
    sendFrame(sim, src.id, dstMac, true);
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const now = Date.now();
      const loop = isLoopActive(sim.network);
      if (loop && sim.loopSince === null) {
        sim.loopSince = now;
        logEvent(sim, 'LOOP DETECTED — both trunks forwarding with STP off. Broadcast storm building.');
      } else if (!loop && sim.loopSince !== null) {
        sim.loopSince = null;
        logEvent(sim, 'Loop broken — STP reconverged, storm stopped.');
      }
      const { traffic: rate } = settingsRef.current;
      sim.spawnAcc += (rate * TICK_MS) / 1000;
      while (sim.spawnAcc >= 1) {
        sim.spawnAcc -= 1;
        autoFrame(sim);
      }
      sim.dots = sim.dots.filter((dot) => {
        dot.progress += TICK_MS / DOT_MS;
        return dot.progress < 1;
      });
      sim.floodTimes = sim.floodTimes.filter((t) => now - t <= 1000);
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const { network } = sim;
  const root = electRootBridge(network.switches);
  const loop = isLoopActive(network);
  const floodRate = loop && sim.loopSince !== null
    ? stormFramesPerSecond(network, (Date.now() - sim.loopSince) / 1000)
    : sim.floodTimes.length;
  const camEntries = camSize(network);
  const blocked = blockedPortCount(network);
  const panelSw = switchById(network, panelSwitch);

  const reset = () => {
    simRef.current = freshSim();
    setFanFault(false);
    bump();
  };

  const toggleStp = () => {
    const enabled = !network.stpEnabled;
    setStpEnabled(network, enabled);
    logEvent(sim, enabled ? 'STP enabled — root bridge elected, redundant ports blocked.' : 'STP DISABLED — redundant trunks will both forward.');
    bump();
  };

  const toggleLink = (linkId) => {
    const port = switchById(network, 'SW1').ports.find((p) => p.linkId === linkId);
    const up = !port.linkUp;
    setLinkUp(network, linkId, up);
    const label = linkId === 'A' ? 'P3↔P3' : 'P4↔P4';
    logEvent(sim, up ? `Trunk link ${label} is UP — STP will block one end if both are up.` : `Trunk link ${label} is DOWN — the network reconverges on the surviving path.`);
    bump();
  };

  const linkUp = (linkId) => switchById(network, 'SW1').ports.find((p) => p.linkId === linkId).linkUp;

  const changePriority = (switchId, priority) => {
    setPriority(network, switchId, Number(priority));
    const newRoot = electRootBridge(network.switches);
    logEvent(sim, `${switchId} priority → ${priority}. Root bridge is now ${newRoot.id}.`);
    bump();
  };

  const metric = (label, value, tone) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${tone || 'text-ink-1'}`}>{value}</p>
    </div>
  );

  const ledColor = (state) => (state === 'forwarding' ? '#16A34A' : state === 'blocked' ? '#D97706' : '#DC2626');
  const ledLabel = (state) => (state === 'forwarding' ? 'forwarding' : state === 'blocked' ? 'blocked by STP' : 'link down');

  const camRows = network.switches.flatMap((sw) => sw.cam.map((e) => ({ ...e, switchId: sw.id })));

  const toggleReveal = (key) => setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const checkYourself = [
    {
      q: 'A host sends a frame to a MAC the switch has never seen. What does the switch do — and why?',
      a: 'It floods the frame out of every forwarding port in the same VLAN. Flooding is how the switch finds the destination: whichever host owns the MAC answers, and the switch learns its port from the reply.',
    },
    {
      q: 'PC-A (VLAN 10) cannot reach PC-D (VLAN 20) through these two switches. Why not?',
      a: 'A VLAN is a separate broadcast domain. The switches never forward a frame from VLAN 10 into VLAN 20 — only a router (or a layer 3 switch) joins VLANs, which is why the frame is dropped.',
    },
    {
      q: 'Two switches are joined by two trunk links and STP is off. One broadcast frame is sent. What happens — and what would stop it?',
      a: 'A broadcast storm: Ethernet has no TTL, so the frame circles the loop forever, multiplying until the links saturate (here, 14,800 frames/s). STP stops it by electing a root bridge and blocking one redundant port, leaving a single loop-free path.',
    },
    {
      q: 'The FAN LED on the front panel turns amber. What does it mean?',
      a: 'A fan fault or overheating. PWR, SYS and FAN are solid green when healthy; amber on FAN means check the fans and the temperature before the switch shuts itself down.',
    },
  ];

  // One screen on desktop: spanning-tree controls on the left, counters +
  // topology + CAM table in the middle, the front panel on the right. The
  // flood rate (the derived metric) sits directly under the primary
  // counters. On narrow screens the rails stack in reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: spanning tree + traffic controls */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Spanning tree</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleStp}
              aria-pressed={network.stpEnabled}
              className={`rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight transition ${network.stpEnabled ? 'glass-btn' : 'border border-red-500/40 bg-red-500/5 text-red-700'}`}
            >
              STP {network.stpEnabled ? 'on' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => toggleLink('A')}
              aria-pressed={linkUp('A')}
              title="The active trunk between SW1 P3 and SW2 P3."
              className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold leading-tight text-ink-1"
            >
              Link P3 {linkUp('A') ? 'up' : 'DOWN'}
            </button>
            <button
              type="button"
              onClick={() => toggleLink('B')}
              aria-pressed={linkUp('B')}
              title="The redundant trunk between SW1 P4 and SW2 P4."
              className="col-span-2 rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold leading-tight text-ink-1"
            >
              Redundant link P4 {linkUp('B') ? 'up' : 'DOWN'}
            </button>
          </div>
          <p className="mt-2 text-xs leading-snug text-ink-2">
            Root: <strong className="text-ink-1">{root.id}</strong> — lowest priority wins, then lowest MAC.
          </p>

          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">SW1 STP priority</span>
              <select
                value={switchById(network, 'SW1').priority}
                onChange={(e) => changePriority('SW1', e.target.value)}
                aria-label="SW1 STP priority"
                className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                <option value={4096}>4096 (root)</option>
                <option value={32768}>32768 (default)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">SW2 STP priority</span>
              <select
                value={switchById(network, 'SW2').priority}
                onChange={(e) => changePriority('SW2', e.target.value)}
                aria-label="SW2 STP priority"
                className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
              >
                <option value={32768}>32768 (default)</option>
                <option value={0}>0 (root — beats 4096)</option>
              </select>
            </label>
          </div>

          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Send a frame</p>
            <div className="mt-2 space-y-2">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">From</span>
                <select
                  value={srcHost}
                  onChange={(e) => setSrcHost(e.target.value)}
                  aria-label="Source host"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
                >
                  {HOSTS.map((h) => (
                    <option key={h.id} value={h.id}>{h.id} — VLAN {h.vlan} ({h.switchId} {h.portId})</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">To</span>
                <select
                  value={dstChoice}
                  onChange={(e) => setDstChoice(e.target.value)}
                  aria-label="Destination MAC"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1"
                >
                  {HOSTS.map((h) => (
                    <option key={h.id} value={h.mac}>{h.id} — {h.mac}</option>
                  ))}
                  <option value={UNKNOWN_MAC}>Unknown MAC — {UNKNOWN_MAC}</option>
                  <option value={BROADCAST_MAC}>Broadcast — {BROADCAST_MAC}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => { sendFrame(sim, srcHost, dstChoice); bump(); }}
                className="glass-btn w-full rounded-lg px-2 py-1.5 text-[13px] font-semibold"
              >
                Send frame
              </button>
            </div>
          </div>

          <div className="mt-3 border-t border-black/10 pt-3">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-1">Auto traffic — {traffic} frames/s</span>
              <input type="range" min="0" max="20" value={traffic} onChange={(e) => setTraffic(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Auto traffic in frames per second" />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Middle: counters, topology, CAM table */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {loop && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3" role="alert">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" />
              <p className="text-[13px] leading-snug text-red-700">
                <strong>Broadcast storm.</strong> Both trunks forward with STP off and Ethernet has no TTL —
                re-enable STP or drop the redundant link to break the loop.
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {metric('forwarded', sim.forwarded)}
            {metric('flooded', sim.flooded)}
            {metric('CAM entries', camEntries)}
          </div>
          {/* Derived metrics, directly under the primary counters. */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {metric('flood rate', `${floodRate.toLocaleString('en-US')} /s`, loop ? 'text-red-700' : 'text-ink-1')}
            {metric('blocked ports', blocked)}
            {metric('dropped', sim.dropped)}
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Two switches · two VLANs · one extra trunk</p>
              <p className="text-[11px] text-ink-3">green = delivered · amber = flooded · red = dropped</p>
            </div>
            <svg viewBox="0 0 640 240" className="w-full" role="img" aria-label="Topology: PC-A and PC-B on SW1, PC-C and PC-D on SW2, joined by two trunk links">
              {/* Host links */}
              <line x1="70" y1="32" x2="170" y2="108" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
              <line x1="70" y1="208" x2="170" y2="152" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
              <line x1="570" y1="32" x2="470" y2="108" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
              <line x1="570" y1="208" x2="470" y2="152" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
              {/* Trunk links */}
              {network.switches.map((sw) => sw.ports.filter((p) => p.mode === 'trunk').map((port) => {
                const y = port.id === 'P3' ? 112 : 148;
                const up = port.linkUp;
                const color = !up ? '#9CA3AF' : port.state === 'blocked' ? '#D97706' : '#16A34A';
                return (
                  <g key={`${sw.id}-${port.id}`}>
                    {sw.id === 'SW1' && (
                      <line x1="300" y1={y} x2="340" y2={y} stroke={color} strokeWidth="3" strokeDasharray={up ? undefined : '5 4'} />
                    )}
                    {sw.id === 'SW1' && (
                      <text x="320" y={y - 6} textAnchor="middle" fontSize="10" fill={color} fontWeight="700">
                        {port.id} {port.state}
                      </text>
                    )}
                  </g>
                );
              }))}
              {/* Switch boxes */}
              {network.switches.map((sw) => {
                const x = sw.id === 'SW1' ? 170 : 340;
                const isRootBridge = sw.id === root.id;
                return (
                  <g key={sw.id}>
                    <rect x={x} y="95" width="130" height="70" rx="10" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                    <text x={x + 65} y="120" textAnchor="middle" fontSize="14" fontWeight="800" fill="#111827">{sw.id}</text>
                    <text x={x + 65} y="137" textAnchor="middle" fontSize="10" fill="#5B6472">
                      {isRootBridge ? 'root bridge' : `priority ${sw.priority}`}
                    </text>
                    <text x={x + 65} y="152" textAnchor="middle" fontSize="10" fill="#5B6472">CAM {sw.cam.length.toLocaleString('en-US')} entries</text>
                    {sw.ports.map((port) => {
                      const cx = sw.id === 'SW1' ? (port.mode === 'access' ? 170 : 300) : (port.mode === 'access' ? 470 : 340);
                      const cy = port.mode === 'access' ? (port.id === 'P1' ? 108 : 152) : (port.id === 'P3' ? 112 : 148);
                      return <circle key={port.id} cx={cx} cy={cy} r="5" fill={ledColor(port.state)} stroke="#FFFFFF" strokeWidth="1.5" />;
                    })}
                  </g>
                );
              })}
              {/* Hosts */}
              {HOSTS.map((host) => {
                const [x, y] = PC_POS[host.id];
                return (
                  <g key={host.id}>
                    <rect x={x - 24} y={y - 14} width="48" height="28" rx="7" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">{host.id}</text>
                    <text x={x} y={y + 26} textAnchor="middle" fontSize="9" fill="#5B6472">VLAN {host.vlan}</text>
                  </g>
                );
              })}
              {/* In-flight frames */}
              {sim.dots.map((dot) => {
                const pos = pointAlong(dot.waypoints, dot.progress);
                return <circle key={dot.id} cx={pos.x} cy={pos.y} r="6" fill={DOT_FILL[dot.kind]} stroke="#FFFFFF" strokeWidth="1.5" />;
              })}
            </svg>
            <p className="mt-1 text-xs leading-snug text-ink-2">
              PC-A and PC-C share VLAN 10; PC-B and PC-D share VLAN 20. The P3 trunk carries both VLANs
              (802.1Q); P4 is the redundant trunk STP holds blocked.
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">CAM table — learned live</p>
              <p className="text-[11px] text-ink-3">{camEntries.toLocaleString('en-US')} of {CAM_CAPACITY.toLocaleString('en-US')} entries</p>
            </div>
            {camRows.length === 0 ? (
              <p className="text-[13px] text-ink-3">Nothing learned yet. Send a frame, or turn the auto traffic up.</p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-ink-3">
                    <th className="py-1 pr-2 font-semibold">Switch</th>
                    <th className="py-1 pr-2 font-semibold">VLAN</th>
                    <th className="py-1 pr-2 font-semibold">MAC address</th>
                    <th className="py-1 font-semibold">Port</th>
                  </tr>
                </thead>
                <tbody>
                  {camRows.slice(0, MAX_CAM_ROWS).map((row) => (
                    <tr key={`${row.switchId}-${row.vlan}-${row.mac}`} className="border-t border-black/5">
                      <td className="py-1 pr-2 font-semibold text-ink-1">{row.switchId}</td>
                      <td className="py-1 pr-2 tabular-nums text-ink-2">{row.vlan}</td>
                      <td className="py-1 pr-2 font-mono text-[12px] text-ink-2">{row.mac}</td>
                      <td className="py-1 font-semibold text-ink-1">{row.portId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {camRows.length > MAX_CAM_ROWS && (
              <p className="mt-1 text-[11px] text-ink-3">+ {camRows.length - MAX_CAM_ROWS} more — see the CLI panel for the full table.</p>
            )}
          </div>
        </div>

        {/* Right rail: the front panel */}
        <div className="flex flex-col gap-2.5 lg:col-start-3 lg:row-start-1">
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Front panel</p>
              <div className="flex overflow-hidden rounded-lg border border-black/10" role="group" aria-label="Switch shown on the front panel">
                {['SW1', 'SW2'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPanelSwitch(id)}
                    aria-pressed={panelSwitch === id}
                    className={`px-2 py-0.5 text-[12px] font-semibold ${panelSwitch === id ? 'glass-btn rounded-none' : 'glass-1 text-ink-2'}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-black/10 bg-white p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-ink-1">{panelSw.id} · 48-port managed switch</p>
                <Network size={14} className="text-ink-3" />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {panelSw.ports.map((port) => (
                  <div key={port.id} className="rounded-md border border-black/10 px-1 py-1.5 text-center">
                    <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={{ backgroundColor: ledColor(port.state) }} title={`${port.id}: ${ledLabel(port.state)}`} />
                    <p className="text-[11px] font-bold leading-none text-ink-1">{port.id}</p>
                    <p className="mt-0.5 text-[9px] leading-none text-ink-3">{port.mode === 'access' ? `VLAN ${port.vlan}` : 'trunk'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-2">
                <span>SFP+ uplinks ×2 · 10 GbE</span>
                <span>Console port · USB backup</span>
              </div>
              <div className="mt-2 flex items-center gap-3 border-t border-black/10 pt-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> PWR
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> SYS
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-1">
                  <span className={`h-2 w-2 rounded-full ${fanFault ? 'bg-amber-500' : 'bg-emerald-600'}`} /> FAN {fanFault ? '— fault' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !fanFault;
                    setFanFault(next);
                    logEvent(sim, next ? 'FAN LED amber — fan fault / overheating.' : 'Fan fault cleared — FAN LED green.');
                    bump();
                  }}
                  aria-pressed={fanFault}
                  className="ml-auto rounded-lg border border-black/10 px-2 py-0.5 text-[11px] font-semibold text-ink-1"
                >
                  {fanFault ? 'Clear fan fault' : 'Simulate fan fault'}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
                Switching ASIC forwards at line rate; the management CPU runs the CLI, web UI and SNMP.
              </p>
            </div>
            <div className="mt-2 space-y-1">
              {panelSw.ports.map((port) => (
                <div key={port.id} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ledColor(port.state) }} />
                  <span className="font-bold text-ink-1">{port.id}</span>
                  <span className="text-ink-2">{port.mode === 'access' ? `access · VLAN ${port.vlan} · untagged` : `trunk · VLANs 10, 20 · native 1`}</span>
                  <span className="ml-auto font-semibold text-ink-1">{port.role} · {port.state}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">What the LEDs mean</p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-ink-2">
              <li><span className="font-semibold text-ink-1">Green port LED</span> — link up, forwarding.</li>
              <li><span className="font-semibold text-ink-1">Amber port LED</span> — STP is holding the port blocked.</li>
              <li><span className="font-semibold text-ink-1">Red port LED</span> — link down.</li>
              <li><span className="font-semibold text-ink-1">Amber FAN LED</span> — fan fault or overheating.</li>
            </ul>
          </div>
        </div>

        {/* CLI panel, under the controls rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Switch CLI — updates live</p>
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900]">{switchCli(network)}</pre>
        </div>

        {/* Event log, under the front panel */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2">
            <Activity size={13} /> Event log
          </p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No events yet. Send a frame, turn STP off, or drop the redundant link.</p>
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
          <h3 className="text-base font-bold text-ink-1">Lab brief — the managed switch</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Two switches, four hosts, two VLANs and one trunk too many. Drive the topology above: send frames,
            watch the CAM table learn where every MAC lives, and see what spanning tree does with the redundant link.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li>Watch a switch learn source MAC addresses into its CAM table (32,000 entries).</li>
                <li>See known unicast go to one port and unknown unicast flood the VLAN.</li>
                <li>Prove a VLAN is a separate broadcast domain — no router, no crossing.</li>
                <li>Elect an STP root bridge, block the redundant trunk, and reconverge after a failure.</li>
                <li>Cause a broadcast storm, then stop it.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                <li><strong className="text-ink-1">CAM / MAC table</strong> — MAC → port, learned from source addresses.</li>
                <li><strong className="text-ink-1">Flooding</strong> — unknown unicast and broadcast go to every port in the VLAN.</li>
                <li><strong className="text-ink-1">Access vs trunk</strong> — one VLAN untagged; many VLANs, 802.1Q-tagged, native untagged.</li>
                <li><strong className="text-ink-1">STP / RSTP</strong> — 802.1D / 802.1w: root bridge + blocked ports stop loops.</li>
                <li><strong className="text-ink-1">Broadcast storm</strong> — no TTL on Ethernet, so a loop multiplies broadcasts.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink-1">Watch the CAM table learn.</strong> Send PC-A → PC-C. The first frame
              floods (SW1 has never seen PC-C); check the CLI panel — both switches have now learned PC-A. Send it
              again: this time it goes to one port.
            </li>
            <li>
              <strong className="text-ink-1">Flood an unknown address.</strong> Send PC-A → Unknown MAC. The frame
              floods every forwarding port in VLAN 10 — including both trunks — but never touches VLAN 20.
            </li>
            <li>
              <strong className="text-ink-1">Prove VLAN isolation.</strong> Send PC-A → PC-D. Same switches, same
              trunk — dropped. VLAN 10 and VLAN 20 are separate broadcast domains; only a router joins them.
            </li>
            <li>
              <strong className="text-ink-1">Cause a broadcast storm.</strong> Turn STP off with the redundant link up,
              then send a broadcast. The flood rate climbs to 14,800 frames/s. Turn STP back on and watch it stop.
            </li>
            <li>
              <strong className="text-ink-1">Force reconvergence.</strong> With STP on, drop the redundant P4
              link — nothing changes, P3 still carries the traffic. Bring P4 back up, then drop the P3 link
              instead: SW2 P4 unblocks and becomes the root port. Or flip the priorities and watch SW2 become
              the root bridge.
            </li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> A first frame to a new MAC floods; the reply teaches both switches, and the second frame goes to one port.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Flooding stays inside the VLAN — PC-B never sees VLAN 10 traffic.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> With STP on, SW1 is root (priority 4096) and SW2 P4 sits blocked; the topology has exactly one loop-free path.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Killing the active trunk unblocks the standby in the same tick — no manual step needed.</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> With STP off and both trunks up, one broadcast multiplies to 14,800 frames/s — Ethernet has no TTL.</li>
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
