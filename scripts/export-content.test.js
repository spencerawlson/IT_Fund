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
// never appear in any public artifact. The last one is the premium cypher note
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

  it('further-reading links are valid, public, and ride the export to the right artifact', () => {
    const full = buildContentJson();
    const isHttp = (u) => typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://'));
    for (const [id, c] of Object.entries(full.lessons)) {
      if (c.further_reading === undefined) continue;
      // At most 3 per lesson; each entry is a non-empty title plus a real
      // http(s) URL — never a paywalled, login-gated, or invented one.
      // (Every seeded URL was curl-checked 200 before it was added.)
      expect(Array.isArray(c.further_reading), `${id}: further_reading is a list`).toBe(true);
      expect(c.further_reading.length, `${id}: at most 3 links`).toBeLessThanOrEqual(3);
      expect(c.further_reading.length, `${id}: at least 1 link`).toBeGreaterThanOrEqual(1);
      for (const link of c.further_reading) {
        expect(text(link.title), `${id}: link title`).toBe(true);
        expect(isHttp(link.url), `${id}: link url is http(s): ${link.url}`).toBe(true);
      }
    }
    // The seed is the Python track: every Python lesson carries links in
    // the full dataset; the free one (py-basics) also carries them in the
    // public module, and premium ones stay out of it entirely.
    const pyIds = ['py-basics', 'py-flow', 'py-collections', 'py-files-errors', 'py-oop', 'py-automation', 'py-concurrency', 'py-testing-packaging', 'py-security-tools'];
    for (const id of pyIds) {
      expect(full.lessons[id].further_reading?.length, `${id}: seeded links`).toBeGreaterThanOrEqual(1);
    }
    expect(freeLessonContent['py-basics'].further_reading?.length).toBeGreaterThanOrEqual(1);
    expect(freeLessonContent['py-flow']).toBeUndefined();
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

  it('quiz answers are not length-biased: the correct answer is the longest in at most 35% of questions', () => {
    // 2026-11-16: the correct answer was the strictly longest option in
    // 88.5% of questions (mean 10.0 words vs 3.3 for distractors), so a
    // learner could pass by always picking the longest answer without
    // knowing the concept. Quiz options are shuffled at runtime, so only
    // length leaks — the rebalance targets ~25% (chance level for 4
    // options); this guard fails the build if the bias creeps back.
    const full = buildContentJson();
    const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
    let quiz = 0;
    let longest = 0;
    for (const track of full.tracks) {
      for (const tier of track.tiers) {
        for (const deck of tier.decks) {
          for (const card of deck.cards) {
            if (!Array.isArray(card.wrong) || card.wrong.length < 2 || typeof card.a !== 'string') continue;
            quiz += 1;
            if (words(card.a) > Math.max(...card.wrong.map(words))) longest += 1;
          }
        }
      }
    }
    expect(quiz).toBeGreaterThan(3000);
    expect(longest / quiz).toBeLessThanOrEqual(0.35);
  });
});
