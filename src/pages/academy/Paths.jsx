import React from 'react';
import { useParams } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import { IconTile, Prerequisites } from '@/components/academy/ui/bits';
import { CourseCard, LearningPathCard, pathPrereqItems } from '@/components/academy/ui/cards';
import { Card, EmptyState, PageContainer, PageHeader, ProgressBar, SectionHeader, StatusBadge } from '@/components/ui-glass';
import { PATHS, getPath, getCourse, formatMinutes, pathMinutes } from '@/data/catalog';
import { useAcademy } from '@/lib/academy';
import { pathProgress, pathStatus } from '@/lib/progress/engine';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import Seo from '@/components/Seo';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';

// Paths you're on come first, then untouched ones, then finished ones. Paths without courses yet
// are not listed.
const ORDER = { 'in-progress': 0, 'not-started': 1, completed: 2 };

// FAQ, in the product's own words — rendered below and mirrored as FAQPage
// JSON-LD on this page's <Seo> (single source of truth, no drift).
const FAQS = [
  {
    q: 'What is a career path?',
    a: 'A path is a set of courses aimed at one role — for example Networking, Cybersecurity, or Cloud Security. Each path lists its courses in order, with the time it takes and the background that makes it easier.',
  },
  {
    q: 'Do I have to finish one path before starting another?',
    a: 'No. Every path is open from the start — nothing is locked. The prerequisites are advice, not gates: they tell you which background makes a path easier, not whether you may start it.',
  },
  {
    q: 'Which path should I start with?',
    a: 'If you are new to IT, start with IT Foundations, then follow the roadmap — it lays out the seven steps from foundations to the CISSP in the order most successful candidates take them.',
  },
  {
    q: 'What certification does a path prepare me for?',
    a: 'It depends on the path. Networking leads toward CompTIA Network+, Cybersecurity toward Security+ and CySA+, and every path builds toward the CISSP capstone. Each course page lists the certifications it prepares you for.',
    sources: [
      { label: 'CompTIA Network+', href: 'https://www.comptia.org/certifications/network' },
      { label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' },
    ],
  },
];

export function PathsIndex() {
  useDocumentTitle('Career Paths · Road to CISSP');
  const state = useAcademy();
  const paths = PATHS.filter((p) => pathStatus(state, p) !== 'coming-soon').sort(
    (a, b) => ORDER[pathStatus(state, a)] - ORDER[pathStatus(state, b)],
  );
  const upcoming = PATHS.filter((p) => pathStatus(state, p) === 'coming-soon');
  return (
    <PageContainer>
      <Seo
        title="Career paths — role-based routes to the CISSP · Road to CISSP"
        description="Each path is a set of courses toward a role. Every path is open from the start; its prerequisites tell you which background makes it easier."
        path="/academy/paths"
        jsonLd={faqJsonLd(FAQS)}
      />
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Career paths' }]}
        title="Career paths"
        description="Each path is a set of courses toward a role. Every path is open from the start; its prerequisites tell you which background makes it easier."
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
      <FaqSection faqs={FAQS} />
    </PageContainer>
  );
}

export function PathDetail() {
  const { slug } = useParams();
  const state = useAcademy();
  const path = getPath(slug);
  useDocumentTitle(path ? `${path.title} · Road to CISSP` : 'Career Path · Road to CISSP');

  if (!path) {
    return (
      <PageContainer>
        <EmptyState icon={SearchX} title="Path not found" text="It may have been renamed." to="/academy/paths" action="See all career paths" />
      </PageContainer>
    );
  }
  const courses = path.courses.map(getCourse).filter(Boolean);
  const status = pathStatus(state, path);
  const prereqs = pathPrereqItems(state, path);
  const someUnmet = ['required', 'recommended'].some((kind) => prereqs[kind].some((p) => !p.met));
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
        <Prerequisites items={prereqs} />
        {someUnmet && (
          <p className="mt-4 max-w-reading text-body text-ink-2">
            None of this is locked. These are the paths that make this one easier — start here whenever you want.
          </p>
        )}
      </section>
    </PageContainer>
  );
}
