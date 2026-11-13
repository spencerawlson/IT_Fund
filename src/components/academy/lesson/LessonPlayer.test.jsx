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
});
