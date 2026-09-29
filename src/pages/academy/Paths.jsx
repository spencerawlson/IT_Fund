import React from 'react';
import { useParams } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import { IconTile, Prerequisites } from '@/components/academy/ui/bits';
import { CourseCard, LearningPathCard, pathPrereqItems } from '@/components/academy/ui/cards';
import { Card, EmptyState, PageContainer, PageHeader, ProgressBar, SectionHeader, StatusBadge } from '@/components/ui-glass';
import { PATHS, getPath, getCourse, formatMinutes, pathMinutes } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { pathProgress, pathStatus } from '@/lib/progress/engine';

// Paths you're on come first; locked ones last. Paths without courses yet are not listed.
const ORDER = { 'in-progress': 0, 'not-started': 1, completed: 2, locked: 3 };

export function PathsIndex() {
  const state = useAcademy();
  const paths = PATHS.filter((p) => pathStatus(state, p) !== 'coming-soon').sort(
    (a, b) => ORDER[pathStatus(state, a)] - ORDER[pathStatus(state, b)],
  );
  const upcoming = PATHS.filter((p) => pathStatus(state, p) === 'coming-soon');
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Career paths' }]}
        title="Career paths"
        description="Each path is a set of courses toward a role. Required prerequisites keep a path locked until you’re ready; recommended ones are advice."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {paths.map((path) => (
          <LearningPathCard key={path.slug} state={state} path={path} headingAs="h2" />
        ))}
      </div>
      {upcoming.length > 0 && (
        <p className="mt-8 flex items-start gap-2 text-small text-ink-2">
          <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          In development: {upcoming.map((p) => p.title).join(', ')}.
        </p>
      )}
    </PageContainer>
  );
}

export function PathDetail() {
  const { slug } = useParams();
  const state = useAcademy();
  const path = getPath(slug);

  if (!path) {
    return (
      <PageContainer>
        <EmptyState icon={SearchX} title="Path not found" text="It may have been renamed." to="/academy/paths" action="See all career paths" />
      </PageContainer>
    );
  }
  const courses = path.courses.map(getCourse).filter(Boolean);
  const status = pathStatus(state, path);
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Career paths', to: '/academy/paths' }, { label: path.title }];

  if (!courses.length) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} eyebrow={`${path.difficulty} path`} title={path.title} description={path.summary} />
        <EmptyState icon={Clock} title="Courses coming soon" text="This path’s courses are in development." to="/academy/paths" action="See the other paths" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader breadcrumbs={crumbs} eyebrow={`${path.difficulty} path`} title={path.title} description={path.summary} />

      <Card>
        <div className="flex items-start justify-between gap-3">
          <IconTile icon={path.icon} color={path.color} />
          <StatusBadge status={status} />
        </div>
        <p className="mt-4 text-small text-ink-2">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'} · {formatMinutes(pathMinutes(path))}
        </p>
        <ProgressBar className="mt-2" value={pathProgress(state, path)} label={`${path.title} progress`} />
      </Card>

      <section aria-labelledby="path-courses" className="mt-12">
        <SectionHeader id="path-courses" title="Courses, in order" />
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.slug} state={state} course={course} />
          ))}
        </div>
      </section>

      <section aria-labelledby="path-prereqs" className="mt-12">
        <SectionHeader id="path-prereqs" title="Before you start" />
        <Prerequisites items={pathPrereqItems(state, path)} />
        {status === 'locked' && (
          <p className="mt-4 max-w-reading text-body text-ink-2">
            This path is locked until its required paths are complete. You can look around; lessons open as you reach them.
          </p>
        )}
      </section>
    </PageContainer>
  );
}
