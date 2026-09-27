import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, KeyRound, Eye } from 'lucide-react';

const STEPS = [
  { phase: 'Plaintext', note: 'Sender has a plaintext message: "HELLO". Anyone could read it as-is.' },
  { phase: 'Encrypt', note: 'An encryption algorithm + a shared key scramble the plaintext into ciphertext.' },
  { phase: 'Transmit', note: 'Ciphertext travels across the network. An eavesdropper only sees gibberish.' },
  { phase: 'Receive', note: 'The ciphertext arrives at the receiver.' },
  { phase: 'Decrypt', note: 'The receiver uses the same key to decrypt — recovering the original "HELLO".' },
];

const PLAIN = 'HELLO';
const CIPHER = 'Xq9#v';

export default function EncryptionAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2400);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  const senderText = step <= 1 ? PLAIN : CIPHER;
  const senderEncrypted = step >= 1;
  const onWire = step === 2 || step === 3;
  const receiverText = step >= 4 ? PLAIN : CIPHER;
  const receiverDecrypted = step >= 4;

  return (
    <div>
      <div className="relative h-72 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14]">
        {/* sender */}
        <div className="absolute left-[12%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[10px] font-bold text-slate-400">SENDER</p>
          <div className={`mt-1 rounded-lg border px-3 py-2 font-mono text-sm font-bold ${senderEncrypted ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-blue-500/40 bg-blue-500/10 text-blue-300'}`}>
            {senderText}
          </div>
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex items-center justify-center gap-1 text-[10px] text-amber-400">
              <KeyRound size={11} /> + key → encrypt
            </motion.div>
          )}
        </div>

        {/* eavesdropper */}
        <div className="absolute left-[50%] top-[16%] -translate-x-1/2 text-center">
          <Eye size={16} className="mx-auto text-slate-500" />
          <p className="text-[9px] text-slate-500">eavesdropper</p>
          <p className="font-mono text-[9px] text-slate-700">{onWire ? CIPHER : '···'}</p>
        </div>

        {/* receiver */}
        <div className="absolute left-[88%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[10px] font-bold text-slate-400">RECEIVER</p>
          <div className={`mt-1 rounded-lg border px-3 py-2 font-mono text-sm font-bold ${receiverDecrypted ? 'border-teal-500/50 bg-teal-500/10 text-teal-300' : 'border-slate-600/40 bg-white/[0.06] text-slate-400'}`}>
            {step >= 3 ? receiverText : '—'}
          </div>
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex items-center justify-center gap-1 text-[10px] text-teal-400">
              <KeyRound size={11} /> + key → decrypt
            </motion.div>
          )}
        </div>

        {/* wire */}
        <div className="absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {/* moving ciphertext */}
        {onWire && (
          <motion.div
            key={step}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-[150%]"
            initial={{ left: '18%', opacity: 0 }}
            animate={{ left: step === 2 ? '50%' : '82%', opacity: [0, 1, 1, 1] }}
            transition={{ duration: 1.8, times: [0, 0.1, 0.5, 1], ease: 'easeInOut' }}
          >
            <div className="rounded-md border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 shadow">
              {CIPHER}
            </div>
          </motion.div>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
        <p className="font-semibold text-white">{current.phase}</p>
        <p className="text-slate-400">{current.note}</p>
      </div>

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
            <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="flex h-8 items-center px-0.5"><span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/20'}`} /></button>
          ))}
        </div>
      </div>
    </div>
  );
}