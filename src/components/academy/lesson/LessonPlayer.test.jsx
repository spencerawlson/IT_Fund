import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import LessonPlayer from './LessonPlayer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SRC = readFileSync(join(ROOT, 'src/components/academy/lesson/LessonPlayer.jsx'), 'utf8');
const LESSON_VIEW_SRC = readFileSync(join(ROOT, 'src/pages/academy/LessonView.jsx'), 'utf8');

const DECK = { id: 'net-osi', title: 'OSI Model' };
const TRACK = { id: 'network', title: 'Network Engineering' };

// Effects never run under SSR, so the player renders its loading state with
// the session still null — exactly the state that crashed before the fix
// (the session destructure ran above the loading guard and threw
// "Cannot destructure property 'steps' from null or undefined value").
// That is what this smoke test asserts. The live flow (bundle resolves,
// intro, steps, completion) is exercised in the browser, not here.
function renderPlayer() {
  return renderToString(
    <ThemeProvider>
      <StaticRouter location="/academy/network/lesson/net-osi">
        <LessonPlayer track={TRACK} deck={DECK} />
      </StaticRouter>
    </ThemeProvider>,
  );
}

describe('LessonPlayer', () => {
  it('renders the loading state without throwing while the bundle is pending (SSR smoke, no network)', () => {
    const html = renderPlayer();
    expect(typeof html).toBe('string');
    // renderToString inserts comment nodes between the JSX text parts
    // ("Loading <!-- -->OSI Model<!-- -->…"), so match the two parts.
    expect(html).toContain('Loading');
    expect(html).toContain('OSI Model');
  });

  it('reads the session only after the bundle has loaded', () => {
    // The session is null until the async getDeckContent load lands; the
    // destructure must sit below the loading guard, never above it.
    const guardAt = SRC.indexOf('if (!bundle || !session)');
    const destructureAt = SRC.indexOf('const { steps, index, tries } = session;');
    expect(guardAt).toBeGreaterThan(-1);
    expect(destructureAt).toBeGreaterThan(guardAt);
  });

  it('hands off to the mission at the end of practice, once passed', () => {
    // The handoff is Cypher's spoken congratulations + invite, shown in
    // the completion state — only when the practice is passed, and only
    // for the one lesson with a mission. A failed run shows no handoff.
    expect(SRC).toContain('MISSION_FOR_LESSON[deck.id]');
    expect(SRC).toContain('{passed && missionId && <MissionHandoff');
    expect(SRC).toContain("missionId={missionId} lessonId={deck.id}");
  });

  it('shows a Practice button after the lesson content on the reading page', () => {
    // Spencer (2026-11-13): after the lesson content, show a Practice
    // button — it opens the interactive lesson (the practice), which the
    // handoff then follows. The reading card is the <article> Card; the
    // Practice section with its button to playerHref must come after it.
    const articleAt = LESSON_VIEW_SRC.indexOf('as="article"');
    const practiceAt = LESSON_VIEW_SRC.indexOf('id="practice"');
    expect(articleAt).toBeGreaterThan(-1);
    expect(practiceAt).toBeGreaterThan(articleAt);
    expect(LESSON_VIEW_SRC).toContain('to={playerHref(lesson)}');
  });

  it('has no Video Explainer placeholder in the player or the lesson page', () => {
    // Scope E: the "Video explainer coming soon" card is gone; Ask Cypher
    // is the interactive assistant. The component was deleted, so neither
    // file may reference it at all.
    expect(SRC).not.toContain('VideoExplainer');
    expect(LESSON_VIEW_SRC).not.toContain('VideoExplainer');
    expect(SRC).not.toContain('Video explainer coming soon');
    expect(LESSON_VIEW_SRC).not.toContain('Video explainer coming soon');
  });

  it('has no static written mission briefing on the lesson page', () => {
    // Scope D: the briefing is what Cypher SAYS at the end of practice
    // (MissionHandoff), never a block of written text — and Sentinel, who
    // is not built yet, must not appear on the lesson page.
    expect(LESSON_VIEW_SRC).not.toContain('Mission briefing');
    expect(LESSON_VIEW_SRC).not.toContain('Sentinel');
    expect(LESSON_VIEW_SRC).not.toContain('Excellent work, Agent');
  });
});
