import { describe, expect, it } from 'vitest';
import { COURSES, allLessons } from '@/data/catalog';
import { LESSON_CONTENT } from './lessonContent';

// Courses whose reading content is still being written. Remove a course from this list when it is
// finished; from then on, every one of its lessons must keep full content. Never add one back.
const PENDING = ['terraform-iac', 'cpp-programming', 'go-programming', 'rust-programming', 'sql-databases', 'docker-containers'];

const finished = COURSES.filter((c) => !PENDING.includes(c.slug));
const text = (s) => typeof s === 'string' && s.trim().length > 0;

describe('lesson reading content', () => {
  it('every content entry belongs to a real lesson', () => {
    const ids = new Set(allLessons.map((l) => l.id));
    expect(Object.keys(LESSON_CONTENT).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('PENDING lists only real courses', () => {
    const slugs = new Set(COURSES.map((c) => c.slug));
    expect(PENDING.filter((s) => !slugs.has(s))).toEqual([]);
  });

  describe.each(finished.map((c) => [c.title, c]))('%s', (_title, course) => {
    it.each(course.lessons.map((l) => [l.id]))('%s has overview, learn and a cheat sheet', (id) => {
      const c = LESSON_CONTENT[id];
      expect(c, `no content for ${id}`).toBeTruthy();
      expect(c.overview?.length, 'overview paragraphs').toBeGreaterThanOrEqual(1);
      expect(c.overview.every(text)).toBe(true);
      expect(c.learn?.length, 'learn sections').toBeGreaterThanOrEqual(2);
      c.learn.forEach((part) => {
        expect(text(part.heading), 'learn heading').toBe(true);
        expect(part.body.length, `body of "${part.heading}"`).toBeGreaterThanOrEqual(1);
        expect(part.body.every(text)).toBe(true);
      });
      expect(c.cheatSheet?.length, 'cheat sheet rows').toBeGreaterThanOrEqual(5);
      c.cheatSheet.forEach(([term, meaning]) => expect(text(term) && text(meaning)).toBe(true));
      (c.examples || []).forEach((ex) => expect(text(ex.title) && text(ex.code)).toBe(true));
    });
  });
});
