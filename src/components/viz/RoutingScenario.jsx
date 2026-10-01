import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// A data-driven routing-protocol visualization for the Visual Lab ("show me what happens").
// A scenario is a topology (nodes + links) plus a list of steps; each step can highlight nodes,
// animate an advertisement/packet along a link, or mark a link down. Renders on the Visual Lab's
// dark stage. Controls: play/pause, prev/next, restart. Teaches the protocol, not just decoration.

const VIEW_W = 640;
const VIEW_H = 320;
const STEP_MS = 2600;

const ACCENT = {
  idle: '#64748B',
  active: '#8B5CF6',   // violet — the focus of the current step
  up: '#34D399',       // emerald — established / reachable
  down: '#F87171',     // red — failed
  flow: '#A78BFA',
};

function nodeColor(node, step) {
  if (step?.down && (node.id === step.down.a || node.id === step.down.b)) return ACCENT.idle;
  if (step?.up?.includes(node.id)) return ACCENT.up;
  if (step?.active?.includes(node.id)) return ACCENT.active;
  return ACCENT.idle;
}

export default function RoutingScenario({ scenario }) {
  const { nodes, links, steps } = scenario;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = steps.length - 1;
  const cur = steps[step];

  useEffect(() => {
    if (!playing || step >= last) return undefined;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const pt = (id) => ({ x: (byId[id].x / 100) * VIEW_W, y: (byId[id].y / 100) * VIEW_H });

  const toggle = () => { if (step >= last) { setStep(0); setPlaying(true); } else setPlaying((p) => !p); };

  const linkDown = (a, b) => cur?.down && ((cur.down.a === a && cur.down.b === b) || (cur.down.a === b && cur.down.b === a));

  return (
    <div>
      <div className="rounded-xl border border-white/10 bg-[#070a12]">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" role="img" aria-label={scenario.title}>
          {/* links */}
          {links.map((l) => {
            const a = pt(l.a); const b = pt(l.b);
            const down = linkDown(l.a, l.b);
            return (
              <line key={`${l.a}-${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={down ? ACCENT.down : '#1e2a3a'} strokeWidth={down ? 3 : 2}
                strokeDasharray={down ? '6 6' : undefined} />
            );
          })}

          {/* traveling advertisement/packet for this step */}
          {cur?.flow && byId[cur.flow.from] && byId[cur.flow.to] && (
            <motion.circle key={`flow-${step}`} r="6" fill={ACCENT.flow}
              initial={{ cx: pt(cur.flow.from).x, cy: pt(cur.flow.from).y, opacity: 0 }}
              animate={{ cx: pt(cur.flow.to).x, cy: pt(cur.flow.to).y, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }} />
          )}

          {/* nodes */}
          {nodes.map((n) => {
            const p = pt(n.id);
            const color = nodeColor(n, cur);
            const isHost = n.kind === 'host' || n.kind === 'prefix';
            return (
              <g key={n.id}>
                {(cur?.active?.includes(n.id) || cur?.up?.includes(n.id)) && (
                  <circle cx={p.x} cy={p.y} r="26" fill={color} opacity="0.18" />
                )}
                {isHost ? (
                  <rect x={p.x - 20} y={p.y - 14} width="40" height="28" rx="5" fill="#0b1120" stroke={color} strokeWidth="2" />
                ) : (
                  <circle cx={p.x} cy={p.y} r="18" fill="#0b1120" stroke={color} strokeWidth="2.5" />
                )}
                <text x={p.x} y={p.y + (isHost ? 4 : 34)} textAnchor="middle" fontSize="12" fontWeight="600" fill="#cbd5e1">{n.label}</text>
                {n.sub && <text x={p.x} y={p.y + (isHost ? 18 : 48)} textAnchor="middle" fontSize="10" fill="#64748b">{n.sub}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {/* narration + controls */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-200">{cur.title}</p>
            <span className="ml-auto text-[11px] text-slate-400">Step {step + 1} / {steps.length}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{cur.text}</p>
        </motion.div>
        <div className="flex items-center gap-2 sm:flex-col">
          <div className="flex gap-2">
            <button onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} aria-label="Previous step"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10"><ChevronLeft size={16} /></button>
            <button onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15" aria-label={playing ? 'Pause' : 'Play'}>
              {step >= last ? <RotateCcw size={15} /> : playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button onClick={() => { setPlaying(false); setStep((s) => Math.min(last, s + 1)); }} aria-label="Next step"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10"><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => { setStep(0); setPlaying(true); }} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
            <RotateCcw size={13} /> Restart
          </button>
        </div>
      </div>

      {/* step scrubber */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {steps.map((_, i) => (
          <button key={i} onClick={() => { setPlaying(false); setStep(i); }} aria-label={`Go to step ${i + 1}`} className="flex h-6 items-center px-0.5">
            <span className={`block h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/20'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
