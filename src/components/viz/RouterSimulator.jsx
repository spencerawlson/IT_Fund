import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Globe, Router, Shield } from 'lucide-react';
import {
  FLOATING_STATIC_AD,
  PUBLIC_IP,
  SIMULATED_CONVERGENCE_S,
  INTERFACES,
  isValidCidr,
  isValidIp,
  createRoutingTable,
  addStaticRoute,
  removeStaticRoute,
  refreshOspfRoutes,
  selectDefaultRoute,
  explainSelection,
  createNatTable,
  needsNat,
  translateOut,
  createAcl,
  evaluateAcl,
  routerConf,
} from '@/lib/networkRouter';

const TICK_MS = 100;
const DOT_MS = 900;
const MAX_EVENTS = 8;
const AUTO_DESTINATIONS = ['8.8.8.8', '172.16.1.10', '172.16.2.10', '10.0.1.8', '1.1.1.1'];
const AUTO_PORTS = [443, 80, 443, 80, 53];
const HOSTS = [
  { ip: '10.0.0.5', label: '10.0.0.5 · VLAN 10 (staff)', vlan: 10 },
  { ip: '10.0.1.5', label: '10.0.1.5 · VLAN 20 (guest)', vlan: 20 },
];

function freshSim() {
  return { sent: 0, forwarded: 0, dropped: 0, dots: [], events: [], nextId: 1 };
}

/** Dot position along host → router → next hop, from progress 0..1. */
function dotPosition(dot) {
  const capped = dot.type === 'ok' ? dot.progress : Math.min(dot.progress, 0.5);
  const y = dot.srcY + (50 - dot.srcY) * capped;
  if (capped <= 0.5) {
    const t = capped / 0.5;
    return { x: 6 + (46 - 6) * t, y };
  }
  const t = (capped - 0.5) / 0.5;
  return { x: 46 + (90 - 46) * t, y };
}

function CheckYourself({ question, answer }) {
  return (
    <details className="rounded-xl border border-black/10 glass-1 px-3 py-2">
      <summary className="cursor-pointer text-[13px] font-semibold text-ink-1">{question}</summary>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{answer}</p>
    </details>
  );
}

export default function RouterSimulator() {
  const [routes, setRoutes] = useState(() => createRoutingTable());
  const [linksUp, setLinksUp] = useState({ 'wan-primary': true, 'wan-backup': true, 'r1-r2': true, 'r1-r3': true });
  const [nat, setNat] = useState(() => createNatTable());
  const [aclOn, setAclOn] = useState(true);
  const [srcHost, setSrcHost] = useState(HOSTS[0].ip);
  const [destIp, setDestIp] = useState('8.8.8.8');
  const [destPort, setDestPort] = useState(443);
  const [traffic, setTraffic] = useState(0);
  const [paused, setPaused] = useState(false);
  const [routeForm, setRouteForm] = useState({ destination: '', nextHop: '', ad: 1 });
  const [formError, setFormError] = useState('');
  const [lastWalk, setLastWalk] = useState(null);
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const cycleRef = useRef(0);
  const spawnAccRef = useRef(0);

  // Live state for the tick loop and packet sender (same pattern as the
  // load balancer: refs mirror state so the interval never goes stale).
  const liveRef = useRef({ routes, linksUp, nat, aclOn });
  liveRef.current = { routes, linksUp, nat, aclOn };

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  const sendPacket = (srcIp, dstIp, dstPort) => {
    const sim = simRef.current;
    const { routes: table, linksUp: links, nat: natTable, aclOn: aclEnabled } = liveRef.current;
    sim.sent += 1;
    const host = HOSTS.find((h) => h.ip === srcIp) || HOSTS[0];
    const srcY = host.vlan === 10 ? 28 : 72;
    const pushDot = (type) => {
      sim.dots.push({ id: sim.nextId, type, srcY, progress: 0, durationMs: DOT_MS });
      sim.nextId += 1;
    };

    if (aclEnabled) {
      const { verdict, rule } = evaluateAcl(createAcl(), { protocol: 'tcp', srcIp, srcPort: 49152, destIp: dstIp, destPort: dstPort }, 'inbound');
      if (verdict === 'deny') {
        sim.dropped += 1;
        pushDot('denied');
        const why = rule ? `ACL rule ${rule.id} (${rule.description})` : 'the implicit deny';
        setLastWalk({ srcIp, destIp: dstIp, destPort: dstPort, verdict: 'denied', headline: `Denied by ${why} — first match wins.`, detail: `A ${srcIp} packet for port ${dstPort} never leaves R1. Turn the ACL off and send it again to watch it pass.` });
        logEvent(sim, `ACL denied ${srcIp} → ${dstIp}:${dstPort} (${why}).`);
        bump();
        return;
      }
    }

    const { route, text } = explainSelection(table, dstIp, links);
    if (!route) {
      sim.dropped += 1;
      pushDot('denied');
      setLastWalk({ srcIp, destIp: dstIp, destPort: dstPort, verdict: 'denied', headline: `No route to ${dstIp} — packet dropped.`, detail: 'No route in the table matches, and no default route is up. Add a route or revive a WAN link.' });
      logEvent(sim, `No route to ${dstIp} — packet from ${srcIp} dropped.`);
      bump();
      return;
    }

    let natText = 'No NAT — destination is inside.';
    if (needsNat(srcIp) && !needsNat(dstIp)) {
      const { nat: nextNat, entry } = translateOut(natTable, srcIp, 49152, dstIp, dstPort);
      setNat(nextNat);
      liveRef.current.nat = nextNat;
      natText = `NAT overload (PAT): ${entry.insideLocal}:49152 → ${entry.insideGlobal}:${entry.globalPort}. Replies come back to port ${entry.globalPort}.`;
    }
    sim.forwarded += 1;
    pushDot('ok');
    setLastWalk({
      srcIp,
      destIp: dstIp,
      destPort: dstPort,
      verdict: 'forwarded',
      headline: `Forwarded via ${route.nextHop} on ${route.interface} (${route.source}, AD ${route.ad}, metric ${route.metric}).`,
      detail: `${text} ${natText}`,
    });
    logEvent(sim, `${srcIp} → ${dstIp}:${dstPort} via ${route.nextHop} (${route.source}, AD ${route.ad}).`);
    bump();
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      sim.dots = sim.dots.filter((dot) => {
        dot.progress += TICK_MS / dot.durationMs;
        return dot.progress < 1;
      });
      if (traffic > 0) {
        spawnAccRef.current += (traffic * TICK_MS) / 1000;
        while (spawnAccRef.current >= 1) {
          spawnAccRef.current -= 1;
          const i = cycleRef.current % AUTO_DESTINATIONS.length;
          cycleRef.current += 1;
          const src = cycleRef.current % 2 === 0 ? HOSTS[0].ip : HOSTS[1].ip;
          sendPacket(src, AUTO_DESTINATIONS[i], AUTO_PORTS[i]);
        }
      }
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, traffic]);

  const sim = simRef.current;
  const defaultRoute = selectDefaultRoute(routes, linksUp);
  const activeRoutes = routes.filter((r) => !(r.linkId && linksUp[r.linkId] === false));

  const toggleWanLink = (linkId, label) => {
    const next = { ...linksUp, [linkId]: !linksUp[linkId] };
    setLinksUp(next);
    liveRef.current.linksUp = next;
    const simNow = simRef.current;
    if (next[linkId]) {
      logEvent(simNow, `${label} is back up.`);
    } else {
      logEvent(simNow, `${label} is DOWN.`);
      if (linkId === 'wan-primary') {
        logEvent(simNow, `Floating static (AD ${FLOATING_STATIC_AD}) via 198.51.100.1 is now the active default route.`);
      }
    }
    bump();
  };

  const toggleOspfLink = (linkId) => {
    const next = { ...linksUp, [linkId]: !linksUp[linkId] };
    setLinksUp(next);
    liveRef.current.linksUp = next;
    const refreshed = refreshOspfRoutes(routes, next);
    setRoutes(refreshed);
    liveRef.current.routes = refreshed;
    const simNow = simRef.current;
    if (next[linkId]) {
      logEvent(simNow, `R1–R2 link restored — OSPF reconverged in ${SIMULATED_CONVERGENCE_S} s, 172.16.0.0/16 via R2 again.`);
    } else {
      const via = refreshed.find((r) => r.destination === '172.16.1.0/24');
      logEvent(simNow, `R1–R2 link DOWN — OSPF reconverged in ${SIMULATED_CONVERGENCE_S} s; 172.16.1.0/24 now via ${via ? `${via.nextHop} (metric ${via.metric})` : 'no path'}.`);
    }
    bump();
  };

  const addRoute = () => {
    const { destination, nextHop, ad } = routeForm;
    if (!isValidCidr(destination)) {
      setFormError('Destination must be a network in CIDR form, e.g. 192.0.2.0/24.');
      return;
    }
    if (!isValidIp(nextHop)) {
      setFormError('Next hop must be a valid IPv4 address, e.g. 203.0.113.1.');
      return;
    }
    const adNum = Number(ad);
    if (!Number.isInteger(adNum) || adNum < 0 || adNum > 255) {
      setFormError('AD must be a whole number from 0 to 255.');
      return;
    }
    try {
      const next = addStaticRoute(routes, { destination, nextHop, interface: 'Gi0/1', ad: adNum });
      setRoutes(next);
      liveRef.current.routes = next;
      setFormError('');
      setRouteForm({ destination: '', nextHop: '', ad: 1 });
      const simNow = simRef.current;
      logEvent(simNow, `Static route added: ${destination} via ${nextHop} (AD ${adNum})${adNum >= FLOATING_STATIC_AD ? ' — floating static' : ''}.`);
      bump();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const removeRoute = (destination) => {
    const next = removeStaticRoute(routes, destination);
    setRoutes(next);
    liveRef.current.routes = next;
    const simNow = simRef.current;
    logEvent(simNow, `Static route removed: ${destination}.`);
    bump();
  };

  const reset = () => {
    simRef.current = freshSim();
    setRoutes(createRoutingTable());
    setLinksUp({ 'wan-primary': true, 'wan-backup': true, 'r1-r2': true, 'r1-r3': true });
    setNat(createNatTable());
    setAclOn(true);
    setLastWalk(null);
    setFormError('');
    cycleRef.current = 0;
    bump();
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  const dots = sim.dots.map((dot) => {
    const pos = dotPosition(dot);
    return (
      <span
        key={dot.id}
        className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${dot.type === 'ok' ? 'bg-[#7C3AED]' : 'bg-red-500'}`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      />
    );
  });

  // One screen on desktop: packet + route controls on the left, the topology,
  // counters and live routing table in the middle, the router box on the right.
  // The derived metric (routes in the RIB, NAT translations, active default)
  // sits directly under the primary counters. Below the fold: the lab brief,
  // ordered exercises, debrief and check-yourself questions.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          {/* Left rail: send a packet, links, static routes, ACL */}
          <div className="rounded-xl glass-1 p-3 lg:flex-1">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Send a packet</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label="Source host">
              {HOSTS.map((host) => (
                <button
                  key={host.ip}
                  type="button"
                  onClick={() => setSrcHost(host.ip)}
                  aria-pressed={srcHost === host.ip}
                  className={`rounded-lg px-2 py-1.5 font-mono text-[11px] font-semibold leading-tight transition ${
                    srcHost === host.ip ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'
                  }`}
                >
                  {host.ip}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-3">{HOSTS.find((h) => h.ip === srcHost)?.label}</p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_72px] gap-2">
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Destination IP</span>
                <input
                  type="text"
                  value={destIp}
                  onChange={(e) => setDestIp(e.target.value)}
                  aria-label="Destination IP"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-[13px] text-ink-1"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Port</span>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={destPort}
                  onChange={(e) => setDestPort(Number(e.target.value))}
                  aria-label="Destination port"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-[13px] text-ink-1"
                />
              </label>
            </div>
            <button type="button" onClick={() => sendPacket(srcHost, destIp, destPort)} className="glass-btn mt-2 w-full rounded-lg px-2 py-1.5 text-[13px] font-semibold">
              Send packet
            </button>

            <label className="mt-3 block">
              <span className="text-[13px] font-semibold text-ink-1">Auto traffic — {traffic} pkt/s</span>
              <input type="range" min="0" max="10" value={traffic} onChange={(e) => setTraffic(Number(e.target.value))} className="mt-0.5 w-full accent-[#7C3AED]" aria-label="Auto traffic in packets per second" />
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={() => { for (let i = 0; i < 10; i += 1) sendPacket(srcHost, destIp, destPort); }} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Burst ×10
              </button>
              <button type="button" onClick={() => setPaused((p) => !p)} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={reset} className="whitespace-nowrap rounded-lg border border-black/10 glass-1 px-1 py-1.5 text-xs font-semibold text-ink-1">
                Reset
              </button>
            </div>

            <p className="mt-2 text-caption font-semibold uppercase tracking-wider text-ink-2">Links — kill to fail over</p>
            <div className="mt-1.5 space-y-1.5">
              <button type="button" onClick={() => toggleWanLink('wan-primary', 'Primary WAN Gi0/1')} className={`w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold ${linksUp['wan-primary'] ? 'border border-black/10 glass-1 text-ink-1' : 'border border-red-500/40 bg-red-500/5 text-red-700'}`}>
                {linksUp['wan-primary'] ? 'Kill primary WAN (Gi0/1)' : 'Revive primary WAN (Gi0/1)'}
              </button>
              <button type="button" onClick={() => toggleWanLink('wan-backup', 'Backup WAN Gi0/2')} className={`w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold ${linksUp['wan-backup'] ? 'border border-black/10 glass-1 text-ink-1' : 'border border-red-500/40 bg-red-500/5 text-red-700'}`}>
                {linksUp['wan-backup'] ? 'Kill backup WAN (Gi0/2)' : 'Revive backup WAN (Gi0/2)'}
              </button>
              <button type="button" onClick={() => toggleOspfLink('r1-r2')} className={`w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold ${linksUp['r1-r2'] ? 'border border-black/10 glass-1 text-ink-1' : 'border border-red-500/40 bg-red-500/5 text-red-700'}`}>
                {linksUp['r1-r2'] ? 'Kill OSPF link R1–R2' : 'Revive OSPF link R1–R2'}
              </button>
            </div>

            <p className="mt-2 text-caption font-semibold uppercase tracking-wider text-ink-2">Add a static route</p>
            <div className="mt-1.5 space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-2">
                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-1">Destination</span>
                  <input
                    type="text"
                    value={routeForm.destination}
                    onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                    placeholder="192.0.2.0/24"
                    aria-label="Static route destination"
                    className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-[13px] text-ink-1"
                  />
                </label>
                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-1">AD</span>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={routeForm.ad}
                    onChange={(e) => setRouteForm({ ...routeForm, ad: Number(e.target.value) })}
                    aria-label="Static route AD"
                    className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-[13px] text-ink-1"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[13px] font-semibold text-ink-1">Next hop</span>
                <input
                  type="text"
                  value={routeForm.nextHop}
                  onChange={(e) => setRouteForm({ ...routeForm, nextHop: e.target.value })}
                  placeholder="203.0.113.1"
                  aria-label="Static route next hop"
                  className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-[13px] text-ink-1"
                />
              </label>
              {formError && <p className="text-[12px] font-semibold text-red-700">{formError}</p>}
              <button type="button" onClick={addRoute} className="w-full rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[13px] font-semibold text-ink-1">
                Add static route
              </button>
              <p className="text-[11px] leading-snug text-ink-3">Tip: AD 200 makes a floating static.</p>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-black/10 glass-1 px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-1"><Shield size={14} /> Guest ACL</span>
              <button
                type="button"
                onClick={() => setAclOn((v) => !v)}
                aria-pressed={aclOn}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${aclOn ? 'glass-btn' : 'border border-black/10 text-ink-2'}`}
              >
                {aclOn ? 'On — Telnet denied' : 'Off'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">

          {/* Middle: counters, derived metric, topology, packet walk, routing table */}
          <div className="min-w-0">
            <div className="grid grid-cols-3 gap-2">
              {metric('packets sent', sim.sent)}
              {metric('forwarded', sim.forwarded)}
              {metric('dropped', sim.dropped)}
            </div>
            <p className="mt-2 rounded-xl border border-black/10 glass-1 px-3 py-1.5 text-center text-[13px] text-ink-2">
              Routes in RIB: <strong className="text-ink-1">{activeRoutes.length}</strong> of {routes.length}
              {' · '}NAT translations: <strong className="text-ink-1">{nat.entries.length}</strong>
              {' · '}Active default: <strong className="text-ink-1">{defaultRoute ? `via ${defaultRoute.nextHop} (AD ${defaultRoute.ad})` : 'none — no WAN link up'}</strong>
            </p>

            <div className="relative mt-3 overflow-hidden rounded-xl border border-black/10 glass-1 p-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">LAN · VLAN 10 / 20</p>
                  <p className="mt-1 font-mono text-[12px] font-bold text-ink-1">10.0.0.5</p>
                  <p className="font-mono text-[12px] font-bold text-ink-1">10.0.1.5</p>
                  <p className="mt-1 text-[11px] text-ink-3">default gateway 10.0.0.1 / 10.0.1.1</p>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-black/10 bg-white px-3 py-2">
                  <Router size={26} className="text-[#6D28D9]" />
                  <p className="mt-0.5 text-[13px] font-bold text-ink-1">R1</p>
                  <p className="text-[11px] text-ink-3">edge router · 1U</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">WAN · Internet</p>
                  <p className="mt-1 flex items-center justify-center gap-1 font-mono text-[12px] font-bold text-ink-1"><Globe size={13} /> 8.8.8.8</p>
                  <p className="text-[11px] text-ink-3">ISP 1 · 203.0.113.1</p>
                  <p className="text-[11px] text-ink-3">ISP 2 · 198.51.100.1</p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0">{dots}</div>
              <p className="mt-2 text-center text-[11px] text-ink-3">
                OSPF: R1–R2 100 Mbps (cost 10) · R1–R3 10 Mbps (cost 100) — 172.16.1.0/24 and 172.16.2.0/24 via R2, metric 20 / 30.
              </p>
            </div>

            {lastWalk && (
              <div className={`mt-3 rounded-xl border p-3 ${lastWalk.verdict === 'forwarded' ? 'border-black/10 glass-1' : 'border-red-500/40 bg-red-500/5'}`}>
                <p className="flex items-start gap-1.5 text-[13px] font-semibold text-ink-1">
                  {lastWalk.verdict === 'forwarded' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-700" />}
                  {lastWalk.srcIp} → {lastWalk.destIp}:{lastWalk.destPort} — {lastWalk.headline}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{lastWalk.detail}</p>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Routing table — live</p>
              <div className="mt-2 max-h-44 overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px] leading-relaxed text-ink-1">
                  <thead>
                    <tr className="text-ink-3">
                      <th className="pr-2 font-semibold">Destination</th>
                      <th className="pr-2 font-semibold">Next hop</th>
                      <th className="pr-2 font-semibold">Intf</th>
                      <th className="pr-2 font-semibold">Source</th>
                      <th className="pr-2 font-semibold">AD</th>
                      <th className="pr-2 font-semibold">Metric</th>
                      <th className="font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route, i) => {
                      const up = !(route.linkId && linksUp[route.linkId] === false);
                      const removable = route.source === 'static' && route.destination !== '0.0.0.0/0';
                      return (
                        <tr key={`${route.destination}-${route.nextHop}-${i}`} className={up ? '' : 'text-ink-3 line-through'}>
                          <td className="pr-2">{route.destination}{route.floating ? ' *' : ''}</td>
                          <td className="pr-2">{route.nextHop}</td>
                          <td className="pr-2">{route.interface}</td>
                          <td className="pr-2">{route.source}</td>
                          <td className="pr-2">{route.ad}</td>
                          <td className="pr-2">{route.metric}</td>
                          <td>
                            {up ? 'Active' : 'Inactive'}
                            {removable && (
                              <button type="button" onClick={() => removeRoute(route.destination)} aria-label={`Remove route ${route.destination}`} className="ml-2 rounded border border-black/10 px-1 text-[10px] font-semibold text-red-700 no-underline">
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-3">* floating static — AD 200, inactive while the primary default route is up. Longest prefix wins, then lowest AD, then lowest metric.</p>
            </div>
          </div>

          {/* Event log */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Event log</p>
            <div className="rounded-xl border border-black/10 glass-1 p-3 lg:flex-1">
              {sim.events.length === 0 ? (
                <p className="text-[13px] text-ink-3">No events yet. Send a packet, kill a link, or add a route.</p>
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

          {/* Right rail: the router box, sub-interfaces, NAT table */}
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ink-2"><Router size={14} /> R1 — 1U edge router</p>
              <div className="mt-2 rounded-lg border border-black/10 bg-white p-2">
                <div className="flex flex-wrap gap-1.5">
                  {INTERFACES.map((iface) => {
                    const down = iface.linkId && linksUp[iface.linkId] === false;
                    return (
                      <div key={iface.id} className={`flex-1 rounded-md border px-1.5 py-1 text-center ${down ? 'border-red-500/40 bg-red-500/5' : 'border-black/10 glass-1'}`}>
                        <p className="font-mono text-[11px] font-bold text-ink-1">{iface.id}</p>
                        <p className="text-[10px] text-ink-3">{iface.network}</p>
                        <p className={`text-[10px] font-semibold ${down ? 'text-red-700' : 'text-emerald-700'}`}>{down ? 'DOWN' : 'UP'}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-2">
                  <span>Mgmt · Console</span>
                  <span>PWR <span className="font-bold text-emerald-700">●</span> SYS <span className="font-bold text-emerald-700">●</span></span>
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-ink-2">
                Router-on-a-stick: one physical trunk (Gi0/0) carries both VLANs as sub-interfaces — Gi0/0.10 for VLAN 10, Gi0/0.20 for VLAN 20 — so the router forwards between VLANs.
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-2">
                OSPF link R1–R2: <strong className="text-ink-1">{linksUp['r1-r2'] ? 'UP — 172.16.0.0/16 via R2' : 'DOWN — reconverged via R3'}</strong>
              </p>
            </div>

            <div className="rounded-xl border border-black/10 glass-1 p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">NAT translations (PAT overload)</p>
              {nat.entries.length === 0 ? (
                <p className="mt-1.5 text-[13px] text-ink-3">None yet. Send a packet to the Internet and watch one public address ({PUBLIC_IP}) serve many private hosts, told apart by port.</p>
              ) : (
                <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-ink-1">
                  {nat.entries.slice(-4).map((entry) => (
                    <li key={`${entry.insideLocal}:${entry.insidePort}`}>
                      {entry.insideLocal}:{entry.insidePort} → {entry.insideGlobal}:{entry.globalPort}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-ink-3">{nat.entries.length} active translation{nat.entries.length === 1 ? '' : 's'} — inside local → inside global.</p>
            </div>
          </div>

          {/* running-config */}
          <div className=" flex flex-col lg:flex-1">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">running-config — updates live</p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[11px] leading-relaxed text-[#859900] lg:min-h-48 lg:max-h-none lg:flex-1 lg:basis-0">{routerConf(routes, nat.entries, createAcl(), linksUp)}</pre>
          </div>
        </div>
      </div>

      {/* Below the fold: lab brief, exercises, debrief, check yourself */}
      <div className="mt-6 space-y-4">
        <section className="rounded-xl border border-black/10 glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Lab brief — the router</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            A router is a Layer 3 device: it forwards packets between networks by destination IP. The control
            plane builds the routing table (RIB); the data plane forwards each packet via the FIB. Hosts send
            anything outside their own network to their default gateway — this router, on Gi0/0.10 or Gi0/0.20.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-2">
                <li>Read a routing table: destination network, next hop, interface, metric, source.</li>
                <li>Predict a lookup with longest-prefix match, then administrative distance, then metric.</li>
                <li>Build a floating static that only takes over when the primary route is withdrawn.</li>
                <li>Watch OSPF reconverge on a new path when a link fails.</li>
                <li>Trace NAT overload and an ACL deny from the packet&apos;s point of view.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-2">
                <li>AD: connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110, RIP 120.</li>
                <li>Metric only compares routes from the same protocol; AD is compared first.</li>
                <li>A floating static needs an AD above the dynamic protocol it backs up — above 110 for OSPF.</li>
                <li>OSPF is link-state (Dijkstra); cost rises as bandwidth falls. RIP is distance-vector, hop count, max 15.</li>
                <li>ACLs are top-down, first match wins, implicit deny at the end; standard matches source only, extended matches protocol, source, destination and port.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-black/10 glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-2">
            <li><strong className="text-ink-1">Longest-prefix match.</strong> Add a static route for 8.8.8.8/32 via 203.0.113.1 (AD 1). Send a packet to 8.8.8.8 and watch the /32 win over the default — then send to 8.8.8.9 and watch it fall back to 0.0.0.0/0.</li>
            <li><strong className="text-ink-1">Floating-static failover.</strong> Kill the primary WAN (Gi0/1). The AD-200 floating static via ISP 2 becomes the active default — send a packet to the Internet and confirm the next hop is 198.51.100.1. Revive Gi0/1 and watch the primary take over again.</li>
            <li><strong className="text-ink-1">OSPF reconvergence.</strong> Send a packet to 172.16.1.10 (via R2, metric 20), then kill the R1–R2 link. OSPF reconverges via R3 — same destination, higher cost. Revive the link and watch it swing back.</li>
            <li><strong className="text-ink-1">NAT overload.</strong> Send packets from both VLAN hosts to 8.8.8.8. Every translation shares the one public address {PUBLIC_IP} with a different source port — that is PAT.</li>
            <li><strong className="text-ink-1">ACL drill.</strong> Switch the source to the guest host (10.0.1.5) and send to port 23: denied by rule 1. Send to port 80: permitted. Turn the ACL off and watch Telnet pass.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-black/10 glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink-2">
            <li>The most specific route always wins the lookup, whatever its AD or metric.</li>
            <li>For the same destination, the lowest AD wins — a RIP route with a lower metric still loses to OSPF.</li>
            <li>The floating static sat idle in the table until the primary default was withdrawn, then took over without any config change.</li>
            <li>OSPF reconverged on a longer, costlier path instead of dropping the remote networks.</li>
            <li>Many private hosts shared one public address, and the ACL stopped Telnet while letting the web through.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-black/10 glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Check yourself</h3>
          <div className="mt-2 space-y-2">
            <CheckYourself
              question="Two routes reach 172.16.1.0/24: OSPF (AD 110, metric 20) and RIP (AD 120, metric 3). Which one forwards the packet, and why?"
              answer="OSPF. Administrative distance is compared before metric — metric only compares routes learned from the same protocol. RIP's lower metric never gets a say because its AD is higher."
            />
            <CheckYourself
              question="The primary default route is a static with AD 1 via Gi0/1. Why is the backup static given AD 200 instead of AD 1?"
              answer="With AD 1 both would tie and the backup would share traffic or win unpredictably. AD 200 keeps it inactive while the primary is up, and above OSPF's 110 so it also stays behind any dynamic route — it only becomes active when the better routes are withdrawn. That is what makes it a floating static."
            />
            <CheckYourself
              question="The table holds 8.8.8.8/32 via ISP 1 and 0.0.0.0/0 via ISP 1. A packet arrives for 8.8.8.8. Which route is used?"
              answer="The /32 host route. Longest-prefix match decides first: 32 matching bits beats 0 matching bits, regardless of AD or metric."
            />
            <CheckYourself
              question="Ten hosts on 10.0.0.0/24 browse the web through one public address. What translates them, and how do replies find the right host?"
              answer="NAT overload (PAT). Each outbound flow is mapped to the single inside-global address with a unique source port; return traffic is demultiplexed by that port back to the right inside-local host."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
