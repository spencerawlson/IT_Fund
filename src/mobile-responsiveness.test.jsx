// Static guard for the 2026-11-08 mobile-responsiveness repair.
//
// No phone browser exists in the sandbox (Playwright browsers are not
// installed and the Muse browser binary refuses to start), so the repo's
// `scripts/mobile-check.mjs` cannot run here. This test guards the exact
// fixes instead: if someone reverts one, the suite fails. It reads source
// files, not rendered output — the real check is mobile-check.mjs plus a
// phone pass on the live site (see docs/mobile-audit.md).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(path.join(root, rel), 'utf8');

describe('mobile responsiveness guards', () => {
  it('lab terminal header wraps and hides its caption on phones', () => {
    const s = src('src/pages/LabWorkspace.jsx');
    expect(s).toContain('flex flex-wrap items-center gap-2');
    expect(s).toContain('hidden text-caption sm:inline');
  });

  it('flow-diagram rail uses small circles on phones, large from sm up', () => {
    const s = src('src/components/lab/FlowDiagram.jsx');
    expect(s).toContain('h-11 w-11');
    expect(s).toContain('sm:h-14 sm:w-14');
    expect(s).toContain('top-[22px]');
    expect(s).toContain('sm:top-7');
  });

  it('module tabs shrink on phones instead of squeezing', () => {
    const s = src('src/pages/Module.jsx');
    expect(s).toContain('text-xs font-semibold');
    expect(s).toContain('sm:text-sm');
    expect(s).toContain('min-w-0 flex-1 items-center justify-center');
  });

  it('lab progress stats keep a phone-friendly gap', () => {
    const s = src('src/pages/LabProgress.jsx');
    expect(s).toContain('grid grid-cols-3 gap-2 sm:gap-3');
  });

  it('lesson cheat-sheet table sits in a horizontal-scroll wrapper', () => {
    const s = src('src/pages/academy/LessonView.jsx');
    expect(s).toContain('<div className="overflow-x-auto">');
  });

  it('break-it scenario buttons meet the 44px tap target', () => {
    const s = src('src/components/lab/BreakItControls.jsx');
    expect(s).toContain('min-h-11');
    expect(s).not.toContain('min-h-[36px]');
  });

  it('small Button variant meets the 44px tap target (33 usages)', () => {
    const s = src('src/components/ui-glass/Button.jsx');
    expect(s).toContain("sm: 'min-h-11 gap-1.5 px-3 text-small'");
    expect(s).not.toContain('min-h-9');
  });

  it('mascot quiz controls meet the 44px tap target', () => {
    const s = src('src/components/StudyMascot.jsx');
    expect(s.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('flashcard read-aloud button meets the 44px tap target', () => {
    const s = src('src/components/FlashcardSession.jsx');
    expect(s).toContain('inline-flex min-h-11 items-center gap-1 rounded-lg border');
  });

  it('tab triggers are a full 44px tall', () => {
    const s = src('src/components/ui-glass/Tabs.jsx');
    expect(s).toContain('px-3 py-3 text-small font-semibold');
    expect(s).not.toContain('px-3 py-2.5 text-small font-semibold');
  });

  it('exam chrome buttons meet the 44px tap target in all three exam pages', () => {
    for (const f of ['src/pages/academy/PracticeExam.jsx', 'src/pages/academy/SecplusPracticeExam.jsx', 'src/pages/academy/CertPracticeExam.jsx']) {
      const s = src(f);
      expect(s).toContain('inline-flex min-h-11 items-center gap-1.5 rounded-control');
      expect(s).toContain('rounded-control min-h-11 px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-ink-1');
      expect(s).toContain('rounded-control min-h-11 px-3 py-1.5 text-small font-semibold text-ink-2 hover:text-danger');
    }
  });

  it('lesson copy-code button meets the 44px tap target', () => {
    const s = src('src/pages/academy/LessonView.jsx');
    expect(s).toContain('inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-small font-semibold text-terminal-muted');
    expect(s).not.toContain('min-h-9');
  });

  it('topology builder palette and view controls meet the 44px tap target', () => {
    const s = src('src/components/labs/TopologyBuilder.jsx');
    expect(s.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('dashboard card layouts (2026-11-08, phone screenshot)', () => {
  it('navigation pills are opaque so scrolling content cannot ghost through them', () => {
    const css = src('src/index.css');
    expect(css).toContain('.glass-1.nav-solid,');
    expect(css).toContain('.glass-3.nav-solid {');
    expect(css).toContain('background: #ffffff;');
  });

  it('app shell header and tab bar use the opaque pill, and main clears the tab bar with room to spare', () => {
    const s = src('src/components/shell/AppShell.jsx');
    expect(s).toContain('glass-1 nav-solid flex h-14');
    expect(s).toContain('glass-3 nav-solid grid grid-cols-5');
    expect(s).toContain('pb-36 lg:pb-12');
    expect(s).not.toContain('pb-28 lg:pb-12');
  });

  it('spaced-repetition hero stacks on phones with a full-width button', () => {
    const s = src('src/pages/Academy.jsx');
    expect(s).toContain('flex flex-col gap-4 sm:flex-row sm:items-center');
    expect(s).toContain('className="w-full justify-center sm:w-auto">Start review');
    // Copy untouched by the layout fix.
    expect(s).toContain('Quick reps now beat relearning later. It only takes a few minutes.');
  });

  it('logo wordmark opts out of the acronym glossary (WebKit blanks gradient text under a highlight)', () => {
    const s = src('src/components/Logo.jsx');
    expect(s).toContain('data-no-glossary');
    expect(s).toContain('bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent');
  });

  it('practice-exam cards stack on phones instead of squeezing the copy', () => {
    for (const f of ['src/pages/academy/Courses.jsx', 'src/pages/CisspRoadmap.jsx']) {
      const s = src(f);
      expect(s).toContain('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between');
      expect(s).toContain('w-full shrink-0 justify-center sm:w-auto');
    }
  });

  it('lesson lab cards stack on phones instead of squeezing the copy', () => {
    const s = src('src/pages/academy/LessonView.jsx');
    expect(s.match(/flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between/g)?.length).toBe(2);
    expect(s).toContain('className="w-full justify-center sm:w-auto"');
  });

  it('focus-mode sticky headers use the opaque pill', () => {
    for (const f of [
      'src/pages/LabLauncher.jsx',
      'src/pages/LabProgress.jsx',
      'src/pages/LabWorkspace.jsx',
      'src/components/academy/lesson/LessonPlayer.jsx',
    ]) {
      expect(src(f)).toContain('glass-1 nav-solid');
    }
  });
});
