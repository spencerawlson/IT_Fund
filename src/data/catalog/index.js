// Builds the Academy catalogue (paths → courses → modules → lessons) from the course
// metadata and the existing track/deck content. Pure data: no React, no storage.
import { getTrack, ROADMAP } from '@/data/academy';
import { COURSE_META } from './courses';
import { PATHS } from './paths';
import { CERTIFICATIONS, SKILLS } from './certifications';
import { LESSON_CONTENT } from './lessonContent';

export { PATHS, CERTIFICATIONS, SKILLS };

/** Rough study time: ~45 s per question, ~2 min per hands-on puzzle, 5-minute floor. */
export const lessonMinutes = (deck) => Math.max(5, Math.round(deck.cards.length * 0.75 + (deck.puzzles?.length || 0) * 2));

// Module prerequisites follow the Road to CISSP roadmap: every module in step N requires
// all modules in step N-1. Within a course, modules and lessons also go strictly in order.
const moduleKey = (trackId, tierId) => `${trackId}:${tierId}`;
const ROADMAP_REQUIRES = new Map();
ROADMAP.forEach((step, i) => {
  const prev = i > 0 ? ROADMAP[i - 1].tiers.map(([t, tier]) => moduleKey(t, tier)) : [];
  step.tiers.forEach(([t, tier]) => ROADMAP_REQUIRES.set(moduleKey(t, tier), { step: step.step, required: prev }));
});

function buildCourse(meta) {
  const track = getTrack(meta.trackId);
  const modules = track.tiers.map((tier, mi) => {
    const key = moduleKey(track.id, tier.id);
    const info = meta.modules?.[tier.id] || { title: tier.label, summary: '' };
    const lessons = tier.decks.map((deck, li) => ({
      id: deck.id,
      number: `${mi + 1}.${li + 1}`,
      title: deck.title,
      summary: deck.summary,
      courseSlug: meta.slug,
      moduleKey: key,
      trackId: track.id,
      deck,
      minutes: lessonMinutes(deck),
      content: LESSON_CONTENT[deck.id] || null,
      resources: deck.resources,
    }));
    return {
      key,
      slug: tier.id,
      number: mi + 1,
      title: info.title,
      summary: info.summary,
      level: tier.label,
      color: tier.color,
      courseSlug: meta.slug,
      roadmapStep: ROADMAP_REQUIRES.get(key)?.step ?? null,
      requiredModules: ROADMAP_REQUIRES.get(key)?.required || [],
      lessons,
      minutes: lessons.reduce((s, l) => s + l.minutes, 0),
    };
  });
  return {
    ...meta,
    color: track.color,
    icon: track.icon,
    modules,
    lessons: modules.flatMap((m) => m.lessons),
    minutes: modules.reduce((s, m) => s + m.minutes, 0),
  };
}

export const COURSES = COURSE_META.map(buildCourse);

const COURSE_BY_SLUG = new Map(COURSES.map((c) => [c.slug, c]));
const MODULE_BY_KEY = new Map(COURSES.flatMap((c) => c.modules.map((m) => [m.key, m])));
const LESSON_BY_ID = new Map(COURSES.flatMap((c) => c.lessons.map((l) => [l.id, l])));
const PATH_BY_SLUG = new Map(PATHS.map((p) => [p.slug, p]));

export const getCourse = (slug) => COURSE_BY_SLUG.get(slug);
export const getModule = (key) => MODULE_BY_KEY.get(key);
export const getModuleBySlug = (courseSlug, moduleSlug) => getCourse(courseSlug)?.modules.find((m) => m.slug === moduleSlug);
export const getLesson = (id) => LESSON_BY_ID.get(id);
export const getPath = (slug) => PATH_BY_SLUG.get(slug);
export const allLessons = [...LESSON_BY_ID.values()];

/** Paths that include a course (a course can serve several paths). */
export const pathsForCourse = (courseSlug) => PATHS.filter((p) => p.courses.includes(courseSlug));

/** Every lesson in Road to CISSP roadmap order: the default "what next" order. */
export const ROADMAP_ORDER = ROADMAP.flatMap((step) =>
  step.tiers.flatMap(([trackId, tierId]) => getModule(moduleKey(trackId, tierId))?.lessons || [])
);

export const pathMinutes = (path) => path.courses.reduce((s, slug) => s + (getCourse(slug)?.minutes || 0), 0);

/** "3 h 20 min" style label. */
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round((minutes % 60) / 5) * 5;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const lessonHref = (lesson) => `/academy/lessons/${lesson.id}`;
export const playerHref = (lesson) => `/academy/${lesson.trackId}/lesson/${lesson.id}`;
export const moduleHref = (module) => `/academy/courses/${module.courseSlug}/${module.slug}`;
export const courseHref = (course) => `/academy/courses/${course.slug}`;
export const pathHref = (path) => `/academy/paths/${path.slug}`;
