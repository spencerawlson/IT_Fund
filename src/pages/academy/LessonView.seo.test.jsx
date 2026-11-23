// SEO Phase 2 (2.3 + 2.5): lesson pages server-render. A free lesson must
// prerender as the full article (not the "Loading lesson…" branch — effects
// never run during SSR), with its own title/canonical and a BreadcrumbList.
// A premium lesson must prerender as the paywall (same tags, no body text
// leaked). An unknown lesson id must be noindexed. Rendered with the same
// anonymous, already-resolved auth the prerender script uses.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import LessonView from './LessonView';
import { SeoCollectorContext } from '@/components/Seo';
import { AuthProvider } from '@/lib/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getLesson, getCourse, getModule } from '@/data/catalog';
import { freeLessonContent } from '@/data/content-public';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PRERENDER_AUTH = { user: null, isLoadingAuth: false, authChecked: true };

function renderLesson(lessonId) {
  const collector = { seo: null, register(data) { this.seo = data; } };
  const queryClient = new QueryClient();
  const html = renderToString(
    <SeoCollectorContext.Provider value={collector}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialAuth={PRERENDER_AUTH}>
          <StaticRouter location={`/academy/lessons/${lessonId}`}>
            <Routes>
              <Route path="/academy/lessons/:lessonId" element={<LessonView />} />
            </Routes>
          </StaticRouter>
        </AuthProvider>
      </QueryClientProvider>
    </SeoCollectorContext.Provider>,
  );
  return { html, seo: collector.seo };
}

function breadcrumbNames(seo) {
  return seo.jsonLd['@graph'][0].itemListElement.map((el) => el.name);
}

describe('LessonView server render (SEO Phase 2)', () => {
  it('free lesson: renders the full article with its own title, canonical, and breadcrumbs', () => {
    const lesson = getLesson('net-osi');
    const course = getCourse(lesson.courseSlug);
    const module = getModule(lesson.moduleKey);
    const { html, seo } = renderLesson('net-osi');
    expect(seo.title).toBe(`${lesson.title} · Road to CISSP`);
    expect(seo.path).toBe('/academy/lessons/net-osi');
    expect(seo.robots).toContain('index');
    expect(seo.jsonLd['@graph'][0]['@type']).toBe('BreadcrumbList');
    expect(breadcrumbNames(seo)).toEqual([
      'Home',
      'Courses',
      course.title,
      `Module ${module.number}`,
      `Lesson ${lesson.number}`,
    ]);
    // The article itself — not the loading branch, not the home page.
    expect(html).not.toContain('Loading lesson');
    expect(html).toContain(freeLessonContent['net-osi'].overview[0].slice(0, 60));
    expect(html).toContain('Overview');
  });

  it('premium lesson: renders the paywall with the same tags and no body text', () => {
    const lesson = getLesson('net-ports');
    const gated = JSON.parse(readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8'));
    const gatedLesson = gated.lessons['net-ports'];
    const { html, seo } = renderLesson('net-ports');
    expect(seo.title).toBe(`${lesson.title} · Road to CISSP`);
    expect(seo.path).toBe('/academy/lessons/net-ports');
    expect(seo.jsonLd['@graph'][0]['@type']).toBe('BreadcrumbList');
    expect(breadcrumbNames(seo)).toHaveLength(5);
    expect(html).toContain('Premium content');
    expect(html).not.toContain('Loading lesson');
    // Bell-LaPadula: the gated body must not appear in the public render.
    expect(html).not.toContain(gatedLesson.overview[0]);
    expect(html).not.toContain(gatedLesson.learn[0].heading);
  });

  it('unknown lesson: noindexed', () => {
    const { seo } = renderLesson('no-such-lesson');
    expect(seo.robots).toBe('noindex');
    expect(seo.title).toContain('not found');
  });
});
