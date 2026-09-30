// Progress engine: pure functions over the learner's saved state (see src/lib/academy.js).
// No React and no storage here, so every rule is unit-testable and could run server-side.
//
// Nothing is locked. Every lesson, module, course and career path is open from the first visit,
// at every level. The ordering below is the *recommended* path, and prerequisites are guidance the
// UI shows as a short notice ("this builds on..."), never access control:
//   - Recommended order inside a module is lesson by lesson; inside a course, module by module.
//   - A module also recommends every module of the previous Road to CISSP roadmap step.
//   - A career path's `required`, `recommended` and `optional` prerequisites are all advice.
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
  'coming-soon': 'Coming soon',
};

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// ---------- lessons ----------

export const isPassed = (state, lessonId) => (state.lessons?.[lessonId]?.best || 0) >= PASS_PCT;

export function isStarted(state, lesson) {
  return !!state.lessons?.[lesson.id] || state.resume?.deckId === lesson.id || lesson.deck.cards.some((c) => state.cards?.[c.id]);
}

/** 'completed' | 'in-progress' | 'available' -- every lesson that exists is open. */
export function lessonStatus(state, lesson) {
  if (isPassed(state, lesson.id)) return 'completed';
  return isStarted(state, lesson) ? 'in-progress' : 'available';
}

// ---------- modules ----------

export const isModuleComplete = (state, module) => module.lessons.every((l) => isPassed(state, l.id));
export const moduleProgress = (state, module) => pct(module.lessons.filter((l) => isPassed(state, l.id)).length, module.lessons.length);

/**
 * Background recommended before a module, and whether the learner has it: the previous module of
 * the same course, plus every module of the previous Road to CISSP roadmap step. Advice only --
 * the module is open either way.
 * @returns {{ met: boolean, modules: object[] }} `modules`: recommended ones not yet complete.
 */
export function modulePrerequisites(state, module) {
  const course = getCourse(module.courseSlug);
  const modules = [];
  const add = (m) => {
    if (m && !isModuleComplete(state, m) && !modules.includes(m)) modules.push(m);
  };
  add(course.modules[module.number - 2]);
  module.requiredModules.forEach((key) => add(getModule(key)));
  return { met: modules.length === 0, modules };
}

/** 'completed' | 'in-progress' | 'not-started' */
export function moduleStatus(state, module) {
  if (isModuleComplete(state, module)) return 'completed';
  return module.lessons.some((l) => isStarted(state, l)) ? 'in-progress' : 'not-started';
}

/**
 * Background recommended before a lesson: the lesson before it in the same module, plus its
 * module's own recommendations.
 * @returns {{ met: boolean, previous: object|null, modules: object[] }}
 */
export function lessonPrerequisites(state, lesson) {
  const module = getModule(lesson.moduleKey);
  const i = module.lessons.findIndex((l) => l.id === lesson.id);
  const before = module.lessons[i - 1];
  const previous = before && !isPassed(state, before.id) ? before : null;
  const { modules } = modulePrerequisites(state, module);
  return { met: !previous && modules.length === 0, previous, modules };
}

// ---------- courses ----------

export const courseLessonsDone = (state, course) => course.lessons.filter((l) => isPassed(state, l.id)).length;
export const courseProgress = (state, course) => pct(courseLessonsDone(state, course), course.lessons.length);
export const courseMinutesLeft = (state, course) => course.lessons.filter((l) => !isPassed(state, l.id)).reduce((s, l) => s + l.minutes, 0);

/** 'completed' | 'in-progress' | 'not-started' -- courses are open at every level. */
export function courseStatus(state, course) {
  if (course.lessons.every((l) => isPassed(state, l.id))) return 'completed';
  return course.lessons.some((l) => isStarted(state, l)) ? 'in-progress' : 'not-started';
}

/** Background recommended before a course: what its first module builds on. */
export const coursePrerequisites = (state, course) => modulePrerequisites(state, course.modules[0]);

/** The recommended next lesson in a course: the first one not yet passed, in course order. */
export const nextLessonInCourse = (state, course) => course.lessons.find((l) => !isPassed(state, l.id)) || null;

// ---------- paths ----------

const pathCourses = (path) => path.courses.map(getCourse).filter(Boolean);

export function isPathComplete(state, path) {
  const courses = pathCourses(path);
  return courses.length > 0 && courses.every((c) => courseStatus(state, c) === 'completed');
}

/**
 * Prerequisite report for a path, for display only: no kind of prerequisite blocks access. A
 * "coming soon" path (no courses yet) counts as met, since there is nothing to study in it.
 * @returns {{ met: boolean, required: {path, met}[], recommended: {path, met}[], optional: {path, met}[] }}
 *   `met` is true when every `required` path is complete.
 */
export function pathPrerequisites(state, path) {
  const check = (slugs = []) =>
    slugs.map(getPath).filter(Boolean).map((p) => ({ path: p, met: p.courses.length === 0 || isPathComplete(state, p) }));
  const required = check(path.prerequisites?.required);
  return {
    met: required.every((r) => r.met),
    required,
    recommended: check(path.prerequisites?.recommended),
    optional: check(path.prerequisites?.optional),
  };
}

export function pathProgress(state, path) {
  const lessons = pathCourses(path).flatMap((c) => c.lessons);
  return pct(lessons.filter((l) => isPassed(state, l.id)).length, lessons.length);
}

/** 'coming-soon' | 'completed' | 'in-progress' | 'not-started' -- paths are never locked. */
export function pathStatus(state, path) {
  const courses = pathCourses(path);
  if (!courses.length) return 'coming-soon';
  if (isPathComplete(state, path)) return 'completed';
  return courses.some((c) => c.lessons.some((l) => isStarted(state, l))) ? 'in-progress' : 'not-started';
}

// ---------- overall ----------

export const lessonsTotal = allLessons.length;
export const lessonsDone = (state) => allLessons.filter((l) => isPassed(state, l.id)).length;
export const overallProgress = (state) => pct(lessonsDone(state), lessonsTotal);

/**
 * Where the recommended path points next: the next unpassed lesson of the course studied most
 * recently, else the first unpassed lesson in Road to CISSP roadmap order.
 * @returns {object|null}
 */
export function recommendedNext(state) {
  const recent = Object.entries(state.lessons || {})
    .filter(([id]) => getLesson(id))
    .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))[0];
  if (recent) {
    const next = nextLessonInCourse(state, getCourse(getLesson(recent[0]).courseSlug));
    if (next) return next;
  }
  return ROADMAP_ORDER.find((l) => !isPassed(state, l.id)) || null;
}

/**
 * What "Continue Learning" should open: a half-finished lesson (saved mid-lesson) if there is one,
 * else `recommendedNext`. Since any lesson can be opened, a saved lesson may be a detour, so
 * `onPath` carries the recommendation whenever it is somewhere else — the dashboard offers both
 * rather than silently retargeting the path to wherever the learner last wandered.
 * @returns {{ lesson, resume: object|null, onPath: object|null } | null}
 */
export function continueLearning(state) {
  const recommended = recommendedNext(state);
  const saved = state.resume?.deckId && getLesson(state.resume.deckId);
  if (saved) {
    const onPath = recommended && recommended.id !== saved.id ? recommended : null;
    return { lesson: saved, resume: state.resume, onPath };
  }
  return recommended ? { lesson: recommended, resume: null, onPath: null } : null;
}

// ---------- review ----------
// Review draws from every lesson the learner has actually studied, wherever they studied it: a
// card is reviewable once it has been seen. Picks are interleaved across lessons, because mixing
// topics beats drilling one at a time.

/** Studied cards the learner may review: { c: card, s: saved state, lessonId, passed }. */
function reviewableCards(state, excludeLessonIds = []) {
  const exclude = new Set([].concat(excludeLessonIds).filter(Boolean));
  return allLessons
    .filter((l) => !exclude.has(l.id))
    .flatMap((l) => {
      const passed = isPassed(state, l.id);
      return l.deck.cards
        .filter((c) => state.cards?.[c.id])
        .map((c) => ({ c, s: state.cards[c.id], lessonId: l.id, passed }));
    });
}

/**
 * Overdue before not-yet-due; then lessons the learner passed before ones they only sampled (they
 * can open anything, so browsing an advanced lesson must not crowd out learnt material); then the
 * weakest box; then the longest overdue.
 */
const byReviewPriority = (now) => (a, b) => {
  const aDue = a.s.due <= now;
  const bDue = b.s.due <= now;
  if (aDue !== bDue) return aDue ? -1 : 1;
  if (a.passed !== b.passed) return a.passed ? -1 : 1;
  return a.s.box - b.s.box || a.s.due - b.s.due;
};

/**
 * Takes `count` items in priority order, at most `perLesson` from any one lesson, then tops up
 * from the remainder if there were not enough lessons to spread across.
 */
function interleave(ranked, count, perLesson) {
  const picked = [];
  const skipped = [];
  const perLessonCount = {};
  for (const item of ranked) {
    if (picked.length >= count) break;
    if ((perLessonCount[item.lessonId] || 0) < perLesson) {
      picked.push(item);
      perLessonCount[item.lessonId] = (perLessonCount[item.lessonId] || 0) + 1;
    } else {
      skipped.push(item);
    }
  }
  for (const item of skipped) {
    if (picked.length >= count) break;
    picked.push(item);
  }
  return picked;
}

const perLessonCap = (count) => Math.max(2, Math.ceil(count / 4));

/**
 * Cards from other studied lessons: overdue first, then the weakest and oldest, spread across
 * lessons. `excludeLessonIds` is one id or a list (e.g. every lesson of a module).
 */
export function pastLessonCards(state, excludeLessonIds, count, now = Date.now()) {
  const ranked = reviewableCards(state, excludeLessonIds).sort(byReviewPriority(now));
  return interleave(ranked, count, perLessonCap(count)).map(({ c }) => c);
}

/** Cards due for spaced-repetition review now, most urgent first, spread across lessons. */
export function reviewQueue(state, count, now = Date.now()) {
  const ranked = reviewableCards(state)
    .filter(({ s }) => s.box > 0 && s.due <= now)
    .sort(byReviewPriority(now));
  return interleave(ranked, count, perLessonCap(count)).map(({ c }) => c);
}

/** How many cards are due for review now. */
export const dueReviewCount = (state, now = Date.now()) =>
  reviewableCards(state).filter(({ s }) => s.box > 0 && s.due <= now).length;

/**
 * Cumulative part of a module assessment: the learner's weakest cards from lessons outside this
 * module.
 */
export const assessmentReviewCards = (state, module, count, now = Date.now()) =>
  pastLessonCards(state, module.lessons.map((l) => l.id), count, now);

// ---------- compatibility helpers for the original track pages ----------

const tierModule = (track, tierIndex) => getModule(`${track.id}:${track.tiers[tierIndex].id}`);
export const isTierComplete = (state, track, tierIndex) => isModuleComplete(state, tierModule(track, tierIndex));

export { COURSES, PATHS };
