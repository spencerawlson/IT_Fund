// Data-driven cards and lists for paths, courses, modules and lessons.
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, Clock, Lock, Check, CircleDot, Circle, Flame, Star, ArrowRight } from 'lucide-react';
import RichText from '@/components/academy/RichText';
import {
  getCourse, getModule, formatMinutes, pathMinutes, pathHref, courseHref, moduleHref, lessonHref, playerHref,
} from '@/data/catalog';
import {
  pathStatus, pathProgress, pathPrerequisites, courseStatus, courseProgress, courseMinutesLeft,
  moduleStatus, moduleProgress, moduleLock, lessonStatus, overallProgress, lessonsDone, lessonsTotal,
} from '@/lib/progress/engine';
import { levelInfo, liveStreak } from '@/lib/academy';
import { ProgressBar, StatusBadge, Pill, IconTile } from './bits';

/** Maps a path's prerequisite report into <Prerequisites> items. */
export const pathPrereqItems = (state, path) => {
  const report = pathPrerequisites(state, path);
  const map = (list) => list.map(({ path: p, met }) => ({ label: p.title, to: pathHref(p), met }));
  return { required: map(report.required), recommended: map(report.recommended), optional: map(report.optional) };
};

/** Modules from other courses a module requires (from the roadmap). */
export const externalModulePrereqs = (state, module) =>
  module.requiredModules
    .map(getModule)
    .filter((m) => m && m.courseSlug !== module.courseSlug)
    .map((m) => ({ label: `${getCourse(m.courseSlug).title} · Module ${m.number}`, to: moduleHref(m), met: moduleStatus(state, m) === 'completed' }));

export function ContinueLearning({ state, next }) {
  const lvl = levelInfo(state.xp);
  const streak = liveStreak(state);
  if (!next) {
    return (
      <section className="glass rounded-[2rem] p-7 sm:p-9">
        <h2 className="text-2xl font-bold">Every open lesson is complete.</h2>
        <p className="mt-2 text-slate-300">Keep your reviews going, or take a module’s knowledge assessment.</p>
      </section>
    );
  }
  const { lesson, resume } = next;
  const course = getCourse(lesson.courseSlug);
  const module = getModule(lesson.moduleKey);
  const cProgress = courseProgress(state, course);
  const total = resume?.plan?.length;

  return (
    <section aria-labelledby="continue-heading" className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: course.color }} />
      <div className="relative">
        <h2 id="continue-heading" className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
          {resume ? 'Pick up where you left off' : 'Continue learning'}
        </h2>
        <div className="mt-5 flex items-start gap-4">
          <IconTile icon={course.icon} color={course.color} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-300">{course.title}</p>
            <p className="mt-0.5 text-sm text-slate-400">Module {module.number}: {module.title}</p>
            <p className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
              Lesson {lesson.number}: <RichText text={lesson.title} />
            </p>
          </div>
        </div>

        <dl className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Course progress</dt>
            <dd className="mt-2"><ProgressBar value={cProgress} color={course.color} label={`${course.title} progress`} /></dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall · {lessonsDone(state)} of {lessonsTotal} lessons</dt>
            <dd className="mt-2"><ProgressBar value={overallProgress(state)} label="Overall Academy progress" /></dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
          <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden="true" /> {formatMinutes(courseMinutesLeft(state, course))} left in course</span>
          <span className="inline-flex items-center gap-1.5"><Star size={15} className="text-amber-300" aria-hidden="true" /> Level {lvl.level} · {state.xp.toLocaleString()} XP</span>
          <span className="inline-flex items-center gap-1.5"><Flame size={15} className="text-orange-400" aria-hidden="true" /> {streak}-day streak</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={playerHref(lesson)} className="glass-btn inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-bold" style={{ '--tint': course.color }}>
            {resume ? <RotateCcw size={17} aria-hidden="true" /> : <Play size={17} className="fill-current" aria-hidden="true" />}
            {resume ? `Resume${total ? ` at step ${resume.index + 1} of ${total}` : ''}` : 'Continue learning'}
          </Link>
          <Link to={lessonHref(lesson)} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10">
            Read the lesson first
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LearningPathCard({ state, path }) {
  const status = pathStatus(state, path);
  const courses = path.courses.map(getCourse).filter(Boolean);
  const report = pathPrerequisites(state, path);
  const missing = report.required.filter((r) => !r.met);
  const comingSoon = status === 'coming-soon';
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={path.icon} color={path.color} />
        <StatusBadge status={status} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{path.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{path.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill>{path.difficulty}</Pill>
        {!comingSoon && <Pill>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</Pill>}
        {!comingSoon && <Pill>{formatMinutes(pathMinutes(path))}</Pill>}
      </div>
      {!comingSoon && <ProgressBar className="mt-5" value={pathProgress(state, path)} color={path.color} label={`${path.title} progress`} />}
      {missing.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
          <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> Requires {missing.map((m) => m.path.title).join(' and ')}
        </p>
      )}
      {missing.length === 0 && report.recommended.some((r) => !r.met) && (
        <p className="mt-3 text-xs text-slate-400">
          Recommended first: {report.recommended.filter((r) => !r.met).map((r) => r.path.title).join(', ')}
        </p>
      )}
      {comingSoon && <p className="mt-3 text-xs text-slate-400">Courses for this path are in development.</p>}
    </>
  );
  if (comingSoon) return <div className="glass rounded-3xl p-6 opacity-70">{body}</div>;
  return (
    <Link to={pathHref(path)} className="glass glass-hover block rounded-3xl p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      {body}
    </Link>
  );
}

export function CourseCard({ state, course }) {
  return (
    <Link to={courseHref(course)} className="glass glass-hover block rounded-3xl p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={course.icon} color={course.color} />
        <StatusBadge status={courseStatus(state, course)} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{course.title}</h3>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-300">{course.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill>{course.difficulty}</Pill>
        <Pill>{course.modules.length} modules · {course.lessons.length} lessons</Pill>
        <Pill>{formatMinutes(course.minutes)}</Pill>
      </div>
      <ProgressBar className="mt-5" value={courseProgress(state, course)} color={course.color} label={`${course.title} progress`} />
    </Link>
  );
}

const LESSON_ICON = { completed: Check, 'in-progress': CircleDot, available: Circle, locked: Lock };

/** Lessons of one module, with status, number and time. Locked lessons are not links. */
export function LessonList({ state, module, color }) {
  return (
    <ol className="space-y-2">
      {module.lessons.map((lesson) => {
        const status = lessonStatus(state, lesson);
        const Icon = LESSON_ICON[status];
        const locked = status === 'locked';
        const inner = (
          <>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
              style={status === 'completed' ? { background: color, borderColor: 'rgba(255,255,255,0.4)' } : { borderColor: locked ? 'rgba(255,255,255,0.1)' : color }}
            >
              <Icon size={15} aria-hidden="true" className={locked ? 'text-slate-500' : 'text-white'} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[15px] font-semibold ${locked ? 'text-slate-500' : 'text-white'}`}>
                {lesson.number} · <RichText text={lesson.title} />
              </span>
              <span className="text-xs text-slate-400">{lessonStatusLabel(status)} · {lesson.minutes} min</span>
            </span>
            {!locked && <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />}
          </>
        );
        return (
          <li key={lesson.id}>
            {locked ? (
              <div className="flex items-center gap-4 rounded-2xl px-3 py-3 opacity-70">{inner}</div>
            ) : (
              <Link to={lessonHref(lesson)} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const lessonStatusLabel = (s) => ({ completed: 'Completed', 'in-progress': 'In progress', available: 'Ready to start', locked: 'Locked' })[s];

/** Module rows for a course page, each expanding into its lessons. */
export function ModuleList({ state, course }) {
  return (
    <ol className="space-y-4">
      {course.modules.map((module) => {
        const status = moduleStatus(state, module);
        const lock = moduleLock(state, module);
        return (
          <li key={module.key} className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Module {module.number} · {module.level}</p>
                <Link to={moduleHref(module)} className="mt-1 block text-lg font-bold text-white hover:underline">{module.title}</Link>
                {module.summary && <p className="mt-1 text-sm text-slate-300">{module.summary}</p>}
              </div>
              <StatusBadge status={status} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
              <span>{module.lessons.length} lessons</span>
              <span>{formatMinutes(module.minutes)}</span>
            </div>
            <ProgressBar className="mt-3" value={moduleProgress(state, module)} color={course.color} label={`Module ${module.number} progress`} />
            {!lock.unlocked && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
                <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                Opens after: {lock.blockers.map((m) => `${getCourse(m.courseSlug).title} · Module ${m.number}`).join(', ')}
              </p>
            )}
            {lock.unlocked && (
              <div className="mt-4">
                <LessonList state={state} module={module} color={course.color} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
