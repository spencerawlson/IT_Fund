import { describe, it, expect } from 'vitest';
import { COURSES, PATHS, ROADMAP_ORDER, allLessons, getCourse, getModule, getPath } from '@/data/catalog';
import {
  PASS_PCT, isLessonUnlocked, lessonStatus, moduleLock, courseProgress, courseStatus, courseMinutesLeft,
  pathStatus, pathPrerequisites, continueLearning, pastLessonCards, overallProgress,
} from './engine';

const empty = () => ({ xp: 0, cards: {}, lessons: {}, bosses: {}, resume: null });
const withLessons = (ids, best = 100, at = 1) => ({
  ...empty(),
  lessons: Object.fromEntries(ids.map((id, i) => [id, { best, at: at + i }])),
});
const moduleLessons = (key) => getModule(key).lessons.map((l) => l.id);

describe('catalogue', () => {
  it('places every lesson in the roadmap order exactly once', () => {
    const ids = ROADMAP_ORDER.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(allLessons.length);
  });

  it('only references courses and paths that exist', () => {
    PATHS.forEach((p) => {
      p.courses.forEach((slug) => expect(getCourse(slug), slug).toBeTruthy());
      Object.values(p.prerequisites).flat().forEach((slug) => expect(getPath(slug), slug).toBeTruthy());
    });
  });
});

describe('lesson locking', () => {
  const [first, second] = getModule('python:beginner').lessons;

  it('opens only the first lesson of a first-step module on a fresh start', () => {
    expect(isLessonUnlocked(empty(), first.id)).toBe(true);
    expect(isLessonUnlocked(empty(), second.id)).toBe(false);
    expect(lessonStatus(empty(), second)).toBe('locked');
  });

  it('opens the next lesson only after a passing score', () => {
    expect(isLessonUnlocked(withLessons([first.id], PASS_PCT - 1), second.id)).toBe(false);
    expect(isLessonUnlocked(withLessons([first.id], PASS_PCT), second.id)).toBe(true);
  });

  it('runs first-step modules of different courses in parallel', () => {
    const networkFirst = getModule('network:beginner').lessons[0];
    expect(isLessonUnlocked(empty(), networkFirst.id)).toBe(true);
  });
});

describe('module prerequisites', () => {
  it('locks a module until the previous roadmap step is complete', () => {
    const intermediate = getModule('network:intermediate');
    const onlyPython = withLessons(moduleLessons('python:beginner'));
    const lock = moduleLock(onlyPython, intermediate);
    expect(lock.unlocked).toBe(false);
    expect(lock.blockers.map((m) => m.key)).toContain('network:beginner');

    const stepOne = withLessons([...moduleLessons('python:beginner'), ...moduleLessons('network:beginner')]);
    expect(moduleLock(stepOne, intermediate).unlocked).toBe(true);
  });

  it('keeps a module open once one of its lessons is passed', () => {
    const intermediate = getModule('network:intermediate');
    const state = withLessons([intermediate.lessons[0].id]);
    expect(moduleLock(state, intermediate).unlocked).toBe(true);
  });
});

describe('course progress', () => {
  const course = getCourse('python-automation');

  it('reports progress, status and time left', () => {
    expect(courseProgress(empty(), course)).toBe(0);
    expect(courseStatus(empty(), course)).toBe('not-started');
    expect(courseMinutesLeft(empty(), course)).toBe(course.minutes);

    const done = withLessons(course.lessons.map((l) => l.id));
    expect(courseProgress(done, course)).toBe(100);
    expect(courseStatus(done, course)).toBe('completed');
    expect(courseMinutesLeft(done, course)).toBe(0);
  });

  it('counts only passing lessons', () => {
    const failed = withLessons([course.lessons[0].id], 10);
    expect(courseProgress(failed, course)).toBe(0);
    expect(courseStatus(failed, course)).toBe('in-progress');
  });

  it('computes overall progress across every course', () => {
    const all = withLessons(COURSES.flatMap((c) => c.lessons.map((l) => l.id)));
    expect(overallProgress(all)).toBe(100);
  });
});

describe('career path prerequisites', () => {
  it('marks paths without courses as coming soon', () => {
    expect(pathStatus(empty(), getPath('it-foundations'))).toBe('coming-soon');
  });

  it('does not lock on recommended prerequisites', () => {
    const networking = getPath('networking');
    expect(pathPrerequisites(empty(), networking).unlocked).toBe(true);
    expect(pathStatus(empty(), networking)).toBe('not-started');
  });

  it('locks on required prerequisites until they are complete', () => {
    const cloud = getPath('cloud-computing');
    expect(pathStatus(empty(), cloud)).toBe('locked');
    const networkDone = withLessons(getCourse('network-engineering').lessons.map((l) => l.id));
    expect(pathPrerequisites(networkDone, cloud).unlocked).toBe(true);
  });
});

describe('continue learning', () => {
  it('starts with the first roadmap lesson', () => {
    expect(continueLearning(empty()).lesson.id).toBe(ROADMAP_ORDER[0].id);
  });

  it('prefers a half-finished lesson', () => {
    const lesson = getModule('network:beginner').lessons[0];
    const state = { ...empty(), resume: { deckId: lesson.id, plan: [], index: 3 } };
    expect(continueLearning(state).lesson.id).toBe(lesson.id);
    expect(continueLearning(state).resume.index).toBe(3);
  });

  it('continues the most recently studied course', () => {
    const net = getModule('network:beginner').lessons;
    const state = withLessons([net[0].id], 100, Date.now());
    expect(continueLearning(state).lesson.id).toBe(net[1].id);
  });
});

describe('review of past lessons', () => {
  it('returns overdue cards from other studied lessons first', () => {
    const [a, b] = getModule('python:beginner').lessons;
    const now = 1_000_000;
    const state = {
      ...withLessons([a.id, b.id]),
      cards: {
        [a.deck.cards[0].id]: { box: 3, due: now + 10 },
        [a.deck.cards[1].id]: { box: 4, due: now - 10 },
        [b.deck.cards[0].id]: { box: 1, due: now - 10 },
      },
    };
    const picked = pastLessonCards(state, b.id, 5, now).map((c) => c.id);
    expect(picked).toEqual([a.deck.cards[1].id, a.deck.cards[0].id]);
  });
});
