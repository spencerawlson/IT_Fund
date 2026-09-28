import { describe, it, expect, beforeEach } from 'vitest';
import { setProgressAdapter, completeLesson, saveLessonProgress, clearLessonProgress, gradeCard, XP } from './academy';
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
