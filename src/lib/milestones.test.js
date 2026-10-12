import { describe, it, expect } from 'vitest';
import { detectMilestones, detectLabMilestones, STREAK_MILESTONES } from './milestones';
import { xpForLevel } from './academy';

const base = {
  xp: 0,
  streak: { count: 0, last: null },
  badges: [],
  exam: null,
  secplusExam: null,
  certExams: {},
};

const withVals = (over) => ({ ...base, ...over });

describe('detectMilestones', () => {
  it('detects a level-up with the new rank title', () => {
    const out = detectMilestones(withVals({ xp: 0 }), withVals({ xp: xpForLevel(2) }));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('levelup-2');
    expect(out[0].kind).toBe('levelup');
    expect(out[0].title).toContain('Level 2');
  });

  it('stays silent when the level does not change', () => {
    expect(detectMilestones(withVals({ xp: 10 }), withVals({ xp: 20 }))).toEqual([]);
  });

  it('fires each streak milestone exactly when crossed', () => {
    for (const m of STREAK_MILESTONES) {
      const out = detectMilestones(
        withVals({ streak: { count: m - 1, last: '2026-10-10' } }),
        withVals({ streak: { count: m, last: '2026-10-11' } }),
      );
      expect(out.map((o) => o.id)).toContain(`streak-${m}`);
      expect(out.find((o) => o.id === `streak-${m}`).kind).toBe('streak');
    }
  });

  it('does not refire a streak milestone that was already passed', () => {
    const out = detectMilestones(
      withVals({ streak: { count: 7, last: '2026-10-10' } }),
      withVals({ streak: { count: 8, last: '2026-10-11' } }),
    );
    expect(out.filter((o) => o.kind === 'streak')).toEqual([]);
  });

  it('detects newly earned badges with their titles', () => {
    const out = detectMilestones(withVals({ badges: [] }), withVals({ badges: ['first-steps'] }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'badge-first-steps', kind: 'badge' });
    expect(out[0].title).toContain('First Steps');
  });

  it('ignores already-earned badges and unknown badge ids', () => {
    const out = detectMilestones(
      withVals({ badges: ['first-steps'] }),
      withVals({ badges: ['first-steps', 'not-a-real-badge'] }),
    );
    expect(out).toEqual([]);
  });

  it('detects a passed CISSP exam', () => {
    const prevExam = { id: 'exam-1', finishedAt: null, result: null };
    const nextExam = { id: 'exam-1', finishedAt: 123, result: { passed: true, pct: 82 } };
    const out = detectMilestones(withVals({ exam: prevExam }), withVals({ exam: nextExam }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'exam-pass-cissp-exam-1', kind: 'exam-pass' });
    expect(out[0].subtitle).toContain('CISSP');
    expect(out[0].subtitle).toContain('82%');
  });

  it('stays silent for a failed or unfinished exam', () => {
    const failed = { id: 'exam-1', finishedAt: 123, result: { passed: false, pct: 40 } };
    expect(detectMilestones(withVals({}), withVals({ exam: failed }))).toEqual([]);
    const running = { id: 'exam-2', finishedAt: null, result: null };
    expect(detectMilestones(withVals({}), withVals({ exam: running }))).toEqual([]);
  });

  it('detects a passed Security+ exam and per-cert exams', () => {
    const fin = (id) => ({ id, finishedAt: 123, result: { passed: true, pct: 90 } });
    const out = detectMilestones(
      withVals({ secplusExam: { id: 's1', finishedAt: null }, certExams: {} }),
      withVals({ secplusExam: fin('s1'), certExams: { 'aws-saa': fin('a1') } }),
    );
    const ids = out.map((o) => o.id);
    expect(ids).toContain('exam-pass-secplus-s1');
    expect(ids).toContain('exam-pass-aws-saa-a1');
    expect(out.find((o) => o.id === 'exam-pass-aws-saa-a1').subtitle).toContain('AWS Solutions Architect');
  });

  it('does not refire for an already-finished exam', () => {
    const fin = { id: 'exam-1', finishedAt: 100, result: { passed: true, pct: 80 } };
    const later = { id: 'exam-1', finishedAt: 100, result: { passed: true, pct: 80 } };
    expect(detectMilestones(withVals({ exam: fin }), withVals({ exam: later }))).toEqual([]);
  });

  it('orders celebrations: exam-pass, levelup, streak, badge', () => {
    const prev = withVals({ xp: 0, streak: { count: 2, last: 'd1' }, badges: [] });
    const next = withVals({
      xp: xpForLevel(2),
      streak: { count: 3, last: 'd2' },
      badges: ['first-steps'],
      exam: { id: 'e1', finishedAt: 5, result: { passed: true, pct: 75 } },
    });
    const kinds = detectMilestones(prev, next).map((o) => o.kind);
    expect(kinds).toEqual(['exam-pass', 'levelup', 'streak', 'badge']);
  });

  it('is a pure function: same input, same output, no side effects', () => {
    const prev = withVals({});
    const next = withVals({ xp: xpForLevel(3), badges: ['combo-10'] });
    const a = detectMilestones(prev, next);
    const b = detectMilestones(prev, next);
    expect(a).toEqual(b);
    expect(prev.badges).toEqual([]);
  });
});

describe('detectLabMilestones', () => {
  it('celebrates the first completion of a lab', () => {
    const out = detectLabMilestones({ 'net-subnetting-001': { completions: 1 } }, new Set());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'lab-complete-net-subnetting-001', kind: 'lab-complete' });
    expect(out[0].title).toBe('Lab complete!');
  });

  it('never repeats a lab already celebrated', () => {
    const seen = new Set(['lab-complete-net-subnetting-001']);
    expect(detectLabMilestones({ 'net-subnetting-001': { completions: 4 } }, seen)).toEqual([]);
  });

  it('ignores labs with no completions and empty maps', () => {
    expect(detectLabMilestones({ 'x': { completions: 0 } }, new Set())).toEqual([]);
    expect(detectLabMilestones({}, new Set())).toEqual([]);
    expect(detectLabMilestones(null, new Set())).toEqual([]);
  });
});
