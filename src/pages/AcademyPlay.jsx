import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Trophy, Skull, Sparkles, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useBgTint } from '@/components/academy/LiquidBackground';
import FlashDeck from '@/components/academy/FlashDeck';
import QuizRun from '@/components/academy/QuizRun';
import TutorAssist from '@/components/academy/tutor/TutorAssist';
import { getTrack, getDeck, allCards } from '@/data/academy';
import {
  useAcademy, buildQuestions, dueCards, cardState, recordBoss, checkDeckMastered, bossKey, shuffle, BOSS_PASS_PCT,
} from '@/lib/academy';
import { isLessonUnlocked, isTierComplete, pastLessonCards } from '@/lib/progress/engine';

const LEARN_BATCH = 15;
const QUIZ_LENGTH = 10;
const BOSS_LENGTH = 15;
const BOSS_LIVES = 3;
const REVIEW_BATCH = 30;

// Due cards first, then unseen, then the weakest boxes.
function learnOrder(state, cards) {
  const now = Date.now();
  const rank = (c) => {
    const s = cardState(state, c.id);
    if (s.box > 0 && s.due <= now) return 0;
    if (s.box === 0) return 1;
    return 2 + s.box;
  };
  return shuffle(cards).sort((a, b) => rank(a) - rank(b)).slice(0, LEARN_BATCH);
}

function masteryCheck(cards) {
  new Set(cards.map((c) => c.deckId)).forEach((id) => checkDeckMastered(getDeck(id)));
}

/** kind: 'deck' | 'boss' | 'review' */
export default function AcademyPlay({ kind }) {
  const { trackId, deckId, tierId } = useParams();
  const [params] = useSearchParams();
  const mode = kind === 'deck' ? params.get('mode') || 'learn' : kind === 'boss' ? 'quiz' : 'learn';
  const state = useAcademy();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);
  const xpStart = useRef(state.xp);

  const track = trackId ? getTrack(trackId) : null;
  const deck = kind === 'deck' ? getDeck(deckId) : null;
  const tierIndex = track ? track.tiers.findIndex((t) => t.id === (deck ? deck.tierId : tierId)) : -1;
  const tier = tierIndex >= 0 ? track.tiers[tierIndex] : null;
  const color = track?.color || '#F59E0B';
  useBgTint(color);

  // Build the session once per round; progress updates must not reshuffle it mid-play.
  const session = useMemo(() => {
    if (kind === 'review') {
      const due = shuffle(dueCards(state, allCards)).slice(0, REVIEW_BATCH);
      // Nothing due yet: keep practising earlier lessons, weakest cards first.
      return due.length ? { cards: due } : { cards: shuffle(pastLessonCards(state, null, LEARN_BATCH)), extra: true };
    }
    if (kind === 'boss' && tier) {
      const pool = tier.decks.flatMap((d) => d.cards);
      return { questions: buildQuestions(pool, pool, BOSS_LENGTH) };
    }
    if (deck) {
      return mode === 'quiz' ? { questions: buildQuestions(deck.cards, deck.cards, QUIZ_LENGTH) } : { cards: learnOrder(state, deck.cards) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, deckId, tierId, mode, round]);

  const restart = () => {
    xpStart.current = state.xp;
    setResult(null);
    setRound((r) => r + 1);
  };

  const onFlashDone = useCallback(
    ({ known, total }) => {
      masteryCheck(session.cards);
      setResult({ correct: known, total });
    },
    [session]
  );

  const onQuizDone = useCallback(
    (r) => {
      masteryCheck(session.questions.map((q) => q.card));
      const pct = Math.round((r.correct / r.total) * 100);
      let passed = null;
      if (kind === 'boss') {
        passed = recordBoss(bossKey(track.id, tier.id), pct, r.livesLost);
        if (passed) confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
      }
      setResult({ ...r, pct, passed });
    },
    [session, kind, track, tier]
  );

  const backTo = kind === 'review' || !track ? '/academy' : `/academy/${track.id}`;
  // Context for the AI tutor.
  const meta = { track: track?.title, topic: deck?.title || (tier ? `${tier.label} boss` : 'Daily review') };
  const title =
    kind === 'review' ? (session?.extra ? 'Extra practice: earlier lessons' : 'Review: earlier lessons') : kind === 'boss' ? `${tier?.label} Boss: ${track?.title}` : deck?.title;

  let body;
  if ((kind !== 'review' && !track) || (kind === 'deck' && !deck) || (kind === 'boss' && !tier)) {
    body = <p className="text-center text-slate-300">Not found.</p>;
  } else if (!result && ((kind === 'deck' && !isLessonUnlocked(state, deck.id)) || (kind === 'boss' && !isTierComplete(state, track, tierIndex)))) {
    body = (
      <div className="mx-auto max-w-md glass rounded-2xl p-8 text-center">
        <Lock className="mx-auto text-slate-500" size={32} />
        <p className="mt-3 font-semibold text-white">Not yet: one step at a time</p>
        <p className="mt-1 text-sm text-slate-300">
          {kind === 'boss' ? 'The boss is this tier’s final exam: pass every lesson in the tier first.' : 'Reach this lesson on your path first.'}
        </p>
        <Link to="/academy" className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">Back to your path</Link>
      </div>
    );
  } else if (result) {
    body = <Results result={result} kind={kind} mode={mode} xp={state.xp - xpStart.current} color={color} onRestart={restart} backTo={backTo} meta={meta} />;
  } else if (session.cards && !session.cards.length) {
    body = (
      <div className="mx-auto max-w-md glass rounded-2xl p-8 text-center">
        <Sparkles className="mx-auto text-amber-300" size={32} />
        <p className="mt-3 font-semibold text-white">Nothing to review yet</p>
        <p className="mt-1 text-sm text-slate-300">Finish your first lesson and its questions will start coming back here.</p>
        <Link to="/academy" className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">Back to your path</Link>
      </div>
    );
  } else if (session.cards) {
    body = <FlashDeck key={round} cards={session.cards} color={color} onDone={onFlashDone} meta={meta} />;
  } else {
    body = <QuizRun key={round} questions={session.questions} lives={kind === 'boss' ? BOSS_LIVES : null} color={color} onFinish={onQuizDone} meta={meta} />;
  }

  return (
    <div className="relative isolate min-h-screen text-white">
      <Navbar />
      <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <Link to={backTo} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white">
          <ArrowLeft size={15} /> {track ? track.title : 'Academy'}
        </Link>
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {kind === 'boss' ? 'Boss battle' : kind === 'review' ? 'Spaced repetition' : mode === 'quiz' ? 'Quiz' : 'Learn'}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold">{title}</h1>
          {deck && (
            <div className="mt-2 flex gap-2 text-xs">
              <Link to={`?mode=learn`} onClick={restart} className={`rounded-full px-3 py-1 font-semibold ${mode === 'learn' ? 'bg-white/15 text-white' : 'bg-white/[0.03] text-slate-300 hover:text-white'}`}>Learn</Link>
              <Link to={`?mode=quiz`} onClick={restart} className={`rounded-full px-3 py-1 font-semibold ${mode === 'quiz' ? 'bg-white/15 text-white' : 'bg-white/[0.03] text-slate-300 hover:text-white'}`}>Quiz</Link>
            </div>
          )}
        </div>
        {body}
      </div>
    </div>
  );
}

function Results({ result, kind, mode, xp, color, onRestart, backTo, meta }) {
  const pct = result.pct ?? Math.round((result.correct / result.total) * 100);
  const isBoss = kind === 'boss';
  const Icon = isBoss && !result.passed ? Skull : Trophy;
  const headline = isBoss
    ? result.passed
      ? 'Boss defeated!'
      : result.answered < result.total
        ? 'Out of hearts!'
        : `Not quite: ${BOSS_PASS_PCT}% needed`
    : mode === 'quiz'
      ? 'Quiz complete'
      : 'Session complete';

  return (
    <div className="mx-auto max-w-md glass rounded-2xl p-8 text-center">
      <Icon size={40} className={`mx-auto ${isBoss && !result.passed ? 'text-rose-400' : 'text-amber-300'}`} />
      <h2 className="mt-3 text-xl font-bold text-white">{headline}</h2>
      <p className="mt-4 text-5xl font-bold" style={{ color }}>{pct}%</p>
      <p className="mt-1 text-sm text-slate-300">
        {result.correct} / {result.total} {mode === 'quiz' || isBoss ? 'correct' : 'known on first try'}
      </p>
      <div className="mt-4 flex justify-center gap-2 text-xs">
        <span className="rounded-full bg-amber-400/15 px-3 py-1 font-semibold text-amber-300">+{xp} XP</span>
        {result.maxCombo > 1 && <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">Best combo {result.maxCombo}</span>}
      </div>
      {result.missed?.length > 0 && (
        <TutorAssist
          actions={[{ mode: 'weakspots', label: 'Analyze my weak spots' }]}
          context={{ ...meta, missed: result.missed.slice(0, 15).map((c) => ({ q: c.q.slice(0, 500), a: c.a.slice(0, 300) })) }}
          className="mt-5 text-left [&>div:first-child]:justify-center"
        />
      )}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={onRestart} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
          <RotateCcw size={15} /> {isBoss && !result.passed ? 'Try again' : 'Play again'}
        </button>
        <Link to={backTo} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: color }}>
          Continue
        </Link>
      </div>
    </div>
  );
}
