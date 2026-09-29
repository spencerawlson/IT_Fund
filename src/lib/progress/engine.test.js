import { describe, it, expect } from 'vitest';
import { COURSES, PATHS, ROADMAP_ORDER, allLessons, getCourse, getModule, getPath } from '@/data/catalog';
import {
  PASS_PCT, isLessonUnlocked, lessonStatus, moduleLock, courseProgress, courseStatus, courseMinutesLeft,
  pathStatus, pathPrerequisites, continueLearning, pastLessonCards, overallProgress,
  reviewQueue, dueReviewCount, assessmentReviewCards,
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

  // Learner passed the first two Python lessons; everything else is still locked.
  const [py1, py2, py3] = getModule('python:beginner').lessons;
  const lockedLesson = getModule('python:intermediate').lessons[0];
  const now = 1_000_000;
  const card = (lesson, i, box, due) => ({ [lesson.deck.cards[i].id]: { box, due } });

  it('never reviews cards from a lesson the learner cannot open', () => {
    const state = {
      ...withLessons([py1.id, py2.id]),
      // e.g. progress saved by an older version of the app that allowed skipping ahead
      cards: { ...card(py1, 0, 2, now - 5), ...card(lockedLesson, 0, 1, now - 50), ...card(lockedLesson, 1, 1, now - 50) },
    };
    const locked = new Set(lockedLesson.deck.cards.map((c) => c.id));
    expect(lessonStatus(state, lockedLesson)).toBe('locked');
    expect(pastLessonCards(state, null, 10, now).some((c) => locked.has(c.id))).toBe(false);
    expect(reviewQueue(state, 10, now).some((c) => locked.has(c.id))).toBe(false);
    expect(dueReviewCount(state, now)).toBe(1);
  });

  it('spreads picks across lessons instead of drilling one', () => {
    const state = {
      ...withLessons([py1.id, py2.id]),
      cards: {
        // py1's cards are all weaker, so pure priority order would take only py1
        ...card(py1, 0, 1, now - 9), ...card(py1, 1, 1, now - 8), ...card(py1, 2, 1, now - 7),
        ...card(py2, 0, 3, now - 9), ...card(py2, 1, 3, now - 8),
      },
    };
    const picked = pastLessonCards(state, null, 4, now);
    const fromPy1 = picked.filter((c) => c.deckId === py1.id).length;
    expect(picked).toHaveLength(4);
    expect(fromPy1).toBe(2);
  });

  it('tops up from one lesson when there are no others to spread across', () => {
    const state = {
      ...withLessons([py1.id]),
      cards: { ...card(py1, 0, 1, now - 3), ...card(py1, 1, 1, now - 2), ...card(py1, 2, 1, now - 1) },
    };
    expect(pastLessonCards(state, null, 3, now)).toHaveLength(3);
  });

  it('queues only due cards, weakest and longest overdue first', () => {
    const state = {
      ...withLessons([py1.id, py2.id, py3.id]),
      cards: {
        ...card(py1, 0, 3, now - 100), // due, strong
        ...card(py2, 0, 1, now - 10), //  due, weakest
        ...card(py3, 0, 1, now + 10), //  weak but not due yet
      },
    };
    expect(reviewQueue(state, 10, now).map((c) => c.id)).toEqual([py2.deck.cards[0].id, py1.deck.cards[0].id]);
  });

  it('assessment review cards come only from earlier modules', () => {
    const intermediate = getModule('python:intermediate');
    const beginnerIds = getModule('python:beginner').lessons.map((l) => l.id);
    const state = {
      ...withLessons([...beginnerIds, intermediate.lessons[0].id]),
      cards: { ...card(py1, 0, 1, now - 5), ...card(intermediate.lessons[0], 0, 1, now - 5) },
    };
    const picked = assessmentReviewCards(state, intermediate, 3, now).map((c) => c.deckId);
    expect(picked).toEqual([py1.id]);
  });
});
