import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Square, Volume2, Send, ShieldCheck, Lightbulb, ChevronDown } from 'lucide-react';
import CypherViewer from '@/components/three/CypherCharacter';
import { useTutor, useTutorEnabled, TutorText, Thinking, pillClass } from '@/components/academy/tutor/TutorAssist';
import { useCypherVoice } from '@/api/voice';
import { missionsApi } from '@/api/missions';
import { logCypherEvent } from '@/api/analytics';
import { Button } from '@/components/ui-glass';
import { missionCtaLabel } from '@/components/academy/lesson/MissionHandoff';

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

// Preset questions: each button asks a real question about THIS lesson
// instead of submitting an empty form. The backend requires a question
// for explain/example/simplify (400 "question is required"), and the chat
// path is the right one for lesson-level presets — the mode prompts are
// built around a flashcard question/answer, which the panel has no
// access to. The question also fills the input, so the student sees
// exactly what was asked.
export function presetQuestion(mode, lessonTitle, level) {
  const topic = lessonTitle || 'this lesson';
  const atLevel = level && level !== 'intermediate' ? ` at ${level} level` : '';
  switch (mode) {
    case 'example':
      return `Give me a concrete, real-world example of ${topic}.`;
    case 'simplify':
      return `Explain ${topic} in simple terms${atLevel}, using an everyday analogy.`;
    case 'explain':
    default:
      return `Explain the key ideas of ${topic}${atLevel}.`;
  }
}

// Cypher on the lesson page (Network Security first): the 3D tutor offers
// assistance, answers questions with the CURRENT lesson context through the
// existing server-side AI tutor (no duplicate chatbot), explains the mission
// from the CURRENT VALIDATED mission state (read-only — hints never alter
// validation, XP, or mission state), and invites the student into
// Operation Broken Shield. The deterministic grading path is untouched:
// everything here reads state the server already validated.
export default function CypherLessonPanel({ lesson, missionId, practicalHref, defaultMissionOpen = false }) {
  const tutorEnabled = useTutorEnabled();
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const { text, loading, error, ask, stop } = useTutor();
  const [level, setLevel] = useState('intermediate');
  const [question, setQuestion] = useState('');
  const [active, setActive] = useState(null); // which ask is showing
  // Listen-first: Cypher speaks each answer as soon as it arrives — the
  // student listens, they don't read. The full text stays hidden behind a
  // "Read answer" toggle, and "Hear again" replays once he finishes.
  const [showAnswer, setShowAnswer] = useState(false);
  const [spoken, setSpoken] = useState(false); // this answer has been spoken at least once
  const autoPlayedRef = useRef(''); // answer text already spoken by auto-play
  const stoppedRef = useRef(false); // the student stopped the tutor mid-answer
  const [attemptView, setAttemptView] = useState(null); // {attempt, objectives} or null
  const [hintShown, setHintShown] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  // The Operation Broken Shield section is hidden by default — it only
  // opens when the student clicks its header. The mission's one button
  // lives in the handoff at the end of practice, not open under Ask Cipher.
  const [missionOpen, setMissionOpen] = useState(defaultMissionOpen);
  const loggedOpenRef = useRef(false);
  const loggedInviteRef = useRef(false);

  const context = { track: lesson.trackId, topic: lesson.title, level };

  // A new question resets the listen-first state for the next answer.
  const resetAnswerState = () => {
    autoPlayedRef.current = '';
    stoppedRef.current = false;
    setShowAnswer(false);
    setSpoken(false);
  };

  // Listen-first: when an answer finishes arriving, Cypher speaks it —
  // no "Hear Cipher say it" click needed. The answer text stays hidden
  // (the spoken words show as subtitles while he talks); "Read answer"
  // reveals it. If the student stopped the tutor mid-answer, the partial
  // text is not auto-played — they can hear it with "Hear Cipher say it".
  useEffect(() => {
    if (!text || loading || error || stoppedRef.current) return;
    if (autoPlayedRef.current === text) return;
    autoPlayedRef.current = text;
    setSpoken(true);
    voice.play(text);
  }, [text, loading, error, voice.play]);

  // Read-only: the latest attempt for this mission, with its validated
  // objectives. Never starts a mission — starting is the student's choice
  // via the invitation button.
  const loadAttempt = useCallback(async () => {
    try {
      const { history = [] } = await missionsApi.history();
      const latest = history.find((h) => h.mission_id === missionId);
      if (!latest) return;
      const view = await missionsApi.getAttempt(latest.id);
      setAttemptView(view);
    } catch {
      // No attempt yet, or the mission API is unreachable: the panel still
      // works (tutor + invitation), the hint section just says to start.
      setAttemptView(null);
    }
  }, [missionId]);

  useEffect(() => { loadAttempt(); }, [loadAttempt]);

  useEffect(() => {
    if (loggedOpenRef.current) return;
    loggedOpenRef.current = true;
    logCypherEvent({ event: 'panel_opened', lesson_id: lesson.id, mission_id: missionId });
  }, [lesson.id, missionId]);

  // The mission section is hidden until the student opens it — that first
  // open is when the invitation is actually shown.
  const toggleMission = () => {
    const next = !missionOpen;
    setMissionOpen(next);
    if (next && !loggedInviteRef.current) {
      loggedInviteRef.current = true;
      logCypherEvent({ event: 'invite_shown', lesson_id: lesson.id, mission_id: missionId });
    }
  };

  const runMode = (mode) => {
    const q = presetQuestion(mode, lesson.title, level);
    setQuestion(q);
    setActive(mode);
    setHintShown(false);
    resetAnswerState();
    ask({ ...context, mode: 'chat', messages: [{ role: 'user', content: q }] });
  };

  const askQuestion = () => {
    const q = question.trim();
    if (!q) return;
    setActive('chat');
    setHintShown(false);
    resetAnswerState();
    ask({ ...context, mode: 'chat', messages: [{ role: 'user', content: q }] });
  };

  // "Why is this objective still open?" — the question is built from the
  // server-validated state (passed vs open objectives); the tutor explains
  // from that state. Nothing is re-graded client-side.
  const askWhy = () => {
    const objectives = attemptView?.objectives || [];
    if (!objectives.length) return;
    const passed = objectives.filter((o) => o.passed).map((o) => o.label || o.id);
    const open = objectives.filter((o) => !o.passed).map((o) => o.label || o.id);
    const q = `In Operation Broken Shield I have completed ${passed.length} of ${objectives.length} objectives. `
      + `Completed: ${passed.join('; ') || 'none yet'}. Still open: ${open.join('; ') || 'none'}. `
      + `Explain why the open objectives are still open and what concept I am missing for each one. Do not re-grade my work — explain from this state.`;
    setActive('why');
    resetAnswerState();
    ask({ ...context, mode: 'chat', messages: [{ role: 'user', content: q }] });
  };

  const showHint = async () => {
    setHintLoading(true);
    // Re-read the attempt so the hint is always the CURRENT validated state.
    await loadAttempt();
    setHintLoading(false);
    setHintShown(true);
    logCypherEvent({ event: 'hint_viewed', lesson_id: lesson.id, mission_id: missionId });
  };

  const objectives = attemptView?.objectives || [];
  const passedCount = objectives.filter((o) => o.passed).length;
  const nextOpen = objectives.find((o) => !o.passed);
  const completed = attemptView?.attempt?.status === 'completed';

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-56">
          <CypherViewer voiceRef={voiceRef} />
          <p className="mt-1 text-center text-caption text-ink-2">Cipher — your AI tutor</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body text-ink-1">
            Hi, I’m Cipher. I can explain this lesson, show an example, or put
            it more simply — and when you’re ready, I’ll walk you into the
            mission with you.
          </p>

          <label className="mt-3 flex items-center gap-2 text-small text-ink-2">
            Explain at
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              aria-label="Explanation difficulty level"
              className="rounded-control border border-black/10 bg-white px-2 py-1.5 text-small font-semibold text-ink-1"
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>{l.label} level</option>
              ))}
            </select>
          </label>

          {tutorEnabled ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => runMode('explain')} disabled={loading} className={pillClass}>
                  <Sparkles size={15} className="text-action" /> Explain this concept
                </button>
                <button type="button" onClick={() => runMode('example')} disabled={loading} className={pillClass}>
                  <Sparkles size={15} className="text-action" /> Give me an example
                </button>
                <button type="button" onClick={() => runMode('simplify')} disabled={loading} className={pillClass}>
                  <Sparkles size={15} className="text-action" /> Explain it more simply
                </button>
                {loading && (
                  <button type="button" onClick={() => { stoppedRef.current = true; stop(); }} className={pillClass} aria-label="Stop the tutor">
                    <Square size={13} className="fill-current" /> Stop
                  </button>
                )}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => { e.preventDefault(); askQuestion(); }}
              >
                <label htmlFor="cypher-question" className="sr-only">Ask Cipher a question</label>
                <input
                  id="cypher-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask Cipher a question about this lesson…"
                  className="min-w-0 flex-1 rounded-control border border-black/10 bg-white px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-3"
                />
                <button type="submit" disabled={loading || !question.trim()} className={pillClass} aria-label="Ask Cipher">
                  <Send size={15} className="text-action" /> Ask
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-3 text-small text-ink-2">
              The AI tutor isn’t available on this server right now — the mission
              section below still works.
            </p>
          )}

          {active && (
            <div className="animate-rise mt-3 rounded-control border border-violet-700/20 bg-violet-50 p-3.5 text-sm leading-relaxed text-ink-1" aria-live="polite">
              <p className="mb-1.5 flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.14em] text-action-hover">
                <Sparkles size={12} /> Cipher answers
              </p>
              {error ? (
                <p className="text-danger">{error}</p>
              ) : loading || !text ? (
                <Thinking />
              ) : voice.fallback || showAnswer ? (
                // Voice unavailable or muted: listening can't happen, so the
                // answer is shown as text with the Hear button, as before.
                // Same when the student asked to read it.
                <TutorText text={text} />
              ) : voice.subtitle ? (
                <div className="text-small text-ink-2" aria-live="polite">
                  <span className="font-bold text-action-hover">Cipher:</span>{' '}
                  <TutorText text={voice.subtitle} />
                </div>
              ) : null}
              {text && !loading && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
                      onClick={() => { setSpoken(true); voice.play(text); }}
                      className={pillClass}
                    >
                      <Volume2 size={15} className="text-action" /> Hear Cipher say it
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => voice.play(text)}
                      className={pillClass}
                    >
                      <Volume2 size={15} className="text-action" /> Hear again
                    </button>
                  )}
                  {!voice.fallback && (
                    <button
                      type="button"
                      onClick={() => setShowAnswer((s) => !s)}
                      className={pillClass}
                      aria-expanded={showAnswer}
                    >
                      {showAnswer ? 'Hide answer' : 'Read answer'}
                    </button>
                  )}
                </div>
              )}
              {voice.error && <p className="mt-2 text-small text-danger">{voice.error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-black/10 pt-4">
        <button
          type="button"
          onClick={toggleMission}
          aria-expanded={missionOpen}
          className="flex w-full items-center gap-2 text-left text-heading text-ink-1"
        >
          <ShieldCheck size={18} className="shrink-0 text-action" aria-hidden="true" />
          Operation Broken Shield
          <ChevronDown
            size={16}
            className={`ml-auto shrink-0 transition-transform ${missionOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {missionOpen && (
          <>
        {objectives.length > 0 ? (
          <p className="mt-1 text-small text-ink-2">
            {completed
              ? `Mission complete — ${passedCount}/${objectives.length} objectives. Well done, Agent.`
              : `Your latest attempt: ${passedCount}/${objectives.length} objectives complete.`}
          </p>
        ) : (
          <p className="mt-1 text-small text-ink-2">
            A live incident in the SOC: a guest workstation can reach the DMZ
            server and it shouldn’t. You’ll fix the firewall and file the report.
            In the mission, the terminal is the only place your progress is shown
            — run <code>objectives</code> in the Mission Console to see where you
            stand, and <code>hint</code> when you are stuck.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {practicalHref && (
            <Button to={practicalHref} variant="secondary" size="sm">Show a practical application</Button>
          )}
          <Button
            to={`/missions/${missionId}`}
            variant="primary"
            size="sm"
            onClick={() => logCypherEvent({ event: 'invite_accepted', lesson_id: lesson.id, mission_id: missionId })}
          >
            {missionCtaLabel({ completed, hasAttempt: objectives.length > 0 })}
          </Button>
          {nextOpen && !completed && (
            <button
              type="button"
              onClick={showHint}
              disabled={hintLoading}
              className={pillClass}
            >
              <Lightbulb size={15} className="text-action" /> Hint for the next objective
            </button>
          )}
          {objectives.length > 0 && tutorEnabled && (
            <button type="button" onClick={askWhy} disabled={loading} className={pillClass}>
              <Sparkles size={15} className="text-action" /> Why are these still open?
            </button>
          )}
        </div>
        {hintShown && nextOpen && (
          <div className="mt-3 rounded-control border border-amber-600/30 bg-amber-50 p-3.5 text-sm leading-relaxed text-ink-1" aria-live="polite">
            <p className="font-semibold">Hint — {nextOpen.label || nextOpen.id}</p>
            <p className="mt-1">{nextOpen.message || 'Work through the mission step by step.'}</p>
            <p className="mt-2 text-small text-ink-2">
              This hint comes from your validated mission state — it never changes
              your progress or your score.
            </p>
          </div>
        )}
        {hintShown && !nextOpen && objectives.length > 0 && (
          <p className="mt-3 text-small text-ink-2">Every objective is complete — file the incident report.</p>
        )}
          </>
        )}
      </div>
    </div>
  );
}
