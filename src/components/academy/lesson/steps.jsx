import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { shuffle } from '@/lib/academy';
import RichText from '../RichText';
import FeedbackBar, { useAttempts } from './FeedbackBar';
import { WIDGETS, goalMet } from './widgets';

function Prompt({ kicker, children }) {
  return (
    <div className="mb-5 sm:mb-7">
      {kicker && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{kicker}</p>}
      <h2 className="text-[1.35rem] font-bold leading-snug text-white sm:text-3xl">{children}</h2>
    </div>
  );
}

/** Multiple choice built from a flashcard. Wrong picks are eliminated; two misses reveal the answer. */
export function ChoiceStep({ step, color, onComplete, meta }) {
  const { card, options, correct } = step;
  const { status, check, retry, reveal, firstTry } = useAttempts(2);
  const [picked, setPicked] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const locked = status !== 'idle';

  const pick = useCallback((i) => !locked && !eliminated.includes(i) && setPicked(i), [locked, eliminated]);

  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, options.length]);

  const onCheck = () => {
    if (picked !== correct) setEliminated((e) => [...e, picked]);
    check(picked === correct);
  };
  const onRetry = () => {
    setPicked(null);
    retry();
  };

  return (
    <>
      <Prompt kicker={step.review ? 'Let’s try that again' : step.warmup ? `Review · ${step.fromDeck}` : 'Question'}>
        <RichText text={card.q} />
      </Prompt>
      <div className="space-y-2.5 sm:space-y-3">
        {options.map((opt, i) => {
          const isOut = eliminated.includes(i);
          const showRight = (status === 'correct' || status === 'revealed') && i === correct;
          const showWrong = status === 'wrong' && i === picked;
          const selected = picked === i && !showWrong && !showRight;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={locked || isOut}
              className={`glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] text-white transition sm:py-4 sm:text-base ${
                showRight ? 'animate-pop' : ''
              } ${showWrong ? 'animate-shake' : ''} ${isOut && !showWrong ? 'opacity-35 line-through decoration-rose-400/60' : ''} ${!locked && !isOut ? 'active:scale-[0.99]' : ''}`}
              style={
                showRight
                  ? { borderColor: 'rgba(52,211,153,0.8)', background: 'rgba(16,185,129,0.18)' }
                  : showWrong
                    ? { borderColor: 'rgba(251,113,133,0.8)', background: 'rgba(244,63,94,0.16)' }
                    : selected
                      ? { borderColor: color, background: `${color}2e`, boxShadow: `0 0 0 1px ${color}, 0 8px 30px -10px ${color}` }
                      : undefined
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xs font-bold text-slate-300">
                {i + 1}
              </span>
              <RichText text={opt} />
            </button>
          );
        })}
      </div>
      <FeedbackBar
        status={status}
        canCheck={picked !== null}
        onCheck={onCheck}
        onRetry={onRetry}
        onReveal={reveal}
        onContinue={() => onComplete(firstTry)}
        answer={card.a}
        explanation={card.x}
        color={color}
        tutor={{ ...meta, question: card.q, answer: card.a, explanation: card.x, options, user_answer: options[picked ?? eliminated[eliminated.length - 1]] }}
      />
    </>
  );
}

/** Tap items from the bank to build a sequence. Misplaced items bounce back on retry. */
export function OrderStep({ step, color, onComplete, meta }) {
  const { status, check, retry, reveal, firstTry } = useAttempts(3);
  const initialBank = useMemo(() => {
    let s = shuffle(step.items);
    while (s.length > 1 && s.every((v, i) => v === step.items[i])) s = shuffle(step.items);
    return s;
  }, [step.items]);
  const [bank, setBank] = useState(initialBank);
  const [placed, setPlaced] = useState([]);
  const locked = status !== 'idle';
  const shown = status === 'revealed' ? step.items : placed;
  // Indented items mean the puzzle is code: keep whitespace and use a monospace font.
  const codeClass = step.items.some((x) => x.startsWith(' ')) ? 'whitespace-pre font-mono text-sm' : '';

  const place = (item) => {
    if (locked) return;
    setBank((b) => b.filter((x) => x !== item));
    setPlaced((p) => [...p, item]);
  };
  const unplace = (item) => {
    if (locked) return;
    setPlaced((p) => p.filter((x) => x !== item));
    setBank((b) => [...b, item]);
  };
  const onRetry = () => {
    const keep = placed.filter((x, i) => x === step.items[i] && placed.slice(0, i).every((y, j) => y === step.items[j]));
    setPlaced(keep);
    setBank(initialBank.filter((x) => !keep.includes(x)));
    retry();
  };

  return (
    <>
      <Prompt kicker="Put in order">
        <RichText text={step.prompt} />
      </Prompt>
      <ol className="space-y-2">
        {step.items.map((_, i) => {
          const item = shown[i];
          const right = status !== 'idle' && item === step.items[i];
          const wrong = status === 'wrong' && item && item !== step.items[i];
          return (
            <li key={i} className="flex items-center gap-2.5">
              <span className="w-6 shrink-0 text-right text-sm font-bold text-slate-500">{i + 1}</span>
              {item ? (
                <button
                  type="button"
                  onClick={() => unplace(item)}
                  className={`glass flex-1 rounded-2xl px-4 py-3 text-left text-[15px] text-white ${wrong ? 'animate-shake' : 'animate-pop'}`}
                  style={right ? { borderColor: 'rgba(52,211,153,0.8)', background: 'rgba(16,185,129,0.16)' } : wrong ? { borderColor: 'rgba(251,113,133,0.8)', background: 'rgba(244,63,94,0.14)' } : { borderColor: `${color}88` }}
                >
                  <RichText text={item} className={codeClass} />
                </button>
              ) : (
                <div className="h-[50px] flex-1 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]" />
              )}
            </li>
          );
        })}
      </ol>
      {!locked && bank.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tap to place</p>
          <div className="flex flex-wrap gap-2">
            {bank.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => place(item)}
                className="glass glass-hover rounded-2xl px-4 py-2.5 text-left text-sm text-white active:scale-95"
              >
                <RichText text={codeClass ? item.trim() : item} className={codeClass} />
              </button>
            ))}
          </div>
        </div>
      )}
      <FeedbackBar
        status={status}
        canCheck={bank.length === 0}
        onCheck={() => check(placed.every((x, i) => x === step.items[i]))}
        onRetry={onRetry}
        onReveal={reveal}
        onContinue={() => onComplete(firstTry)}
        explanation={step.x}
        color={color}
        tutor={{ ...meta, question: step.prompt, answer: step.items.map((x) => x.trim()).join(' → '), explanation: step.x, user_answer: placed.length ? placed.map((x) => x.trim()).join(' → ') : undefined }}
      />
    </>
  );
}

const parseNumber = (s) => Number(String(s).replace(/[$,%\s]|min/gi, ''));

/** Type a number; tolerance allows rounding. */
export function NumericStep({ step, color, onComplete, meta }) {
  const { status, check, retry, reveal, firstTry } = useAttempts(3);
  const [value, setValue] = useState('');
  const n = parseNumber(value);
  const valid = value.trim() !== '' && Number.isFinite(n);

  return (
    <>
      <Prompt kicker="Work it out">
        <RichText text={step.prompt} />
      </Prompt>
      <div className={`glass flex items-center gap-2 rounded-3xl px-5 py-4 ${status === 'wrong' ? 'animate-shake' : ''}`}
        style={status === 'correct' ? { borderColor: 'rgba(52,211,153,0.8)' } : status === 'wrong' ? { borderColor: 'rgba(251,113,133,0.8)' } : undefined}>
        {step.unit === '$' && <span className="text-2xl font-bold text-slate-400">$</span>}
        <input
          autoFocus
          inputMode="decimal"
          value={value}
          disabled={status === 'correct' || status === 'revealed'}
          onChange={(e) => {
            setValue(e.target.value);
            if (status === 'wrong') retry();
          }}
          placeholder="Your answer"
          aria-label="Your answer"
          className="w-full min-w-0 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-slate-600"
        />
        {step.unit && step.unit !== '$' && <span className="text-xl font-bold text-slate-400">{step.unit}</span>}
      </div>
      <FeedbackBar
        status={status}
        canCheck={valid}
        onCheck={() => check(Math.abs(n - step.answer) <= (step.tolerance || 0))}
        onRetry={retry}
        onReveal={reveal}
        onContinue={() => onComplete(firstTry)}
        answer={`${step.unit === '$' ? '$' : ''}${step.answer.toLocaleString()}${step.unit && step.unit !== '$' ? ` ${step.unit}` : ''}`}
        explanation={step.x}
        color={color}
        tutor={{ ...meta, question: step.prompt, answer: `${step.answer}${step.unit ? ` ${step.unit}` : ''}`, explanation: step.x, user_answer: value || undefined }}
      />
    </>
  );
}

/** Explore an interactive widget until its goal is met. */
export function WidgetStep({ step, color, onComplete, meta }) {
  const { status, check, retry, reveal, firstTry } = useAttempts(3);
  const [value, setValue] = useState(null);
  const Widget = WIDGETS[step.widget];
  const onValue = useCallback((v) => setValue(v), []);

  return (
    <>
      <Prompt kicker="Try it">
        <RichText text={step.prompt} />
      </Prompt>
      <Widget color={color} onValue={onValue} />
      <FeedbackBar
        status={status}
        canCheck={value !== null}
        onCheck={() => check(goalMet(step.widget, step.goal, value))}
        onRetry={retry}
        onReveal={reveal}
        onContinue={() => onComplete(firstTry)}
        answer={step.goal.value !== undefined ? `Target: ${step.goal.value}` : step.goal.prefix !== undefined ? `Target: /${step.goal.prefix}` : 'Change any character in the message.'}
        explanation={step.x}
        color={color}
        tutor={{ ...meta, question: step.prompt, answer: step.goal.value !== undefined ? String(step.goal.value) : step.goal.prefix !== undefined ? `/${step.goal.prefix}` : 'Change any character', explanation: step.x, user_answer: value === null ? undefined : String(value) }}
      />
    </>
  );
}
