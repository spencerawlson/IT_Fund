import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { X, Check, Layers, ArrowRight, History, RotateCcw, Loader2 } from 'lucide-react';
import {
  useAcademy, gradeCard, awardXp, completeLesson, checkDeckMastered, buildQuestions, XP,
  saveLessonProgress, clearLessonProgress,
} from '@/lib/academy';
import { getDeck } from '@/data/academy';
import { getDeckContent, getDeckCards, resolveCards } from '@/lib/content';
import { continueLearning, pastLessonCards, PASS_PCT } from '@/lib/progress/engine';
import { playerHref } from '@/data/catalog';
import { MISSION_FOR_LESSON } from '@/data/missions';
import MissionHandoff from './MissionHandoff';
import RichText from '../RichText';
import { Button, Card, ProgressBar } from '@/components/ui-glass';
import { ACTION } from '@/lib/design/tokens';
import { ChoiceStep, OrderStep, NumericStep, WidgetStep } from './steps';

const STEP_COMPONENTS = { choice: ChoiceStep, order: OrderStep, numeric: NumericStep, widget: WidgetStep };
/** Questions from earlier lessons that open every lesson, so old material keeps coming back. */
const WARMUP_COUNT = 4;

/**
 * A lesson is planned as a list of small descriptors so it can be saved and resumed exactly:
 * w = warm-up card from an earlier lesson, p = puzzle, c = this lesson's card, r = retry of a missed card.
 */
// A lesson bundle: the deck's full cards + puzzles plus every card the plan can
// reference (this lesson's warm-ups and any card ids a saved plan still points
// at), with per-deck distractor pools. Built once per deck in the component.
function planLesson(state, fullDeck, warmupCards) {
  const warmup = warmupCards.map((c) => ({ k: 'w', id: c.id }));
  const questions = buildQuestions(fullDeck.cards, fullDeck.cards, fullDeck.cards.length).map((q) => ({ k: 'c', id: q.card.id }));
  const puzzles = (fullDeck.puzzles || []).map((p) => ({ k: 'p', id: p.id }));
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

function toStep(item, bundle) {
  const { fullDeck, cardsById, cardsByDeck } = bundle;
  if (item.k === 'p') return fullDeck.puzzles.find((p) => p.id === item.id) || null;
  const card = cardsById.get(item.id);
  if (!card) return null; // content changed since this lesson was saved
  const source = getDeck(card.deckId);
  const pool = cardsByDeck.get(card.deckId) || fullDeck.cards;
  const [q] = buildQuestions([card], pool, 1);
  const suffix = { c: '', r: '-review', w: '-warm' }[item.k];
  return { type: 'choice', ...q, id: `${card.id}${suffix}`, review: item.k === 'r', warmup: item.k === 'w', fromDeck: source.title };
}

const toSteps = (plan, bundle) => plan.map((item) => toStep(item, bundle)).filter(Boolean);

function freshSession(state, bundle) {
  const plan = planLesson(state, bundle.fullDeck, bundle.warmupCards);
  return { plan, steps: toSteps(plan, bundle), index: -1, tries: {}, retried: [] };
}

function savedSession(state, bundle) {
  const saved = state.resume;
  if (saved?.deckId !== bundle.fullDeck.id || !saved.plan?.length) return null;
  const steps = toSteps(saved.plan, bundle);
  if (!steps.length || saved.index >= steps.length) return null;
  return { plan: saved.plan, steps, index: -1, resumeAt: saved.index, tries: saved.tries || {}, retried: saved.retried || [] };
}

export default function LessonPlayer({ track, deck }) {
  const state = useAcademy();
  // Card bodies for this lesson: free decks are bundled; premium decks come
  // from the entitled content API. The session is built once the bundle
  // lands (and rebuilt on retry); until then this is a loading state.
  const [bundle, setBundle] = useState(null);
  const [bundleError, setBundleError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [session, setSession] = useState(null);
  useEffect(() => {
    let live = true;
    setBundle(null);
    setBundleError(null);
    setSession(null); // a new deck builds a new session; never reuse the old one
    (async () => {
      try {
        const { cards, puzzles } = await getDeckContent(deck.id);
        const fullDeck = { ...deck, cards, puzzles };
        // Warm-ups for a fresh plan, plus every card id a saved plan still
        // points at (card ids are `<deckId>-<index>`, so the deck is the id
        // minus its trailing `-<index>`).
        const warmupStubs = pastLessonCards(state, deck.id, WARMUP_COUNT);
        const saved = state.resume?.deckId === deck.id ? state.resume.plan || [] : [];
        const savedStubs = saved.filter((i) => i.k !== 'p').map((i) => ({ id: i.id, deckId: i.id.replace(/-\d+$/, '') }));
        const extra = await resolveCards([...warmupStubs, ...savedStubs]);
        const cardsById = new Map(cards.map((c) => [c.id, c]));
        const cardsByDeck = new Map([[deck.id, cards]]);
        for (const c of extra) {
          cardsById.set(c.id, c);
          if (!cardsByDeck.has(c.deckId)) cardsByDeck.set(c.deckId, await getDeckCards(c.deckId));
        }
        const next = { fullDeck, cardsById, cardsByDeck, warmupCards: extra.filter((c) => warmupStubs.some((w) => w.id === c.id)) };
        if (!live) return;
        setBundle(next);
        setSession((prev) => prev ?? (savedSession(state, next) || freshSession(state, next)));
      } catch (err) {
        if (live) setBundleError(err);
      }
    })();
    return () => { live = false; };
    // The plan is fixed when the lesson opens; progress updates must not re-roll it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id, reloadKey]);

  const [done, setDone] = useState(false);
  // One accent everywhere: selections, highlights and buttons use the action colour, not the course colour.
  const color = ACTION.action;

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
    checkDeckMastered(bundle?.fullDeck || deck);
    if (pct >= 80) confetti({ particleCount: 140, spread: 75, origin: { y: 0.65 }, colors: [color, '#ffffff', '#FBBF24'] });
    setDone(true);
  };

  const start = () => setSession((s) => ({ ...s, index: s.resumeAt ?? 0, resumeAt: undefined }));
  const restart = () => {
    clearLessonProgress(deck.id);
    if (!bundle) return;
    setSession({ ...freshSession(state, bundle), index: 0 });
    setDone(false);
  };

  // The session is built together with the bundle (see the effect above), so
  // both are null until the async load lands. Reading the session above this
  // guard crashed the first render ("Cannot destructure property 'steps'").
  if (!bundle || !session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
        {bundleError ? (
          <>
            <p className="text-title font-bold text-ink-1">Couldn’t load this lesson</p>
            <p className="mt-2 text-body text-ink-2">Check your connection and try again.</p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" icon={RotateCcw} onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
              <Button to="/app">Exit lesson</Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 size={28} className="animate-spin text-action" aria-hidden="true" />
            <p className="mt-4 text-body text-ink-2">Loading {deck.title}…</p>
          </>
        )}
      </div>
    );
  }

  // Only reachable once the bundle — and therefore the session — has loaded.
  const { steps, index, tries } = session;

  const step = steps[index];
  const StepComponent = step ? STEP_COMPONENTS[step.type] : null;

  const progress = done ? 100 : index < 0 ? 0 : Math.round((index / steps.length) * 100);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Top bar: exit, progress, position. No site navigation in a lesson. */}
      <header className="sticky top-safe z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 nav-solid mx-auto flex max-w-2xl items-center gap-3 rounded-card px-2 py-2 sm:px-3">
          <Button to="/app" variant="ghost" icon={X} aria-label="Exit lesson (your place is saved)" title="Your place is saved" className="w-10 shrink-0 px-0" />
          <ProgressBar value={progress} label="Lesson progress" showValue={false} className="flex-1" />
          <span className="w-16 shrink-0 text-right text-small tabular-nums text-ink-2">
            {done ? 'Done' : index < 0 ? `${steps.length} steps` : `${index + 1} / ${steps.length}`}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-72 pt-6 sm:px-6 sm:pt-10">
        {done ? (
          <Complete deck={deck} state={state} tries={tries} onRetry={restart} />
        ) : index < 0 ? (
          <Intro deck={deck} track={track} steps={steps} resumeAt={session.resumeAt} onStart={start} onRestart={restart} />
        ) : (
          <div key={step.id} className="animate-rise">
            <StepComponent step={step} color={color} onComplete={onComplete} meta={{ track: track.title, topic: deck.title }} />
          </div>
        )}
      </main>
    </div>
  );
}

/** Fixed bottom action bar, above the safe area. */
function ActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
      <div className="mx-auto flex max-w-2xl gap-2">{children}</div>
    </div>
  );
}

function Intro({ deck, track, steps, resumeAt, onStart, onRestart }) {
  const puzzles = steps.filter((s) => s.type !== 'choice').length;
  const warmups = steps.filter((s) => s.warmup).length;
  const resuming = resumeAt > 0;
  return (
    <div className="animate-rise">
      <p className="text-small font-semibold text-ink-2">{track.title} · {track.tiers.find((t) => t.id === deck.tierId)?.label || deck.tierId}</p>
      <h1 className="mt-1 text-title text-ink-1">{deck.title}</h1>
      <p className="mt-3 text-lesson text-ink-2">{deck.summary}</p>

      <Card level={2} className="mt-4">
        <ul className="space-y-3 text-body text-ink-1">
          <li className="flex gap-3">
            <Check size={18} className="mt-1 shrink-0 text-ink-2" aria-hidden="true" />
            <span>
              {deck.cards.length} questions{puzzles ? ` and ${puzzles} hands-on ${puzzles === 1 ? 'puzzle' : 'puzzles'}` : ''}. Answer
              first, then see why.
            </span>
          </li>
          {warmups > 0 && (
            <li className="flex gap-3">
              <History size={18} className="mt-1 shrink-0 text-ink-2" aria-hidden="true" />
              <span>Opens with {warmups} review {warmups === 1 ? 'question' : 'questions'} from earlier lessons, so nothing fades.</span>
            </li>
          )}
          <li className="flex gap-3">
            <RotateCcw size={18} className="mt-1 shrink-0 text-ink-2" aria-hidden="true" />
            <span>Missed questions come back at the end. Score {PASS_PCT}% on first tries to pass the lesson.</span>
          </li>
        </ul>
        <p className="mt-4 text-small text-ink-2">You can leave at any time; your place is saved.</p>
      </Card>
      {deck.resources.length > 0 && (
        <p className="mt-4 text-small text-ink-2">Based on: {deck.resources.map((r) => r.title).join(' · ')}</p>
      )}

      <ActionBar>
        {resuming && (
          <Button variant="secondary" size="lg" icon={RotateCcw} onClick={onRestart} aria-label="Start over">
            <span className="hidden sm:inline">Start over</span>
          </Button>
        )}
        <Button size="lg" onClick={onStart} autoFocus className="flex-1">
          {resuming ? `Resume at step ${resumeAt + 1} of ${steps.length}` : 'Start lesson'}
        </Button>
      </ActionBar>
    </div>
  );
}

function Complete({ deck, state, tries, onRetry }) {
  const vals = Object.values(tries);
  const pct = vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
  const passed = pct >= PASS_PCT;
  const next = useMemo(() => continueLearning(state)?.lesson || null, [state]);
  const nextHref = next ? playerHref(next) : '/';
  // The mission handoff lives here, at the end of the practice — not on
  // the reading page. Only the one lesson with a mission (net-security)
  // shows it, and only once the practice is passed.
  const missionId = MISSION_FOR_LESSON[deck.id];

  return (
    <div className="animate-pop text-center">
      <span
        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${
          passed ? 'border-success/40 bg-success/15 text-success' : 'border-black/15 bg-black/[0.04] text-ink-1'
        }`}
      >
        {passed ? <Check size={40} aria-hidden="true" /> : <RotateCcw size={34} aria-hidden="true" />}
      </span>
      <h1 className="mt-5 text-title text-ink-1">{passed ? 'Lesson complete' : 'Almost there'}</h1>
      <p className="mt-1 text-body text-ink-2">{deck.title}</p>
      <Card level={2} className="mx-auto mt-6 max-w-sm">
        <p className="text-title tabular-nums text-ink-1">{pct}%</p>
        <p className="text-small text-ink-2">first-try accuracy · {PASS_PCT}% to pass</p>
      </Card>
      <p className="mx-auto mt-5 max-w-sm text-body text-ink-2">
        {!passed
          ? `You need ${PASS_PCT}% to pass this lesson (passing every lesson opens the module assessment). Study the flashcards or go again. Your answers so far already count towards review.`
          : pct >= 80
            ? 'Excellent. These questions will come back on a later review day.'
            : 'Good work. The questions you missed will come back soon in your reviews.'}
      </p>
      {passed && missionId && <MissionHandoff missionId={missionId} lessonId={deck.id} />}
      <ActionBar>
        <Button variant="secondary" size="lg" icon={Layers} to={`/academy/${deck.trackId}/deck/${deck.id}?mode=learn`} aria-label="Flashcards">
          <span className="hidden sm:inline">Flashcards</span>
        </Button>
        {passed ? (
          <Button size="lg" to={nextHref} iconAfter={ArrowRight} className="min-w-0 flex-1">
            {next ? <span className="truncate">Next: <RichText text={next.title} /></span> : 'Back to Home'}
          </Button>
        ) : (
          <Button size="lg" icon={RotateCcw} onClick={onRetry} className="flex-1">Try the lesson again</Button>
        )}
      </ActionBar>
    </div>
  );
}
