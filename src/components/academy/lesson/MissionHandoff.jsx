import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import CypherViewer from '@/components/three/CypherCharacter';
import { useCypherVoice } from '@/api/voice';
import { missionsApi } from '@/api/missions';
import { logCypherEvent } from '@/api/analytics';
import { Button, Card } from '@/components/ui-glass';
import { pillClass } from '@/components/academy/tutor/TutorAssist';

// Cypher's mission handoff, shown when the student finishes the practice
// at the end of a lesson that has a mission (today: net-security /
// Operation Broken Shield). The briefing is dialogue, not a block of
// written text: Cypher congratulates, invites, and points at the one
// mission button. The lines are spoken (voice when available, subtitles
// always) via the same "Hear Cipher say it" control as the lesson panel.
//
// One mission CTA per state — Start Mission when the mission hasn't been
// started, Continue Mission only when an in-progress attempt exists to
// resume, Replay once it is complete — never two at once for the same
// mission. "Launch Lab" (the hands-on lab) stays a separate thing and
// never appears here.
export function missionCtaLabel({ completed, hasAttempt }) {
  if (completed) return 'Replay the mission';
  if (hasAttempt) return 'Continue Mission';
  return 'Start Mission';
}

export function handoffInviteLine(ctaLabel) {
  if (ctaLabel === 'Continue Mission') {
    return 'You can click on the Continue Mission button to pick up the mission and put what you learned in practice.';
  }
  if (ctaLabel === 'Replay the mission') {
    return 'You can click on the Replay the mission button to run the mission again and put what you learned in practice.';
  }
  return 'You can click on the Start Mission button to start the mission and put what you learned in practice.';
}

export default function MissionHandoff({ missionId, lessonId }) {
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const [attemptView, setAttemptView] = useState(null);
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
  const lines = [
    'Congratulations, you finished — you know the drill.',
    'Now that you know about this lesson, we have a mission for you.',
    handoffInviteLine(ctaLabel),
  ];
  const spoken = lines.join(' ');

  return (
    <Card level={2} className="mx-auto mt-6 max-w-2xl text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-44">
          <CypherViewer voiceRef={voiceRef} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-action-hover">Cipher</p>
          {lines.map((line) => (
            <p key={line} className="mt-2 text-body text-ink-1">{line}</p>
          ))}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button to={`/missions/${missionId}`} variant="primary" size="sm">
              {ctaLabel}
            </Button>
            <button
              type="button"
              onClick={() => voice.play(spoken)}
              disabled={voice.playing}
              className={pillClass}
            >
              <Volume2 size={15} className="text-action" /> {voice.playing ? 'Speaking…' : 'Hear Cipher say it'}
            </button>
            {voice.playing && (
              <button type="button" onClick={voice.stop} className={pillClass} aria-label="Stop Cypher speaking">
                <Square size={13} className="fill-current" /> Stop
              </button>
            )}
          </div>
          {voice.error && <p className="mt-2 text-small text-danger">{voice.error}</p>}
        </div>
      </div>
    </Card>
  );
}
