// Data-driven cards and lists for paths, courses, modules and lessons, built on the kit.
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, BookOpen } from 'lucide-react';
import RichText from '@/components/academy/RichText';
import { Button, Card, LessonRow } from '@/components/ui-glass';
import {
  getCourse, getModule, formatMinutes, pathMinutes, pathHref, courseHref, moduleHref, lessonHref, playerHref,
} from '@/data/catalog';
import {
  pathStatus, pathProgress, pathPrerequisites, courseStatus, courseProgress, courseMinutesLeft,
  moduleStatus, moduleProgress, modulePrerequisites, lessonStatus,
} from '@/lib/progress/engine';
import { ProgressBar, StatusBadge, IconTile } from './bits';

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

/**
 * A module's recommended background, as <PrereqNotice> items. `externalOnly` drops modules of the
 * same course, whose order a syllabus already makes obvious.
 */
export const modulePrereqItems = (state, module, { externalOnly = false } = {}) =>
  modulePrerequisites(state, module).modules
    .filter((m) => !externalOnly || m.courseSlug !== module.courseSlug)
    .map((m) => ({
      label: m.courseSlug === module.courseSlug ? `Module ${m.number}: ${m.title}` : `${getCourse(m.courseSlug).title} · Module ${m.number}`,
      to: moduleHref(m),
    }));

const passedIn = (state, lessons) => lessons.filter((l) => lessonStatus(state, l) === 'completed').length;
const meta = (...parts) => parts.filter(Boolean).join(' · ');

/** The dashboard hero: the one next lesson, and one primary action. */
export function ContinueLearning({ state, next }) {
  if (!next) {
    return (
      <Card level={2} padding="lg">
        <h2 className="text-heading text-ink-1">Every lesson is complete.</h2>
        <p className="mt-2 text-body text-ink-2">Keep your reviews going, or take a module’s knowledge assessment.</p>
      </Card>
    );
  }
  const { lesson, resume } = next;
  const course = getCourse(lesson.courseSlug);
  const module = getModule(lesson.moduleKey);
  const total = resume?.plan?.length;
  const started = lessonStatus(state, lesson) === 'in-progress';
  const label = resume ? `Resume${total ? ` · step ${resume.index + 1} of ${total}` : ''}` : started ? 'Continue lesson' : 'Start lesson';

  return (
    <Card as="section" padding="lg" aria-labelledby="continue-heading">
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">
        {resume ? 'Pick up where you left off' : 'Up next'}
      </p>
      <div className="mt-4 flex items-start gap-4">
        <IconTile icon={course.icon} color={course.color} size="lg" />
        <div className="min-w-0">
          <p className="text-small text-ink-2">{course.title} · Module {module.number}: {module.title}</p>
          <h2 id="continue-heading" className="mt-1 text-heading text-ink-1">
            Lesson {lesson.number}: <RichText text={lesson.title} />
          </h2>
          <p className="mt-1 text-small text-ink-2">{meta(`${lesson.minutes} min`, `${lesson.deck.cards.length} questions`)}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between gap-4 text-small text-ink-2">
          <span>{passedIn(state, course.lessons)} of {course.lessons.length} lessons in {course.title}</span>
          <span className="shrink-0">{formatMinutes(courseMinutesLeft(state, course))} left</span>
        </div>
        <ProgressBar value={courseProgress(state, course)} label={`${course.title} progress`} showValue={false} />
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button to={playerHref(lesson)} size="lg" icon={resume || started ? RotateCcw : Play}>{label}</Button>
        <Button to={lessonHref(lesson)} size="lg" variant="secondary" icon={BookOpen}>Read the lesson first</Button>
      </div>
    </Card>
  );
}

function CardTop({ icon, color, status, title, text, as: Heading = 'h3' }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={icon} color={color} />
        <StatusBadge status={status} />
      </div>
      <Heading className="mt-4 text-heading text-ink-1">{title}</Heading>
      <p className="mt-1 line-clamp-2 text-small text-ink-2">{text}</p>
    </>
  );
}

/** `headingAs`: 'h2' when the card sits directly under the page h1 (index pages). */
export function LearningPathCard({ state, path, headingAs }) {
  const status = pathStatus(state, path);
  const courses = path.courses.map(getCourse).filter(Boolean);
  const missing = pathPrerequisites(state, path).required.filter((r) => !r.met);
  const comingSoon = status === 'coming-soon';
  const body = (
    <>
      <CardTop icon={path.icon} color={path.color} status={status} title={path.title} text={path.summary} as={headingAs} />
      <p className="mt-3 text-small text-ink-2">
        {comingSoon ? meta(path.difficulty, 'Courses in development') : meta(path.difficulty, `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`, formatMinutes(pathMinutes(path)))}
      </p>
      {!comingSoon && <ProgressBar className="mt-4" value={pathProgress(state, path)} label={`${path.title} progress`} />}
      {missing.length > 0 && (
        <p className="mt-3 text-small text-ink-2">
          Recommended first: {missing.map((m) => m.path.title).join(' and ')}
        </p>
      )}
    </>
  );
  return comingSoon ? <Card>{body}</Card> : <Card to={pathHref(path)}>{body}</Card>;
}

export function CourseCard({ state, course, headingAs }) {
  return (
    <Card to={courseHref(course)}>
      <CardTop icon={course.icon} color={course.color} status={courseStatus(state, course)} title={course.title} text={course.description} as={headingAs} />
      <p className="mt-3 text-small text-ink-2">
        {meta(course.difficulty, `${course.modules.length} modules`, `${course.lessons.length} lessons`, formatMinutes(course.minutes))}
      </p>
      <ProgressBar className="mt-4" value={courseProgress(state, course)} label={`${course.title} progress`} />
    </Card>
  );
}

/** Lessons of one module, with status, number and time. Every lesson is open, so every row links. */
export function LessonList({ state, module }) {
  const statuses = module.lessons.map((l) => lessonStatus(state, l));
  const currentIndex = statuses.findIndex((s) => s === 'in-progress' || s === 'available');
  return (
    <ol className="space-y-1">
      {module.lessons.map((lesson, i) => (
        <li key={lesson.id}>
          <LessonRow
            number={lesson.number}
            title={<RichText text={lesson.title} />}
            status={statuses[i]}
            minutes={lesson.minutes}
            to={lessonHref(lesson)}
            current={i === currentIndex}
          />
        </li>
      ))}
    </ol>
  );
}

/**
 * Module sections for a course page: header, progress, then its lessons. Every module is open, so
 * the order is the recommended one, not a sequence of gates.
 */
export function ModuleList({ state, course }) {
  return (
    <ol className="space-y-4">
      {course.modules.map((module) => (
        <li key={module.key}>
          <Card level={2} padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Module {module.number} · {module.level}</p>
                <h3 className="mt-1 text-heading text-ink-1">
                  <Link to={moduleHref(module)} className="hover:underline hover:decoration-white/40 hover:underline-offset-4">{module.title}</Link>
                </h3>
                <p className="mt-1 text-small text-ink-2">{meta(module.summary, `${module.lessons.length} lessons`, formatMinutes(module.minutes))}</p>
              </div>
              <StatusBadge status={moduleStatus(state, module)} />
            </div>
            <ProgressBar className="mt-4" value={moduleProgress(state, module)} label={`Module ${module.number} progress`} />
            <div className="-mx-2 mt-4">
              <LessonList state={state} module={module} />
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
