import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CERT_EXAMS,
  scoreCertExam,
  startCertPracticeExam,
  answerCertExamQuestion,
  finishCertPracticeExam,
  clearCertPracticeExam,
  certExamHistory,
  setProgressAdapter,
} from '@/lib/academy';
import { memoryAdapter } from './progress/storage';

// Exam questions are built server-side now (backend/content.py); the client
// only scores them and runs the timed session. Builder/quota/pool coverage
// lives in backend/test_content.py. These tests use hand-built fixtures and
// a mocked fetch so they never touch the network.

function fakeQuestions(n, domains = [1, 2, 3, 4]) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    domain: domains[i % domains.length],
    card: { id: `c-${i}`, deckId: 'aws-saa-concepts', trackId: 'aws-saa', q: `Question ${i}?`, a: `Answer ${i}`, e: `Why ${i}` },
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

describe('generic cert exams', () => {
  for (const certId of ['aws-saa', 'cysa', 'aws-security']) {
    it(`scores a ${certId} exam`, () => {
      const questions = fakeQuestions(10);
      const answers = {};
      questions.forEach((q, i) => { answers[q.id] = i % 2 === 0 ? q.correct : (q.correct + 1) % 4; });
      const result = scoreCertExam(certId, questions, answers);
      expect(result.total).toBe(10);
      expect(result.correct).toBe(5);
      expect(result.pct).toBe(50);
    });

    it(`starts and finishes a ${certId} exam session from the API`, async () => {
      const cfg = CERT_EXAMS[certId];
      mockFetchExam(fakeQuestions(cfg.questionCount));
      const exam = await startCertPracticeExam(certId);
      expect(exam.questions).toHaveLength(cfg.questionCount);
      expect(exam.questions[0].options).toHaveLength(4);
      answerCertExamQuestion(certId, exam.questions[0].id, exam.questions[0].correct);
      const finished = finishCertPracticeExam(certId);
      expect(finished.result.total).toBe(cfg.questionCount);
      expect(finished.result.correct).toBe(1);
      expect(certExamHistory(store.load(), certId)).toHaveLength(1);
      clearCertPracticeExam(certId);
      expect(certExamHistory(store.load(), certId)).toHaveLength(1); // history survives the clear
    });
  }

  it('throws on unknown cert', async () => {
    await expect(startCertPracticeExam('nope')).rejects.toThrow();
  });
});
