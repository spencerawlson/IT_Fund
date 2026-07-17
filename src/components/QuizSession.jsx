import React, { useState } from 'react';
import { Check, X, ChevronRight, RotateCcw, Trophy } from 'lucide-react';

export default function QuizSession({ module, onComplete }) {
  const questions = module.quiz;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);

  const current = questions[index];

  const handleSelect = (i) => {
    if (showFeedback) return;
    setSelected(i);
    setShowFeedback(true);
    setAnswers([...answers, i]);
  };

  const handleNext = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      setDone(true);
      const score = answers.filter((a, i) => a === questions[i].correct).length;
      onComplete(score, questions.length);
    }
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setShowFeedback(false);
    setAnswers([]);
    setDone(false);
  };

  if (done) {
    const score = answers.filter((a, i) => a === questions[i].correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15">
          <Trophy size={32} className="text-amber-400" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-white">Quiz Complete</h3>
        <p className="mt-2 text-3xl font-bold text-white">
          {score}/{questions.length}
        </p>
        <p className="mt-1 text-sm text-slate-400">{pct}% correct</p>
        <button
          onClick={restart}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <RotateCcw size={15} /> Retry Quiz
        </button>
      </div>
    );
  }

  const isCorrect = selected === current.correct;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="text-blue-400">{answers.filter((a, i) => a === questions[i].correct).length} correct</span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold leading-snug text-white">{current.question}</h3>
        <div className="mt-5 space-y-2.5">
          {current.options.map((opt, i) => {
            const isSel = selected === i;
            const isAnswer = i === current.correct;
            let cls = 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-slate-200';
            if (showFeedback) {
              if (isAnswer) cls = 'border-green-500/40 bg-green-500/10 text-green-300';
              else if (isSel) cls = 'border-red-500/40 bg-red-500/10 text-red-300';
              else cls = 'border-white/5 bg-white/[0.02] text-slate-500';
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showFeedback}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}
              >
                <span>{opt}</span>
                {showFeedback && isAnswer && <Check size={16} className="text-green-400" />}
                {showFeedback && isSel && !isAnswer && <X size={16} className="text-red-400" />}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className={`mt-4 rounded-xl border p-4 text-sm ${isCorrect ? 'border-green-500/30 bg-green-500/[0.07] text-green-300' : 'border-amber-500/30 bg-amber-500/[0.07] text-amber-200'}`}>
            <p className="font-semibold">{isCorrect ? '✓ Correct!' : '✗ Not quite.'}</p>
            <p className="mt-1 text-slate-300">{current.explanation}</p>
          </div>
        )}

        {showFeedback && (
          <button
            onClick={handleNext}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            {index + 1 < questions.length ? 'Next Question' : 'See Results'} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}