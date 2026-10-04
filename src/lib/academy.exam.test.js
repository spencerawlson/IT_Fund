import { describe, it, expect, beforeEach } from 'vitest';
import {
  setProgressAdapter,
  buildPracticeExam,
  scoreExam,
  examDomainQuotas,
  startPracticeExam,
  answerExamQuestion,
  toggleExamFlag,
  finishPracticeExam,
  clearPracticeExam,
  examHistory,
  DECK_DOMAIN,
  EXAM_QUESTION_COUNT,
  EXAM_DURATION_MIN,
  EXAM_PASS_PCT,
  XP,
} from './academy';
import { memoryAdapter } from './progress/storage';
import { CISSP_DOMAINS } from '../data/academy/meta';

let store;
beforeEach(() => {
  store = memoryAdapter();
  setProgressAdapter(store);
});

describe('examDomainQuotas', () => {
  it('sums to the exam length and matches the CISSP weights exactly', () => {
    const quotas = examDomainQuotas(100);
    expect(Object.values(quotas).reduce((s, n) => s + n, 0)).toBe(100);
    for (const d of CISSP_DOMAINS) expect(quotas[d.id]).toBe(d.weight);
  });
});

describe('DECK_DOMAIN', () => {
  it('maps every deck to a valid CISSP domain', () => {
    const ids = Object.values(DECK_DOMAIN);
    expect(ids.length).toBeGreaterThan(60);
    for (const id of ids) expect(id).toBeGreaterThanOrEqual(1);
    for (const id of ids) expect(id).toBeLessThanOrEqual(8);
  });
});

describe('buildPracticeExam', () => {
  it('builds 100 unique questions with exact per-domain quotas', () => {
    const { questions, quotas, shortfalls } = buildPracticeExam();
    expect(questions).toHaveLength(EXAM_QUESTION_COUNT);
    expect(shortfalls).toEqual([]);
    expect(new Set(questions.map((q) => q.id)).size).toBe(EXAM_QUESTION_COUNT);
    const counts = {};
    for (const q of questions) counts[q.domain] = (counts[q.domain] || 0) + 1;
    for (const d of CISSP_DOMAINS) expect(counts[d.id]).toBe(quotas[d.id]);
  });

  it('shuffles option order while keeping the correct answer mapped', () => {
    const { questions } = buildPracticeExam();
    for (const q of questions) {
      expect(q.options).toContain(q.card.a);
      expect(q.options[q.correct]).toBe(q.card.a);
      expect(new Set(q.options).size).toBe(q.options.length); // no duplicate options
    }
  });

  it('fills shortfalls from the global pool when a domain is thin', () => {
    // Force an impossible quota: every domain wants more than it has.
    const { questions, shortfalls } = buildPracticeExam({ count: 4000 });
    expect(questions.length).toBeLessThanOrEqual(4000);
    expect(shortfalls.length).toBeGreaterThan(0);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });
});

describe('scoreExam', () => {
  const { questions } = buildPracticeExam({ count: 20 });

  it('scores a perfect run as 100% and passed', () => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
    const r = scoreExam(questions, answers);
    expect(r.correct).toBe(20);
    expect(r.pct).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.missed).toEqual([]);
  });

  it('scores an empty run as 0% and not passed, all questions missed', () => {
    const r = scoreExam(questions, {});
    expect(r.pct).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.missed).toHaveLength(20);
  });

  it('aggregates per-domain totals and flags below the pass line', () => {
    // Answer only domain-1 questions correctly.
    const answers = {};
    for (const q of questions) if (q.domain === 1) answers[q.id] = q.correct;
    const r = scoreExam(questions, answers);
    for (const d of CISSP_DOMAINS) {
      const pd = r.perDomain[d.id];
      expect(pd.total).toBe(questions.filter((q) => q.domain === d.id).length);
      expect(pd.pct).toBe(pd.total ? Math.round((pd.correct / pd.total) * 100) : 0);
      expect(pd.passed).toBe(pd.pct >= EXAM_PASS_PCT);
    }
    expect(r.missed.every((q) => q.domain !== 1)).toBe(true);
  });
});

describe('practice exam session', () => {
  it('persists the deadline so a refresh cannot reset the clock', () => {
    const exam = startPracticeExam();
    expect(exam.deadline - exam.startedAt).toBe(EXAM_DURATION_MIN * 60 * 1000);
    expect(exam.questions).toHaveLength(EXAM_QUESTION_COUNT);
    // Simulate a refresh: the adapter still holds the same exam.
    expect(store.load().exam.deadline).toBe(exam.deadline);
  });

  it('records answers and flags, then finishes with history and XP', () => {
    const exam = startPracticeExam();
    const first = exam.questions[0];
    answerExamQuestion(first.id, (first.correct + 1) % first.options.length); // wrong on purpose
    toggleExamFlag(first.id);
    for (const q of exam.questions.slice(1)) answerExamQuestion(q.id, q.correct);
    const finished = finishPracticeExam();
    expect(finished.finishedAt).toBeGreaterThan(0);
    expect(finished.result.correct).toBe(EXAM_QUESTION_COUNT - 1);
    expect(finished.result.missed.map((q) => q.id)).toEqual([first.id]);
    const history = examHistory(store.load());
    expect(history).toHaveLength(1);
    expect(history[0].pct).toBe(finished.result.pct);
    expect(history[0].perDomain[1]).toBe(finished.result.perDomain[1].pct);
    expect(store.load().xp).toBe((EXAM_QUESTION_COUNT - 1) * XP.examPerCorrect);
    expect(store.load().exam.finished).toBeUndefined(); // kept for the report, not re-finishable
    expect(finishPracticeExam().finishedAt).toBe(finished.finishedAt); // idempotent
  });

  it('discards an exam without recording an attempt', () => {
    startPracticeExam();
    clearPracticeExam();
    expect(store.load().exam).toBeNull();
    expect(examHistory(store.load())).toEqual([]);
  });
});
