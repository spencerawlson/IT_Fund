import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ModuleDetail } from './Courses';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mounted: the module page reads progress from useAcademy; an empty state
// (no lessons, no bosses) renders every lesson row as not-started.
vi.mock('@/lib/academy', () => ({
  useAcademy: () => ({ resume: null, lessons: {}, bosses: {} }),
  bossKey: (trackId, tier) => `${trackId}:${tier}`,
  BOSS_PASS_PCT: 80,
}));

async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

async function renderModule(courseSlug, moduleSlug) {
  let root;
  act(() => {
    root = TestRenderer.create(
      <ThemeProvider>
        <StaticRouter location={`/academy/courses/${courseSlug}/${moduleSlug}`}>
          <Routes>
            <Route path="/academy/courses/:courseSlug/:moduleSlug" element={<ModuleDetail />} />
          </Routes>
        </StaticRouter>
      </ThemeProvider>,
    );
  });
  await flush();
  return root;
}

describe('ModuleDetail breadcrumbs (navigation fix, 2026-11-18)', () => {
  it('shows Home › Courses › Course › Module, with Courses linking to the index', async () => {
    const root = await renderModule('network-engineering', 'advanced');
    const nav = root.root.findByProps({ 'aria-label': 'Breadcrumb' });
    const links = nav.findAllByType('a').map((n) => ({ href: n.props.href, label: n.children.join('') }));
    const current = nav.findAllByType('span').map((n) => n.children.join(''));
    expect(links[0]).toEqual({ href: '/', label: 'Home' });
    expect(links[1]).toEqual({ href: '/academy/courses', label: 'Courses' });
    expect(links[2]).toEqual({ href: '/academy/courses/network-engineering', label: 'Network Engineering' });
    // Home, Courses, course — the module itself is the current page.
    expect(links.length).toBe(3);
    expect(current).toHaveLength(1);
    expect(current[0]).toMatch(/^Module 3/);
  });
});
