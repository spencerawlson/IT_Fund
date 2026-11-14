import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import CypherViewer from '@/components/three/CypherCharacter';
import { useCypherVoice } from '@/api/voice';
import { missionsApi } from '@/api/missions';
import { logCypherEvent } from '@/api/analytics';
import { Button, Card } from '@/components/ui-glass';
import { pillClass, TutorText } from '@/components/academy/tutor/TutorAssist';

// Cypher's mission handoff, shown when the student finishes the practice
// at the end of a lesson that has a mission (today: net-security /
// Operation Broken Shield). The briefing is dialogue, not a block of
// written text: Cypher says ONE line — congratulations, invite, and the
// pointer to the one mission button — and he SPEAKS it himself as soon as
// the handoff appears (listen-first, same as the lesson panel). The words
// show as subtitles while he talks; the full line stays hidden behind a
// "Read message" toggle, and "Hear again" replays once he finishes.
// Voice unavailable or muted falls back to showing the line as text with
// the Hear button, as before — never nothing.
//
// One mission CTA per state — Launch Mission when the mission hasn't been
// started, Continue Mission only when an in-progress attempt exists to
// resume, Replay once it is complete — never two at once for the same
// mission. "Launch Lab" (the hands-on lab) stays a separate thing and
// never appears here.
//
// Placement: the button sits to the RIGHT of Cypher's message on desktop
// (sm:flex-row, its own column) and BELOW it on mobile (flex-col) — the
// line says "on your right", so the layout must match the words.
export function missionCtaLabel({ completed, hasAttempt }) {
  if (completed) return 'Replay the mission';
  if (hasAttempt) return 'Continue Mission';
  return 'Launch Mission';
}

// The one spoken line. For the first run it is exactly Spencer's words;
// the other states name the button the student actually sees, in the
// same shape, so the words are always true about the button on screen.
export function handoffLine(ctaLabel) {
  if (ctaLabel === 'Continue Mission') {
    return "Excellent work, Agent. Now that you've learned and practiced, I have a mission for you. Click the 'Continue Mission' button on your right to pick up where you left off.";
  }
  if (ctaLabel === 'Replay the mission') {
    return "Excellent work, Agent. Now that you've learned and practiced, I have a mission for you. Click the 'Replay the mission' button on your right to run it again.";
  }
  return "Excellent work, Agent. Now that you've learned and practiced, I have a mission for you. Click the 'Launch Mission' button on your right to begin.";
}

export default function MissionHandoff({ missionId, lessonId }) {
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const [attemptView, setAttemptView] = useState(null);
  // The attempt fetch settles the CTA label (Launch / Continue / Replay)
  // and therefore the spoken line; auto-play waits for it so Cypher never
  // says "Launch Mission" while the button says "Continue Mission".
  const [attemptLoaded, setAttemptLoaded] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const [spoken, setSpoken] = useState(false); // the line has been spoken at least once
  const autoPlayedRef = useRef('');
  const loggedRef = useRef(false);

  // Read-only: the latest attempt for this mission, with its validated
  // objectives. Never starts a mission — starting is the student's choice
  // via the one button below.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { history = [] } = await missionsApi.history();
        const latest = history.find((h) => h.mission_id === missionId);
        if (!latest || !live) return;
        const view = await missionsApi.getAttempt(latest.id);
        if (live) setAttemptView(view);
      } catch {
        if (live) setAttemptView(null);
      } finally {
        if (live) setAttemptLoaded(true);
      }
    })();
    return () => { live = false; };
  }, [missionId]);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logCypherEvent({ event: 'mission_handoff_shown', lesson_id: lessonId, mission_id: missionId });
  }, [lessonId, missionId]);

  const objectives = attemptView?.objectives || [];
  const completed = attemptView?.attempt?.status === 'completed';
  const ctaLabel = missionCtaLabel({ completed, hasAttempt: objectives.length > 0 });
  const line = handoffLine(ctaLabel);

  // Listen-first: the line speaks itself when the handoff appears, once
  // the attempt has settled the label. The words show as subtitles while
  // he talks; the full line stays hidden behind "Read message", and "Hear
  // again" replays once he finishes.
  useEffect(() => {
    if (!attemptLoaded) return;
    if (autoPlayedRef.current === line) return;
    autoPlayedRef.current = line;
    setSpoken(true);
    voice.play(line);
  }, [attemptLoaded, line, voice.play]);

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
            <p className="mt-2 text-body text-ink-1">{line}</p>
          ) : voice.subtitle ? (
            <p className="mt-2 text-small text-ink-2" aria-live="polite">
              <span className="font-bold text-action-hover">Cipher:</span>{' '}
              <TutorText text={voice.subtitle} />
            </p>
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
                onClick={() => { setSpoken(true); voice.play(line); }}
                className={pillClass}
              >
                <Volume2 size={15} className="text-action" /> Hear Cipher say it
              </button>
            ) : (
              <button
                type="button"
                onClick={() => voice.play(line)}
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
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
