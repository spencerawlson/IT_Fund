import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, MessageCircle, Sparkles, Square, X, Zap } from 'lucide-react';
import CypherFace from '@/components/academy/tutor/CypherFace';
import VoiceWaveform from '@/components/academy/tutor/VoiceWaveform';
import { useTutor, useTutorEnabled } from '@/components/academy/tutor/TutorAssist';
import { useTutorPanel } from '@/components/shell/TutorContext';
import { useOptionalAuth } from '@/lib/AuthContext';
import { useCypherVoice, fetchVoiceStatus, warmVoice } from '@/api/voice';
import { streamTutor } from '@/api/tutor';
import { logCypherEvent } from '@/api/analytics';

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

// The three preset chips (Spencer's 2026-11-16 mockup): the label, the
// tutor mode it sends, and its icon.
const PRESETS = [
  { mode: 'explain', label: 'Explain this concept', icon: Sparkles },
  { mode: 'example', label: 'Give me an example', icon: Lightbulb },
  { mode: 'simplify', label: 'Explain it more simply', icon: Zap },
];

// The follow-up box sends the learner's own words (backend chat turns are
// capped at 1500 chars; a spoken answer to a long essay helps nobody).
const FOLLOW_UP_MAX = 500;

// The question each preset sends: the backend requires a question for
// explain/example/simplify (400 "question is required"), and the mode
// prompts are built around a question about the lesson. The panel builds
// it from the current lesson context (title + level); the student types
// nothing for a preset.
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

// Cypher on the lesson page — the floating "Ask Cypher" panel (Spencer,
// 2026-11-16). It no longer sits in the lesson flow: an "Ask Cypher" pill
// floats bottom-right (above the phone tab bar) and opens Cypher as a panel
// sliding in from the right on a computer, or a sheet sliding up from the
// bottom on a phone, so the lesson starts at the top of the page and stays
// readable while he talks. The header's Ask-the-tutor button opens the
// same panel on a lesson (TutorContext dock), so there is one Cypher.
//
// The panel stays mounted while closed (hidden + inert), so his voice
// keeps playing after you close it: the pill turns into a small "Cypher
// is speaking" player with Stop and his talking face.
//
// Inside: the 2D face (CypherFace) with a Ready / Thinking / Speaking
// badge, the Explanation Depth segmented control, the three preset chips,
// and an "Ask a follow-up" box (backend chat mode, at the chosen depth).
// The player appears only after a preset is tapped — never before:
// while the answer is being made it shows "Getting your explanation
// ready…" + Stop; while Cypher speaks it shows ONLY the waveform + a
// Stop button on its left. No progress bar, no time, no Pause, no Play
// button (Spencer, 2026-11-16 — Stop only; tapping Stop ends playback
// and hides the player, and a preset tap replays from the beginning).
//
// Listen-only, as before: answers are spoken, never shown as text. If
// voice is unavailable or muted the presets are disabled and a note
// under them says why. Asking needs a signed-in learner (the tutor spends
// money and the backend answers 401 otherwise), so signed-out visitors
// see "Sign in to ask Cypher" instead of the controls. Nothing about the
// mission shows here: it lives in the handoff at the end of practice.
export default function CypherLessonPanel({ lesson, missionId, lessonText, furtherReading }) {
  const tutorEnabled = useTutorEnabled();
  const auth = useOptionalAuth();
  // Unknown (no auth context, or not checked yet) counts as signed in, so
  // the panel never flashes a sign-in prompt at a signed-in learner.
  const signedOut = Boolean(auth && auth.authChecked && !auth.isAuthenticated);
  const voiceRef = useRef({ talking: false, level: 0 });
  const voice = useCypherVoice(voiceRef);
  const { text, loading: tutorLoading, error: tutorError, ask, reset: resetTutor } = useTutor();
  const [level, setLevel] = useState('intermediate');
  const [followUp, setFollowUp] = useState('');
  // null = the voice status hasn't answered yet; true/false once it has.
  // Only a definitive "not configured" (with the tutor up) disables the
  // panel — a failed status fetch leaves it unknown, not unavailable.
  const [voiceConfigured, setVoiceConfigured] = useState(null);
  const autoPlayedRef = useRef(''); // answer text already spoken by auto-play
  const warmUpKeyRef = useRef(''); // lesson|level already warmed (or warming)
  const warmUpAbortRef = useRef(null); // AbortController of the warm-up in flight
  const loggedOpenRef = useRef(false);
  const closeBtnRef = useRef(null);
  const dragRef = useRef(null); // { startY, dy } while the phone sheet is dragged
  const [dragY, setDragY] = useState(0);

  // ---- open / close: the app-wide tutor state when the shell provides it
  // (header button + pill share it), else this panel's own state.
  const panel = useTutorPanel();
  const shared = typeof panel.registerDock === 'function';
  const [localOpen, setLocalOpen] = useState(false);
  const open = shared ? panel.open : localOpen;
  const setOpen = shared ? panel.setOpen : setLocalOpen;
  const registerDock = panel.registerDock;
  useEffect(() => (typeof registerDock === 'function' ? registerDock() : undefined), [registerDock]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Escape closes the panel; opening moves focus into it (the shell puts
  // focus back on whatever opened it when it closes).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => closeBtnRef.current?.focus?.(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, close]);

  // panel_opened fires the first time the learner actually opens Cypher
  // (the panel is mounted on every lesson, so mount is not "opened").
  useEffect(() => {
    if (!open || loggedOpenRef.current) return;
    loggedOpenRef.current = true;
    logCypherEvent({ event: 'panel_opened', lesson_id: lesson.id, mission_id: missionId });
  }, [open, lesson.id, missionId]);

  const context = {
    track: lesson.trackId,
    topic: lesson.title,
    level,
    // Grounding: the lesson's own text, so Cypher explains only what this
    // lesson covers. Omitted when the page has no reading body (a
    // practice-only lesson) — the backend then answers as before.
    ...(lessonText ? { lesson_text: lessonText } : {}),
    // Further reading: the lesson page's public links, so the tutor can
    // point at them by topic (never by URL) when the answer touches one.
    ...(furtherReading?.length ? { further_reading: furtherReading } : {}),
  };

  // Listen-first: when an answer finishes arriving, Cypher speaks it —
  // no click needed. The spoken words are never shown as text.
  useEffect(() => {
    if (!text || tutorLoading || tutorError) return;
    if (autoPlayedRef.current === text) return;
    autoPlayedRef.current = text;
    voice.play(text);
  }, [text, tutorLoading, tutorError, voice.play]);

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
  // background — tutor text, then voice audio — so a tap plays at once.
  // Silent and non-blocking; the student's tap aborts it (see runMode).
  // Not while muted or signed out (nobody would hear it / the backend would
  // refuse it), and only once per lesson+level: the voice budget is 30
  // generations an hour and the backend checks the rate limit before the
  // cache. A failed warm-up stops quietly after the first failure.
  useEffect(() => {
    if (!tutorEnabled || signedOut || voiceConfigured !== true || voice.muted) return undefined;
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
              // Same links as the tap path: a warmed answer must be
              // generated under the same prompt, or the tap misses the cache.
              ...(furtherReading?.length ? { further_reading: furtherReading } : {}),
              mode,
              question: presetQuestion(mode, lesson.title, level),
            },
            { signal: controller.signal },
          );
          if (controller.signal.aborted || !answer) continue;
          const warmed = await warmVoice(answer);
          if (!warmed) return;
        } catch {
          return;
        }
      }
    })();
    return undefined;
  }, [tutorEnabled, signedOut, voiceConfigured, voice.muted, lesson.id, lesson.title, level, lessonText, furtherReading]);

  // Leaving the lesson stops the warm-up (this effect only fires on unmount).
  useEffect(() => () => { warmUpAbortRef.current?.abort(); }, []);

  // One of the three explanations, requested directly for this lesson.
  // The tap wins over the background warm-up: stop warming so the explicit
  // request is the only generation running; the answer auto-plays.
  const runMode = (mode) => {
    // Unlock audio inside this tap: the answer plays seconds later, when
    // the tutor's text arrives, and phones block sound that a tap didn't start.
    voice.unlock?.();
    warmUpAbortRef.current?.abort();
    autoPlayedRef.current = '';
    ask({ ...context, mode, question: presetQuestion(mode, lesson.title, level) });
  };

  // A follow-up in the learner's own words: the backend's chat mode (it
  // takes a free-form question; the lesson-panel modes are built around a
  // preset question), told which lesson this is and at which depth.
  const askFollowUp = (e) => {
    e.preventDefault();
    const q = followUp.trim().slice(0, FOLLOW_UP_MAX);
    if (!q || tutorLoading) return;
    voice.unlock?.();
    warmUpAbortRef.current?.abort();
    autoPlayedRef.current = '';
    setFollowUp('');
    ask({
      mode: 'chat',
      track: (lesson.title || lesson.trackId || '').slice(0, 80),
      level,
      messages: [{ role: 'user', content: q }],
    });
  };

  // ---- playback (Stop only — no Pause, Spencer 2026-11-16) ----
  const generating = tutorLoading || voice.loading;
  const isPlaying = voice.playing && !voice.fallback;
  // The player exists only once a preset has been tapped: while the
  // answer is being made, and while Cypher speaks it. Before that there
  // is no player at all — no progress bar, no time, no play button.
  // While speaking it shows ONLY the waveform + the Stop button, the
  // button on the left of the waveform. Stop ends playback and hides
  // the player; a preset tap replays from the beginning.
  const showPlayer = generating || isPlaying;
  const presetDisabled = voiceConfigured === false || voice.muted || tutorLoading;

  const status = generating ? 'thinking' : isPlaying ? 'speaking' : 'ready';

  // Status notes (not the player): why the presets are disabled, or what
  // went wrong with the last ask. They show under the presets, so the
  // learner always sees why — the player itself never explains.
  let statusNote = null;
  let statusAction = null;
  if (tutorError) {
    statusNote = tutorError;
  } else if (voice.error) {
    statusNote = voice.error;
  } else if (voice.fallback) {
    statusNote = 'Voice unavailable — check your sound.';
  } else if (voiceConfigured === false) {
    statusNote = 'Cypher’s voice isn’t available on this server.';
  } else if (voice.muted) {
    statusNote = 'Voice is muted.';
    statusAction = { label: 'Unmute', onClick: () => voice.setMuted(false) };
  }

  // Stop ends whatever is happening and hides the player: playback
  // stops, or a generation in flight is cancelled and its partial text
  // cleared so there is nothing half-made to play. A stopped answer is
  // heard again by tapping a preset — it replays from the beginning.
  const onStop = () => {
    if (tutorLoading || tutorError) resetTutor();
    if (voice.playing || voice.loading) voice.stop();
    autoPlayedRef.current = '';
  };

  // ---- phone sheet: drag the handle down to close ----
  const onDragStart = (e) => {
    dragRef.current = { startY: e.touches[0].clientY, dy: 0 };
  };
  const onDragMove = (e) => {
    if (!dragRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - dragRef.current.startY);
    dragRef.current.dy = dy;
    setDragY(dy);
  };
  const onDragEnd = () => {
    const dy = dragRef.current?.dy || 0;
    dragRef.current = null;
    setDragY(0);
    if (dy > 90) close();
  };

  const statusBadge = {
    ready: { label: 'Ready', cls: 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700', dot: 'bg-emerald-500' },
    thinking: { label: 'Thinking', cls: 'border-amber-600/25 bg-amber-500/10 text-amber-700', dot: 'bg-amber-500 animate-pulse' },
    speaking: { label: 'Speaking', cls: 'border-violet-600/25 bg-violet-500/10 text-violet-700', dot: 'bg-violet-500 animate-pulse' },
  }[status];

  // Mini player on the pill while Cypher talks with the panel closed.
  const miniPlayer = !open && (isPlaying || generating);

  return (
    <>
      {/* ---- The floating pill: "Ask Cypher", or a mini player while he talks ---- */}
      {tutorEnabled && !open && (
        <div
          data-testid="cypher-launcher"
          className="fixed right-4 z-40 flex items-center gap-1 rounded-full border border-black/10 bg-white/95 p-1 pr-1.5 shadow-[0_12px_32px_-10px_rgba(76,29,149,0.45)] backdrop-blur lg:bottom-6 lg:right-6"
          style={{ bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 4.75rem)' }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={miniPlayer ? 'Open Cypher' : 'Ask Cypher'}
            aria-expanded={false}
            className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-small font-semibold text-ink-1"
          >
            <span className="block h-10 w-10 overflow-hidden rounded-full bg-[#0D1B2A]">
              <CypherFace emotion="happy" className="h-full w-full" talking={isPlaying} levelRef={voiceRef} />
            </span>
            {miniPlayer ? (
              <span className="text-ink-2" aria-live="polite">{generating ? 'Cypher is thinking…' : 'Cypher is speaking'}</span>
            ) : (
              <span>Ask Cypher</span>
            )}
          </button>
          {miniPlayer && (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop Cypher"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 text-ink-1"
            >
              <Square size={14} className="fill-current" />
            </button>
          )}
        </div>
      )}

      {/* ---- Phone backdrop: tap outside the sheet to close it ---- */}
      {open && (
        <div aria-hidden="true" onClick={close} className="fixed inset-0 z-[45] bg-slate-950/40 sm:hidden" />
      )}

      {/* ---- The panel: right side on a computer, bottom sheet on a phone.
          Always mounted so the voice survives closing it. ---- */}
      <section
        role="dialog"
        aria-label="Cypher, your AI tutor"
        aria-hidden={!open}
        {...(open ? {} : { inert: '' })}
        data-testid="cypher-panel"
        data-open={open ? 'true' : 'false'}
        className={[
          'fixed z-50 flex flex-col border border-black/10 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out motion-reduce:transition-none',
          // phone: bottom sheet
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl',
          // tablet / computer: panel on the right
          'sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[440px] sm:rounded-3xl',
          open ? 'translate-y-0 sm:translate-x-0' : 'pointer-events-none translate-y-[105%] sm:translate-y-0 sm:translate-x-[110%]',
        ].join(' ')}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        {/* Drag handle (phone) */}
        <div
          className="flex justify-center pt-2.5 sm:hidden"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        {/* Header: name, status badge, close */}
        <div
          className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 pb-3 pt-2 sm:pt-4"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="flex items-center gap-2.5">
            <h2 className="text-heading text-ink-1">Cypher</h2>
            <span data-testid="cypher-status" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold ${statusBadge.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label="Close Cypher"
            className="rounded-full p-2 text-ink-2 transition hover:bg-slate-100 hover:text-ink-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {/* Face + identity */}
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 sm:w-28">
              <CypherFace emotion="happy" className="w-full" talking={voice.playing} levelRef={voiceRef} />
            </div>
            <div className="min-w-0">
              <p className="text-small font-semibold text-ink-1">Cypher — your AI tutor</p>
              <p className="mt-0.5 text-caption text-ink-2">Ask about <span className="font-semibold text-ink-1">{lesson.title}</span>. He explains out loud.</p>
            </div>
          </div>

          {/* Explanation depth: segmented control */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span id="cypher-depth-label" className="text-caption font-semibold uppercase tracking-wider text-ink-2">Explanation depth</span>
            <div role="radiogroup" aria-label="Explanation difficulty level"className="inline-flex rounded-xl border border-black/10 bg-slate-100 p-1">
              {LEVELS.map((l) => {
                const active = level === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-level={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`rounded-lg px-3 py-1.5 text-caption font-semibold transition ${active ? 'bg-white text-ink-1 shadow-sm ring-1 ring-black/10' : 'text-ink-2 hover:text-ink-1'}`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!tutorEnabled ? (
            <p className="mt-5 text-small text-ink-2">The AI tutor isn’t available on this server right now.</p>
          ) : signedOut ? (
            <div data-testid="cypher-signin" className="mt-5 rounded-2xl border border-black/10 bg-slate-50 p-5 text-center">
              <p className="text-small font-semibold text-ink-1">Sign in to ask Cypher</p>
              <p className="mt-1 text-caption text-ink-2">Cypher’s explanations are for signed-in learners.</p>
              <Link to="/signin" className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-action-surface px-4 py-2 text-small font-semibold text-action-surface-ink">
                Sign in <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div className="mt-4 flex flex-wrap gap-2" data-testid="cypher-presets">
                {PRESETS.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => runMode(mode)}
                    disabled={presetDisabled}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-small font-semibold text-ink-1 transition hover:border-action/40 hover:bg-action/5 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Icon size={15} className="text-action" /> {label}
                  </button>
                ))}
              </div>

              {/* Status note (not the player): why the presets are disabled,
                  or what went wrong with the last ask — so the learner
                  always sees why, even with no player on screen. */}
              {statusNote && (
                <p className="mt-3 text-caption text-ink-2" aria-live="polite">
                  {statusNote}
                  {statusAction && (
                    <button type="button" onClick={statusAction.onClick} className="ml-2 font-semibold text-action underline">
                      {statusAction.label}
                    </button>
                  )}
                </p>
              )}

              {/* Player: part of the panel (light surface) — it exists only
                  once a preset has been tapped. While the answer is being
                  made: "Getting your explanation ready…" + Stop. While
                  Cypher speaks: ONLY the waveform + the Stop button, the
                  button on the left of the waveform. No progress bar, no
                  time, no Pause, no Play button. Stop ends playback and
                  hides the player; a preset tap replays from the start.
                  No answer text. */}
              {showPlayer && (
              <div data-testid="cypher-player-card" className="mt-5 rounded-2xl border border-black/10 bg-slate-50 px-4 py-4">
                {isPlaying ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onStop}
                      aria-label="Stop Cypher"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-ink-1 transition hover:border-black/30"
                    >
                      <Square size={14} className="fill-current" />
                    </button>
                    <VoiceWaveform levelRef={voiceRef} active tone="light" className="h-10 min-w-0 flex-1" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-caption text-ink-2" aria-live="polite">Getting your explanation ready…</p>
                    <button
                      type="button"
                      onClick={onStop}
                      aria-label="Stop Cypher"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-ink-1 transition hover:border-black/30"
                    >
                      <Square size={14} className="fill-current" />
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* Follow-up question */}
              <form onSubmit={askFollowUp} data-testid="cypher-follow-up" className="relative mt-5 flex items-center">
                <MessageCircle size={16} className="pointer-events-none absolute left-3.5 text-ink-3" aria-hidden="true" />
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  maxLength={FOLLOW_UP_MAX}
                  placeholder="Ask Cypher a follow-up question…"
                  aria-label="Ask Cypher a follow-up question"
                  className="w-full rounded-xl border border-black/15 bg-white py-3 pl-10 pr-20 text-base text-ink-1 outline-none placeholder:text-ink-3 focus:border-action/50 focus:ring-2 focus:ring-action/15 sm:text-small"
                />
                <button
                  type="submit"
                  disabled={!followUp.trim() || presetDisabled}
                  className="absolute right-1.5 inline-flex items-center gap-1 rounded-lg bg-action-surface px-3 py-1.5 text-caption font-semibold text-action-surface-ink disabled:opacity-50"
                >
                  Ask <ArrowRight size={12} />
                </button>
              </form>
              <p className="mt-2 text-caption text-ink-3">AI can make mistakes. Check important facts against the official exam objectives.</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
