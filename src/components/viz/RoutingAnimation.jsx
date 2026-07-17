import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, AlertTriangle } from 'lucide-react';
import BreakItControls, { BREAK_SCENARIOS } from '@/components/lab/BreakItControls';

const STEPS = [
  { label: 'Packet In', badge: 'Flow', note: 'A packet arrives at a router. The router reads the destination IP and consults its routing table.', scenarioNote: { 'packet-loss': 'Packet arrives but gets dropped before lookup completes.', 'router-down': 'No path available; router interface is offline.', 'nat-exhaust': 'Session is accepted, but NAT translation has no free port.', 'vpn-down': 'Encrypted tunnel is down; IPSec SA is unavailable.' } },
  { label: 'Route Lookup', badge: 'FIB', note: 'Longest-prefix match selects the best route. Next-hop is chosen by administrative distance and metric.', scenarioNote: { 'packet-loss': 'Dropped after lookup due to queue overflow.', 'router-down': 'Routing table still holds routes, but no egress exists.', 'nat-exhaust': 'NAT lookup returns no translation slot.', 'vpn-down': 'Tunnel route still exists in table but no encrypted path.' } },
  { label: 'Forward', badge: 'Egress', note: 'The packet is forwarded out the chosen interface toward the next hop or destination subnet.', scenarioNote: { 'packet-loss': 'Egress queue is full; packet is tail-dropped.', 'router-down': 'Forwarding aborted on failed interface.', 'nat-exhaust': 'Cannot forward: untranslatable source address.', 'vpn-down': 'Next hop unreachable through tunnel.' } },
  { label: 'NAT', badge: 'PAT', note: 'NAT rewrites private source addresses to a public address, tracking sessions so replies return correctly.', scenarioNote: { 'packet-loss': 'Return path drops translated packet.', 'router-down': 'NAT table is unreachable after control-plane failure.', 'nat-exhaust': 'PAT table full; new flows reset.', 'vpn-down': 'Return path must traverse plain Internet with no tunnel.' } },
  { label: 'VPN', badge: 'IPsec', note: 'IPsec tunnels encapsulate and encrypt traffic across untrusted links between sites or clouds.', scenarioNote: { 'packet-loss': 'Encrypted chunks are missing; reassembly fails.', 'router-down': 'Tunnel endpoint goes offline with router.', 'nat-exhaust': 'ESP/UDP packets are translated incorrectly.', 'vpn-down': 'Tunnel drops; plaintext may be exposed.' } },
];

const NODES = [
  { id: 'src', label: 'LAN', x: 8, y: 50 },
  { id: 'router', label: 'Router', x: 38, y: 50 },
  { id: 'dst', label: 'WAN', x: 78, y: 50 },
];

const PATHS = [
  ['src', 'router'],
  ['router', 'dst'],
];

export default function RoutingAnimation() {
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

  const activePathUpTo = step + 1;
  const note = current.scenarioNote?.[scenario];

  const routerFaulty = scenario === 'router-down';
  const saturate = scenario === 'nat-exhaust' && step >= 3;
  const tunnelDown = scenario === 'vpn-down' && step >= 4;

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          {PATHS.map(([a, b], idx) => {
            const A = NODES.find(n => n.id === a);
            const B = NODES.find(n => n.id === b);
            const failed =
              (routerFaulty) ||
              (scenario === 'packet-loss' && step % 2 === 0) ||
              (scenario === 'nat-exhaust' && step === 3) ||
              tunnelDown;
            const active = !failed && idx < activePathUpTo;
            const lineActive = active;
            return (
              <g key={idx}>
                <line x1={`${A.x}%`} y1={`${A.y}%`} x2={`${B.x}%`} y2={`${B.y}%`} stroke={lineActive ? '#f43f5e' : '#ffffff12'} strokeWidth="1" strokeDasharray={active ? 'none' : '2 3'} />
                {lineActive && (
                  <circle cx={`${(A.x + B.x) / 2}%`} cy={`${(A.y + B.y) / 2}%`} r="1.2" fill="#f43f5e">
                    <animate attributeName="opacity" values="0.25;0.9;0.25" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {NODES.map((node) => {
            const isRouter = node.id === 'router';
            const isDown = routerFaulty && isRouter;
            return (
              <div
                key={node.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-3 py-2 text-center backdrop-blur transition ${
                  isDown ? 'border-red-500/60 bg-red-500/15 shadow-lg shadow-red-500/20' : isRouter ? 'border-teal-300/60 bg-teal-500/15 shadow-lg shadow-teal-500/20' : 'border-white/20 bg-white/10'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <p className={`text-[11px] font-bold ${isDown ? 'text-red-300' : isRouter ? 'text-teal-200' : 'text-slate-200'}`}>{node.label}</p>
                {isRouter && <p className="text-[10px] text-teal-300/80">{isDown ? 'OFFLINE' : saturate ? 'PAT FULL' : tunnelDown ? 'VPN DOWN' : 'NAT + route'}</p>}
              </div>
            );
          })}
        </div>

        <div className="absolute left-1/2 top-[14px] -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      {note && (
        <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2.5 text-xs text-rose-200">
          <span className="mr-1 inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]"><AlertTriangle size={10} /> Failure mode</span>
          <span className="text-slate-300">{note}</span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      <BreakItControls scenarios={BREAK_SCENARIOS} scenario={scenario} onScenarioChange={(id) => { setScenario(id); setStep(0); setPlaying(true); }} />

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
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><HelpCircle size={10}/> Routing table lookup</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1">NAT + VPN protections</span>
      </div>
    </div>
  );
}
