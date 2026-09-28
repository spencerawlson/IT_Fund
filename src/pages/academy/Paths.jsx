import React from 'react';
import { useParams } from 'react-router-dom';
import { useBgTint } from '@/components/academy/LiquidBackground';
import AcademyShell from '@/components/academy/ui/AcademyShell';
import { Breadcrumbs, EmptyState, IconTile, Pill, Prerequisites, ProgressBar, SectionHeading, StatusBadge } from '@/components/academy/ui/bits';
import { CourseCard, LearningPathCard, pathPrereqItems } from '@/components/academy/ui/cards';
import { PATHS, getPath, getCourse, formatMinutes, pathMinutes } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { pathProgress, pathStatus } from '@/lib/progress/engine';

export function PathsIndex() {
  const state = useAcademy();
  useBgTint('#F59E0B');
  return (
    <AcademyShell>
      <Breadcrumbs items={[{ label: 'Academy', to: '/academy' }, { label: 'Career paths' }]} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Career paths</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
        IT Foundations → Networking and Linux → Python and Cloud → Cybersecurity → Cloud Security → DevSecOps → Security
        Engineering → Security Architecture. Required prerequisites lock a path; recommended ones are advice.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {PATHS.map((path) => (
          <LearningPathCard key={path.slug} state={state} path={path} />
        ))}
      </div>
    </AcademyShell>
  );
}

export function PathDetail() {
  const { slug } = useParams();
  const state = useAcademy();
  const path = getPath(slug);
  useBgTint(path?.color);

  if (!path) {
    return (
      <AcademyShell>
        <EmptyState title="Path not found" text="It may have been renamed." to="/academy/paths" action="See all career paths" />
      </AcademyShell>
    );
  }
  const courses = path.courses.map(getCourse).filter(Boolean);
  const status = pathStatus(state, path);

  return (
    <AcademyShell>
      <Breadcrumbs items={[{ label: 'Academy', to: '/academy' }, { label: 'Career paths', to: '/academy/paths' }, { label: path.title }]} />
      <header className="glass rounded-[2rem] p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <IconTile icon={path.icon} color={path.color} size="lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{path.title}</h1>
              <p className="mt-1 text-slate-300">{path.summary}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill>{path.difficulty}</Pill>
          {courses.length > 0 && <Pill>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</Pill>}
          {courses.length > 0 && <Pill>{formatMinutes(pathMinutes(path))}</Pill>}
        </div>
        {courses.length > 0 && <ProgressBar className="mt-6" value={pathProgress(state, path)} color={path.color} label={`${path.title} progress`} />}
      </header>

      <section className="mt-12">
        <SectionHeading>Prerequisites</SectionHeading>
        <Prerequisites items={pathPrereqItems(state, path)} />
        {status === 'locked' && (
          <p className="mt-4 text-sm text-slate-300">
            This path is locked until its required paths are complete. You can still look around; lessons open as you reach them.
          </p>
        )}
      </section>

      <section className="mt-12">
        <SectionHeading>Courses, in order</SectionHeading>
        {courses.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.slug} state={state} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState title="Courses coming soon" text="This path’s courses are in development." to="/academy/paths" action="See the other paths" />
        )}
      </section>
    </AcademyShell>
  );
}
