import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardList, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import { useCypherVoice, fetchVoiceStatus } from '@/api/voice';

// The SOC room is three.js: it loads only when a mission is completed, never
// while the learner works the terminal.
const MissionSocScene = React.lazy(() => import('@/components/three/MissionSocScene'));

const NO_DEVICES = [];
const OPEN_S = 1.8; // establishing shot before the first line
const TURN_CAP_S = 30; // a stalled voice never hangs the scene
const SPEAKER_LABEL = { cypher: 'Cypher', sentinel: 'Sentinel — server room', patch: 'Patch — workshop' };

/**
 * The mission closing scene (Spencer, 2026-11-18): as soon as a mission is
 * completed the SOC room comes back over the terminal, the three robots
 * congratulate the learner in turn (each in his own room, camera on his
 * face), and Cypher announces the next mission. Then an end card: start the
 * next mission, review the results (closes this layer, revealing the debrief
 * and dossier on the terminal page), or go back to the Labs.
 *
 * `turns` is closingTurns(...) from src/data/missions.js; `nextMission` is
 * { id, title } or null when this was the last one.
 */
export default function SocClosing({ turns, nextMission, onReview, background = '#F8F7FF' }) {
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const speakerRef = useRef('wide');
  const [idx, setIdx] = useState(-1); // -1: establishing shot
  const [ended, setEnded] = useState(false);
  const spokenRef = useRef(-1);
  const capRef = useRef(null);
  const charsRef = useRef(null);
  const playRef = useRef(null);
  playRef.current = voice.play;
  const stopRef = useRef(null);
  stopRef.current = voice.stop;

  useEffect(() => {
    let live = true;
    fetchVoiceStatus().then((s) => { if (live) charsRef.current = s?.characters || {}; });
    const t = setTimeout(() => setIdx(0), OPEN_S * 1000);
    return () => { live = false; clearTimeout(t); stopRef.current?.(); };
  }, []);

  useEffect(() => {
    if (idx < 0 || ended) return undefined;
    if (idx >= turns.length) {
      speakerRef.current = 'wide';
      setEnded(true);
      return undefined;
    }
    const turn = turns[idx];
    speakerRef.current = turn.speaker;
    if (spokenRef.current !== idx) {
      spokenRef.current = idx;
      const who = charsRef.current?.[turn.speaker] ? turn.speaker : 'cypher';
      // 'briefing': these short scripted lines may use the credits kept back
      // from lesson read-aloud, like the mission briefing.
      playRef.current?.(turn.text, who, 'briefing');
      if (capRef.current) clearTimeout(capRef.current);
      capRef.current = setTimeout(() => setIdx((i) => i + 1), TURN_CAP_S * 1000);
      return undefined;
    }
    if (!voice.loading && !voice.playing) {
      const t = setTimeout(() => setIdx((i) => i + 1), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [idx, ended, turns, voice.loading, voice.playing]);

  useEffect(() => () => { if (capRef.current) clearTimeout(capRef.current); }, [idx]);

  const finish = () => {
    stopRef.current?.();
    speakerRef.current = 'wide';
    setEnded(true);
  };

  const turn = idx >= 0 && idx < turns.length ? turns[idx] : null;
  const caption = ended ? null
    : idx < 0 ? 'Back to the SOC…'
      : (voice.subtitle || (turn ? SPEAKER_LABEL[turn.speaker] : null));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-ink-1" role="dialog" aria-modal="true" aria-label="Mission complete">
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full w-full portrait:h-auto portrait:aspect-square">
          <React.Suspense fallback={<div className="flex h-full items-center justify-center text-white/70">Loading SOC room…</div>}>
            <MissionSocScene
              devices={NO_DEVICES}
              incidentActive={false}
              contained
              onRendererFailed={finish}
              background={background}
              cypherVoiceRef={voiceRef}
              speakerRef={speakerRef}
            />
          </React.Suspense>
        </div>
      </div>
      {caption && (
        <p className="absolute inset-x-0 bottom-0 z-10 bg-black/60 px-4 py-3 text-center text-body text-white" aria-live="polite">{caption}</p>
      )}
      {!ended && (
        <button type="button" onClick={finish} className="absolute right-4 top-4 z-10 rounded-control border border-white/20 bg-black/60 px-2.5 py-1 text-caption font-semibold text-white">
          Skip
        </button>
      )}
      {ended && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pt-10 sm:pb-10" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))' }}>
          <div className="mx-auto max-w-xl rounded-card bg-white/95 p-5 text-center shadow-xl sm:p-6">
            <p className="text-title font-semibold text-ink-1">Mission complete — well done!</p>
            <p className="mt-1 text-body text-ink-2">
              {nextMission ? <>Next up: <strong>{nextMission.title}</strong>. See you on the next mission!</> : 'More missions are on the way. See you on the next mission!'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {nextMission && (
                <Button to={`/missions/${nextMission.id}`} size="lg" iconAfter={ArrowRight}>Start next mission</Button>
              )}
              <Button size="lg" variant="secondary" icon={ClipboardList} onClick={onReview}>Review my results</Button>
              <Button to="/labs" size="lg" variant="ghost" icon={LayoutGrid}>Back to Labs</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
