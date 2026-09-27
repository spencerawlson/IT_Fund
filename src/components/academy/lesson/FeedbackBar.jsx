import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import RichText from '../RichText';
import TutorAssist from '../tutor/TutorAssist';

/**
 * Attempt tracking shared by every step: `check(isRight)` moves idle -> correct | wrong,
 * and after `maxTries` misses to revealed. `firstTry` is what feeds spaced repetition.
 */
export function useAttempts(maxTries = 2) {
  const [status, setStatus] = useState('idle');
  const [tries, setTries] = useState(0);
  const check = useCallback(
    (isRight) => {
      if (isRight) return setStatus('correct');
      const n = tries + 1;
      setTries(n);
      setStatus(n >= maxTries ? 'revealed' : 'wrong');
    },
    [tries, maxTries]
  );
  return { status, tries, check, retry: () => setStatus('idle'), reveal: () => setStatus('revealed'), firstTry: status === 'correct' && tries === 0 };
}

const PRAISE = ['Nice!', 'Correct!', 'Spot on!', 'Exactly!', 'You got it!'];

/**
 * Bottom sheet with the primary action; Enter triggers it. `tutor` is the study context for
 * the AI tutor: a Hint before checking, an explanation after.
 */
export default function FeedbackBar({ status, canCheck, onCheck, onRetry, onReveal, onContinue, answer, explanation, color, tutor }) {
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);

  const primary = useCallback(() => {
    if (status === 'idle' && canCheck) onCheck();
    else if (status === 'wrong') onRetry();
    else if (status === 'correct' || status === 'revealed') onContinue();
  }, [status, canCheck, onCheck, onRetry, onContinue]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      primary();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [primary]);

  const tone =
    status === 'correct' ? 'border-emerald-400/40' : status === 'wrong' ? 'border-rose-400/40' : status === 'revealed' ? 'border-amber-300/40' : 'border-white/10';
  const label = status === 'idle' ? 'Check' : status === 'wrong' ? 'Try again' : 'Continue';
  const tint = status === 'correct' ? '#10B981' : status === 'wrong' ? '#F43F5E' : color;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:px-6">
      <div className={`glass-strong mx-auto max-w-2xl rounded-3xl border p-4 sm:p-5 ${tone} ${status !== 'idle' ? 'animate-rise' : ''}`}>
        {status !== 'idle' && (
          <div className="mb-3 max-h-[34vh] overflow-y-auto">
            {status === 'correct' && (
              <p className="flex items-center gap-2 text-base font-bold text-emerald-300"><CheckCircle2 size={20} /> {praise}</p>
            )}
            {status === 'wrong' && (
              <p className="flex items-center gap-2 text-base font-bold text-rose-300"><XCircle size={20} /> Not quite. Give it another go.</p>
            )}
            {status === 'revealed' && (
              <>
                <p className="flex items-center gap-2 text-base font-bold text-amber-200"><Lightbulb size={20} /> Here’s the answer</p>
                {answer && <p className="mt-1 text-sm font-semibold text-white"><RichText text={answer} /></p>}
              </>
            )}
            {explanation && status !== 'wrong' && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                <span className="font-semibold text-white">Why: </span>
                <RichText text={explanation} />
              </p>
            )}
          </div>
        )}
        {tutor && (
          <TutorAssist
            key={status === 'idle' ? 'before' : 'after'}
            actions={status === 'idle' ? [{ mode: 'hint', label: 'Hint' }] : [{ mode: 'explain', label: status === 'correct' ? 'Explain more' : 'Help me understand' }]}
            context={tutor}
            className="mb-3"
            answerClassName="max-h-[26vh] overflow-y-auto"
          />
        )}
        <div className="flex gap-2">
          {status === 'wrong' && onReveal && (
            <button type="button" onClick={onReveal} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Show answer
            </button>
          )}
          <button
            type="button"
            onClick={primary}
            disabled={status === 'idle' && !canCheck}
            className="glass-btn flex-1 rounded-2xl py-3.5 text-base font-bold"
            style={{ '--tint': tint }}
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
