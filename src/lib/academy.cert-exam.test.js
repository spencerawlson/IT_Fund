import { describe, it, expect } from 'vitest';
import { CERT_EXAMS, buildCertPracticeExam, scoreCertExam, certExamDomainQuotas } from '@/lib/academy';

describe('generic cert exams', () => {
  for (const certId of ['aws-saa', 'cysa', 'aws-security']) {
    it(`builds a ${certId} exam with domain quotas`, () => {
      const cfg = CERT_EXAMS[certId];
      expect(cfg).toBeDefined();
      const { questions, quotas, shortfalls } = buildCertPracticeExam(certId);
      expect(questions.length).toBe(cfg.questionCount);
      expect(shortfalls).toEqual([]);
      const total = Object.values(quotas).reduce((s, n) => s + n, 0);
      expect(total).toBe(cfg.questionCount);
      // every question has 4 options and a valid correct index
      for (const q of questions) {
        expect(q.options.length).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
      }
    });

    it(`scores a ${certId} exam`, () => {
      const { questions } = buildCertPracticeExam(certId, { count: 10 });
      const answers = {};
      questions.forEach((q, i) => { answers[q.id] = i % 2 === 0 ? q.correct : (q.correct + 1) % 4; });
      const result = scoreCertExam(certId, questions, answers);
      expect(result.total).toBe(10);
      expect(result.correct).toBe(5);
      expect(result.pct).toBe(50);
    });
  }

  it('throws on unknown cert', () => {
    expect(() => buildCertPracticeExam('nope')).toThrow();
  });
});
