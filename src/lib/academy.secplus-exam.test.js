import { describe, it, expect, beforeEach } from 'vitest';
import {
  setProgressAdapter,
  buildSecplusPracticeExam,
  scoreSecplusExam,
  secplusExamDomainQuotas,
  startSecplusPracticeExam,
  answerSecplusExamQuestion,
  toggleSecplusExamFlag,
  setSecplusExamIndex,
  finishSecplusPracticeExam,
  clearSecplusPracticeExam,
  secplusExamHistory,
  SECPLUS_DECK_DOMAIN,
  SECPLUS_EXAM_QUESTION_COUNT,
  SECPLUS_EXAM_DURATION_MIN,
  SECPLUS_EXAM_PASS_PCT,
  // CISSP engine must keep working untouched:
  buildPracticeExam,
  scoreExam,
  examDomainQuotas,
  EXAM_QUESTION_COUNT,
} from './academy';
import { memoryAdapter } from './progress/storage';
import { SECURITY_PLUS_DOMAINS } from '../data/academy/meta';

let store;
beforeEach(() => {
  store = memoryAdapter();
  setProgressAdapter(store);
});

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

describe('secplusExamDomainQuotas', () => {
  it('sums to 90 and approximates the SY0-701 weights (largest remainder)', () => {
    const quotas = secplusExamDomainQuotas(90);
    expect(Object.values(quotas).reduce((s, n) => s + n, 0)).toBe(90);
    // 12% of 90 = 10.8, 22% = 19.8, 18% = 16.2, 28% = 25.2, 20% = 18.0
    expect(quotas).toEqual({ 1: 11, 2: 20, 3: 16, 4: 25, 5: 18 });
  });
});

describe('SECPLUS_DECK_DOMAIN', () => {
  it('maps the Security+ decks to valid domains', () => {
    const tagged = Object.entries(SECPLUS_DECK_DOMAIN).filter(([, v]) => v !== null);
    expect(tagged.length).toBeGreaterThanOrEqual(17);
    for (const [, id] of tagged) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(5);
    }
  });

  it('tags the expected decks in the right domains', () => {
    expect(SECPLUS_DECK_DOMAIN['cy-crypto']).toBe(1);
    expect(SECPLUS_DECK_DOMAIN['cy-concepts']).toBe(1);
    expect(SECPLUS_DECK_DOMAIN['cy-threat-actors']).toBe(2);
    expect(SECPLUS_DECK_DOMAIN['cy-malware']).toBe(2);
    expect(SECPLUS_DECK_DOMAIN['cy-vulns']).toBe(2);
    expect(SECPLUS_DECK_DOMAIN['cy-cloud-arch']).toBe(3);
    expect(SECPLUS_DECK_DOMAIN['cy-net-arch']).toBe(3);
    expect(SECPLUS_DECK_DOMAIN['cy-secure-proto']).toBe(3);
    expect(SECPLUS_DECK_DOMAIN['cy-soc']).toBe(4);
    expect(SECPLUS_DECK_DOMAIN['cy-detection']).toBe(4);
    expect(SECPLUS_DECK_DOMAIN['cy-ir-forensics']).toBe(4);
    expect(SECPLUS_DECK_DOMAIN['cy-risk']).toBe(5);
    expect(SECPLUS_DECK_DOMAIN['cy-governance']).toBe(5);
    expect(SECPLUS_DECK_DOMAIN['cy-frameworks']).toBe(5);
  });
});

describe('buildSecplusPracticeExam', () => {
  it('returns 90 questions with no shortfalls', () => {
    const { questions, quotas, shortfalls } = buildSecplusPracticeExam();
    expect(questions).toHaveLength(90);
    expect(shortfalls).toEqual([]);
    expect(Object.values(quotas).reduce((s, n) => s + n, 0)).toBe(90);
  });

  it('samples each domain at its quota and shuffles question order', () => {
    const { questions, quotas } = buildSecplusPracticeExam();
    const counts = {};
    for (const q of questions) counts[q.domain] = (counts[q.domain] || 0) + 1;
    for (const d of SECURITY_PLUS_DOMAINS) expect(counts[d.id]).toBe(quotas[d.id]);
    // every question has 4 options with exactly one correct answer
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
    }
  });
});

describe('scoreSecplusExam', () => {
  it('grades a perfect paper as a pass at 83% threshold', () => {
    const { questions } = buildSecplusPracticeExam({ count: 20 });
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
    const result = scoreSecplusExam(questions, answers);
    expect(result.total).toBe(20);
    expect(result.correct).toBe(20);
    expect(result.pct).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.missed).toEqual([]);
  });

  it('grades an empty paper as a fail', () => {
    const { questions } = buildSecplusPracticeExam({ count: 20 });
    const result = scoreSecplusExam(questions, {});
    expect(result.correct).toBe(0);
    expect(result.pct).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.missed).toHaveLength(20);
  });

  it('applies the 83% pass threshold, not the CISSP 70%', () => {
    const { questions } = buildSecplusPracticeExam({ count: 100 });
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
  it('starts, answers, flags, and finishes independently of the CISSP exam', () => {
    const exam = startSecplusPracticeExam();
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

  it('clears without recording', () => {
    startSecplusPracticeExam();
    clearSecplusPracticeExam();
    expect(secplusExamHistory(store.load())).toHaveLength(0);
  });
});

describe('CISSP exam untouched', () => {
  it('still builds 100-question exams with its own quotas', () => {
    const { questions } = buildPracticeExam();
    expect(questions).toHaveLength(EXAM_QUESTION_COUNT);
    const quotas = examDomainQuotas();
    expect(Object.values(quotas).reduce((s, n) => s + n, 0)).toBe(100);
  });
});
