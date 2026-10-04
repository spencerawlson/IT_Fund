import { describe, it, expect, beforeEach } from 'vitest';
import { memoryAdapter } from './storage';
import {
  __setAdapter,
  getProgress,
  saveFlashcardProgress,
  saveQuizScore,
  getOverallProgress,
} from './modules';

describe('library module progress', () => {
  beforeEach(() => {
    __setAdapter(memoryAdapter());
  });

  it('starts empty', () => {
    expect(getProgress('m1')).toEqual({ flashcards: null, quiz: null });
    expect(getOverallProgress('m1')).toBe(0);
  });

  it('keeps the best flashcard/quiz scores', () => {
    saveFlashcardProgress('m1', 3, 10);
    saveFlashcardProgress('m1', 7, 10);
    saveQuizScore('m1', 6, 10);
    saveQuizScore('m1', 4, 10);
    const p = getProgress('m1');
    expect(p.flashcards).toMatchObject({ known: 7, total: 10, bestKnown: 7 });
    expect(p.quiz).toMatchObject({ bestScore: 6, lastScore: 4 });
    // (0.7 + 0.6) / 2 = 65%
    expect(getOverallProgress('m1')).toBe(65);
  });

  it('averages only the parts that exist', () => {
    saveQuizScore('m2', 8, 10);
    expect(getOverallProgress('m2')).toBe(80);
  });
});
