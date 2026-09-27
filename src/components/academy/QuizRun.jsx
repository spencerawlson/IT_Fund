import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Zap, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { gradeCard, recordCombo, XP } from '@/lib/academy';
import RichText from './RichText';
import TutorAssist from './tutor/TutorAssist';

const multiplier = (combo) => (combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1);

/**
 * Multiple-choice run used by both Quiz and Boss modes.
 * lives = null means unlimited. Calls onFinish({ correct, total, livesLost, maxCombo, answered, missed }).
 * `meta` ({ track, topic }) gives the AI tutor context.
 */
export default function QuizRun({ questions, lives = null, color = '#3B82F6', onFinish, meta }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hearts, setHearts] = useState(lives);
  const missed = useRef([]);
  const q = questions[index];

  const choose = useCallback(
    (i) => {
      if (picked !== null || !q) return;
      setPicked(i);
      const right = i === q.correct;
      const nextCombo = right ? combo + 1 : 0;
      gradeCard(q.card.id, right, right ? Math.round(XP.quizCorrect * multiplier(nextCombo)) : 0);
      setCombo(nextCombo);
      if (right) setCorrect((c) => c + 1);
      else missed.current.push(q.card);
      if (nextCombo > maxCombo) {
        setMaxCombo(nextCombo);
        recordCombo(nextCombo);
      }
      if (!right && hearts !== null) setHearts((h) => h - 1);
    },
    [picked, q, combo, maxCombo, hearts]
  );

  const next = useCallback(() => {
    if (picked === null) return;
    const outOfLives = hearts !== null && hearts <= 0;
    if (index + 1 >= questions.length || outOfLives) {
      onFinish({
        correct,
        total: questions.length,
        answered: index + 1,
        livesLost: lives === null ? 0 : lives - hearts,
        maxCombo,
        missed: missed.current,
      });
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  }, [picked, hearts, index, questions.length, correct, lives, maxCombo, onFinish]);

  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      // preventDefault stops a focused button from also firing its own click.
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        choose(n - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, next]);

  if (!q) return null;

  const answeredRight = picked !== null && picked === q.correct;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-300">
              <Zap size={13} /> {combo} combo · x{multiplier(combo)}
            </span>
          )}
          {hearts !== null && (
            <span className="inline-flex items-center gap-0.5" aria-label={`${hearts} lives left`}>
              {Array.from({ length: lives }, (_, i) => (
                <Heart key={i} size={15} className={i < hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-600'} />
              ))}
            </span>
          )}
        </div>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${(index / questions.length) * 100}%`, backgroundColor: color }} />
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold leading-snug text-white sm:text-xl">
          <RichText text={q.card.q} />
        </h3>
        <div className="mt-5 space-y-2.5">
          {q.options.map((opt, i) => {
            let style = 'glass hover:border-white/30';
            if (picked !== null) {
              if (i === q.correct) style = 'border-emerald-500/60 bg-emerald-500/10';
              else if (i === picked) style = 'border-rose-500/60 bg-rose-500/10';
              else style = 'border-white/5 bg-white/[0.01] opacity-60';
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={picked !== null}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm text-slate-100 transition ${style}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-slate-300">
                  {i + 1}
                </span>
                <RichText text={opt} />
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className={`mt-5 rounded-xl border p-4 text-sm ${answeredRight ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-rose-500/30 bg-rose-500/[0.06]'}`}>
            <p className={`flex items-center gap-2 font-semibold ${answeredRight ? 'text-emerald-300' : 'text-rose-300'}`}>
              {answeredRight ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {answeredRight ? `Correct! +${Math.round(XP.quizCorrect * multiplier(combo))} XP` : 'Not quite.'}
            </p>
            {!answeredRight && (
              <p className="mt-1 text-slate-200">
                Answer: <RichText text={q.card.a} className="font-semibold" />
              </p>
            )}
            {q.card.x && (
              <p className="mt-1.5 leading-relaxed text-slate-300">
                <RichText text={q.card.x} />
              </p>
            )}
          </div>
        )}
        {picked !== null && !answeredRight && (
          <TutorAssist
            key={q.card.id}
            actions={[{ mode: 'explain', label: 'Help me understand' }]}
            context={{ ...meta, question: q.card.q, answer: q.card.a, explanation: q.card.x, options: q.options, user_answer: q.options[picked] }}
            className="mt-4"
          />
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={next}
          disabled={picked === null}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ backgroundColor: color }}
        >
          {index + 1 >= questions.length || (hearts !== null && hearts <= 0) ? 'See results' : 'Next'} <ArrowRight size={15} />
        </button>
      </div>
      <p className="mt-2 text-right text-[11px] text-slate-500">Keys: 1-4 to answer, Enter for next</p>
    </div>
  );
}
