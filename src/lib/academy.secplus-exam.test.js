import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setProgressAdapter,
  scoreSecplusExam,
  startSecplusPracticeExam,
  answerSecplusExamQuestion,
  toggleSecplusExamFlag,
  setSecplusExamIndex,
  finishSecplusPracticeExam,
  clearSecplusPracticeExam,
  secplusExamHistory,
  SECPLUS_EXAM_QUESTION_COUNT,
  SECPLUS_EXAM_DURATION_MIN,
  SECPLUS_EXAM_PASS_PCT,
  // CISSP scorer must keep working untouched:
  scoreExam,
} from './academy';
import { memoryAdapter } from './progress/storage';
import { SECURITY_PLUS_DOMAINS } from '../data/academy/meta';

// Exam questions are built server-side now (backend/content.py); the client
// only scores them and runs the timed session. Builder/quota/pool coverage
// lives in backend/test_content.py. These tests use hand-built fixtures and
// a mocked fetch so they never touch the network.

function fakeQuestions(n, domains = [1, 2, 3, 4, 5]) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    domain: domains[i % domains.length],
    card: { id: `c-${i}`, deckId: 'cy-concepts', trackId: 'security', q: `Question ${i}?`, a: `Answer ${i}`, e: `Why ${i}` },
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

describe('SECURITY_PLUS_DOMAINS', () => {
  it('weights sum to 100 and match the SY0-701 outline', () => {
    expect(SECURITY_PLUS_DOMAINS.reduce((s, d) => s + d.weight, 0)).toBe(100);
    expect(SECURITY_PLUS_DOMAINS.map((d) => [d.id, d.weight])).toEqual([
      [1, 12],
      [2, 22],
      [3, 18],
      [4, 28],
      [5, 20],
    ]);
  });
});

describe('scoreSecplusExam', () => {
  it('grades a perfect paper as a pass at 83% threshold', () => {
    const questions = fakeQuestions(20);
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
    const result = scoreSecplusExam(questions, answers);
    expect(result.total).toBe(20);
    expect(result.correct).toBe(20);
    expect(result.pct).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.missed).toEqual([]);
  });

  it('grades an empty paper as a fail', () => {
    const questions = fakeQuestions(20);
    const result = scoreSecplusExam(questions, {});
    expect(result.correct).toBe(0);
    expect(result.pct).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.missed).toHaveLength(20);
  });

  it('applies the 83% pass threshold, not the CISSP 70%', () => {
    const questions = fakeQuestions(100);
    // answer 75 correctly -> 75% -> passes CISSP, fails Security+
    const answers = {};
    questions.forEach((q, i) => {
      answers[q.id] = i < 75 ? q.correct : (q.correct + 1) % 4;
    });
    const secplus = scoreSecplusExam(questions, answers);
    expect(secplus.pct).toBe(75);
    expect(secplus.passed).toBe(false);
    const cissp = scoreExam(questions, answers);
    expect(cissp.passed).toBe(true);
  });
});

describe('Security+ exam session', () => {
  it('starts, answers, flags, and finishes independently of the CISSP exam', async () => {
    mockFetchExam(fakeQuestions(SECPLUS_EXAM_QUESTION_COUNT));
    const exam = await startSecplusPracticeExam();
    expect(exam.id).toMatch(/^secplus-exam-/);
    expect(exam.questions).toHaveLength(SECPLUS_EXAM_QUESTION_COUNT);
    expect(exam.deadline - exam.startedAt).toBe(SECPLUS_EXAM_DURATION_MIN * 60 * 1000);

    const q0 = exam.questions[0];
    answerSecplusExamQuestion(q0.id, q0.correct);
    toggleSecplusExamFlag(exam.questions[1].id);
    setSecplusExamIndex(5);

    const finished = finishSecplusPracticeExam();
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.result.total).toBe(SECPLUS_EXAM_QUESTION_COUNT);
    expect(finished.result.correct).toBe(1);

    const history = secplusExamHistory(store.load());
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(exam.id);
  });

  it('clears without recording', async () => {
    mockFetchExam(fakeQuestions(SECPLUS_EXAM_QUESTION_COUNT));
    await startSecplusPracticeExam();
    clearSecplusPracticeExam();
    expect(secplusExamHistory(store.load())).toHaveLength(0);
  });
});
