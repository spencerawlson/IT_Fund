import { describe, expect, it } from 'vitest';
import { mergeProgress } from './merge';

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
