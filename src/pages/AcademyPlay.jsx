import React, { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, RotateCcw, Check, X, Sparkles, Lock, SearchX } from 'lucide-react';
import { Button, Card, EmptyState } from '@/components/ui-glass';
import { ACTION } from '@/lib/design/tokens';
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

  const track = trackId ? getTrack(trackId) : null;
  const deck = kind === 'deck' ? getDeck(deckId) : null;
  const tierIndex = track ? track.tiers.findIndex((t) => t.id === (deck ? deck.tierId : tierId)) : -1;
  const tier = tierIndex >= 0 ? track.tiers[tierIndex] : null;
  // One accent everywhere, not the course colour.
  const color = ACTION.action;

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

  const backTo = kind === 'review' || !track ? '/' : `/academy/${track.id}`;
  // Context for the AI tutor.
  const meta = { track: track?.title, topic: deck?.title || (tier ? `${tier.label} boss` : 'Daily review') };
  const title =
    kind === 'review' ? (session?.extra ? 'Extra practice: earlier lessons' : 'Review: earlier lessons') : kind === 'boss' ? `${track?.title}: ${tier?.label} assessment` : deck?.title;

  let body;
  if ((kind !== 'review' && !track) || (kind === 'deck' && !deck) || (kind === 'boss' && !tier)) {
    body = <EmptyState icon={SearchX} title="Not found" text="This quiz may have moved." to="/" action="Back to Home" />;
  } else if (!result && ((kind === 'deck' && !isLessonUnlocked(state, deck.id)) || (kind === 'boss' && !isTierComplete(state, track, tierIndex)))) {
    body = (
      <EmptyState
        icon={Lock}
        title="Not open yet"
        text={kind === 'boss' ? 'The assessment is this module’s final check: pass every lesson in the module first.' : 'Reach this lesson on your path first.'}
        to="/"
        action="Back to Home"
      />
    );
  } else if (result) {
    body = <Results result={result} kind={kind} mode={mode} onRestart={restart} backTo={backTo} meta={meta} />;
  } else if (session.cards && !session.cards.length) {
    body = (
      <EmptyState
        icon={Sparkles}
        title="Nothing to review yet"
        text="Finish your first lesson and its questions will start coming back here."
        to="/"
        action="Back to Home"
      />
    );
  } else if (session.cards) {
    body = <FlashDeck key={round} cards={session.cards} color={color} onDone={onFlashDone} meta={meta} />;
  } else {
    body = <QuizRun key={round} questions={session.questions} lives={kind === 'boss' ? BOSS_LIVES : null} color={color} onFinish={onQuizDone} meta={meta} />;
  }

  const kicker = kind === 'boss' ? 'Module assessment' : kind === 'review' ? 'Review' : mode === 'quiz' ? 'Quiz' : 'Flashcards';
  const toggle = (active) =>
    `rounded-control px-3 py-1.5 text-small font-semibold transition-colors ${active ? 'bg-white/10 text-ink-1' : 'text-ink-2 hover:text-ink-1'}`;

  return (
    <main className="min-h-screen text-ink-1">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        <Button to={backTo} variant="ghost" size="sm" icon={ArrowLeft} className="-ml-3 mb-6">
          {track ? track.title : 'Home'}
        </Button>
        <div className="mb-6">
          <p className="text-small font-semibold text-ink-2">{kicker}</p>
          <h1 className="mt-1 text-title text-ink-1">{title}</h1>
          {deck && (
            <div className="mt-4 inline-flex gap-1 rounded-control border border-white/10 p-1" role="group" aria-label="Mode">
              <Link to="?mode=learn" onClick={restart} aria-current={mode === 'learn' ? 'page' : undefined} className={toggle(mode === 'learn')}>Flashcards</Link>
              <Link to="?mode=quiz" onClick={restart} aria-current={mode === 'quiz' ? 'page' : undefined} className={toggle(mode === 'quiz')}>Quiz</Link>
            </div>
          )}
        </div>
        {body}
      </div>
    </main>
  );
}

function Results({ result, kind, mode, onRestart, backTo, meta }) {
  const pct = result.pct ?? Math.round((result.correct / result.total) * 100);
  const isBoss = kind === 'boss';
  const failed = isBoss && !result.passed;
  const headline = isBoss
    ? result.passed
      ? 'Assessment passed'
      : result.answered < result.total
        ? 'Out of lives'
        : `Not yet: ${BOSS_PASS_PCT}% needed`
    : mode === 'quiz'
      ? 'Quiz complete'
      : 'Session complete';

  return (
    <Card level={2} padding="lg" className="mx-auto max-w-md text-center">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
          failed ? 'border-white/15 bg-white/10 text-ink-1' : 'border-success/40 bg-success/15 text-success'
        }`}
      >
        {failed ? <X size={30} aria-hidden="true" /> : <Check size={32} aria-hidden="true" />}
      </span>
      <h2 className="mt-4 text-heading text-ink-1">{headline}</h2>
      <p className="mt-3 text-title tabular-nums text-ink-1">{pct}%</p>
      <p className="mt-1 text-small text-ink-2">
        {result.correct} / {result.total} {mode === 'quiz' || isBoss ? 'correct' : 'known on first try'}
      </p>
      {result.missed?.length > 0 && (
        <TutorAssist
          actions={[{ mode: 'weakspots', label: 'Analyze my weak spots' }]}
          context={{ ...meta, missed: result.missed.slice(0, 15).map((c) => ({ q: c.q.slice(0, 500), a: c.a.slice(0, 300) })) }}
          className="mt-5 text-left [&>div:first-child]:justify-center"
        />
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" icon={RotateCcw} onClick={onRestart}>{failed ? 'Try again' : 'Go again'}</Button>
        <Button to={backTo} iconAfter={ArrowRight}>Continue</Button>
      </div>
    </Card>
  );
}
