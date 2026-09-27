import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, HelpCircle } from 'lucide-react';

const STEPS = [
  { dir: 'right', label: 'Client → Server', badge: 'SYN', state: 'Client: SYN_SENT', seq: 'seq=0', ack: '—', size: '—', windows: [], note: 'analogy: "Hi, can we talk? Here is my starting number (0)."', explain: 'The client asks the server to open a connection. SYN means synchronize — the client proposes an initial sequence number so both sides agree where data starts. No data is sent yet.' },
  { dir: 'left', label: 'Server → Client', badge: 'SYN-ACK', state: 'Server: SYN_RCVD', seq: 'seq=100', ack: 'ack=1', size: '—', windows: [], note: 'analogy: "Yes! Let us talk. My starting number is 100, and I got your 0."', explain: 'The server agrees and also proposes its own sequence number. SYN-ACK confirms receipt of the client’s SYN and sends its own. This is the second handshake step.' },
  { dir: 'right', label: 'Client → Server', badge: 'ACK', state: 'Both: ESTABLISHED', seq: 'seq=1', ack: 'ack=101', size: '20 bytes', windows: [], note: 'analogy: "Got it — connection is open."', explain: 'The client confirms the server’s SYN. Now both sides know each other’s starting numbers. The connection is established and ready for data.' },
  { dir: 'right', label: 'Data Segment #1', badge: 'PSH+ACK', state: 'ESTABLISHED', seq: 'seq=1', ack: 'ack=101', size: '50 bytes', windows: [{from:'right',to:'left'}], note: 'analogy: "Message part 1: Hello..."', explain: 'Real data is now split into segments. TCP adds a sequence number so the receiver can reorder out-of-order packets. PSH asks the receiver to deliver data up the stack immediately rather than waiting for more bytes.' },
  { dir: 'left', label: 'Acknowledgment', badge: 'ACK', state: 'ESTABLISHED', seq: 'seq=101', ack: 'ack=51', size: '—', windows: [], note: 'analogy: "Received bytes 1-50. Next expected byte is 51."', explain: 'The receiver confirms how much it got. If this ACK is lost, the sender retransmits after a timeout. This acknowledgement system is why TCP is called reliable.' },
  { dir: 'right', label: 'Data Segment #2', badge: 'PSH+ACK', state: 'ESTABLISHED', seq: 'seq=51', ack: 'ack=101', size: '50 bytes', windows: [{from:'right',to:'left'}], note: 'analogy: "Message part 2: ...World"', explain: 'The sender continues with the next sequence number. If segments arrive out of order, TCP reassembles them before handing data to the application.' },
  { dir: 'right', label: 'Client → Server', badge: 'FIN', state: 'Client: FIN_WAIT_1', seq: 'seq=101', ack: 'ack=151', size: '—', windows: [], note: 'analogy: "I am done talking."', explain: 'The client initiates close with FIN — finish. It means “I have no more data.” TCP connections can be half-open: one side closed, the other still open.' },
  { dir: 'left', label: 'Server → Client', badge: 'ACK', state: 'Client: FIN_WAIT_2, Server: CLOSE_WAIT', seq: 'seq=151', ack: 'ack=102', size: '—', windows: [], note: 'analogy: "Got your close request."', explain: 'The server acknowledges the client’s FIN. The client waits in FIN_WAIT_2 until the server also finishes sending.' },
  { dir: 'left', label: 'Server → Client', badge: 'FIN', state: 'Client: TIME_WAIT, Server: LAST_ACK', seq: 'seq=151', ack: 'ack=102', size: '—', windows: [], note: 'analogy: "I am done too."', explain: 'The server finishes sending and sends its own FIN. This is the third step in connection teardown.' },
  { dir: 'right', label: 'Client → Server', badge: 'ACK', state: 'Client: TIME_WAIT → CLOSED', seq: 'seq=102', ack: 'ack=152', size: '—', windows: [], note: 'analogy: "Closing now."', explain: 'The client acknowledges the server FIN. After a TIME_WAIT timer (typically 2×MSL), the client fully closes to catch any delayed duplicate packets. Then both sides are closed.' },
];

const colorMap = {
  blue: 'border-blue-500/50 bg-blue-500/15 text-blue-300',
  teal: 'border-teal-500/50 bg-teal-500/15 text-teal-300',
  green: 'border-green-500/50 bg-green-500/15 text-green-300',
  amber: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  red: 'border-red-500/50 bg-red-500/15 text-red-300',
};

export default function TcpAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2600);
    return () => clearTimeout(t);
  }, [step, playing]);

  const current = STEPS[step];
  const reset = () => { setStep(0); setPlaying(true); };
  const toggle = () => setPlaying((p) => !p);

  const startLeft = current.dir === 'right' ? '8%' : '92%';
  const endLeft = current.dir === 'right' ? '92%' : '8%';
  const accent = current.badge.includes('SYN') && current.badge.includes('ACK') ? 'teal' : current.badge === 'FIN' ? 'red' : current.badge === 'ACK' ? 'teal' : 'blue';

  return (
    <div>
      {/* Stage */}
      <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d1320] to-[#0a0e14] sm:h-72">
        {/* Endpoints */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-center">
          <p className="text-[11px] font-bold text-blue-300">CLIENT</p>
          <p className="mt-0.5 text-[10px] text-slate-400">192.168.1.10</p>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-center">
          <p className="text-[11px] font-bold text-teal-300">SERVER</p>
          <p className="mt-0.5 text-[10px] text-slate-400">93.184.216.34</p>
        </div>

        {/* Line */}
        <div className="absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {/* Packet */}
        {current.dir !== 'none' && (
          <motion.div
            key={step}
            className="absolute"
            style={{ top: 'calc(50% - 30px)' }}
            initial={{ left: startLeft, opacity: 0 }}
            animate={{ left: endLeft, opacity: [0, 1, 1, 1] }}
            transition={{ duration: 1.6, times: [0, 0.1, 0.85, 1], ease: 'easeInOut' }}
          >
            <div className={`flex flex-col items-center rounded-lg border px-3 py-1.5 text-center shadow-lg min-w-[110px] ${colorMap[accent]}`}>
              <span className="text-[11px] font-bold tracking-wide">{current.badge}</span>
              <span className="text-[10px] opacity-80">{current.state}</span>
              <span className="mt-0.5 text-[10px] opacity-90">seq={current.seq.replace('seq=','')} ack={current.ack.replace('ack=','')}</span>
              <span className="text-[10px] opacity-80">len={current.size}</span>
            </div>
          </motion.div>
        )}

        {/* State label */}
        {current.dir === 'none' && (
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-green-500/40 bg-green-500/10 px-5 py-2 text-center"
          >
            <p className="text-sm font-bold text-green-300">{current.label}</p>
            <p className="text-[10px] text-slate-400">{current.sub}</p>
          </motion.div>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      {/* Concept + controls */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
          <p className="font-semibold text-white">{current.label}</p>
          <p className="text-slate-400">{current.note}</p>
          <p className="mt-1.5 text-slate-300">{current.explain}</p>
        </div>
        <div className="flex sm:flex-col items-center gap-2">
          <button onClick={toggle} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
            {playing && step < STEPS.length - 1 ? <Pause size={14} /> : <Play size={14} />}
            {playing && step < STEPS.length - 1 ? 'Pause' : 'Play'}
          </button>
          <button onClick={reset} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5">
            <RotateCcw size={14} /> Restart
          </button>
        </div>
      </div>

      {/* Quick legend */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1"><HelpCircle size={10}/> SYN = request connection</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">ACK = acknowledgement</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">PSH = send data now</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">FIN = close connection</span>
        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.06] px-2 py-1">seq/ack = ordering numbers</span>
      </div>

      {/* Scrubber */}
      <div className="mt-4 flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="flex h-8 items-center px-0.5"><span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/20'}`} /></button>
        ))}
      </div>
    </div>
  );
}
