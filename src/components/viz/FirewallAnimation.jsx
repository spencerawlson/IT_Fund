import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Shield } from 'lucide-react';
import BreakItControls from '@/components/lab/BreakItControls';

const SCENARIOS = [
  { id: 'none', label: 'Normal', icon: null, description: 'Baseline policy behavior' },
  { id: 'rule-missing', label: 'Rule Missing', icon: Shield, description: 'Expected allow rule is absent; traffic falls to default deny or leaks through.' },
  { id: 'rule-order', label: 'Rule Order', icon: Shield, description: 'A broader allow appears before a specific deny, changing effective policy.' },
  { id: 'state-invalidation', label: 'State Invalid', icon: Shield, description: 'Asymmetric timeout or NAT mutation breaks stateful tracking.' },
  { id: 'spoofed-source', label: 'Spoofed Source', icon: Shield, description: 'Packets arrive with forged source IP; anti-spoof checks are bypassed.' },
];

const PACKETS = [
  { port: 443, proto: 'TCP', verdict: 'allow', note: 'HTTPS on 443 — explicit allow rule.', scenarioNote: { 'rule-missing': 'No allow for 443; default-deny blocks it.', 'rule-order': 'If allow-any precedes this, it may still leak.', 'state-invalidation': 'Session table expired mid-flow.', 'spoofed-source': 'Spoofed 443 packet hits forwarding checks.' } },
  { port: 80, proto: 'TCP', verdict: 'allow', note: 'HTTP on 80 — allowed.', scenarioNote: { 'rule-missing': 'Missing allow for 80 drops web traffic.', 'rule-order': 'Earlier deny may override this allow.', 'state-invalidation': 'Connection resets on state loss.', 'spoofed-source': 'Spoofed 80 packet classified.' } },
  { port: 22, proto: 'TCP', verdict: 'deny', note: 'SSH on 22 — explicit deny.', scenarioNote: { 'rule-missing': 'No explicit deny; matching allow makes SSH exposed.', 'rule-order': 'Wide preceding allow may permit SSH.', 'state-invalidation': 'Scanner bypasses state checks.', 'spoofed-source': 'Spoofed SSH still denied by explicit rule.' } },
  { port: 3389, proto: 'TCP', verdict: 'deny', note: 'RDP on 3389 — default deny.', scenarioNote: { 'rule-missing': 'No rule; default-deny still blocks.', 'rule-order': 'If allow-all exists first, RDP exposes.', 'state-invalidation': 'Scanner bypass on reset state.', 'spoofed-source': 'Default-deny rejects spoofed RDP.' } },
  { port: 443, proto: 'TCP', verdict: 'allow', note: 'Health-checked HTTPS — allowed.', scenarioNote: { 'rule-missing': 'Health checker also blocked.', 'rule-order': 'Preceding deny may remove health exemptions.', 'state-invalidation': 'Probe timeout marks endpoint unhealthy.', 'spoofed-source': 'Source-spoofed health probe hits anti-spoof.' } },
];

const RULES = [
  { port: '443', action: 'ALLOW', desc: 'HTTPS / TLS' },
  { port: '80', action: 'ALLOW', desc: 'HTTP' },
  { port: '22', action: 'DENY', desc: 'SSH' },
  { port: '3389', action: 'DENY', desc: 'RDP' },
  { port: '*', action: 'DENY', desc: 'Default deny' },
];

export default function FirewallAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scenario, setScenario] = useState('none');
  useEffect(() => {
    if (!playing || step >= PACKETS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2800);
    return () => clearTimeout(t);
  }, [step, playing, scenario]);

  const current = PACKETS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);
  const note = current.scenarioNote?.[scenario];
  const effective = scenario === 'rule-order' ? 'effective: ordered match' : 'effective: first-match';
  const ordered = scenario === 'rule-order';

  return (
    <div>
      <div className="relative h-80 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#080d18] via-[#0c1220] to-[#070b14] sm:h-96">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.06)_1px,transparent_0)] bg-[length:22px_22px]" />

        <div className="absolute left-[8%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center backdrop-blur">
          <p className="text-[11px] font-bold text-sky-300">CLIENT</p>
        </div>

        <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-amber-500/60 bg-amber-500/15 px-3 py-2.5 text-center shadow-2xl shadow-amber-500/20 backdrop-blur">
          <div className="flex items-center justify-center gap-2">
            <Shield size={16} className="text-amber-300" />
            <p className="text-[11px] font-bold text-amber-200 tracking-wide">FIREWALL</p>
          </div>
          <p className="mt-1 text-[10px] text-amber-300/80">{ordered ? 'rule-order active' : 'stateful inspection'}</p>
        </div>

        <div className="absolute left-[88%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center backdrop-blur">
          <p className="text-[11px] font-bold text-emerald-300">SERVER</p>
        </div>

        <div className="absolute left-[12%] right-[12%] top-1/2 h-px -translate-y-1/2 bg-white/10" />

        <AnimatePresence>
          <motion.div
            key={`${step}-${current.port}-${current.verdict}-${scenario}`}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-[140%]"
            initial={{ left: '12%', opacity: 0, scale: 0.8 }}
            animate={{
              left: current.verdict === 'allow' ? '88%' : '38%',
              opacity: [0, 1, 1, current.verdict === 'allow' ? 1 : 0.4],
              scale: 1,
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 2.1, times: [0, 0.1, 0.55, 1], ease: 'easeInOut' }}
          >
            <div
              className={`rounded-lg border px-3 py-1.5 text-center shadow-2xl backdrop-blur ${
                current.verdict === 'allow'
                  ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-300 shadow-[0_10px_25px_rgba(16,185,129,0.25)]'
                  : 'border-rose-500/70 bg-rose-500/20 text-rose-300 shadow-[0_10px_25px_rgba(244,63,94,0.25)]'
              }`}
            >
              <p className="text-[11px] font-bold">{current.proto}/{current.port}</p>
              <p className="text-[9px] opacity-80">{current.verdict === 'allow' ? 'ALLOWED' : 'DROPPED'}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          key={`v-${step}`}
          initial={{ opacity: 0, scale: 0.7, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="absolute left-[38%] top-[68%] -translate-x-1/2"
        >
          <span
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
              current.verdict === 'allow' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {current.verdict === 'allow' ? 'ALLOW' : 'DROP'}
          </span>
        </motion.div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Packet {step + 1} / {PACKETS.length}
        </div>
      </div>

      {note && (
        <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2.5 text-xs text-rose-200">
          <span className="mr-1 inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]"><span className="text-rose-400">⚠</span> Failure mode</span>
          <span className="text-slate-300">{note}</span>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rules (top-down)</p>
          <div className="mt-2 space-y-1 font-mono text-xs">
            {RULES.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-14 text-[11px] font-bold ${r.action === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'}`}>{r.action}</span>
                <span className="text-slate-300">tcp/{r.port}</span>
                <span className="text-slate-400">— {r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm sm:max-w-sm">
          <p className="font-semibold text-white">
            {current.proto}/{current.port} → {current.verdict === 'allow' ? 'ALLOWED' : 'DROPPED'}
          </p>
          <p className="text-slate-400">{current.note}</p>
        </div>
      </div>

      <BreakItControls scenarios={SCENARIOS} scenario={scenario} onScenarioChange={(id) => { setScenario(id); setStep(0); setPlaying(true); }} accent="amber" />

      <div className="mt-4 flex items-center gap-3">
        <button onClick={toggle} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
          {playing && step < PACKETS.length - 1 ? <Pause size={15} /> : <Play size={15} />}
          {playing && step < PACKETS.length - 1 ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5">
          <RotateCcw size={15} /> Restart
        </button>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="text-[11px] text-slate-400">Mode: stateful</span>
          <span className="text-[11px] text-slate-400">Policy: default-deny</span>
        </div>
      </div>
    </div>
  );
}
