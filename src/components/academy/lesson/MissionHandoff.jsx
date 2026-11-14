import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import CypherViewer from '@/components/three/CypherCharacter';
import { useCypherVoice } from '@/api/voice';
import { logCypherEvent } from '@/api/analytics';
import { Button, Card } from '@/components/ui-glass';
import { pillClass } from '@/components/academy/tutor/TutorAssist';

// Cypher's mission handoff, shown when the student finishes the practice
// at the end of a lesson that has a mission (today: net-security /
// Operation Broken Shield). The briefing is dialogue, not a block of
// written text: Cypher says ONE line — congratulations, invite, and the
// pointer to the one mission button — and he SPEAKS it himself as soon as
// the handoff appears (listen-first, same as the lesson panel). Voice-only:
// no subtitle paragraph while he talks; the full line stays hidden behind
// a "Read message" toggle, and "Hear again" replays once he finishes.
// Voice unavailable or muted falls back to showing the line as text with
// the Hear button, as before — never nothing.
//
// The button is ALWAYS "Launch Mission" — never Continue or Replay.
// Clicking it enters the mission: the mission page resumes an in-progress
// attempt when one exists and starts fresh otherwise. One CTA, one label,
// always. "Launch Lab" (the hands-on lab) stays a separate thing and
// never appears here.
//
// Placement: the button sits to the RIGHT of Cypher's message on desktop
// (sm:flex-row, its own column) and BELOW it on mobile (flex-col) — the
// line says "on your right", so the layout must match the words.
export const HANDOFF_LINE = "Excellent work, Agent. Now that you've learned and practiced, I have a mission for you. Click the 'Launch Mission' button on your right to begin.";

export default function MissionHandoff({ missionId, lessonId }) {
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const [showLine, setShowLine] = useState(false);
  const [spoken, setSpoken] = useState(false); // the line has been spoken at least once
  const autoPlayedRef = useRef(false);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logCypherEvent({ event: 'mission_handoff_shown', lesson_id: lessonId, mission_id: missionId });
  }, [lessonId, missionId]);

  // Listen-first: the line speaks itself when the handoff appears.
  // Voice-only: no subtitle paragraph while he talks; the full line stays
  // hidden behind "Read message", and "Hear again" replays once he finishes.
  useEffect(() => {
    if (autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    setSpoken(true);
    voice.play(HANDOFF_LINE);
  }, [voice.play]);

  return (
    <Card level={2} className="mx-auto mt-6 max-w-2xl text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-44">
          <CypherViewer voiceRef={voiceRef} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-action-hover">Cipher</p>
          {voice.fallback || showLine ? (
            // Voice unavailable or muted: listening can't happen, so the
            // line is shown as text with the Hear button, as before.
            // Same when the student asked to read it.
            <p className="mt-2 text-body text-ink-1">{HANDOFF_LINE}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {voice.loading ? (
              <button type="button" disabled className={pillClass}>
                <Volume2 size={15} className="text-action" /> Loading voice…
              </button>
            ) : voice.playing ? (
              <>
                <button type="button" disabled className={pillClass}>
                  <Volume2 size={15} className="text-action" /> Speaking…
                </button>
                <button type="button" onClick={voice.stop} className={pillClass} aria-label="Stop Cypher speaking">
                  <Square size={13} className="fill-current" /> Stop
                </button>
              </>
            ) : voice.fallback || !spoken ? (
              <button
                type="button"
                onClick={() => { setSpoken(true); voice.play(HANDOFF_LINE); }}
                className={pillClass}
              >
                <Volume2 size={15} className="text-action" /> Hear Cipher say it
              </button>
            ) : (
              <button
                type="button"
                onClick={() => voice.play(HANDOFF_LINE)}
                className={pillClass}
              >
                <Volume2 size={15} className="text-action" /> Hear again
              </button>
            )}
            {!voice.fallback && (
              <button
                type="button"
                onClick={() => setShowLine((s) => !s)}
                className={pillClass}
                aria-expanded={showLine}
              >
                {showLine ? 'Hide message' : 'Read message'}
              </button>
            )}
          </div>
          {voice.error && <p className="mt-2 text-small text-danger">{voice.error}</p>}
        </div>
        <div className="shrink-0 sm:self-center">
          <Button to={`/missions/${missionId}`} variant="primary" size="sm">
            Launch Mission
          </Button>
        </div>
      </div>
    </Card>
  );
}
