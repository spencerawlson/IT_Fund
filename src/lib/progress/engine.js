// Progress engine: pure functions over the learner's saved state (see src/lib/academy.js).
// No React and no storage here, so every rule is unit-testable and could run server-side.
//
// Locking rules (hard locks are "required" only; everything else is guidance):
//   - Lessons inside a module go strictly in order: pass one to open the next.
//   - Modules inside a course go strictly in order.
//   - A module also requires every module of the previous Road to CISSP roadmap step.
//   - A career path is locked until its `required` paths are complete; `recommended` and
//     `optional` paths only produce labelled warnings.
import {
  COURSES, PATHS, ROADMAP_ORDER, allLessons, getCourse, getLesson, getModule, getPath,
} from '@/data/catalog';

/** First-try accuracy needed to pass a lesson. */
export const PASS_PCT = 70;

export const STATUS = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
  available: 'Available',
  locked: 'Locked',
  'coming-soon': 'Coming soon',
};

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// ---------- lessons ----------

export const isPassed = (state, lessonId) => (state.lessons?.[lessonId]?.best || 0) >= PASS_PCT;

export function isStarted(state, lesson) {
  return !!state.lessons?.[lesson.id] || state.resume?.deckId === lesson.id || lesson.deck.cards.some((c) => state.cards?.[c.id]);
}

export function isLessonUnlocked(state, lessonId) {
  const lesson = getLesson(lessonId);
  if (!lesson) return false;
  if (isPassed(state, lessonId)) return true;
  const module = getModule(lesson.moduleKey);
  if (!moduleLock(state, module).unlocked) return false;
  const i = module.lessons.findIndex((l) => l.id === lessonId);
  return i === 0 || isPassed(state, module.lessons[i - 1].id);
}

/** 'completed' | 'in-progress' | 'available' | 'locked' */
export function lessonStatus(state, lesson) {
  if (isPassed(state, lesson.id)) return 'completed';
  if (!isLessonUnlocked(state, lesson.id)) return 'locked';
  return isStarted(state, lesson) ? 'in-progress' : 'available';
}

// ---------- modules ----------

export const isModuleComplete = (state, module) => module.lessons.every((l) => isPassed(state, l.id));
export const moduleProgress = (state, module) => pct(module.lessons.filter((l) => isPassed(state, l.id)).length, module.lessons.length);

/** { unlocked, blockers: modules that must be completed first } */
export function moduleLock(state, module) {
  const course = getCourse(module.courseSlug);
  const blockers = [];
  const prev = course.modules[module.number - 2];
  if (prev && !isModuleComplete(state, prev)) blockers.push(prev);
  module.requiredModules.forEach((key) => {
    const m = getModule(key);
    if (m && !isModuleComplete(state, m) && !blockers.includes(m)) blockers.push(m);
  });
  // Once any lesson in a module is passed, keep it open even if prerequisites change later.
  const sticky = module.lessons.some((l) => isPassed(state, l.id));
  return { unlocked: sticky || blockers.length === 0, blockers: sticky ? [] : blockers };
}

export function moduleStatus(state, module) {
  if (isModuleComplete(state, module)) return 'completed';
  if (!moduleLock(state, module).unlocked) return 'locked';
  return module.lessons.some((l) => isStarted(state, l)) ? 'in-progress' : 'not-started';
}

// ---------- courses ----------

export const courseLessonsDone = (state, course) => course.lessons.filter((l) => isPassed(state, l.id)).length;
export const courseProgress = (state, course) => pct(courseLessonsDone(state, course), course.lessons.length);
export const courseMinutesLeft = (state, course) => course.lessons.filter((l) => !isPassed(state, l.id)).reduce((s, l) => s + l.minutes, 0);

export function courseStatus(state, course) {
  if (course.lessons.every((l) => isPassed(state, l.id))) return 'completed';
  if (!moduleLock(state, course.modules[0]).unlocked) return 'locked';
  return course.lessons.some((l) => isStarted(state, l)) ? 'in-progress' : 'not-started';
}

/** The next lesson to take in a course: first unpassed lesson that is open, or null. */
export const nextLessonInCourse = (state, course) =>
  course.lessons.find((l) => !isPassed(state, l.id) && isLessonUnlocked(state, l.id)) || null;

// ---------- paths ----------

const pathCourses = (path) => path.courses.map(getCourse).filter(Boolean);

export function isPathComplete(state, path) {
  const courses = pathCourses(path);
  return courses.length > 0 && courses.every((c) => courseStatus(state, c) === 'completed');
}

/**
 * Prerequisite report for a path. A "coming soon" path (no courses yet) can never block anyone.
 * @returns {{ unlocked: boolean, required: {path, met}[], recommended: {path, met}[], optional: {path, met}[] }}
 */
export function pathPrerequisites(state, path) {
  const check = (slugs = []) =>
    slugs.map(getPath).filter(Boolean).map((p) => ({ path: p, met: p.courses.length === 0 || isPathComplete(state, p) }));
  const required = check(path.prerequisites?.required);
  return {
    unlocked: required.every((r) => r.met),
    required,
    recommended: check(path.prerequisites?.recommended),
    optional: check(path.prerequisites?.optional),
  };
}

export function pathProgress(state, path) {
  const lessons = pathCourses(path).flatMap((c) => c.lessons);
  return pct(lessons.filter((l) => isPassed(state, l.id)).length, lessons.length);
}

/** 'coming-soon' | 'completed' | 'in-progress' | 'locked' | 'not-started' */
export function pathStatus(state, path) {
  const courses = pathCourses(path);
  if (!courses.length) return 'coming-soon';
  if (isPathComplete(state, path)) return 'completed';
  const started = courses.some((c) => c.lessons.some((l) => isStarted(state, l)));
  if (started) return 'in-progress';
  return pathPrerequisites(state, path).unlocked ? 'not-started' : 'locked';
}

// ---------- overall ----------

export const lessonsTotal = allLessons.length;
export const lessonsDone = (state) => allLessons.filter((l) => isPassed(state, l.id)).length;
export const overallProgress = (state) => pct(lessonsDone(state), lessonsTotal);

/**
 * What "Continue Learning" should open:
 *   1. a half-finished lesson (saved mid-lesson),
 *   2. else the next lesson in the course you studied most recently,
 *   3. else the first open lesson in Road to CISSP roadmap order.
 * @returns {{ lesson, resume: object|null } | null}
 */
export function continueLearning(state) {
  const saved = state.resume?.deckId && getLesson(state.resume.deckId);
  if (saved && isLessonUnlocked(state, saved.id)) return { lesson: saved, resume: state.resume };

  const recent = Object.entries(state.lessons || {})
    .filter(([id]) => getLesson(id))
    .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))[0];
  if (recent) {
    const next = nextLessonInCourse(state, getCourse(getLesson(recent[0]).courseSlug));
    if (next) return { lesson: next, resume: null };
  }
  const first = ROADMAP_ORDER.find((l) => !isPassed(state, l.id) && isLessonUnlocked(state, l.id));
  return first ? { lesson: first, resume: null } : null;
}

/** Cards from earlier, already-studied lessons: overdue first, then the weakest and oldest. */
export function pastLessonCards(state, excludeLessonId, count, now = Date.now()) {
  return allLessons
    .filter((l) => l.id !== excludeLessonId && state.lessons?.[l.id])
    .flatMap((l) => l.deck.cards)
    .filter((c) => state.cards?.[c.id])
    .map((c) => ({ c, s: state.cards[c.id] }))
    .sort((a, b) => {
      const aDue = a.s.due <= now;
      const bDue = b.s.due <= now;
      if (aDue !== bDue) return aDue ? -1 : 1;
      return a.s.box - b.s.box || a.s.due - b.s.due;
    })
    .slice(0, count)
    .map(({ c }) => c);
}

// ---------- compatibility helpers for the original track pages ----------

const tierModule = (track, tierIndex) => getModule(`${track.id}:${track.tiers[tierIndex].id}`);
export const isTierOpen = (state, track, tierIndex) => moduleLock(state, tierModule(track, tierIndex)).unlocked;
export const isTierComplete = (state, track, tierIndex) => isModuleComplete(state, tierModule(track, tierIndex));

export { COURSES, PATHS };
