import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { X, Flame, Sparkles, Trophy, Layers, ArrowRight, Puzzle, BookOpen } from 'lucide-react';
import {
  useAcademy, gradeCard, awardXp, completeLesson, checkDeckMastered, buildQuestions, liveStreak, XP,
} from '@/lib/academy';
import { nextLessonInTrack } from '@/lib/academyPath';
import RichText from '../RichText';
import { ChoiceStep, OrderStep, NumericStep, WidgetStep } from './steps';

const STEP_COMPONENTS = { choice: ChoiceStep, order: OrderStep, numeric: NumericStep, widget: WidgetStep };

/** Intro, then the deck's questions with its hands-on puzzles spread through them (the first one opens as a hook). */
function buildSteps(deck) {
  const questions = buildQuestions(deck.cards, deck.cards, deck.cards.length).map((q) => ({ type: 'choice', id: q.card.id, ...q }));
  const puzzles = deck.puzzles || [];
  const steps = [];
  const gap = puzzles.length > 1 ? Math.max(2, Math.floor(questions.length / puzzles.length)) : 0;
  let p = 0;
  questions.forEach((q, i) => {
    if (p < puzzles.length && (i === 0 || (gap && i % gap === 0))) steps.push(puzzles[p++]);
    steps.push(q);
  });
  while (p < puzzles.length) steps.push(puzzles[p++]);
  return steps;
}

export default function LessonPlayer({ track, deck }) {
  const state = useAcademy();
  const [steps, setSteps] = useState(() => buildSteps(deck));
  const [index, setIndex] = useState(-1); // -1 = intro screen
  const [firstTries, setFirstTries] = useState({});
  const [done, setDone] = useState(false);
  const xpStart = useRef(state.xp);
  const retried = useRef(new Set());
  const color = track.color;

  const step = steps[index];
  const StepComponent = step ? STEP_COMPONENTS[step.type] : null;

  const onComplete = (firstTry) => {
    if (step.type === 'choice') {
      gradeCard(step.card.id, firstTry, step.review ? (firstTry ? 5 : 0) : firstTry ? XP.quizCorrect : 0);
    } else {
      awardXp(firstTry ? XP.puzzleSolved : 5);
    }
    let nextSteps = steps;
    if (!step.review) {
      setFirstTries((f) => ({ ...f, [step.id]: firstTry }));
      // A missed question comes back once at the end, Brilliant/Duolingo style.
      if (!firstTry && step.type === 'choice' && !retried.current.has(step.id)) {
        retried.current.add(step.id);
        nextSteps = [...steps, { ...step, review: true, id: `${step.id}-review` }];
        setSteps(nextSteps);
      }
    }
    if (index + 1 >= nextSteps.length) finish({ ...firstTries, ...(step.review ? {} : { [step.id]: firstTry }) });
    else setIndex(index + 1);
  };

  const finish = (tries) => {
    const vals = Object.values(tries);
    const pct = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
    completeLesson(deck.id, pct);
    checkDeckMastered(deck);
    if (pct >= 80) confetti({ particleCount: 140, spread: 75, origin: { y: 0.65 }, colors: [color, '#ffffff', '#FBBF24'] });
    setDone(true);
  };

  const progress = done ? 100 : index < 0 ? 0 : Math.round((index / steps.length) * 100);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass mx-auto flex max-w-2xl items-center gap-3 rounded-full px-3 py-2 sm:px-4">
          <Link to={`/academy/${track.id}`} aria-label="Exit lesson" className="rounded-full p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
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
          <Complete track={track} deck={deck} state={state} tries={firstTries} xp={state.xp - xpStart.current} color={color} />
        ) : index < 0 ? (
          <Intro deck={deck} track={track} steps={steps} color={color} onStart={() => setIndex(0)} />
        ) : (
          <div key={step.id} className="animate-rise">
            <StepComponent step={step} color={color} onComplete={onComplete} meta={{ track: track.title, topic: deck.title }} />
          </div>
        )}
      </main>
    </div>
  );
}

function Intro({ deck, track, steps, color, onStart }) {
  const puzzles = steps.filter((s) => s.type !== 'choice').length;
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
      <p className="mt-5 text-sm leading-relaxed text-slate-400">
        Learn by doing: answer first, then see why. There's no penalty for mistakes; missed questions come back at the end.
      </p>
      {deck.resources.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">Based on: {deck.resources.map((r) => r.title).join(' · ')}</p>
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
        <div className="mx-auto max-w-2xl">
          <button type="button" onClick={onStart} autoFocus className="glass-btn w-full rounded-2xl py-4 text-base font-bold" style={{ '--tint': color }}>
            Start lesson
          </button>
        </div>
      </div>
    </div>
  );
}

function Complete({ track, deck, state, tries, xp, color }) {
  const vals = Object.values(tries);
  const pct = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
  const next = useMemo(() => nextLessonInTrack(state, track), [state, track]);
  const nextHref = next ? `/academy/${track.id}/lesson/${next.id}` : `/academy/${track.id}`;

  return (
    <div className="animate-pop text-center">
      <div className="glass mx-auto flex h-24 w-24 items-center justify-center rounded-full" style={{ boxShadow: `0 0 60px -10px ${color}` }}>
        <Trophy size={44} className="text-amber-300" />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-white">Lesson complete!</h1>
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
        {pct >= 80 ? 'Excellent. These cards will come back on a later review day.' : 'Good work. The cards you missed will come back soon in Daily Review.'}
      </p>
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Link to={`/academy/${track.id}/deck/${deck.id}?mode=learn`} className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold text-white">
            <Layers size={16} /> <span className="hidden sm:inline">Flashcards</span>
          </Link>
          <Link to={nextHref} className="glass-btn inline-flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold" style={{ '--tint': color }}>
            {next ? <>Next: <RichText text={next.title} className="max-w-[55vw] truncate" /></> : 'Back to path'} <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
