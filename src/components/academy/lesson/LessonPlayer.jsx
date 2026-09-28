import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { X, Flame, Sparkles, Trophy, Layers, ArrowRight, Puzzle, BookOpen, History, RotateCcw } from 'lucide-react';
import {
  useAcademy, gradeCard, awardXp, completeLesson, checkDeckMastered, buildQuestions, liveStreak, XP,
  saveLessonProgress, clearLessonProgress,
} from '@/lib/academy';
import { allCards, getDeck } from '@/data/academy';
import { continueLearning, pastLessonCards, PASS_PCT } from '@/lib/progress/engine';
import { playerHref } from '@/data/catalog';
import RichText from '../RichText';
import { ChoiceStep, OrderStep, NumericStep, WidgetStep } from './steps';

const STEP_COMPONENTS = { choice: ChoiceStep, order: OrderStep, numeric: NumericStep, widget: WidgetStep };
const CARDS = new Map(allCards.map((c) => [c.id, c]));
/** Questions from earlier lessons that open every lesson, so old material keeps coming back. */
const WARMUP_COUNT = 4;

/**
 * A lesson is planned as a list of small descriptors so it can be saved and resumed exactly:
 * w = warm-up card from an earlier lesson, p = puzzle, c = this lesson's card, r = retry of a missed card.
 */
function planLesson(state, deck) {
  const warmup = pastLessonCards(state, deck.id, WARMUP_COUNT).map((c) => ({ k: 'w', id: c.id }));
  const questions = buildQuestions(deck.cards, deck.cards, deck.cards.length).map((q) => ({ k: 'c', id: q.card.id }));
  const puzzles = (deck.puzzles || []).map((p) => ({ k: 'p', id: p.id }));
  // The deck's hands-on puzzles are spread through its questions (the first one opens as a hook).
  const plan = [...warmup];
  const gap = puzzles.length > 1 ? Math.max(2, Math.floor(questions.length / puzzles.length)) : 0;
  let p = 0;
  questions.forEach((q, i) => {
    if (p < puzzles.length && (i === 0 || (gap && i % gap === 0))) plan.push(puzzles[p++]);
    plan.push(q);
  });
  while (p < puzzles.length) plan.push(puzzles[p++]);
  return plan;
}

function toStep(item, deck) {
  if (item.k === 'p') return deck.puzzles.find((p) => p.id === item.id) || null;
  const card = CARDS.get(item.id);
  if (!card) return null; // content changed since this lesson was saved
  const source = getDeck(card.deckId);
  const [q] = buildQuestions([card], source.cards, 1);
  const suffix = { c: '', r: '-review', w: '-warm' }[item.k];
  return { type: 'choice', ...q, id: `${card.id}${suffix}`, review: item.k === 'r', warmup: item.k === 'w', fromDeck: source.title };
}

const toSteps = (plan, deck) => plan.map((item) => toStep(item, deck)).filter(Boolean);

function freshSession(state, deck) {
  const plan = planLesson(state, deck);
  return { plan, steps: toSteps(plan, deck), index: -1, tries: {}, retried: [] };
}

function savedSession(state, deck) {
  const saved = state.resume;
  if (saved?.deckId !== deck.id || !saved.plan?.length) return null;
  const steps = toSteps(saved.plan, deck);
  if (!steps.length || saved.index >= steps.length) return null;
  return { plan: saved.plan, steps, index: -1, resumeAt: saved.index, tries: saved.tries || {}, retried: saved.retried || [] };
}

export default function LessonPlayer({ track, deck }) {
  const state = useAcademy();
  const [session, setSession] = useState(() => savedSession(state, deck) || freshSession(state, deck));
  const [done, setDone] = useState(false);
  const xpStart = useRef(state.xp);
  const color = track.color;
  const { steps, index, tries } = session;

  const step = steps[index];
  const StepComponent = step ? STEP_COMPONENTS[step.type] : null;

  const onComplete = (firstTry) => {
    if (step.type === 'choice') {
      const xp = step.warmup ? (firstTry ? XP.flashKnown : XP.flashAgain) : step.review ? (firstTry ? 5 : 0) : firstTry ? XP.quizCorrect : 0;
      gradeCard(step.card.id, firstTry, xp);
    } else {
      awardXp(firstTry ? XP.puzzleSolved : 5);
    }
    let { plan, steps: nextSteps, tries: nextTries, retried } = session;
    // Only this lesson's own questions and puzzles count towards its score.
    if (!step.review && !step.warmup) {
      nextTries = { ...nextTries, [step.id]: firstTry };
      // A missed question comes back once at the end, Brilliant/Duolingo style.
      if (!firstTry && step.type === 'choice' && !retried.includes(step.id)) {
        retried = [...retried, step.id];
        plan = [...plan, { k: 'r', id: step.card.id }];
        nextSteps = [...nextSteps, { ...step, review: true, id: `${step.id}-review` }];
      }
    }
    if (index + 1 >= nextSteps.length) {
      finish(nextTries);
      setSession({ ...session, plan, steps: nextSteps, tries: nextTries, retried });
      return;
    }
    setSession({ ...session, plan, steps: nextSteps, tries: nextTries, retried, index: index + 1 });
    saveLessonProgress({ deckId: deck.id, plan, index: index + 1, tries: nextTries, retried });
  };

  const finish = (finalTries) => {
    const vals = Object.values(finalTries);
    const pct = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
    clearLessonProgress(deck.id);
    completeLesson(deck.id, pct);
    checkDeckMastered(deck);
    if (pct >= 80) confetti({ particleCount: 140, spread: 75, origin: { y: 0.65 }, colors: [color, '#ffffff', '#FBBF24'] });
    setDone(true);
  };

  const start = () => setSession((s) => ({ ...s, index: s.resumeAt ?? 0, resumeAt: undefined }));
  const restart = () => {
    clearLessonProgress(deck.id);
    setSession({ ...freshSession(state, deck), index: 0 });
    setDone(false);
    xpStart.current = state.xp;
  };

  const progress = done ? 100 : index < 0 ? 0 : Math.round((index / steps.length) * 100);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass mx-auto flex max-w-2xl items-center gap-3 rounded-full px-3 py-2 sm:px-4">
          <Link to="/academy" aria-label="Exit lesson" title="Your place is saved" className="rounded-full p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
            <X size={20} />
          </Link>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, #ffffffcc)`, boxShadow: `0 0 12px ${color}` }}
            />
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-300">
            <Flame size={16} /> {liveStreak(state)}
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-72 pt-6 sm:px-6 sm:pt-10">
        {done ? (
          <Complete deck={deck} state={state} tries={tries} xp={state.xp - xpStart.current} color={color} onRetry={restart} />
        ) : index < 0 ? (
          <Intro deck={deck} track={track} steps={steps} color={color} resumeAt={session.resumeAt} onStart={start} onRestart={restart} />
        ) : (
          <div key={step.id} className="animate-rise">
            <StepComponent step={step} color={color} onComplete={onComplete} meta={{ track: track.title, topic: deck.title }} />
          </div>
        )}
      </main>
    </div>
  );
}

function Intro({ deck, track, steps, color, resumeAt, onStart, onRestart }) {
  const puzzles = steps.filter((s) => s.type !== 'choice').length;
  const warmups = steps.filter((s) => s.warmup).length;
  const resuming = resumeAt > 0;
  return (
    <div className="animate-rise">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{track.title} · {deck.tierId}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">{deck.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">{deck.summary}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <BookOpen size={18} style={{ color }} />
          <p className="mt-2 text-2xl font-bold text-white">{deck.cards.length}</p>
          <p className="text-xs text-slate-400">questions</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <Puzzle size={18} style={{ color }} />
          <p className="mt-2 text-2xl font-bold text-white">{puzzles}</p>
          <p className="text-xs text-slate-400">hands-on puzzles</p>
        </div>
      </div>
      {warmups > 0 && (
        <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-slate-300">
          <History size={16} className="mt-0.5 shrink-0" style={{ color }} />
          Opens with {warmups} review {warmups === 1 ? 'question' : 'questions'} from your earlier lessons, so nothing fades.
        </p>
      )}
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Learn by doing: answer first, then see why. Missed questions come back at the end. Score {PASS_PCT}% on first tries to
        unlock the next lesson. You can leave at any time; your place is saved.
      </p>
      {deck.resources.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">Based on: {deck.resources.map((r) => r.title).join(' · ')}</p>
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
        <div className="mx-auto flex max-w-2xl gap-2">
          {resuming && (
            <button type="button" onClick={onRestart} className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold text-white">
              <RotateCcw size={16} /> <span className="hidden sm:inline">Start over</span>
            </button>
          )}
          <button type="button" onClick={onStart} autoFocus className="glass-btn flex-1 rounded-2xl py-4 text-base font-bold" style={{ '--tint': color }}>
            {resuming ? `Resume at step ${resumeAt + 1} of ${steps.length}` : 'Start lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Complete({ deck, state, tries, xp, color, onRetry }) {
  const vals = Object.values(tries);
  const pct = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
  const passed = pct >= PASS_PCT;
  const next = useMemo(() => continueLearning(state)?.lesson || null, [state]);
  const nextHref = next ? playerHref(next) : '/academy';

  return (
    <div className="animate-pop text-center">
      <div className="glass mx-auto flex h-24 w-24 items-center justify-center rounded-full" style={{ boxShadow: `0 0 60px -10px ${color}` }}>
        <Trophy size={44} className="text-amber-300" />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-white">{passed ? 'Lesson complete!' : 'Almost there'}</h1>
      <p className="mt-1 text-slate-300">{deck.title}</p>
      <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-3xl font-bold" style={{ color }}>{pct}%</p>
          <p className="text-xs text-slate-400">first-try accuracy</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="inline-flex items-center gap-1 text-3xl font-bold text-amber-300"><Sparkles size={20} />{xp}</p>
          <p className="text-xs text-slate-400">XP earned</p>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-sm text-sm text-slate-400">
        {!passed
          ? `You need ${PASS_PCT}% to unlock the next lesson. Study the flashcards or go again. Your answers so far already count towards review.`
          : pct >= 80
            ? 'Excellent. These cards will come back on a later review day.'
            : 'Good work. The cards you missed will come back soon in your reviews.'}
      </p>
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Link to={`/academy/${deck.trackId}/deck/${deck.id}?mode=learn`} className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold text-white">
            <Layers size={16} /> <span className="hidden sm:inline">Flashcards</span>
          </Link>
          {passed ? (
            <Link to={nextHref} className="glass-btn inline-flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold" style={{ '--tint': color }}>
              {next ? <>Next: <RichText text={next.title} className="max-w-[55vw] truncate" /></> : 'Back to your path'} <ArrowRight size={18} />
            </Link>
          ) : (
            <button type="button" onClick={onRetry} className="glass-btn inline-flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold" style={{ '--tint': color }}>
              <RotateCcw size={18} /> Try the lesson again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
