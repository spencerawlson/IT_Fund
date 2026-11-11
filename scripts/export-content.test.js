// Content-export sync tests: the committed artifacts (backend/data/content.json
// and src/data/content-public.js) must match a fresh build from the sources,
// the free tier must match src/lib/subscription.js, and the public module must
// contain zero premium content. Run by `vitest run` (and therefore by CI).
// If any of these fail after a curriculum edit, run `node scripts/export-content.mjs`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContentJson,
  buildPublicData,
  FREE_LESSON_IDS as LIB_FREE_LESSONS,
  FREE_DECK_IDS as LIB_FREE_DECKS,
  allDecks,
} from './export-content-lib.mjs';
import { FREE_LESSON_IDS, FREE_DECKS } from '@/lib/subscription';
import { tracks, freeLessonContent, freeCipherNotes } from '@/data/content-public';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Audit canary set (deliverable 03, F-01): verbatim premium strings that must
// never appear in any public artifact. The last one is the premium cipher note
// (net-switch-route) — it must also stay out of the public module.
const CANARIES = [
  'Bell-LaPadula enforces confidentiality',
  'Treat it as likely C2 beaconing',
  'A control should never cost more than the value of the asset it protects',
  'What is the goal of a Business Continuity Plan',
  'four canons of the ISC2 Code of Ethics',
  'NetFlow shows a workstation opening an HTTPS connection',
  'Longest prefix match is decided before administrative distance',
];

const text = (s) => typeof s === 'string' && s.trim().length > 0;

describe('content export', () => {
  it('free tier in the export matches src/lib/subscription.js (single source of truth)', () => {
    expect([...LIB_FREE_LESSONS].sort()).toEqual([...FREE_LESSON_IDS].sort());
    expect([...LIB_FREE_DECKS].sort()).toEqual([...FREE_DECKS].sort());
  });

  it('committed backend/data/content.json matches a fresh build (ignoring generatedAt)', () => {
    const fresh = buildContentJson();
    const committed = JSON.parse(readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8'));
    const { generatedAt: _freshAt, ...freshRest } = fresh;
    const { generatedAt: _committedAt, ...committedRest } = committed;
    expect(committedRest).toEqual(freshRest);
  });

  it('committed src/data/content-public.js matches a fresh build', () => {
    const fresh = buildPublicData();
    expect({ tracks, freeLessonContent, freeCipherNotes }).toEqual({
      tracks: fresh.tracks,
      freeLessonContent: fresh.freeLessonContent,
      freeCipherNotes: fresh.freeCipherNotes,
    });
  });

  it('public module contains zero premium content (audit canary set)', () => {
    const source = readFileSync(join(ROOT, 'src', 'data', 'content-public.js'), 'utf8');
    for (const canary of CANARIES) {
      expect(source, `canary leaked into public module: ${canary}`).not.toContain(canary);
    }
    // And the full dataset does contain them (the export did not silently drop content).
    const full = readFileSync(join(ROOT, 'backend', 'data', 'content.json'), 'utf8');
    for (const canary of CANARIES) {
      expect(full, `canary missing from full dataset: ${canary}`).toContain(canary);
    }
  });

  it('public module carries exactly the free tier bodies (57 cards, 5 lessons)', () => {
    const publicCards = tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks)).flatMap((d) => d.cards);
    expect(publicCards.filter((c) => c.q).length).toBe(57);
    expect(Object.keys(freeLessonContent).sort()).toEqual([...LIB_FREE_LESSONS].sort());
    // Premium decks keep structure (ids + counts) but no bodies or puzzles.
    const premium = tracks
      .flatMap((t) => t.tiers.flatMap((tier) => tier.decks))
      .filter((d) => !LIB_FREE_DECKS.includes(d.id));
    expect(premium.length).toBeGreaterThan(200);
    for (const deck of premium) {
      expect(deck.cards.every((c) => c.q === undefined && c.a === undefined)).toBe(true);
      expect(deck.puzzles).toEqual([]);
      expect(deck.cards.length).toBeGreaterThan(0); // ids + count still present
    }
  });

  it('every deck has a lesson and every lesson belongs to a real deck (1:1)', () => {
    const full = buildContentJson();
    const deckIds = new Set(allDecks.map((d) => d.id));
    expect(Object.keys(full.lessons).sort()).toEqual([...deckIds].sort());
  });

  it('every lesson has valid reading content (moved from lessonContent.test.js)', () => {
    const full = buildContentJson();
    for (const [id, c] of Object.entries(full.lessons)) {
      expect(c.overview?.length, `${id}: overview paragraphs`).toBeGreaterThanOrEqual(1);
      expect(c.overview.every(text), `${id}: overview text`).toBe(true);
      expect(c.learn?.length, `${id}: learn sections`).toBeGreaterThanOrEqual(2);
      c.learn.forEach((part) => {
        expect(text(part.heading), `${id}: learn heading`).toBe(true);
        expect(part.body.length, `${id}: body of "${part.heading}"`).toBeGreaterThanOrEqual(1);
        expect(part.body.some(text), `${id}: body needs at least one paragraph`).toBe(true);
        part.body.filter((p) => !text(p)).forEach(({ stack }) => {
          expect(stack?.items?.length, `${id}: stack in "${part.heading}"`).toBeGreaterThanOrEqual(2);
          stack.items.forEach((it) => expect(text(it.badge) && text(it.name) && text(it.does)).toBe(true));
          expect(new Set(stack.items.map((it) => it.name)).size, `${id}: stack names unique`).toBe(stack.items.length);
          if (stack.mnemonic) expect(stack.items.every((it) => text(it.word))).toBe(true);
        });
      });
    }
  });

  it('every card has a question, an answer, and three distractors', () => {
    const full = buildContentJson();
    let count = 0;
    for (const track of full.tracks) {
      for (const tier of track.tiers) {
        for (const deck of tier.decks) {
          for (const card of deck.cards) {
            count += 1;
            expect(text(card.q), `${card.id}: question`).toBe(true);
            expect(text(card.a), `${card.id}: answer`).toBe(true);
            expect(card.wrong?.length, `${card.id}: distractors`).toBe(3);
          }
        }
      }
    }
    expect(count).toBeGreaterThan(3000);
  });
});
