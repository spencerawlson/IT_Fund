import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setProgressAdapter,
  scoreExam,
  startPracticeExam,
  answerExamQuestion,
  toggleExamFlag,
  finishPracticeExam,
  clearPracticeExam,
  examHistory,
  EXAM_QUESTION_COUNT,
  EXAM_DURATION_MIN,
  EXAM_PASS_PCT,
  XP,
} from './academy';
import { memoryAdapter } from './progress/storage';
import { CISSP_DOMAINS } from '../data/academy/meta';

// Exam questions are built server-side now (backend/content.py); the client
// only scores them and runs the timed session. Builder/quota/pool coverage
// lives in backend/test_content.py. These tests use hand-built fixtures and
// a mocked fetch so they never touch the network.

/** Deterministic fake exam questions in the server's shape. */
function fakeQuestions(n, domains = [1, 2, 3, 4, 5, 6, 7, 8]) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    domain: domains[i % domains.length],
    card: { id: `c-${i}`, deckId: 'net-osi', trackId: 'cissp', q: `Question ${i}?`, a: `Answer ${i}`, e: `Why ${i}` },
    options: [`Answer ${i}`, `Wrong A ${i}`, `Wrong B ${i}`, `Wrong C ${i}`],
    correct: 0,
  }));
}

function mockFetchExam(questions) {
  const payload = { questions, quotas: {}, shortfalls: [] };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })));
}

let store;
beforeEach(() => {
  store = memoryAdapter();
  setProgressAdapter(store);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('scoreExam', () => {
  const questions = fakeQuestions(20);

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
  it('persists the deadline so a refresh cannot reset the clock', async () => {
    mockFetchExam(fakeQuestions(EXAM_QUESTION_COUNT));
    const exam = await startPracticeExam();
    expect(exam.deadline - exam.startedAt).toBe(EXAM_DURATION_MIN * 60 * 1000);
    expect(exam.questions).toHaveLength(EXAM_QUESTION_COUNT);
    // Simulate a refresh: the adapter still holds the same exam.
    expect(store.load().exam.deadline).toBe(exam.deadline);
  });

  it('records answers and flags, then finishes with history and XP', async () => {
    mockFetchExam(fakeQuestions(EXAM_QUESTION_COUNT));
    const exam = await startPracticeExam();
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

  it('discards an exam without recording an attempt', async () => {
    mockFetchExam(fakeQuestions(EXAM_QUESTION_COUNT));
    await startPracticeExam();
    clearPracticeExam();
    expect(store.load().exam).toBeNull();
    expect(examHistory(store.load())).toEqual([]);
  });

  it('surfaces a failed fetch instead of starting an empty exam', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    await expect(startPracticeExam()).rejects.toMatchObject({ status: 503 });
    expect(store.load()).toBeNull(); // nothing was written: no empty exam exists
  });
});
