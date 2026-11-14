import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Square, Volume2 } from 'lucide-react';
import CypherViewer from '@/components/three/CypherCharacter';
import { useTutor, useTutorEnabled, TutorText, Thinking, pillClass } from '@/components/academy/tutor/TutorAssist';
import { useCypherVoice } from '@/api/voice';
import { logCypherEvent } from '@/api/analytics';

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

// The question each button sends: the backend requires a question for
// explain/example/simplify (400 "question is required"), and the mode
// prompts are built around a question about the lesson. There is no input
// box anymore — the panel builds the question itself from the current
// lesson context (title + level) and sends it with the mode. The student
// types nothing; free-form questions belong to Ask the Tutor.
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
// assistance through the existing server-side AI tutor (no duplicate
// chatbot). Three buttons — explain, example, simplify — each ask directly
// for the current lesson context, no typing. Answers are listen-first and
// voice-only: Cypher speaks each answer as soon as it arrives, with no
// subtitle paragraph while he talks; when voice is unavailable or muted the
// full text is shown directly instead. The mission lives in the handoff at
// the end of practice, not here: nothing about Operation Broken Shield
// shows in this panel.
export default function CypherLessonPanel({ lesson, missionId, lessonText }) {
  const tutorEnabled = useTutorEnabled();
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const { text, loading, error, ask, stop } = useTutor();
  const [level, setLevel] = useState('intermediate');
  const [active, setActive] = useState(null); // which ask is showing
  // Listen-first + voice-only: Cypher speaks each answer as soon as it
  // arrives — the student listens, they don't read. No subtitle paragraph
  // while he talks; when voice is unavailable or muted the answer text is
  // shown directly instead (voice.fallback). "Hear again" replays once he
  // finishes.
  const [spoken, setSpoken] = useState(false); // this answer has been spoken at least once
  const autoPlayedRef = useRef(''); // answer text already spoken by auto-play
  const stoppedRef = useRef(false); // the student stopped the tutor mid-answer
  const loggedOpenRef = useRef(false);

  const context = {
    track: lesson.trackId,
    topic: lesson.title,
    level,
    // Grounding: the lesson's own text, so Cypher explains only what this
    // lesson covers. Omitted when the page has no reading body (a
    // practice-only lesson) — the backend then answers as before.
    ...(lessonText ? { lesson_text: lessonText } : {}),
  };

  // A new question resets the listen-first state for the next answer.
  const resetAnswerState = () => {
    autoPlayedRef.current = '';
    stoppedRef.current = false;
    setSpoken(false);
  };

  // Listen-first: when an answer finishes arriving, Cypher speaks it —
  // no "Hear Cipher say it" click needed. Voice-only: the spoken words
  // are NOT shown as subtitles while he talks. If the student stopped the
  // tutor mid-answer, the partial text is not auto-played — they can hear
  // it with "Hear Cipher say it".
  useEffect(() => {
    if (!text || loading || error || stoppedRef.current) return;
    if (autoPlayedRef.current === text) return;
    autoPlayedRef.current = text;
    setSpoken(true);
    voice.play(text);
  }, [text, loading, error, voice.play]);

  useEffect(() => {
    if (loggedOpenRef.current) return;
    loggedOpenRef.current = true;
    logCypherEvent({ event: 'panel_opened', lesson_id: lesson.id, mission_id: missionId });
  }, [lesson.id, missionId]);

  // One of the three explanations, requested directly for this lesson —
  // no input box. The question the mode needs is built from the lesson
  // context (title + level); the student types nothing. Free-form
  // questions belong to Ask the Tutor.
  const runMode = (mode) => {
    setActive(mode);
    resetAnswerState();
    ask({ ...context, mode, question: presetQuestion(mode, lesson.title, level) });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-56">
          <CypherViewer voiceRef={voiceRef} />
          <p className="mt-1 text-center text-caption text-ink-2">Cipher — your AI tutor</p>
        </div>
        <div className="min-w-0 flex-1">
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
            </div>
          ) : (
            <p className="mt-3 text-small text-ink-2">
              The AI tutor isn’t available on this server right now.
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
              ) : voice.fallback ? (
                // Voice unavailable or muted: listening can't happen, so the
                // answer is shown as text directly, with the Hear button.
                <TutorText text={text} />
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
                </div>
              )}
              {voice.error && <p className="mt-2 text-small text-danger">{voice.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
