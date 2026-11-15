import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Sparkles, Square } from 'lucide-react';
import { Card } from '@/components/ui-glass';
import CypherFace from '@/components/academy/tutor/CypherFace';
import VoiceWaveform from '@/components/academy/tutor/VoiceWaveform';
import { useTutor, useTutorEnabled, pillClass } from '@/components/academy/tutor/TutorAssist';
import { useCypherVoice, fetchVoiceStatus, warmVoice } from '@/api/voice';
import { streamTutor } from '@/api/tutor';
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

const WARM_UP_MODES = ['explain', 'example', 'simplify'];

// Player time: elapsed / total as m:ss ("1:24 / 3:56"). The total is the
// decoded audio length; when it is unknown the caller shows elapsed
// only — never a made-up total.
export function formatPlayerTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Cypher on the lesson page: the tutor offers assistance through the
// existing server-side AI tutor (no duplicate chatbot). His visual is the
// 2D face (CypherFace) on its dark chip — the six-emotion art Spencer
// sent, resting at Happy here. Three buttons — explain, example,
// simplify — each ask directly for the current lesson context, no typing.
//
// Listen-only: this panel never shows an answer as text, while speaking
// or after — the student hears Cypher, they don't read him. The old
// "Cypher answers" card and "Hear again" are gone. Next to the face,
// the level selector and the preset buttons sit in the right column,
// and under the buttons sits the player: the black neon card (Spencer's
// mockup) — waveform on top, progress bar + time, circular Play / Pause
// / Stop buttons, and a caption saying what they do. The waveform is
// hidden until it talks (nothing before playback starts, frozen while
// paused, gone on stop). The level selector stays where it was; the
// preset buttons sit further down and centred. If voice is unavailable
// or muted the play button is disabled and its caption says why — the
// answer text is never the fallback. The mission lives in the handoff
// at the end of practice, not here: nothing about Operation Broken
// Shield shows in this panel.
//
// Layout (Spencer, 2026-11-15 07:20 EST): the player lives INSIDE the
// section Card's right column, under the preset buttons and next to the
// face — the same black neon card, same size, not bigger; the time
// counter stays. This SUPERSEDES the 05:50 EST "play button not in the
// card" direction that had made the player a standalone sibling below
// the section Card. On mobile the column stacks, so the player sits
// below the presets as before. LessonView renders this component bare.
export default function CypherLessonPanel({ lesson, missionId, lessonText }) {
  const tutorEnabled = useTutorEnabled();
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const { text, loading: tutorLoading, error: tutorError, ask, reset: resetTutor } = useTutor();
  const [level, setLevel] = useState('intermediate');
  // null = the voice status hasn't answered yet; true/false once it has.
  // Only a definitive "not configured" (with the tutor up) disables the
  // panel — a failed status fetch leaves it unknown, not unavailable.
  const [voiceConfigured, setVoiceConfigured] = useState(null);
  const autoPlayedRef = useRef(''); // answer text already spoken by auto-play
  const warmUpKeyRef = useRef(''); // lesson|level already warmed (or warming)
  const warmUpAbortRef = useRef(null); // AbortController of the warm-up in flight
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
  };

  // Listen-first: when an answer finishes arriving, Cypher speaks it —
  // no click needed. The spoken words are never shown as text.
  useEffect(() => {
    if (!text || tutorLoading || tutorError) return;
    if (autoPlayedRef.current === text) return;
    autoPlayedRef.current = text;
    voice.play(text);
  }, [text, tutorLoading, tutorError, voice.play]);

  useEffect(() => {
    if (loggedOpenRef.current) return;
    loggedOpenRef.current = true;
    logCypherEvent({ event: 'panel_opened', lesson_id: lesson.id, mission_id: missionId });
  }, [lesson.id, missionId]);

  // Is Cypher's voice actually set up on this server? Asked once on
  // mount; a "no" disables the play button and the presets with the
  // caption saying why, instead of generating answers nobody can hear.
  useEffect(() => {
    let live = true;
    fetchVoiceStatus().then((s) => {
      if (live) setVoiceConfigured(Boolean(s.configured && s.characters?.cypher));
    });
    return () => { live = false; };
  }, []);

  // Warm-up: when a lesson opens, generate this lesson's three preset
  // answers (explain / example / simplify) for the current level in the
  // background — tutor text, then voice audio — so by the time the
  // student taps a preset it is already cached and plays at once, with
  // no text streaming down the page. Silent and non-blocking: it never
  // touches the panel state, and the student's tap aborts it (see
  // runMode) and falls back to the normal generate-then-play path. It
  // does not run while voice is muted (nobody would hear the audio it
  // spends money making). Only one lesson at a time, and only once per
  // lesson+level: at 30 voice generations an hour, warming the whole
  // catalog (222 lessons x 3 modes x 3 levels) would take days of
  // budget — and the backend checks the rate limit before the cache, so
  // even already-cached audio spends budget. A failed warm-up (rate
  // limit, sign-in, offline) stops quietly after the first failure
  // instead of spending more.
  useEffect(() => {
    if (!tutorEnabled || voiceConfigured !== true || voice.muted) return undefined;
    const key = `${lesson.id}|${level}`;
    if (warmUpKeyRef.current === key) return undefined;
    warmUpAbortRef.current?.abort();
    warmUpKeyRef.current = key;
    const controller = new AbortController();
    warmUpAbortRef.current = controller;
    (async () => {
      for (const mode of WARM_UP_MODES) {
        if (controller.signal.aborted) return;
        try {
          const answer = await streamTutor(
            {
              track: lesson.trackId,
              topic: lesson.title,
              level,
              ...(lessonText ? { lesson_text: lessonText } : {}),
              mode,
              question: presetQuestion(mode, lesson.title, level),
            },
            { signal: controller.signal },
          );
          if (controller.signal.aborted || !answer) continue;
          // Stop on the first failure (rate limit, sign-in, offline):
          // the other modes would fail the same way, and the tap still
          // falls back to the normal generate-then-play path.
          const warmed = await warmVoice(answer);
          if (!warmed) return;
        } catch {
          return;
        }
      }
    })();
    return undefined;
  }, [tutorEnabled, voiceConfigured, voice.muted, lesson.id, lesson.title, level, lessonText]);

  // Leaving the lesson stops the warm-up: the audio it was making is for
  // a lesson nobody is looking at anymore. (A re-render is not an
  // unmount — this effect has no deps, so it only fires when the panel
  // actually goes away.)
  useEffect(() => () => { warmUpAbortRef.current?.abort(); }, []);

  // One of the three explanations, requested directly for this lesson —
  // no input box. The question the mode needs is built from the lesson
  // context (title + level); the student types nothing. Free-form
  // questions belong to Ask the Tutor. The tap wins over the background
  // warm-up: stop warming so the explicit request is the only
  // generation running, and the answer auto-plays when it arrives.
  const runMode = (mode) => {
    warmUpAbortRef.current?.abort();
    resetAnswerState();
    ask({ ...context, mode, question: presetQuestion(mode, lesson.title, level) });
  };

  // ---- playback state machine (Play / Pause / Stop: three states, two buttons) ----
  const generating = tutorLoading || voice.loading;
  const hasExplanation = Boolean(text) && !tutorLoading && !tutorError;
  const isPlaying = voice.playing && !voice.paused && !voice.fallback;
  const isPaused = voice.paused && !voice.fallback;
  // Voice can't be heard: definitively unconfigured, muted, or the last
  // play attempt ended without audio. The play button is disabled and
  // its caption says why — the answer text is never shown instead.
  const voiceBlocked = voiceConfigured === false || voice.muted || voice.fallback;
  const playDisabled = voiceBlocked || generating || (!isPlaying && !isPaused && !hasExplanation);
  const showStop = isPlaying || isPaused || generating;
  const presetDisabled = voiceConfigured === false || voice.muted || tutorLoading;

  // Playback position for the player card: elapsed / total from the
  // voice hook's decoded audio clock. The waveform shows only while
  // audio is playing or paused (hidden before it talks, gone on stop).
  const { elapsed, total } = voice.progress || { elapsed: 0, total: 0 };
  const showWaveform = isPlaying || isPaused;
  const progressPct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  const timeText = total > 0
    ? `${formatPlayerTime(elapsed)} / ${formatPlayerTime(total)}`
    : formatPlayerTime(elapsed);

  // The caption says what the button does, and updates with the state.
  // The current activity wins over the static reasons (a generation in
  // flight, a failed play, or live playback is what the student is
  // looking at right now); the unavailability reasons come next, before
  // the replay/idle lines — the play button is disabled while they hold,
  // so "Tap to hear it again" would be a lie there.
  let caption;
  let captionAction = null;
  if (generating) {
    caption = 'Getting your explanation ready…';
  } else if (voice.error) {
    caption = voice.error;
  } else if (voice.fallback) {
    caption = 'Voice unavailable — check your sound.';
  } else if (isPlaying) {
    caption = 'Playing — tap to pause.';
  } else if (isPaused) {
    caption = 'Paused — tap to continue.';
  } else if (voiceConfigured === false) {
    caption = 'Cypher’s voice isn’t available on this server.';
  } else if (voice.muted) {
    caption = 'Voice is muted.';
    captionAction = { label: 'Unmute', onClick: () => voice.setMuted(false) };
  } else if (hasExplanation) {
    caption = 'Tap to hear it again.';
  } else {
    caption = 'Tap an explanation below to hear Cypher.';
  }

  const onPlayPause = () => {
    if (playDisabled) return;
    if (isPaused) {
      voice.resume();
      return;
    }
    if (isPlaying) {
      voice.pause();
      return;
    }
    if (hasExplanation) voice.play(text);
  };

  // Stop ends whatever is happening and resets to the start: playback
  // stops (position gone — the next play starts from the beginning) or,
  // while an answer is still being made, the generation is cancelled and
  // the partial text cleared so there is nothing half-made to play.
  const onStop = () => {
    if (tutorLoading) resetTutor();
    if (voice.playing || voice.paused || voice.loading) voice.stop();
    autoPlayedRef.current = '';
  };

  return (
    <>
      <Card level={2} padding="sm" className="mb-8">
        <h2 className="text-heading text-ink-1">Cypher</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-56">
          <CypherFace emotion="happy" className="w-full" talking={voice.playing} levelRef={voiceRef} />
          <p className="mt-1 text-center text-caption text-ink-2">Cypher — your AI tutor</p>
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
            /* Presets: further down and centred — the player card sits
               below them, inside this column. */
            <div className="mt-6 flex flex-wrap justify-center gap-2" data-testid="cypher-presets">
              <button type="button" onClick={() => runMode('explain')} disabled={presetDisabled} className={pillClass}>
                <Sparkles size={15} className="text-action" /> Explain this concept
              </button>
              <button type="button" onClick={() => runMode('example')} disabled={presetDisabled} className={pillClass}>
                <Sparkles size={15} className="text-action" /> Give me an example
              </button>
              <button type="button" onClick={() => runMode('simplify')} disabled={presetDisabled} className={pillClass}>
                <Sparkles size={15} className="text-action" /> Explain it more simply
              </button>
            </div>
          ) : (
            <p className="mt-3 text-small text-ink-2">
              The AI tutor isn’t available on this server right now.
            </p>
          )}

          {/* Neon player card (Spencer's mockup): the black card under
              the preset buttons, next to the face — inside the section
              Card's right column (Spencer 2026-11-15: next to the head,
              not below the section). Same size and styling as the
              standalone card it replaces: waveform on top (hidden until
              it talks), then the progress bar, the time, the circular
              buttons, and the caption saying what they do. No download
              button. No answer text anywhere. */}
          {tutorEnabled && (
            <div data-testid="cypher-player-card" className="mt-6 rounded-[2rem] bg-black p-3 sm:p-4">
              <div className="rounded-3xl border border-white/10 bg-[#0B0B0D] px-4 py-5 sm:px-6">
                {showWaveform && (
                  <VoiceWaveform levelRef={voiceRef} active={isPlaying} paused={isPaused} />
                )}
                <div
                  data-testid="cypher-progress"
                  className="mt-4 h-1.5 w-full rounded-full bg-white/15"
                  role="progressbar"
                  aria-label="Playback progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPct)}
                >
                  <div data-testid="cypher-progress-fill" className="relative h-full rounded-full bg-red-500" style={{ width: `${progressPct}%` }}>
                    <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-red-500" />
                  </div>
                </div>
                <p data-testid="cypher-time" className="mt-2 text-left text-small text-white/80">{timeText}</p>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={onPlayPause}
                    disabled={playDisabled}
                    aria-label={isPlaying ? 'Pause Cypher' : isPaused ? 'Resume Cypher' : 'Play Cypher’s explanation'}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black text-white transition hover:border-white/70 disabled:opacity-50"
                  >
                    {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
                  </button>
                  {showStop && (
                    <button
                      type="button"
                      onClick={onStop}
                      aria-label="Stop Cypher"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black text-white transition hover:border-white/70"
                    >
                      <Square size={18} className="fill-current" />
                    </button>
                  )}
                </div>
                <p className="mt-3 text-center text-small text-white/60" aria-live="polite">
                  {caption}
                  {captionAction && (
                    <button
                      type="button"
                      onClick={captionAction.onClick}
                      className="ml-2 font-semibold text-white underline"
                    >
                      {captionAction.label}
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </Card>
    </>
  );
}
