import { describe, expect, it, vi } from 'vitest';
import { mergeProgress } from './merge';
import { setProgressAdapter, resetAcademy } from '../academy';
import { memoryAdapter } from './storage';

describe('mergeProgress', () => {
  it('keeps the higher lesson best, tie-broken by later attempt', () => {
    const a = { lessons: { l1: { best: 80, at: 5 }, l2: { best: 90, at: 1 } } };
    const b = { lessons: { l1: { best: 70, at: 9 }, l2: { best: 90, at: 8 }, l3: { best: 60, at: 2 } } };
    const { lessons } = mergeProgress(a, b);
    expect(lessons.l1).toEqual({ best: 80, at: 5 }); // higher best wins over later attempt
    expect(lessons.l2).toEqual({ best: 90, at: 8 }); // tie -> later attempt
    expect(lessons.l3).toEqual({ best: 60, at: 2 }); // only in b
  });

  it('keeps the more-advanced card, maxing right/wrong', () => {
    const a = { cards: { c1: { box: 3, due: 10, right: 5, wrong: 2 } } };
    const b = { cards: { c1: { box: 1, due: 99, right: 1, wrong: 4 }, c2: { box: 2, due: 1 } } };
    const { cards } = mergeProgress(a, b);
    expect(cards.c1.box).toBe(3); // higher box wins despite b's later due
    expect(cards.c1.right).toBe(5);
    expect(cards.c1.wrong).toBe(4); // maxed across both
    expect(cards.c2.box).toBe(2);
  });

  it('breaks a card box tie by later due', () => {
    const a = { cards: { c1: { box: 2, due: 10 } } };
    const b = { cards: { c1: { box: 2, due: 20 } } };
    expect(mergeProgress(a, b).cards.c1.due).toBe(20);
  });

  it('maxes revSeen across a merge (PR 3, §4.2 collision rule)', () => {
    // The §4.2 rule: revSeen is a high-water mark — the merged record keeps
    // the MAXIMUM revision seen, whichever side held the higher box. The PR 2
    // behaviour (revSeen rides with the picked record) lost the newer
    // revision whenever the lower-rev side had the higher box.
    const a = { cards: { c1: { box: 3, due: 10, right: 5, wrong: 2, revSeen: 2 } } };
    const b = { cards: { c1: { box: 1, due: 99, right: 1, wrong: 4, revSeen: 5 } } };
    expect(mergeProgress(a, b).cards.c1.revSeen).toBe(5);
    expect(mergeProgress(b, a).cards.c1.revSeen).toBe(5); // order-independent
    const c = { cards: { c1: { box: 1, due: 10, right: 1, wrong: 1, revSeen: 1 } } };
    const d = { cards: { c1: { box: 4, due: 5, right: 2, wrong: 0, revSeen: 4 } } };
    expect(mergeProgress(c, d).cards.c1.revSeen).toBe(4);
    // No revSeen on either side: none is invented.
    expect(mergeProgress(
      { cards: { c1: { box: 2, due: 10, right: 1, wrong: 0 } } },
      { cards: { c1: { box: 3, due: 20, right: 2, wrong: 1 } } },
    ).cards.c1.revSeen).toBeUndefined();
    // Idempotent: merging the result with itself keeps the max.
    const m = mergeProgress(a, b);
    expect(mergeProgress(m, m).cards.c1.revSeen).toBe(5);
  });

  it('maxes xp/combo/days/bosses and unions badges/mastered', () => {
    const a = { xp: 100, bestCombo: 4, days: { '2026-01-01': 30 }, bosses: { 'net:beginner': 80 }, badges: ['x'], mastered: { d1: true } };
    const b = { xp: 250, bestCombo: 2, days: { '2026-01-01': 10, '2026-01-02': 5 }, bosses: { 'net:beginner': 90 }, badges: ['x', 'y'], mastered: { d2: true } };
    const m = mergeProgress(a, b);
    expect(m.xp).toBe(250);
    expect(m.bestCombo).toBe(4);
    expect(m.days).toEqual({ '2026-01-01': 30, '2026-01-02': 5 });
    expect(m.bosses).toEqual({ 'net:beginner': 90 });
    expect(m.badges.sort()).toEqual(['x', 'y']);
    expect(m.mastered).toEqual({ d1: true, d2: true });
  });

  it('keeps verified labs and lab-marked lessons across a merge', () => {
    // A cross-device sync must never un-complete a lesson or re-arm the
    // one-time lab XP guard.
    const a = { lessons: { l1: { best: 60, at: 5 } }, labs: {} };
    const b = { lessons: { l1: { at: 9, via: 'lab' } }, labs: { 'py-basics-001': { verified: true, at: 9 } } };
    const m = mergeProgress(a, b);
    expect(m.lessons.l1).toEqual({ best: 60, at: 5, via: 'lab' }); // score kept, provenance kept
    expect(m.labs['py-basics-001']).toEqual({ verified: true, at: 9 });
    const m2 = mergeProgress(b, a);
    expect(m2.lessons.l1.via).toBe('lab'); // order-independent
    expect(m2.labs['py-basics-001'].verified).toBe(true);
  });

  it('keeps the streak with the higher count, tie by later date', () => {
    expect(mergeProgress({ streak: { count: 3, last: '2026-01-03' } }, { streak: { count: 5, last: '2026-01-01' } }).streak.count).toBe(5);
    expect(mergeProgress({ streak: { count: 3, last: '2026-01-03' } }, { streak: { count: 3, last: '2026-01-09' } }).streak.last).toBe('2026-01-09');
  });

  it('keeps the most recent resume point', () => {
    expect(mergeProgress({ resume: { deckId: 'a', at: 5 } }, { resume: { deckId: 'b', at: 9 } }).resume.deckId).toBe('b');
    expect(mergeProgress({ resume: { deckId: 'a', at: 5 } }, {}).resume.deckId).toBe('a');
    expect(mergeProgress({}, {}).resume).toBeNull();
  });

  it('is symmetric for xp and badges', () => {
    const a = { xp: 10, badges: ['a'] };
    const b = { xp: 40, badges: ['b'] };
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(ab.xp).toBe(ba.xp);
    expect(ab.badges.sort()).toEqual(ba.badges.sort());
  });
});

// PR 1 regression tests (card UUID migration, plan v2.1 §4.1).
// Written FIRST against the current code and observed FAILING: mergeProgress
// returns a literal object with exactly 11 keys, silently dropping exams,
// exam sessions, missions, celebrations and any unknown field on every merge.
// These tests prove the defect before the fix lands. They must all pass after
// the §4.1 rewrite, with no change to the existing 8 tests above.
describe('mergeProgress — field preservation (PR 1 regression)', () => {
  const unfinishedExam = (overrides = {}) => ({
    id: 'exam-100',
    startedAt: 100,
    deadline: 100 + 60 * 60 * 1000,
    questions: [{ id: 'q1' }, { id: 'q2' }],
    quotas: {},
    answers: { q1: 'a' },
    flagged: ['q2'],
    index: 1,
    finishedAt: null,
    result: null,
    ...overrides,
  });

  const finishedExam = (overrides = {}) => ({
    ...unfinishedExam({ startedAt: 100, answers: { q1: 'a', q2: 'b' }, index: 2 }),
    finishedAt: 500,
    result: { total: 2, correct: 2, pct: 100, passed: true },
    ...overrides,
  });

  const attempt = (id, at, correct = 8) => ({
    id,
    at,
    total: 10,
    correct,
    pct: correct * 10,
    passed: correct >= 7,
    perDomain: {},
  });

  it('preserves an in-progress CISSP exam session across a merge', () => {
    const session = unfinishedExam();
    const m = mergeProgress({ exam: session }, {});
    expect(m.exam).toEqual(session);
    const m2 = mergeProgress({}, { exam: session });
    expect(m2.exam).toEqual(session);
  });

  it('a finished exam session wins over an unfinished copy of the same exam', () => {
    const finished = finishedExam();
    const unfinished = unfinishedExam();
    expect(mergeProgress({ exam: finished }, { exam: unfinished }).exam).toEqual(finished);
    expect(mergeProgress({ exam: unfinished }, { exam: finished }).exam).toEqual(finished);
  });

  it('keeps the later-started unfinished exam when neither side finished it', () => {
    const early = unfinishedExam({ startedAt: 100, answers: { q1: 'a' }, index: 1 });
    const late = unfinishedExam({ startedAt: 200, answers: { q1: 'b', q2: 'c' }, index: 2, flagged: [] });
    expect(mergeProgress({ exam: early }, { exam: late }).exam).toEqual(late);
    expect(mergeProgress({ exam: late }, { exam: early }).exam).toEqual(late);
  });

  it('preserves Security+ and generic cert exam sessions', () => {
    const secplus = unfinishedExam({ id: 'secplus-exam-100' });
    const cert = unfinishedExam({ id: 'aws-saa-exam-100', certId: 'aws-saa' });
    const m = mergeProgress(
      { secplusExam: secplus, certExams: { 'aws-saa': cert } },
      {},
    );
    expect(m.secplusExam).toEqual(secplus);
    expect(m.certExams['aws-saa']).toEqual(cert);
    // Per-cert finished-wins: a finished aws-saa session beats an unfinished one.
    const certFinished = { ...cert, finishedAt: 600, result: { total: 2, correct: 1, pct: 50, passed: false } };
    const m2 = mergeProgress(
      { certExams: { 'aws-saa': cert } },
      { certExams: { 'aws-saa': certFinished, cysa: unfinishedExam({ id: 'cysa-exam-100', certId: 'cysa' }) } },
    );
    expect(m2.certExams['aws-saa']).toEqual(certFinished);
    expect(m2.certExams.cysa.id).toBe('cysa-exam-100');
  });

  it('unions exam histories by attempt id, capped at the 20 most recent', () => {
    const a1 = attempt('a1', 10);
    const a2 = attempt('a2', 20);
    const a3 = attempt('a3', 30);
    const m = mergeProgress({ exams: [a2, a1] }, { exams: [a3, a2] });
    expect(m.exams).toBeDefined(); // present, not dropped
    expect(m.exams.map((x) => x.id)).toEqual(['a3', 'a2', 'a1']); // newest first, a2 once
    expect(m.exams.find((x) => x.id === 'a2')).toEqual(a2); // byte-identical attempt
    // Cap: 21 distinct attempts across both sides keep exactly the 20 most recent.
    const manyA = Array.from({ length: 11 }, (_, i) => attempt(`t${i}`, i));
    const manyB = Array.from({ length: 10 }, (_, i) => attempt(`t${i + 11}`, i + 11));
    const capped = mergeProgress({ exams: manyA }, { exams: manyB });
    expect(capped.exams).toBeDefined(); // present, not dropped
    expect(capped.exams).toHaveLength(20);
    expect(capped.exams.map((x) => x.id)).not.toContain('t0'); // oldest dropped
    expect(capped.exams.map((x) => x.id)).toContain('t20'); // newest kept
  });

  it('preserves per-cert exam histories, unioned by attempt id', () => {
    const m = mergeProgress(
      { 'aws-saaExams': [attempt('s1', 10)], cysaExams: [attempt('c1', 10)] },
      { 'aws-saaExams': [attempt('s2', 20), attempt('s1', 10)] },
    );
    expect(m['aws-saaExams']).toBeDefined(); // present, not dropped
    expect(m['aws-saaExams'].map((x) => x.id)).toEqual(['s2', 's1']);
    expect(m.cysaExams).toBeDefined();
    expect(m.cysaExams.map((x) => x.id)).toEqual(['c1']);
    // Security+ history follows the same rule.
    const s = mergeProgress({ secplusExams: [attempt('p1', 5)] }, { secplusExams: [attempt('p2', 9)] });
    expect(s.secplusExams).toBeDefined();
    expect(s.secplusExams.map((x) => x.id)).toEqual(['p2', 'p1']);
  });

  it('unions mission completions by mission id, keeping the earlier completion', () => {
    const m = mergeProgress(
      { missions: { 'op-broken-shield': { xp: 50, at: 100 } } },
      { missions: { 'op-packet-flood': { xp: 30, at: 200 } } },
    );
    expect(m.missions).toEqual({
      'op-broken-shield': { xp: 50, at: 100 },
      'op-packet-flood': { xp: 30, at: 200 },
    });
    // Same mission on both sides: the earlier completion wins (deterministic).
    const m2 = mergeProgress(
      { missions: { m1: { xp: 50, at: 100 } } },
      { missions: { m1: { xp: 50, at: 300 } } },
    );
    expect(m2.missions.m1).toEqual({ xp: 50, at: 100 });
    expect(mergeProgress(
      { missions: { m1: { xp: 50, at: 300 } } },
      { missions: { m1: { xp: 50, at: 100 } } },
    ).missions.m1).toEqual({ xp: 50, at: 100 });
  });

  it('unions seenCelebrations', () => {
    const m = mergeProgress({ seenCelebrations: ['first-steps'] }, { seenCelebrations: ['century'] });
    expect(m.seenCelebrations).toBeDefined(); // present, not dropped
    expect(m.seenCelebrations.sort()).toEqual(['century', 'first-steps']);
    const m2 = mergeProgress({ seenCelebrations: ['first-steps'] }, { seenCelebrations: ['first-steps'] });
    expect(m2.seenCelebrations).toEqual(['first-steps']); // no duplicates
  });

  it('preserves unknown top-level keys instead of dropping them (catch-all)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const m = mergeProgress({ futureField: { x: 1 } }, { anotherFuture: 'yes' });
      expect(m.futureField).toEqual({ x: 1 });
      expect(m.anotherFuture).toBe('yes');
      // On a value conflict the server side (b) wins and a warning is logged.
      const conflict = mergeProgress({ futureField: { x: 1 } }, { futureField: { x: 2 } });
      expect(conflict.futureField).toEqual({ x: 2 });
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('merges concurrent card updates to the correct values (guard — passes on current code)', () => {
    // v2.1 test strategy §16: higher box wins, right/wrong maxed, due from the winner.
    const a = { cards: { c1: { box: 3, due: 10, right: 5, wrong: 2 } } };
    const b = { cards: { c1: { box: 1, due: 99, right: 1, wrong: 4 } } };
    const m = mergeProgress(a, b);
    expect(m.cards.c1).toEqual({ box: 3, due: 10, right: 5, wrong: 4 });
    expect(mergeProgress(b, a).cards.c1).toEqual({ box: 3, due: 10, right: 5, wrong: 4 });
    // Box tie -> later due wins.
    expect(mergeProgress({ cards: { c1: { box: 2, due: 10 } } }, { cards: { c1: { box: 2, due: 20 } } }).cards.c1.due).toBe(20);
  });

  it('merges concurrent lesson and boss updates to the correct values (guard — passes on current code)', () => {
    const m = mergeProgress(
      { lessons: { l1: { best: 80, at: 5 }, l2: { best: 90, at: 1 } }, bosses: { 'net:beginner': 80 } },
      { lessons: { l1: { best: 70, at: 9 }, l2: { best: 90, at: 8, via: 'lab' } }, bosses: { 'net:beginner': 90 } },
    );
    expect(m.lessons.l1).toEqual({ best: 80, at: 5 }); // higher best wins over later attempt
    expect(m.lessons.l2).toEqual({ best: 90, at: 8, via: 'lab' }); // tie -> later attempt, lab provenance kept
    expect(m.bosses['net:beginner']).toBe(90); // higher % wins
  });

  it('is order-independent and idempotent for preserved fields', () => {
    const a = {
      exams: [attempt('a1', 10)],
      exam: unfinishedExam(),
      missions: { m1: { xp: 50, at: 100 } },
      seenCelebrations: ['first-steps'],
    };
    const b = {
      exams: [attempt('a2', 20)],
      exam: finishedExam(),
      missions: { m2: { xp: 30, at: 200 } },
      seenCelebrations: ['century'],
    };
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(ab).toEqual(ba);
    expect(ab.exams).toBeDefined(); // present, not dropped
    expect(ab.exams.map((x) => x.id)).toEqual(['a2', 'a1']);
    expect(ab.exam.finishedAt).toBe(500); // finished wins either way
    expect(Object.keys(ab.missions).sort()).toEqual(['m1', 'm2']);
    expect(ab.seenCelebrations.sort()).toEqual(['century', 'first-steps']);
    expect(mergeProgress(ab, ab)).toEqual(ab); // idempotent
  });

  it('preserves every key of the state shape (state-shape guard)', () => {
    // EMPTY keys are derived from the real state shape (resetAcademy() writes
    // {...EMPTY} to a fresh adapter) so a future state key fails this test
    // until merge.js knows it.
    const store = memoryAdapter();
    setProgressAdapter(store);
    resetAcademy();
    const emptyKeys = Object.keys(store.load());
    expect(emptyKeys).toContain('exams');
    expect(emptyKeys).toContain('missions');
    const runtimeKeys = ['certExams', 'aws-saaExams', 'cysaExams', 'seenCelebrations'];
    const full = {};
    for (const k of [...emptyKeys, ...runtimeKeys]) {
      if (k === 'exams' || k === 'secplusExams' || k === 'aws-saaExams' || k === 'cysaExams') full[k] = [attempt('h1', 1)];
      else if (k === 'exam' || k === 'secplusExam') full[k] = unfinishedExam();
      else if (k === 'certExams') full[k] = { 'aws-saa': unfinishedExam({ id: 'aws-saa-exam-1' }) };
      else if (k === 'missions') full[k] = { m1: { xp: 10, at: 1 } };
      else if (k === 'seenCelebrations') full[k] = ['first-steps'];
      else if (k === 'resume') full[k] = { deckId: 'py-basics', at: 1 };
      else if (k === 'streak') full[k] = { count: 1, last: '2026-01-01' };
      else if (k === 'cards') full[k] = { c1: { box: 1, due: 1 } };
      else if (k === 'lessons') full[k] = { l1: { best: 10, at: 1 } };
      else if (k === 'labs') full[k] = { 'py-basics-001': { verified: true, at: 1 } };
      else if (k === 'bosses') full[k] = { 'net:beginner': 10 };
      else if (k === 'days') full[k] = { '2026-01-01': 5 };
      else if (k === 'badges') full[k] = ['x'];
      else if (k === 'mastered') full[k] = { d1: true };
      else full[k] = 1;
    }
    const m = mergeProgress(full, {});
    for (const k of [...emptyKeys, ...runtimeKeys]) {
      expect(m, `key ${k} must survive a merge`).toHaveProperty(k);
    }
    expect(m.exams).toHaveLength(1);
    expect(m.missions.m1).toEqual({ xp: 10, at: 1 });
    expect(m.exam.id).toBe('exam-100');
  });
});
