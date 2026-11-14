// Course 1: Introduction to Information Technology — registration, roadmap
// coverage, path navigation, lesson identity, progress preservation, reading
// content, gating, and lab wiring. The reference course for the IT Foundations
// career path: every assertion here is the contract Courses 2–10 must meet.
import { describe, it, expect } from 'vitest';
import {
  COURSES, PATHS, ROADMAP_ORDER, allLessons, getCourse, getLesson, getModule, getPath,
  courseHref, moduleHref, lessonHref, pathHref, playerHref, SKILLS, CERTIFICATIONS,
} from '@/data/catalog';
import { LESSON_CONTENT } from './lessonContent';
import { FREE_DECKS, FREE_LESSON_IDS } from '@/lib/subscription';
import { labForLesson } from '@/data/labLessons';
import { pathStatus } from '@/lib/progress/engine';

const empty = () => ({ xp: 0, cards: {}, lessons: {}, bosses: {}, resume: null });

const INTRO_DECKS = [
  'it-what-is-it',
  'it-binary-basics',
  'it-hardware',
  'it-storage-memory',
  'it-os-boot',
  'it-files-cli',
];

describe('Introduction to Information Technology (Course 1)', () => {
  it('registers the course and its track', () => {
    const course = getCourse('intro-to-it');
    expect(course).toBeDefined();
    expect(course.trackId).toBe('intro-it');
    expect(course.title).toBe('Introduction to Information Technology');
    expect(course.difficulty).toBe('Beginner');
    expect(course.modules).toHaveLength(3);
    expect(course.modules.map((m) => m.slug)).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(course.modules.map((m) => m.title)).toEqual([
      'What IT Is',
      'Hardware & Storage',
      'Operating Systems & Working with Computers',
    ]);
    expect(course.lessons).toHaveLength(6);
    expect(course.lessons.map((l) => l.id)).toEqual(INTRO_DECKS);
    expect(course.skills).toEqual(expect.arrayContaining(['hardware', 'it-support', 'troubleshooting']));
    expect(course.certifications).toEqual(['itf-plus']);
    expect(SKILLS.hardware).toBe('Hardware');
    expect(SKILLS['it-support']).toBe('IT Support');
    expect(CERTIFICATIONS['itf-plus'].name).toContain('IT Fundamentals');
  });

  it('places the course on the IT Foundations path and nowhere else', () => {
    const path = getPath('it-foundations');
    expect(path).toBeDefined();
    expect(path.courses).toEqual(['intro-to-it']);
    expect(pathStatus(empty(), path)).toBe('not-started');
    expect(PATHS.filter((p) => p.courses.includes('intro-to-it'))).toHaveLength(1);
  });

  it('roadmap covers every intro-it lesson exactly once', () => {
    const ids = ROADMAP_ORDER.map((l) => l.id);
    for (const deckId of INTRO_DECKS) {
      expect(ids.filter((id) => id === deckId)).toHaveLength(1);
    }
    // Intro-it opens the roadmap: the first lesson a new learner is sent to.
    expect(ROADMAP_ORDER[0].id).toBe('it-what-is-it');
  });

  it('path navigation resolves end to end: path → course → module → lesson', () => {
    const path = getPath('it-foundations');
    expect(pathHref(path)).toBe('/academy/paths/it-foundations');
    const course = path.courses.map(getCourse)[0];
    expect(courseHref(course)).toBe('/academy/courses/intro-to-it');
    const mod = getModule('intro-it:beginner');
    expect(mod).toBeDefined();
    expect(mod.courseSlug).toBe('intro-to-it');
    expect(mod.lessons.map((l) => l.id)).toEqual(['it-what-is-it', 'it-binary-basics']);
    expect(moduleHref(mod)).toBe('/academy/courses/intro-to-it/beginner');
    const lesson = getLesson('it-binary-basics');
    expect(lesson.courseSlug).toBe('intro-to-it');
    expect(lesson.moduleKey).toBe('intro-it:beginner');
    expect(lessonHref(lesson)).toBe('/academy/lessons/it-binary-basics');
    expect(playerHref(lesson)).toBe('/academy/intro-it/lesson/it-binary-basics');
    // Every lesson of the course resolves through the same chain.
    for (const l of course.lessons) {
      expect(getLesson(l.id)).toBeDefined();
      expect(getModule(l.moduleKey).courseSlug).toBe('intro-to-it');
    }
  });

  it('lesson ids are unique across the whole catalogue', () => {
    const ids = allLessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(COURSES.flatMap((c) => c.lessons.map((l) => l.id))).size).toBe(ids.length);
  });

  it('preserves existing progress: free tier and existing lessons untouched', () => {
    expect([...FREE_DECKS].sort()).toEqual(['cl-concepts', 'cy-linux', 'lx-cli', 'net-osi', 'py-basics']);
    expect([...FREE_LESSON_IDS].sort()).toEqual(['cl-concepts', 'lx-cli', 'net-osi', 'py-basics', 'sec-concepts']);
    // Spot-check pre-existing lessons still resolve with the same ids.
    for (const id of ['net-osi', 'py-basics', 'git-basics', 'sec-concepts', 'lx-cli']) {
      expect(getLesson(id)).toBeDefined();
    }
    // No existing deck or lesson id was reused by the new course.
    const before = allLessons.filter((l) => !INTRO_DECKS.includes(l.id));
    expect(before).toHaveLength(allLessons.length - INTRO_DECKS.length);
  });

  it('every intro-it deck has full reading content (no summary-only fallback)', () => {
    for (const deckId of INTRO_DECKS) {
      const content = LESSON_CONTENT[deckId];
      expect(content, `${deckId} must have reading content`).toBeDefined();
      expect(content.overview.filter((p) => p.trim()).length).toBeGreaterThanOrEqual(1);
      expect(content.learn.length).toBeGreaterThanOrEqual(2);
      for (const section of content.learn) {
        expect(section.heading.trim()).not.toBe('');
        expect(section.body.length).toBeGreaterThanOrEqual(1);
        expect(section.body.filter((b) => typeof b === 'string' && b.trim()).length).toBeGreaterThanOrEqual(1);
      }
      expect(content.cheatSheet.length).toBeGreaterThanOrEqual(8);
      for (const [term, meaning] of content.cheatSheet) {
        expect(term.trim()).not.toBe('');
        expect(meaning.trim()).not.toBe('');
      }
    }
    // 1:1 deck ↔ lesson: no intro-it lesson without a deck, no deck without a lesson.
    const deckIds = new Set(COURSES.flatMap((c) => c.lessons.map((l) => l.id)));
    for (const deckId of INTRO_DECKS) {
      expect(deckIds.has(deckId)).toBe(true);
      expect(LESSON_CONTENT[deckId]).toBeDefined();
    }
  });

  it('is Pro-gated by default: no intro-it deck or lesson is free', () => {
    for (const deckId of INTRO_DECKS) {
      expect(FREE_DECKS.has(deckId)).toBe(false);
      expect(FREE_LESSON_IDS.has(deckId)).toBe(false);
    }
  });

  it('wires the CLI lesson to the hands-on terminal lab', () => {
    expect(labForLesson('it-files-cli')).toBe('linux-terminal-001');
  });
});
