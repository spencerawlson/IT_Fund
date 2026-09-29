import React from 'react';
import { useParams } from 'react-router-dom';
import { Play, Swords, Lock, Check, SearchX } from 'lucide-react';
import { IconTile, Prerequisites } from '@/components/academy/ui/bits';
import { CourseCard, LessonList, ModuleList, externalModulePrereqs } from '@/components/academy/ui/cards';
import {
  Button, Card, EmptyState, ListLink, PageContainer, PageHeader, ProgressBar, SectionHeader, StatusBadge,
} from '@/components/ui-glass';
import { getTrack, trackResources } from '@/data/academy';
import {
  COURSES, CERTIFICATIONS, SKILLS, getCourse, getModuleBySlug, pathsForCourse, formatMinutes, courseHref, pathHref, playerHref,
} from '@/data/catalog';
import { useAcademy, bossKey, BOSS_PASS_PCT } from '@/lib/academy';
import {
  courseProgress, courseStatus, courseMinutesLeft, nextLessonInCourse, moduleLock, moduleProgress, moduleStatus, isModuleComplete,
  pathPrerequisites, lessonStatus,
} from '@/lib/progress/engine';

// Courses you're working on come first; locked ones last.
const ORDER = { 'in-progress': 0, 'not-started': 1, completed: 2, locked: 3 };
const passed = (state, lessons) => lessons.filter((l) => lessonStatus(state, l) === 'completed').length;

export function CoursesIndex() {
  const state = useAcademy();
  const courses = [...COURSES].sort((a, b) => ORDER[courseStatus(state, a)] - ORDER[courseStatus(state, b)]);
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Courses' }]}
        title="Courses"
        description="Each course is a sequence of modules, and each module a sequence of lessons. Courses open as you finish the ones before them."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.slug} state={state} course={course} headingAs="h2" />
        ))}
      </div>
    </PageContainer>
  );
}

function CourseNotFound() {
  return (
    <PageContainer>
      <EmptyState icon={SearchX} title="Course not found" text="It may have been renamed." to="/academy/courses" action="See all courses" />
    </PageContainer>
  );
}

export function CourseDetail() {
  const { courseSlug } = useParams();
  const state = useAcademy();
  const course = getCourse(courseSlug);
  if (!course) return <CourseNotFound />;

  const next = nextLessonInCourse(state, course);
  const status = courseStatus(state, course);
  const required = externalModulePrereqs(state, course.modules[0]);
  // Recommended background comes from the career paths this course belongs to.
  const recommended = new Map();
  pathsForCourse(course.slug).forEach((p) =>
    pathPrerequisites(state, p).recommended.forEach(({ path, met }) => recommended.set(path.slug, { label: path.title, to: pathHref(path), met }))
  );
  const certifications = course.certifications.map((id) => CERTIFICATIONS[id]).filter(Boolean);
  const track = getTrack(course.trackId);
  const resources = track ? trackResources(track) : [];

  return (
    <PageContainer wide>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Courses', to: '/academy/courses' }, { label: course.title }]}
        eyebrow={`${course.difficulty} course`}
        title={course.title}
        description={course.description}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Progress and the next step: first on phones, a sticky sidebar on desktop. */}
        <aside aria-label="Course progress" className="lg:sticky lg:top-6 lg:order-last">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <IconTile icon={course.icon} color={course.color} />
              <StatusBadge status={status} />
            </div>
            <p className="mt-4 text-small text-ink-2">{passed(state, course.lessons)} of {course.lessons.length} lessons complete</p>
            <ProgressBar className="mt-2" value={courseProgress(state, course)} label={`${course.title} progress`} />
            <dl className="mt-4 space-y-1 text-small">
              <div className="flex justify-between gap-3"><dt className="text-ink-2">Modules</dt><dd className="text-ink-1">{course.modules.length}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-2">Total time</dt><dd className="text-ink-1">{formatMinutes(course.minutes)}</dd></div>
              {status !== 'completed' && (
                <div className="flex justify-between gap-3"><dt className="text-ink-2">Time left</dt><dd className="text-ink-1">{formatMinutes(courseMinutesLeft(state, course))}</dd></div>
              )}
            </dl>
            {next ? (
              <Button to={playerHref(next)} icon={Play} className="mt-5 w-full">
                {status === 'not-started' ? 'Start' : 'Continue'}: Lesson {next.number}
              </Button>
            ) : (
              status === 'locked' && (
                <p className="mt-5 flex items-start gap-2 text-small text-ink-2">
                  <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Opens after the prerequisites below.
                </p>
              )
            )}
          </Card>
        </aside>

        <div className="min-w-0 space-y-12">
          <section aria-labelledby="modules-heading">
            <SectionHeader id="modules-heading" title="Syllabus" description={`${course.modules.length} modules · ${course.lessons.length} lessons`} />
            <ModuleList state={state} course={course} />
          </section>

          <section aria-labelledby="learn-heading">
            <SectionHeader id="learn-heading" title="What you’ll learn" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {course.objectives.map((o) => (
                <li key={o} className="flex gap-3 text-body text-ink-1">
                  <Check size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" />{o}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="prereq-heading">
            <SectionHeader id="prereq-heading" title="Before you start" />
            <Prerequisites items={{ required, recommended: [...recommended.values()] }} />
          </section>

          <section aria-labelledby="outcomes-heading" className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 id="outcomes-heading" className="text-heading text-ink-1">Skills</h2>
              <p className="mt-2 text-body text-ink-2">{course.skills.map((s) => SKILLS[s] || s).join(', ')}</p>
            </div>
            {certifications.length > 0 && (
              <div>
                <h2 className="text-heading text-ink-1">Prepares you for</h2>
                <ul className="mt-2 space-y-1 text-body text-ink-2">
                  {certifications.map((c) => <li key={c.id}>{c.vendor} {c.name}</li>)}
                </ul>
              </div>
            )}
          </section>

          {resources.length > 0 && (
            <section aria-labelledby="resources-heading">
              <SectionHeader id="resources-heading" title="Free resources" description="The lessons summarise these sources. Go deeper with the originals." />
              <Card level={2} padding="sm">
                <ul className="divide-y divide-white/[0.06]">
                  {resources.map((r) => <li key={r.id}><ListLink href={r.url} title={r.title} /></li>)}
                </ul>
              </Card>
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export function ModuleDetail() {
  const { courseSlug, moduleSlug } = useParams();
  const state = useAcademy();
  const course = getCourse(courseSlug);
  const module = getModuleBySlug(courseSlug, moduleSlug);

  if (!course || !module) {
    return (
      <PageContainer>
        <EmptyState icon={SearchX} title="Module not found" to={course ? courseHref(course) : '/academy/courses'} action="Back to the course" />
      </PageContainer>
    );
  }
  const lock = moduleLock(state, module);
  const complete = isModuleComplete(state, module);
  const bestBoss = state.bosses?.[bossKey(course.trackId, module.slug)] || 0;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: course.title, to: courseHref(course) }, { label: `Module ${module.number}` }]}
        eyebrow={`Module ${module.number} · ${module.level}`}
        title={module.title}
        description={module.summary}
      />
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-2">
        <StatusBadge status={moduleStatus(state, module)} />
        <span>{module.lessons.length} lessons</span>
        <span>{formatMinutes(module.minutes)}</span>
      </div>

      <Card level={2} padding="md">
        <ProgressBar value={moduleProgress(state, module)} label={`Module ${module.number} progress`} />
        {lock.unlocked ? (
          <div className="-mx-2 mt-4">
            <LessonList state={state} module={module} />
          </div>
        ) : (
          <div className="mt-5">
            <p className="mb-4 flex items-center gap-2 text-body text-ink-1"><Lock size={16} aria-hidden="true" /> This module opens after:</p>
            <Prerequisites
              items={{
                required: lock.blockers.map((m) => ({ label: `${getCourse(m.courseSlug).title} · Module ${m.number}: ${m.title}`, to: `/academy/courses/${m.courseSlug}/${m.slug}`, met: false })),
              }}
            />
          </div>
        )}
      </Card>

      <Card as="section" aria-labelledby="assessment-heading" className="mt-6">
        <h2 id="assessment-heading" className="text-heading text-ink-1">Module assessment</h2>
        <p className="mt-1 max-w-reading text-body text-ink-2">
          15 questions from every lesson in this module, 3 lives. Score {BOSS_PASS_PCT}% to pass.
          {bestBoss ? ` Best so far: ${bestBoss}%.` : ''}
        </p>
        {complete ? (
          <Button to={`/academy/${course.trackId}/boss/${module.slug}`} icon={Swords} className="mt-5">Take the assessment</Button>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-2">
            <Lock size={14} aria-hidden="true" /> Opens when every lesson in this module is passed
          </p>
        )}
      </Card>
    </PageContainer>
  );
}
