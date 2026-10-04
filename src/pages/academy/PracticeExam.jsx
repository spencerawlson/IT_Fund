import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, Award, Check, ChevronLeft, ChevronRight, Clock, Flag,
  Home, ListChecks, Play, RotateCcw, TriangleAlert, X,
} from 'lucide-react';
import { Button, Card, ProgressBar, EmptyState } from '@/components/ui-glass';
import { CISSP_DOMAINS } from '@/data/academy/meta';
import {
  useAcademy, startPracticeExam, answerExamQuestion, toggleExamFlag, setExamIndex,
  finishPracticeExam, clearPracticeExam, examHistory,
  EXAM_QUESTION_COUNT, EXAM_DURATION_MIN, EXAM_PASS_PCT,
} from '@/lib/academy';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const domainById = Object.fromEntries(CISSP_DOMAINS.map((d) => [d.id, d]));

function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function PracticeExam() {
  const state = useAcademy();
  useDocumentTitle('Practice Exam · Road to CISSP');
  const exam = state.exam;

  return (
    <main className="min-h-screen text-ink-1">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        {!exam && <StartScreen history={examHistory(state)} />}
        {exam && !exam.finishedAt && <RunningExam key={exam.id} exam={exam} />}
        {exam && exam.finishedAt && <ReportScreen exam={exam} />}
      </div>
    </main>
  );
}

// -------------------------------------------------------------------------------------------------
// Start screen
// -------------------------------------------------------------------------------------------------

function StartScreen({ history }) {
  const recent = history.slice(0, 3);
  return (
    <div>
      <Button to="/" variant="ghost" size="sm" icon={ArrowLeft} className="-ml-3 mb-6">Home</Button>
      <p className="text-small font-semibold text-ink-2">Test-day simulator</p>
      <h1 className="mt-1 text-title text-ink-1">CISSP practice exam</h1>

      <Card level={2} padding="lg" className="mt-6">
        <ul className="space-y-3 text-body text-ink-1">
          <li className="flex gap-3"><ListChecks size={18} className="mt-1 shrink-0 text-action" aria-hidden="true" />{EXAM_QUESTION_COUNT} questions, sampled from every track and weighted by the official CISSP domain weights.</li>
          <li className="flex gap-3"><Clock size={18} className="mt-1 shrink-0 text-action" aria-hidden="true" />{EXAM_DURATION_MIN / 60} hours on the clock. The timer survives a refresh — closing the tab does not buy you time.</li>
          <li className="flex gap-3"><Award size={18} className="mt-1 shrink-0 text-action" aria-hidden="true" />{EXAM_PASS_PCT}% proficiency to pass, with a per-domain breakdown so you know exactly what to study next.</li>
        </ul>
        <div className="mt-6">
          <Button size="lg" icon={Play} onClick={() => startPracticeExam()} className="w-full sm:w-auto">Start the exam</Button>
        </div>
        <p className="mt-3 text-small text-ink-2">One sitting. Flag questions to revisit them before you finish.</p>
      </Card>

      <h2 className="mt-10 text-heading text-ink-1">Previous attempts</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-body text-ink-2">No attempts yet. Your last three will appear here.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {recent.map((a) => (
            <li key={a.id}>
              <Card level={1} padding="md" className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-body font-semibold text-ink-1 tabular-nums">{a.pct}%</p>
                  <p className="text-small text-ink-2">{new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {a.correct}/{a.total}</p>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-small font-semibold',
                  a.passed ? 'border-success/40 bg-success/15 text-success' : 'border-white/15 bg-white/5 text-ink-2',
                )}>
                  {a.passed ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                  {a.passed ? 'Passed' : 'Not yet'}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Running exam
// -------------------------------------------------------------------------------------------------

const ANNOUNCE_AT_MIN = [30, 10, 5];

function RunningExam({ exam }) {
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const [announce, setAnnounce] = useState('');
  const announcedRef = useRef(new Set());
  const finishedRef = useRef(false);

  const remaining = exam.deadline - now;
  const q = exam.questions[exam.index];
  const answeredCount = Object.keys(exam.answers).length;
  const flagged = exam.flagged.includes(q.id);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Time's up: auto-submit once.
  useEffect(() => {
    if (!finishedRef.current && exam.deadline - Date.now() <= 0) {
      finishedRef.current = true;
      finishPracticeExam();
    }
  }, [now, exam.deadline]);

  // Screen-reader time warnings only — not every second.
  useEffect(() => {
    for (const m of ANNOUNCE_AT_MIN) {
      if (remaining <= m * 60 * 1000 && remaining > 0 && !announcedRef.current.has(m)) {
        announcedRef.current.add(m);
        setAnnounce(`${m} minutes remaining in the exam.`);
      }
    }
  }, [remaining]);

  const go = (i) => {
    setConfirming(false);
    setExamIndex(Math.max(0, Math.min(exam.questions.length - 1, i)));
    window.scrollTo({ top: 0 });
  };

  const urgent = remaining <= 10 * 60 * 1000;

  return (
    <div>
      <div aria-live="polite" className="sr-only">{announce}</div>

      {/* Sticky exam chrome: progress, timer, flag, finish. */}
      <div className="sticky top-0 z-10 -mx-4 bg-[var(--bg-base)]/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-semibold text-ink-2 tabular-nums">
            Question {exam.index + 1} <span className="text-ink-3">of {exam.questions.length}</span>
          </p>
          <p className={cn('flex items-center gap-1.5 text-small font-semibold tabular-nums', urgent ? 'text-danger' : 'text-ink-1')}>
            <Clock size={14} aria-hidden="true" />
            <span aria-label={`${Math.ceil(remaining / 60000)} minutes remaining`}>{fmtClock(remaining)}</span>
          </p>
        </div>
        <ProgressBar className="mt-2" value={((exam.index + 1) / exam.questions.length) * 100} label="Exam progress" showValue={false} size="sm" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => toggleExamFlag(q.id)}
            aria-pressed={flagged}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-small font-semibold transition-colors',
              flagged ? 'bg-warning/15 text-warning' : 'text-ink-2 hover:bg-white/5 hover:text-ink-1',
            )}
          >
            <Flag size={14} aria-hidden="true" />{flagged ? 'Flagged' : 'Flag for review'}
          </button>
          <p className="text-small text-ink-2 tabular-nums">{answeredCount} answered</p>
          {confirming ? (
            <span className="inline-flex items-center gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-control px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-ink-1">Keep going</button>
              <Button size="sm" variant="secondary" onClick={() => finishPracticeExam()}>Submit exam</Button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-control px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-danger">
              Finish early
            </button>
          )}
        </div>
      </div>

      {/* Question card */}
      <Card level={2} padding="lg" className="mt-4">
        <p className="text-caption font-semibold uppercase tracking-wider" style={{ color: domainById[q.domain].color }}>
          Domain {q.domain} · {domainById[q.domain].title}
        </p>
        <h2 className="mt-2 text-heading text-ink-1">{q.card.q}</h2>

        <fieldset className="mt-5">
          <legend className="sr-only">Answer choices for question {exam.index + 1}</legend>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const selected = exam.answers[q.id] === i;
              return (
                <label
                  key={i}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3 text-body transition-colors',
                    selected
                      ? 'border-action/60 bg-action/10 text-ink-1'
                      : 'glass-2 border-white/10 text-ink-1 hover:border-white/30',
                  )}
                >
                  <input
                    type="radio"
                    name={`exam-q-${q.id}`}
                    checked={selected}
                    onChange={() => answerExamQuestion(q.id, i)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#7C3AED]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {/* Prev / next */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="secondary" icon={ChevronLeft} disabled={exam.index === 0} onClick={() => go(exam.index - 1)}>Previous</Button>
        {exam.index < exam.questions.length - 1 ? (
          <Button iconAfter={ChevronRight} onClick={() => go(exam.index + 1)}>Next</Button>
        ) : (
          <Button onClick={() => setConfirming(true)}>Review & finish</Button>
        )}
      </div>

      {/* Question navigator */}
      <details className="group mt-6">
        <summary className="cursor-pointer list-none text-small font-semibold text-ink-2 hover:text-ink-1">
          Question navigator <span className="text-ink-3">({answeredCount}/{exam.questions.length} answered{exam.flagged.length > 0 && `, ${exam.flagged.length} flagged`})</span>
        </summary>
        <div className="mt-3 grid grid-cols-10 gap-1.5 sm:grid-cols-20" role="group" aria-label="Jump to a question">
          {exam.questions.map((qq, i) => {
            const answered = exam.answers[qq.id] !== undefined;
            const isFlagged = exam.flagged.includes(qq.id);
            return (
              <button
                key={qq.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${answered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged' : ''}${i === exam.index ? ', current' : ''}`}
                aria-current={i === exam.index ? 'true' : undefined}
                className={cn(
                  'flex h-8 items-center justify-center rounded text-caption font-semibold tabular-nums transition-colors',
                  i === exam.index
                    ? 'bg-action text-action-ink'
                    : answered
                      ? 'bg-white/10 text-ink-1 hover:bg-white/15'
                      : 'bg-white/5 text-ink-3 hover:bg-white/10',
                  isFlagged && i !== exam.index && 'ring-1 ring-warning/70',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </details>

      <button type="button" onClick={() => { if (window.confirm('Abandon this exam? Your answers will not be recorded.')) clearPracticeExam(); }} className="mt-8 text-small text-ink-3 hover:text-ink-2">
        Abandon exam (nothing is recorded)
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Report
// -------------------------------------------------------------------------------------------------

function ReportScreen({ exam }) {
  const { result } = exam;
  const fired = useRef(false);

  useEffect(() => {
    if (result.passed && !fired.current) {
      fired.current = true;
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
    }
  }, [result.passed]);

  return (
    <div>
      <p className="text-small font-semibold text-ink-2">Exam report</p>
      <h1 className="mt-1 text-title text-ink-1">{result.passed ? 'You passed' : 'Not yet — keep going'}</h1>

      <Card level={2} padding="lg" className="mt-6 text-center">
        <span className={cn(
          'mx-auto flex h-16 w-16 items-center justify-center rounded-full border',
          result.passed ? 'border-success/40 bg-success/15 text-success' : 'border-white/15 bg-white/10 text-ink-1',
        )}>
          {result.passed ? <Check size={32} aria-hidden="true" /> : <X size={30} aria-hidden="true" />}
        </span>
        <p className="mt-4 text-title tabular-nums text-ink-1">{result.pct}%</p>
        <p className="mt-1 text-small text-ink-2">{result.correct} / {result.total} correct · {EXAM_PASS_PCT}% needed to pass</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button icon={RotateCcw} onClick={() => startPracticeExam()}>Retake exam</Button>
          <Button to="/" variant="secondary" icon={Home}>Back to home</Button>
        </div>
      </Card>

      <h2 className="mt-10 text-heading text-ink-1">Per-domain breakdown</h2>
      <Card level={2} padding="md" className="mt-4">
        <ul className="divide-y divide-white/[0.06]">
          {CISSP_DOMAINS.map((d) => {
            const pd = result.perDomain[d.id];
            return (
              <li key={d.id} className="px-2 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 text-body font-semibold text-ink-1">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                    <span className="tabular-nums text-ink-2">{d.id}.</span> {d.title}
                  </p>
                  <p className="flex shrink-0 items-center gap-1.5 text-small tabular-nums text-ink-2">
                    {!pd.passed && <TriangleAlert size={14} className="text-warning" aria-label="Below target" />}
                    {pd.pct}% <span className="text-ink-3">({pd.correct}/{pd.total})</span>
                  </p>
                </div>
                <ProgressBar className="mt-2" value={pd.pct} label={`Domain ${d.id}: ${d.title}`} showValue={false} size="sm" />
              </li>
            );
          })}
        </ul>
      </Card>

      {result.missed.length > 0 && (
        <section aria-labelledby="missed-heading" className="mt-10">
          <h2 id="missed-heading" className="text-heading text-ink-1">Review missed questions ({result.missed.length})</h2>
          <ul className="mt-4 space-y-3">
            {result.missed.map((mq) => {
              const chosen = exam.answers[mq.id];
              return (
                <li key={mq.id}>
                  <Card level={1} padding="md">
                    <p className="text-caption font-semibold uppercase tracking-wider" style={{ color: domainById[mq.domain].color }}>
                      Domain {mq.domain} · {domainById[mq.domain].title}
                    </p>
                    <p className="mt-1 text-body font-semibold text-ink-1">{mq.card.q}</p>
                    <p className="mt-2 text-small text-ink-2">
                      Your answer: <span className="text-danger">{chosen === undefined ? 'Not answered' : mq.options[chosen]}</span>
                    </p>
                    <p className="mt-1 text-small text-ink-2">
                      Correct: <span className="font-semibold text-success">{mq.options[mq.correct]}</span>
                    </p>
                    {mq.card.x && <p className="mt-2 text-small leading-relaxed text-ink-1">{mq.card.x}</p>}
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.missed.length === 0 && (
        <EmptyState icon={Award} title="Flawless run" text="Every single question correct. The real exam should feel familiar." />
      )}
    </div>
  );
}
