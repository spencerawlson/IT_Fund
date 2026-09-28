import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Swords, Lock } from 'lucide-react';
import { useBgTint } from '@/components/academy/LiquidBackground';
import AcademyShell from '@/components/academy/ui/AcademyShell';
import { Breadcrumbs, EmptyState, IconTile, Pill, Prerequisites, ProgressBar, SectionHeading, StatusBadge } from '@/components/academy/ui/bits';
import { CourseCard, LessonList, ModuleList, externalModulePrereqs } from '@/components/academy/ui/cards';
import {
  COURSES, CERTIFICATIONS, SKILLS, getCourse, getModuleBySlug, pathsForCourse, formatMinutes, courseHref, pathHref, playerHref,
} from '@/data/catalog';
import { useAcademy, bossKey, BOSS_PASS_PCT } from '@/lib/academy';
import {
  courseProgress, courseStatus, courseMinutesLeft, nextLessonInCourse, moduleLock, moduleProgress, moduleStatus, isModuleComplete,
  pathPrerequisites,
} from '@/lib/progress/engine';

export function CoursesIndex() {
  const state = useAcademy();
  useBgTint('#6366F1');
  return (
    <AcademyShell>
      <Breadcrumbs items={[{ label: 'Academy', to: '/academy' }, { label: 'Courses' }]} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Courses</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
        Each course is a sequence of modules; each module a sequence of lessons. Courses can belong to several career paths
        and certification tracks.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {COURSES.map((course) => (
          <CourseCard key={course.slug} state={state} course={course} />
        ))}
      </div>
    </AcademyShell>
  );
}

export function CourseDetail() {
  const { courseSlug } = useParams();
  const state = useAcademy();
  const course = getCourse(courseSlug);
  useBgTint(course?.color);

  if (!course) {
    return (
      <AcademyShell>
        <EmptyState title="Course not found" to="/academy/courses" action="See all courses" />
      </AcademyShell>
    );
  }
  const next = nextLessonInCourse(state, course);
  const status = courseStatus(state, course);
  const required = externalModulePrereqs(state, course.modules[0]);
  // Recommended background comes from the career paths this course belongs to.
  const recommended = new Map();
  pathsForCourse(course.slug).forEach((p) =>
    pathPrerequisites(state, p).recommended.forEach(({ path, met }) => recommended.set(path.slug, { label: path.title, to: pathHref(path), met }))
  );

  return (
    <AcademyShell>
      <Breadcrumbs items={[{ label: 'Academy', to: '/academy' }, { label: 'Courses', to: '/academy/courses' }, { label: course.title }]} />
      <header className="glass rounded-[2rem] p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <IconTile icon={course.icon} color={course.color} size="lg" />
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300">{course.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill>{course.difficulty}</Pill>
          <Pill>{course.modules.length} modules · {course.lessons.length} lessons</Pill>
          <Pill>{formatMinutes(course.minutes)} total</Pill>
          {status !== 'completed' && <Pill>{formatMinutes(courseMinutesLeft(state, course))} left</Pill>}
        </div>
        <ProgressBar className="mt-6" value={courseProgress(state, course)} color={course.color} label={`${course.title} progress`} />
        {next && (
          <Link to={playerHref(next)} className="glass-btn mt-7 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold" style={{ '--tint': course.color }}>
            <Play size={16} className="fill-current" aria-hidden="true" /> {status === 'not-started' ? 'Start' : 'Continue'}: Lesson {next.number}
          </Link>
        )}
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <SectionHeading>What you’ll learn</SectionHeading>
          <ul className="space-y-2.5 text-[15px] leading-relaxed text-slate-200">
            {course.objectives.map((o) => (
              <li key={o} className="flex gap-2.5"><span aria-hidden="true" className="text-slate-500">—</span>{o}</li>
            ))}
          </ul>
        </section>
        <section>
          <SectionHeading>Prerequisites</SectionHeading>
          <Prerequisites
            items={{
              required,
              recommended: [...recommended.values()],
            }}
          />
        </section>
        <section>
          <SectionHeading>Skills gained</SectionHeading>
          <div className="flex flex-wrap gap-2">{course.skills.map((s) => <Pill key={s}>{SKILLS[s] || s}</Pill>)}</div>
        </section>
        <section>
          <SectionHeading>Certifications it prepares for</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {course.certifications.map((id) => CERTIFICATIONS[id]).filter(Boolean).map((c) => <Pill key={c.id}>{c.vendor} {c.name}</Pill>)}
          </div>
        </section>
      </div>

      <section className="mt-14">
        <SectionHeading>Modules</SectionHeading>
        <ModuleList state={state} course={course} />
      </section>
    </AcademyShell>
  );
}

export function ModuleDetail() {
  const { courseSlug, moduleSlug } = useParams();
  const state = useAcademy();
  const course = getCourse(courseSlug);
  const module = getModuleBySlug(courseSlug, moduleSlug);
  useBgTint(course?.color);

  if (!course || !module) {
    return (
      <AcademyShell>
        <EmptyState title="Module not found" to={course ? courseHref(course) : '/academy/courses'} action="Back to the course" />
      </AcademyShell>
    );
  }
  const lock = moduleLock(state, module);
  const complete = isModuleComplete(state, module);
  const bestBoss = state.bosses?.[bossKey(course.trackId, module.slug)] || 0;

  return (
    <AcademyShell>
      <Breadcrumbs
        items={[
          { label: 'Academy', to: '/academy' },
          { label: course.title, to: courseHref(course) },
          { label: `Module ${module.number}` },
        ]}
      />
      <header className="glass rounded-[2rem] p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Module {module.number} · {module.level}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{module.title}</h1>
            {module.summary && <p className="mt-2 text-slate-300">{module.summary}</p>}
          </div>
          <StatusBadge status={moduleStatus(state, module)} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill>{module.lessons.length} lessons</Pill>
          <Pill>{formatMinutes(module.minutes)}</Pill>
        </div>
        <ProgressBar className="mt-6" value={moduleProgress(state, module)} color={course.color} label={`Module ${module.number} progress`} />
      </header>

      {!lock.unlocked ? (
        <section className="mt-12">
          <SectionHeading>Locked</SectionHeading>
          <Prerequisites
            items={{
              required: lock.blockers.map((m) => ({ label: `${getCourse(m.courseSlug).title} · Module ${m.number}: ${m.title}`, to: `/academy/courses/${m.courseSlug}/${m.slug}`, met: false })),
            }}
          />
        </section>
      ) : (
        <section className="mt-12">
          <SectionHeading>Lessons</SectionHeading>
          <LessonList state={state} module={module} color={course.color} />
        </section>
      )}

      <section className="mt-12">
        <SectionHeading>Knowledge assessment</SectionHeading>
        <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div>
            <p className="font-bold text-white">{module.title}: final assessment</p>
            <p className="mt-1 text-sm text-slate-300">
              15 questions from every lesson in this module, 3 lives. Score {BOSS_PASS_PCT}% to pass.
              {bestBoss ? ` Best so far: ${bestBoss}%.` : ''}
            </p>
          </div>
          {complete ? (
            <Link to={`/academy/${course.trackId}/boss/${module.slug}`} className="glass-btn inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold" style={{ '--tint': course.color }}>
              <Swords size={16} aria-hidden="true" /> Take the assessment
            </Link>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-400">
              <Lock size={14} aria-hidden="true" /> Opens when every lesson in this module is passed
            </p>
          )}
        </div>
      </section>
    </AcademyShell>
  );
}
