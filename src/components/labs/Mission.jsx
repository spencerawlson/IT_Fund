import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { beatFor, intelFrom } from '@/data/missions';

// Phase 2 of the game layer (docs/GAME_LAB_DESIGN.md): story framing over the
// real lab. MissionBrief types out the briefing; MissionDossier is the
// completion screen. Both are pure presentation — they read the same results
// and findings the plain workspace uses, and change nothing about the lab.

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};

/** Reveal `text` character by character; shows it in full at once under
 *  prefers-reduced-motion. Returns the visible slice and whether it's done. */
function useTypewriter(text, speed = 14) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? text.length : 0));
  const ref = useRef(text);
  ref.current = text;
  useEffect(() => {
    if (prefersReducedMotion()) { setN(text.length); return undefined; }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= ref.current.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

/** The typed mission briefing: callsign header + narrative, in a CRT panel. */
export function MissionBrief({ mission }) {
  const body = (mission?.brief || []).join('\n');
  const { shown, done } = useTypewriter(body);
  if (!mission) return null;
  return (
    <div className="mission-console">
      <div className="crt rounded-card border border-terminal-border bg-terminal-bg p-4 font-mono">
        <div className="text-caption font-semibold tracking-[0.2em] text-terminal-muted">// INCOMING TRANSMISSION</div>
        <div className="mt-1 text-body font-bold text-terminal-bright">{mission.callsign}</div>
        <pre className="mt-3 whitespace-pre-wrap break-words text-small leading-relaxed text-terminal-text">
          {shown}{!done && <span className="animate-pulse">▋</span>}
        </pre>
      </div>
    </div>
  );
}

/** Completion dossier: every objective as a cleared beat + recovered intel. */
export function MissionDossier({ lab, mission, results = [], findings }) {
  const passed = (id) => results.some((r) => r.objective_id === id && r.passed);
  const intel = intelFrom(mission, findings);
  return (
    <div className="mission-console">
      <div className="crt rounded-card border border-terminal-border bg-terminal-bg p-5 font-mono">
        <div className="text-caption font-semibold tracking-[0.2em] text-terminal-muted">// MISSION REPORT</div>
        <div className="mt-1 text-heading font-bold text-terminal-bright">{mission.callsign} — COMPLETE</div>

        <ol className="mt-4 space-y-1.5">
          {(lab.objectives || []).map((o) => (
            <li key={o.id} className="flex items-center gap-2 text-small text-terminal-text">
              <Check size={14} className="shrink-0 text-terminal-bright" aria-hidden="true" />
              <span className={passed(o.id) ? '' : 'opacity-60'}>{beatFor(mission, o)}</span>
            </li>
          ))}
        </ol>

        {intel.length > 0 && (
          <div className="mt-5">
            <div className="text-caption font-semibold tracking-[0.2em] text-terminal-muted">// INTEL EXFILTRATED</div>
            <ul className="mt-2 space-y-1">
              {intel.map((it, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2 text-small">
                  <span className="text-terminal-muted">{it.label}:</span>
                  <span className="break-all font-bold text-terminal-bright">{it.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
