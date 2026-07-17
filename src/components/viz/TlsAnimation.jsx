import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import BreakItControls from '@/components/lab/BreakItControls';

const STEPS = [
  { label: 'Client Handshake', badge: 'TLS', note: 'The client opens a TCP connection and sends a ClientHello with supported cipher suites.', from: 'client', to: 'server', scenarioNote: { 'cert-expired': 'Client receives an expired certificate and aborts trust validation.', 'mitm': 'Intercepted handshake; client cannot verify server identity.', 'key-compromise': 'Session key material is exposed before derivation completes.', 'downgrade': 'Attacker forces fallback to TLS 1.0 or weak ciphers.' } },
  { label: 'Certificate', badge: 'Server cert', note: 'The server returns its TLS certificate. The client validates trust chain, hostname, expiration, and revocation.', from: 'ca', to: 'server', scenarioNote: { 'cert-expired': 'Certificate validity window is past; validation fails.', 'mitm': 'Fake certificate presented; chain cannot be verified to trusted CA.', 'key-compromise': 'CA private key leaked; attacker can sign fraudulent certs.', 'downgrade': 'Client accepts older protocol/cipher than intended.' } },
  { label: 'Key Exchange', badge: 'Keys', note: 'Both sides derive session keys using asymmetric crypto. Symmetric encryption will protect bulk data.', from: 'client', to: 'server', scenarioNote: { 'cert-expired': 'Handshake already failed; no keys derived.', 'mitm': 'Attacker intercepts key exchange and learns session key.', 'key-compromise': 'Session key derivation is observed and reused.', 'downgrade': 'Key exchange falls back to export-grade RSA/weak DH.' } },
  { label: 'Encrypted Data', badge: 'TLS record', note: 'Application data is encrypted with AES-style symmetric ciphers inside TLS records.', from: 'client', to: 'server', scenarioNote: { 'cert-expired': 'No encrypted channel established.', 'mitm': 'Attacker can decrypt or tamper with records.', 'key-compromise': 'Confidentiality is lost; plaintext recoverable.', 'downgrade': 'Cipher suite is weak; traffic is easier to decrypt offline.' } },
  { label: 'Downgrade Protection', badge: '1.3', note: 'TLS 1.3 removes unsafe legacy algorithms and enables 1-RTT handshakes, reducing latency and attack surface.', from: 'client', to: 'server', scenarioNote: { 'cert-expired': 'Not applicable; connection already failed.', 'mitm': 'Removal of legacy algo reduces MITM surface.', 'key-compromise': 'Forward secrecy limits exposure to this session only.', 'downgrade': 'TLS 1.3 prevents downgrade to legacy protocol versions.' } },
];

const NODES = [
  { id: 'client', label: 'CLIENT', x: 10, y: 50 },
  { id: 'server', label: 'SERVER', x: 88, y: 50 },
  { id: 'ca', label: 'CA', x: 48, y: 20 },
];

const PATHS = [
  ['client', 'server'],
  ['ca', 'server'],
];

export default function TlsAnimation() {
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

  const note = current.scenarioNote?.[scenario];
  const caDistrusted = scenario === 'mitm' || scenario === 'key-compromise';
  const weakCipher = scenario === 'downgrade';

  return (
    <div>
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          {PATHS.map(([a, b], idx) => {
            const A = NODES.find(n => n.id === a);
            const B = NODES.find(n => n.id === b);
            const failed = caDistrusted || (scenario === 'cert-expired' && idx > 0);
            const active = !failed;
            return (
              <g key={idx}>
                <line x1={`${A.x}%`} y1={`${A.y}%`} x2={`${B.x}%`} y2={`${B.y}%`} stroke={active ? '#ffffff12' : '#ffffff12'} strokeWidth="1" strokeDasharray="2 3" />
                {active && (
                  <line x1={`${A.x}%`} y1={`${A.y}%`} x2={`${B.x}%`} y2={`${B.y}%`} stroke={weakCipher ? '#f59e0b' : '#a78bfa'} strokeWidth="1" />
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {NODES.map((node) => {
            const active = current.from === node.id || current.to === node.id;
            const isServer = node.id === 'server';
            const distrusted = node.id === 'ca' && caDistrusted;
            return (
              <div
                key={node.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-3 py-2 text-center backdrop-blur transition ${
                  distrusted ? 'border-rose-500/60 bg-rose-500/15 shadow-lg shadow-rose-500/20' : isServer ? 'border-purple-300/60 bg-purple-500/15 shadow-lg shadow-purple-500/20' : active ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/5'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <p className={`text-[11px] font-bold ${distrusted ? 'text-rose-300' : isServer ? 'text-purple-200' : 'text-slate-200'}`}>{node.label}</p>
                {isServer && <p className="text-[10px] text-purple-300/80">{weakCipher ? 'weak cipher' : 'certificate'}</p>}
                {distrusted && <p className="text-[10px] text-rose-300/80">untrusted</p>}
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
          <span className="mr-1 inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]"><span className="text-rose-400">⚠</span> Failure mode</span>
          <span className="text-slate-300">{note}</span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.label}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

      <BreakItControls scenario={scenario} onScenarioChange={(id) => { setScenario(id); setStep(0); setPlaying(true); }} />

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
            <button key={i} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-purple-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1"><span className="text-purple-400">⟵</span> Handshake + cert validation</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1">Session keys + encrypted records</span>
      </div>
    </div>
  );
}
