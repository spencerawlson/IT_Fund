import { describe, expect, it } from 'vitest';
import { COURSES, allLessons } from '@/data/catalog';
import { LESSON_CONTENT } from './lessonContent';
import { LESSON_VISUAL_IDS } from '@/components/academy/lesson/visuals';

// Courses whose reading content is still being written. Remove a course from this list when it is
// finished; from then on, every one of its lessons must keep full content. Never add one back.
const PENDING = [];

const finished = COURSES.filter((c) => !PENDING.includes(c.slug));
const text = (s) => typeof s === 'string' && s.trim().length > 0;

describe('lesson reading content', () => {
  it('every content entry belongs to a real lesson', () => {
    const ids = new Set(allLessons.map((l) => l.id));
    expect(Object.keys(LESSON_CONTENT).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('structured learn blocks are well formed', () => {
    const problems = [];
    Object.entries(LESSON_CONTENT).forEach(([id, c]) => {
      [...(c.learn || []), ...(c.architecture ? [c.architecture] : [])].forEach((part) => {
        const where = `${id} / ${part.heading || 'architecture'}`;
        if (part.visual && !LESSON_VISUAL_IDS.includes(part.visual)) problems.push(`${where}: unknown visual ${part.visual}`);
        if (part.table) {
          const n = part.table.columns?.length;
          if (!n || !part.table.rows?.length) problems.push(`${where}: empty table`);
          part.table.rows?.forEach((r) => { if (r.length !== n || !r.every(text)) problems.push(`${where}: row ${r[0]} misaligned`); });
        }
        if (part.points && !part.points.every(text)) problems.push(`${where}: empty point`);
        if (part.note && !(text(part.note.label) && text(part.note.text))) problems.push(`${where}: incomplete note`);
      });
    });
    expect(problems).toEqual([]);
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
