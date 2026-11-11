import { describe, it, expect, beforeEach } from 'vitest';
import { setProgressAdapter, completeLesson, recordVerifiedLabCompletion, saveLessonProgress, clearLessonProgress, gradeCard, XP } from './academy';
import { isPassed } from './progress/engine';
import { memoryAdapter } from './progress/storage';

let store;
beforeEach(() => {
  store = memoryAdapter();
  setProgressAdapter(store);
});

describe('academy store', () => {
  it('persists through the adapter and keeps the best lesson score', () => {
    completeLesson('py-basics', 60);
    completeLesson('py-basics', 90);
    completeLesson('py-basics', 40);
    expect(store.load().lessons['py-basics'].best).toBe(90);
    expect(store.load().xp).toBe(XP.lessonComplete); // first completion only
  });

  it('saves and clears mid-lesson progress for the right lesson only', () => {
    saveLessonProgress({ deckId: 'py-basics', plan: [{ k: 'c', id: 'py-basics-0' }], index: 1, tries: {}, retried: [] });
    expect(store.load().resume.deckId).toBe('py-basics');
    clearLessonProgress('py-flow');
    expect(store.load().resume.deckId).toBe('py-basics');
    clearLessonProgress('py-basics');
    expect(store.load().resume).toBeNull();
  });

  it('drops a missed card back to the first review box', () => {
    gradeCard('py-basics-0', true);
    gradeCard('py-basics-0', true);
    expect(store.load().cards['py-basics-0'].box).toBe(3);
    gradeCard('py-basics-0', false);
    expect(store.load().cards['py-basics-0'].box).toBe(1);
  });
});

describe('verified lab completions (Spencer rule, 2026-11-11)', () => {
  it('awards lab XP once and marks related lessons complete without a quiz score', () => {
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(true);
    const s = store.load();
    expect(s.labs['py-basics-001'].verified).toBe(true);
    expect(s.xp).toBe(XP.labComplete + XP.lessonComplete);
    expect(s.lessons['py-basics'].via).toBe('lab');
    expect(s.lessons['py-basics'].best).toBeUndefined(); // no invented score
    expect(isPassed(s, 'py-basics')).toBe(true);
    // A second verified completion of the same lab: no double award.
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(false);
    expect(store.load().xp).toBe(XP.labComplete + XP.lessonComplete);
  });

  it('keeps a guided lesson score when the lab completes an already-passed lesson', () => {
    completeLesson('py-basics', 80);
    const before = store.load().xp;
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(true);
    const s = store.load();
    expect(s.xp).toBe(before + XP.labComplete); // lab XP only, no lesson XP
    expect(s.lessons['py-basics'].best).toBe(80); // score preserved, no via
    expect(s.lessons['py-basics'].via).toBeUndefined();
  });

  it('a lab with no related lessons still earns its lab XP', () => {
    expect(recordVerifiedLabCompletion('sec-dns-typo-001', [])).toBe(true);
    expect(store.load().xp).toBe(XP.labComplete);
    expect(store.load().lessons).toEqual({});
  });
});
