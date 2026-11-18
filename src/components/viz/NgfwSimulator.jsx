import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, Globe, Server } from 'lucide-react';
import {
  ZONE_LABELS,
  ZONE_NETWORKS,
  APPS,
  TEST_PACKETS,
  createFirewall,
  evaluatePacket,
  addRule,
  deleteRule,
  moveRule,
  closeSession,
  tickSessions,
  runNacCheck,
  remediateHost,
  testPacketById,
  ngfwConf,
} from '@/lib/ngfw';

const TICK_MS = 500;
const MAX_EVENTS = 8;
// The live traffic cycles through these packets in order, so the counters
// move without any randomness.
const TRAFFIC_CYCLE = ['web', 'dns', 'web', 'dmz-web', 'ssh', 'web', 'https-exploit', 'ftp', 'web', 'return'];

function freshSim() {
  return {
    fw: createFirewall(),
    events: [],
    lastResult: null,
    lastPacket: null,
    trafficIndex: 0,
    nextId: 1,
  };
}

function QuizQuestion({ question, answer }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <li className="rounded-xl border border-black/10 glass-1 p-3">
      <p className="text-[13px] font-semibold text-ink-1">{question}</p>
      {revealed ? (
        <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{answer}</p>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-1.5 rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold text-ink-1"
        >
          Reveal answer
        </button>
      )}
    </li>
  );
}

export default function NgfwSimulator() {
  const [formAction, setFormAction] = useState('allow');
  const [formSrc, setFormSrc] = useState('inside');
  const [formDst, setFormDst] = useState('outside');
  const [formApp, setFormApp] = useState('any');
  const [formPosition, setFormPosition] = useState('top');
  const [packetId, setPacketId] = useState('web');
  const [paused, setPaused] = useState(false);
  const [, setVersion] = useState(0);
  const simRef = useRef(freshSim());
  const settingsRef = useRef({ paused });
  settingsRef.current = { paused };

  const bump = () => setVersion((v) => v + 1);

  const logEvent = (sim, text) => {
    sim.events = [{ id: sim.nextId, time: new Date().toLocaleTimeString(), text }, ...sim.events].slice(0, MAX_EVENTS);
    sim.nextId += 1;
  };

  const sendPacket = (sim, packet, { quiet = false } = {}) => {
    const result = evaluatePacket(sim.fw, packet);
    sim.lastResult = result;
    sim.lastPacket = packet;
    if (!quiet) {
      if (result.verdict === 'blocked') logEvent(sim, `IPS blocked ${packet.name} — exploit signature matched.`);
      else if (result.verdict === 'deny') logEvent(sim, `Denied ${packet.name} — ${result.reason}.`);
      else if (result.sessionId) logEvent(sim, `Session ${result.sessionId} opened (${packet.src} → ${packet.dst}, ${packet.app}).`);
    } else if (result.verdict === 'blocked' || result.verdict === 'deny') {
      logEvent(sim, `${result.verdict === 'blocked' ? 'IPS blocked' : 'Denied'} ${packet.name} — ${result.reason}.`);
    }
    return result;
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      const sim = simRef.current;
      const packet = testPacketById(TRAFFIC_CYCLE[sim.trafficIndex % TRAFFIC_CYCLE.length]);
      sim.trafficIndex += 1;
      if (packet) sendPacket(sim, packet, { quiet: true });
      const expired = tickSessions(sim.fw);
      for (const session of expired) logEvent(sim, `Session ${session.id} closed (idle timeout).`);
      bump();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const sim = simRef.current;
  const { fw } = sim;
  const total = fw.counters.allowed + fw.counters.denied + fw.counters.blocked;
  const allowRate = total === 0 ? 100 : Math.round((fw.counters.allowed / total) * 100);
  const quarantined = fw.hosts.filter((h) => h.quarantined);

  const reset = () => {
    simRef.current = freshSim();
    bump();
  };

  const handleAddRule = () => {
    const rule = addRule(sim.fw, { action: formAction, srcZone: formSrc, dstZone: formDst, app: formApp }, formPosition);
    logEvent(sim, `Rule added ${formPosition === 'top' ? 'at the top' : 'at the bottom'}: ${rule.name}.`);
    bump();
  };

  const handleMoveRule = (ruleId, direction) => {
    if (moveRule(sim.fw, ruleId, direction)) {
      logEvent(sim, `Rule ${ruleId} moved ${direction} — first match wins, so the verdict can change.`);
      bump();
    }
  };

  const handleDeleteRule = (ruleId) => {
    const rule = sim.fw.rules.find((r) => r.id === ruleId);
    if (deleteRule(sim.fw, ruleId)) {
      logEvent(sim, `Rule deleted: ${rule ? rule.name : ruleId}.`);
      bump();
    }
  };

  const handleNacCheck = () => {
    const found = runNacCheck(sim.fw);
    if (found.length > 0) logEvent(sim, `NAC check: ${found.join(', ')} failed — quarantined until remediated.`);
    else logEvent(sim, 'NAC check: every host is compliant.');
    bump();
  };

  const handleRemediate = (hostId) => {
    if (remediateHost(sim.fw, hostId)) {
      logEvent(sim, `${hostId} remediated and back on the network.`);
      bump();
    }
  };

  const handleSendPacket = () => {
    const packet = testPacketById(packetId);
    if (packet) {
      sendPacket(sim, packet);
      bump();
    }
  };

  const metric = (label, value) => (
    <div className="rounded-xl border border-black/10 glass-1 px-2 py-1.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-ink-1">{value}</p>
    </div>
  );

  const verdict = sim.lastResult;
  const verdictStyle = verdict?.verdict === 'allow'
    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-800'
    : verdict?.verdict === 'blocked'
      ? 'border-amber-500/40 bg-amber-500/5 text-amber-800'
      : 'border-red-500/40 bg-red-500/5 text-red-800';

  // One screen on desktop: rule base on the left, zones + counters in the
  // middle, the firewall box and session table on the right. Sessions open
  // and the allow rate sit directly under the primary counters. On narrow
  // screens the rails stack in reading order.
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)_272px] lg:grid-rows-[auto_auto]">
        {/* Left rail: rule base + add-rule form + inspection toggles */}
        <div className="rounded-xl glass-1 p-3 lg:col-start-1 lg:row-start-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Rule base — first match wins</p>
          <ol className="mt-2 space-y-1">
            {fw.rules.map((rule, i) => (
              <li key={rule.id} className="flex items-center gap-1 rounded-lg border border-black/10 glass-1 px-1.5 py-1">
                <span className="w-3 shrink-0 text-center text-[11px] font-bold tabular-nums text-ink-3">{i + 1}</span>
                <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${rule.action === 'allow' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                  {rule.action === 'allow' ? 'ALLOW' : 'DENY'}
                </span>
                <span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight text-ink-1">{rule.name}</span>
                <span className="flex shrink-0 gap-0.5">
                  <button type="button" onClick={() => handleMoveRule(rule.id, 'up')} disabled={i === 0} aria-label={`Move rule ${rule.id} up`} className="rounded border border-black/10 px-0.5 py-0.5 text-[10px] font-bold text-ink-1 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => handleMoveRule(rule.id, 'down')} disabled={i === fw.rules.length - 1} aria-label={`Move rule ${rule.id} down`} className="rounded border border-black/10 px-0.5 py-0.5 text-[10px] font-bold text-ink-1 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => handleDeleteRule(rule.id)} aria-label={`Delete rule ${rule.id}`} className="rounded border border-black/10 px-0.5 py-0.5 text-[10px] font-bold text-red-700">✕</button>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-1 text-[11px] leading-snug text-ink-3">Top-down — first match wins; the rest hits the implicit deny.</p>

          <p className="mt-2.5 text-caption font-semibold uppercase tracking-wider text-ink-2">Add a rule</p>
          <div className="mt-1.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-2">Action</span>
                <select value={formAction} onChange={(e) => setFormAction(e.target.value)} aria-label="Rule action" className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1">
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-2">Application</span>
                <select value={formApp} onChange={(e) => setFormApp(e.target.value)} aria-label="Application" className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1">
                  {APPS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-2">From zone</span>
                <select value={formSrc} onChange={(e) => setFormSrc(e.target.value)} aria-label="Source zone" className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1">
                  {Object.keys(ZONE_LABELS).map((z) => <option key={z} value={z}>{ZONE_LABELS[z]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-2">To zone</span>
                <select value={formDst} onChange={(e) => setFormDst(e.target.value)} aria-label="Destination zone" className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1">
                  {Object.keys(ZONE_LABELS).map((z) => <option key={z} value={z}>{ZONE_LABELS[z]}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-ink-2">Position</span>
                <select value={formPosition} onChange={(e) => setFormPosition(e.target.value)} aria-label="Rule position" className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-[13px] font-semibold text-ink-1">
                  <option value="top">Top of list</option>
                  <option value="bottom">Bottom of list</option>
                </select>
              </label>
              <button type="button" onClick={handleAddRule} className="glass-btn self-end rounded-lg px-2 py-1 text-[13px] font-semibold">Add rule</button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => { sim.fw.sslInspection = !sim.fw.sslInspection; logEvent(sim, `SSL inspection turned ${sim.fw.sslInspection ? 'on — the IPS can now see inside HTTPS.' : 'off — encrypted exploits are invisible to the IPS.'}`); bump(); }}
              aria-pressed={fw.sslInspection}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${fw.sslInspection ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'}`}
            >
              SSL: {fw.sslInspection ? 'on' : 'off'}
            </button>
            <button
              type="button"
              onClick={() => { sim.fw.ipsEnabled = !sim.fw.ipsEnabled; logEvent(sim, `IPS turned ${sim.fw.ipsEnabled ? 'on.' : 'off — exploits are no longer blocked.'}`); bump(); }}
              aria-pressed={fw.ipsEnabled}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${fw.ipsEnabled ? 'glass-btn' : 'border border-black/10 glass-1 text-ink-2'}`}
            >
              IPS: {fw.ipsEnabled ? 'on' : 'off'}
            </button>
            <button type="button" onClick={handleNacCheck} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[11px] font-semibold text-ink-1">
              NAC check
            </button>
            {quarantined.length > 0 ? (
              <button type="button" onClick={() => handleRemediate(quarantined[0].id)} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] font-semibold text-amber-800">
                Remediate {quarantined[0].id}
              </button>
            ) : (
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[11px] font-semibold text-ink-1">
                {paused ? 'Resume traffic' : 'Pause traffic'}
              </button>
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {quarantined.length > 0 && (
              <button type="button" onClick={() => setPaused((p) => !p)} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[11px] font-semibold text-ink-1">
                {paused ? 'Resume traffic' : 'Pause traffic'}
              </button>
            )}
            <button type="button" onClick={reset} className="rounded-lg border border-black/10 glass-1 px-2 py-1.5 text-[11px] font-semibold text-ink-1">
              Reset
            </button>
          </div>
        </div>

        {/* Middle: counters, derived metric, zone diagram, test packet */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="grid grid-cols-3 gap-2">
            {metric('allowed', fw.counters.allowed)}
            {metric('denied', fw.counters.denied)}
            {metric('threats blocked', fw.counters.blocked)}
          </div>
          <p className="mt-2 text-center text-[13px] font-semibold text-ink-2">
            {`Sessions open: ${fw.sessions.length} · Allow rate: ${allowRate}% · NAT translations: ${fw.counters.nat}`}
          </p>

          {/* Zone diagram: inside — NGFW — DMZ / outside */}
          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Zones — the firewall sits between them</p>
            <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg border border-black/10 glass-2 px-2.5 py-2 text-center">
                <p className="flex items-center justify-center gap-1 text-[13px] font-bold text-ink-1"><Server size={13} /> Inside (LAN)</p>
                <p className="font-mono text-[11px] text-ink-3">{ZONE_NETWORKS.inside}</p>
                <p className="mt-0.5 text-[11px] text-ink-2">PC-1 · PC-7 · DB-1</p>
              </div>
              <span className="text-center text-lg font-bold text-ink-3" aria-hidden="true">→</span>
              <div className="flex-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-2 text-center">
                <p className="flex items-center justify-center gap-1 text-[13px] font-bold text-ink-1"><ShieldCheck size={14} className="text-violet-700" /> NGFW-1</p>
                <p className="font-mono text-[11px] text-ink-3">stateful · DPI · IPS</p>
                <p className="mt-0.5 text-[11px] text-ink-2">2 WAN + 8 LAN · 2× 10GbE SFP+</p>
              </div>
              <span className="text-center text-lg font-bold text-ink-3" aria-hidden="true">→</span>
              <div className="flex flex-1 flex-col gap-2">
                <div className="rounded-lg border border-black/10 glass-2 px-2.5 py-1.5 text-center">
                  <p className="text-[13px] font-bold text-ink-1">DMZ</p>
                  <p className="font-mono text-[11px] text-ink-3">{ZONE_NETWORKS.dmz} · WEB-1</p>
                </div>
                <div className="rounded-lg border border-black/10 glass-2 px-2.5 py-1.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[13px] font-bold text-ink-1"><Globe size={13} /> Outside</p>
                  <p className="font-mono text-[11px] text-ink-3">internet · WAN {ZONE_NETWORKS.outside.split(' ')[0]}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test packet sender + verdict */}
          <div className="mt-3 rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Send a test packet</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Test packet</span>
                <select value={packetId} onChange={(e) => setPacketId(e.target.value)} aria-label="Test packet" className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] font-semibold text-ink-1">
                  {TEST_PACKETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <button type="button" onClick={handleSendPacket} className="glass-btn shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold">Send packet</button>
            </div>
            {verdict ? (
              <div className={`mt-2.5 rounded-lg border px-3 py-2 ${verdictStyle}`}>
                <p className="text-[13px] font-bold uppercase tracking-wide">
                  {`${verdict.verdict === 'allow' ? 'Allow' : verdict.verdict === 'blocked' ? 'Blocked' : 'Deny'} — ${verdict.reason}`}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug">{verdict.detail}</p>
              </div>
            ) : (
              <p className="mt-2.5 text-[13px] text-ink-3">No packet sent yet. Live traffic is already flowing — pause it to drill one packet at a time.</p>
            )}
          </div>

          {/* Quarantine notice */}
          {quarantined.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-[13px] leading-snug text-amber-800">
                <strong>{quarantined.map((h) => h.id).join(', ')}</strong> is in the quarantine VLAN — unpatched, so NAC
                isolates it until remediated. Its traffic is denied before the rules are even checked.
              </p>
            </div>
          )}
        </div>

        {/* Right rail: the box + the stateful session table */}
        <div className="flex flex-col gap-2.5 lg:col-start-3 lg:row-start-1">
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-1"><ShieldCheck size={15} className="text-violet-700" /> NGFW-1 — 1U appliance</p>
            <div className="mt-2 rounded-lg border border-black/10 glass-2 p-2">
              <div className="flex items-center gap-1">
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-800">WAN1</span>
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-800">WAN2</span>
                <span className="ml-1 flex gap-0.5">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className="inline-block h-3.5 w-3.5 rounded-[3px] border border-black/20 bg-white" title={`LAN${i + 1}`} />
                  ))}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">SFP+ 10G ×2</span>
                <span className="rounded glass-2 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-2">CONSOLE</span>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> PWR</span>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-[12px] leading-snug text-ink-2">
              <li className="flex items-center gap-1.5"><Lock size={12} /> Security processor, AES-NI · 32–128 GB ECC RAM · dual SSDs RAID 1</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600" /> App control · SSL inspection · IDS/IPS with threat intel</li>
              <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-violet-700" /> IPS {fw.ipsEnabled ? 'on' : 'OFF'} · SSL inspection {fw.sslInspection ? 'on' : 'off'} · NAT on</li>
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 glass-1 p-3">
            <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Stateful session table</p>
            {fw.sessions.length === 0 ? (
              <p className="mt-1.5 text-[13px] leading-snug text-ink-3">No open sessions — return traffic from the internet will be dropped.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {fw.sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg border border-black/10 glass-1 px-2 py-1.5">
                    <span className="min-w-0 flex-1 font-mono text-[11px] leading-tight text-ink-1">{s.src} → {s.dst} · {s.app}:{s.port}</span>
                    <button type="button" onClick={() => { if (closeSession(sim.fw, s.id)) { logEvent(sim, `Session ${s.id} closed by hand.`); bump(); } }} aria-label={`Close session ${s.id}`} className="shrink-0 rounded border border-black/10 px-1.5 py-0.5 text-[11px] font-semibold text-ink-1">Close</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* NGFW config, under the rule rail */}
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">NGFW config — updates live</p>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#002B36] p-3 font-mono text-[10px] leading-snug text-[#859900]">{ngfwConf(fw)}</pre>
        </div>

        {/* Event log, under the session table */}
        <div className="lg:col-start-3 lg:row-start-2">
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-2">Event log</p>
          <div className="rounded-xl border border-black/10 glass-1 p-3">
            {sim.events.length === 0 ? (
              <p className="text-[13px] text-ink-3">No events yet. Send a packet, or let the live traffic run.</p>
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
          <h3 className="text-base font-bold text-ink-1">Lab brief — the next-gen firewall</h3>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">
            A next-gen firewall is stateful inspection, deep packet inspection, application awareness and
            IPS in one box. It enforces zone-based policy between the inside LAN, the screened-subnet DMZ
            and the internet: rules are checked top-down, the first match wins, and anything not explicitly
            allowed is dropped by the implicit deny.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Objectives</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink-2">
                <li>Order the rules so first-match-wins blocks SSH — and see a broad allow above the deny break it.</li>
                <li>Open and close stateful sessions, and prove return traffic is allowed only on an open session.</li>
                <li>Turn SSL inspection on so the IPS can see — and block — an exploit hiding inside HTTPS.</li>
                <li>Use zone policy and NAC quarantine to contain a breach to the DMZ.</li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Exam lens</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink-2">
                <li>ACLs are top-down, first match wins, implicit deny at the end; default deny is least privilege.</li>
                <li>Stateful tracks sessions; stateless checks each packet alone. IDS detects, IPS prevents.</li>
                <li>The DMZ is a screened subnet between two filtering points; the app is identified, not just the port.</li>
                <li>NAT rewrites inside addresses to the WAN address; a proxy firewall and a WAF guard web apps.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Exercises — in order</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-snug text-ink-2">
            <li>Send the SSH packet — it is denied by Rule 2. Add a broad “Allow inside → outside, any app” rule at the top and send SSH again: now it is allowed. Move the broad allow below Rule 2 and send once more: denied again.</li>
            <li>Send the web packet and watch a session open in the session table. Send the return-traffic packet: allowed, it belongs to the session. Close the session and send the return packet again: denied, no open session.</li>
            <li>With SSL inspection off, send the HTTPS exploit: it passes — the IPS cannot see inside encrypted traffic. Turn SSL inspection on and resend: blocked by IPS. Send the plain-HTTP exploit: blocked either way.</li>
            <li>Send the DMZ server → LAN database packet: denied by Rule 5. A compromised DMZ host cannot reach the LAN — the blast radius stops at the DMZ.</li>
            <li>Run the NAC check: unpatched PC-7 is quarantined and its web traffic is denied. Remediate PC-7 and send its web packet again: allowed.</li>
          </ol>
        </section>

        <section className="rounded-xl glass-1 p-4">
          <h3 className="text-base font-bold text-ink-1">Debrief — what you should have seen</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-snug text-ink-2">
            <li>First match wins: rule order is the policy — a broad allow above a deny disables the deny.</li>
            <li>Default deny: anything not explicitly allowed is blocked by the implicit deny at the end of the list.</li>
            <li>Stateful: return traffic is allowed only for open sessions; unsolicited inbound traffic is dropped.</li>
            <li>IPS needs visibility: with SSL inspection off, an exploit inside HTTPS passes; with it on, the IPS blocks it.</li>
            <li>Zones contain breaches: DMZ → LAN is denied, so a compromised DMZ host cannot reach the LAN.</li>
            <li>NAT rewrites inside addresses to the WAN address on the way out, and NAC isolates unpatched hosts until remediated.</li>
          </ul>
          <h4 className="mt-4 text-sm font-bold text-ink-1">Check yourself</h4>
          <ul className="mt-2 space-y-2">
            <QuizQuestion
              question="A too-broad allow sits above the deny for SSH. A user tries SSH to the internet. What happens, and why?"
              answer="It is allowed. Rules are evaluated top-down and the first match wins, so the broad allow matches first and the deny below it is never evaluated. Move the deny above the allow — or delete the broad allow — to block SSH again."
            />
            <QuizQuestion
              question="Return traffic arrives from the internet with no open session. Allowed or denied?"
              answer="Denied. A stateful firewall allows return traffic only when it belongs to an open session; unsolicited inbound traffic hits the implicit deny."
            />
            <QuizQuestion
              question="An exploit hides inside HTTPS and SSL inspection is off. Does the IPS block it?"
              answer="No. The firewall cannot see inside the encrypted payload, so the IPS signature never matches and the packet passes. Turn SSL inspection on and the same packet is blocked."
            />
            <QuizQuestion
              question="A compromised DMZ web server tries to reach the LAN database. What stops it?"
              answer="Zone-based policy: the DMZ → inside rule denies it. The DMZ is a screened subnet between two filtering points, so a DMZ compromise cannot reach the LAN."
            />
          </ul>
        </section>
      </div>
    </div>
  );
}
