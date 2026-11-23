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
  normaliseTrack,
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
    // Premium decks keep structure (ids + counts) but no bodies; puzzles are
    // stubs ({id, legacyId, deckId}), never bodies.
    const premium = tracks
      .flatMap((t) => t.tiers.flatMap((tier) => tier.decks))
      .filter((d) => !LIB_FREE_DECKS.includes(d.id));
    expect(premium.length).toBeGreaterThan(200);
    for (const deck of premium) {
      expect(deck.cards.every((c) => c.q === undefined && c.a === undefined)).toBe(true);
      for (const puzzle of deck.puzzles) {
        expect(Object.keys(puzzle).sort()).toEqual(['deckId', 'id', 'legacyId']);
      }
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

// ---------------------------------------------------------------------------
// PR 2 — Permanent Identity Foundation (UUID migration, plan v2.2 §4).
// Cards and puzzles carry stable UUID v4 ids; the frozen legacy map pairs
// each pre-migration positional id with its UUID. Written BEFORE the
// implementation and observed failing on the pre-migration code.
// ---------------------------------------------------------------------------
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FREE_DECK_SET = new Set(LIB_FREE_DECKS);

function loadLegacyMap() {
  return JSON.parse(readFileSync(join(ROOT, 'scripts', 'legacy-card-ids.json'), 'utf8'));
}

function allExportedCards(content) {
  return content.tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks)).flatMap((d) => d.cards);
}

function allExportedPuzzles(content) {
  return content.tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks)).flatMap((d) => d.puzzles || []);
}

describe('PR 2: frozen legacy map (test areas #1, #2)', () => {
  it('scripts/legacy-card-ids.json exists with exactly 3,229 card + 76 puzzle entries', () => {
    const map = loadLegacyMap();
    expect(map.cards).toHaveLength(3229);
    expect(map.puzzles).toHaveLength(76);
  });

  it('every map entry is {legacyId, id, deckId, rev} with a unique UUID v4 and rev 1', () => {
    const map = loadLegacyMap();
    const seenUuids = new Set();
    const seenLegacy = new Set();
    for (const entries of [map.cards, map.puzzles]) {
      for (const e of entries) {
        expect(Object.keys(e).sort()).toEqual(['deckId', 'id', 'legacyId', 'rev']);
        expect(e.id).toMatch(UUID_V4);
        expect(seenUuids.has(e.id)).toBe(false);
        seenUuids.add(e.id);
        expect(seenLegacy.has(e.legacyId)).toBe(false);
        seenLegacy.add(e.legacyId);
        expect(e.rev).toBe(1);
        expect(typeof e.legacyId).toBe('string');
        expect(typeof e.deckId).toBe('string');
      }
    }
  });

  it('map pairs match the export exactly, both directions (cards and puzzles)', () => {
    const map = loadLegacyMap();
    const content = buildContentJson();
    const cards = allExportedCards(content);
    const puzzles = allExportedPuzzles(content);
    expect(cards).toHaveLength(3229);
    expect(puzzles).toHaveLength(76);

    const cardByUuid = new Map(cards.map((c) => [c.id, c]));
    const puzzleByUuid = new Map(puzzles.map((p) => [p.id, p]));
    for (const e of map.cards) {
      const c = cardByUuid.get(e.id);
      expect(c).toBeDefined();
      expect(c.legacyId).toBe(e.legacyId);
      expect(c.deckId).toBe(e.deckId);
    }
    for (const e of map.puzzles) {
      const p = puzzleByUuid.get(e.id);
      expect(p).toBeDefined();
      expect(p.legacyId).toBe(e.legacyId);
      expect(p.deckId).toBe(e.deckId);
    }
    const mapCardByUuid = new Map(map.cards.map((e) => [e.id, e]));
    const mapPuzzleByUuid = new Map(map.puzzles.map((e) => [e.id, e]));
    for (const c of cards) {
      if (c.legacyId === undefined) continue;
      const e = mapCardByUuid.get(c.id);
      expect(e).toBeDefined();
      expect(e.legacyId).toBe(c.legacyId);
    }
    for (const p of puzzles) {
      if (p.legacyId === undefined) continue;
      const e = mapPuzzleByUuid.get(p.id);
      expect(e).toBeDefined();
      expect(e.legacyId).toBe(p.legacyId);
    }
  });

  it('every card id and every puzzle id in the full dataset is a UUID v4', () => {
    const content = buildContentJson();
    for (const c of allExportedCards(content)) expect(c.id).toMatch(UUID_V4);
    for (const p of allExportedPuzzles(content)) expect(p.id).toMatch(UUID_V4);
  });

  it('every exported card carries rev (int >= 1) and a 6-element tuple shape survives the export', () => {
    const content = buildContentJson();
    for (const c of allExportedCards(content)) {
      expect(Number.isInteger(c.rev) && c.rev >= 1).toBe(true);
      expect(typeof c.q).toBe('string');
      expect(typeof c.a).toBe('string');
      expect(typeof c.x).toBe('string');
      expect(Array.isArray(c.wrong) && c.wrong.length === 3).toBe(true);
    }
  });
});

describe('PR 2: stable ids under reorder and insert (fixture tracks)', () => {
  // Fixture UUIDs are NOT in the frozen map: they simulate new cards, which
  // export with a UUID and no legacyId (never an invented positional id).
  const U1 = '11111111-1111-4111-8111-111111111111';
  const U2 = '22222222-2222-4222-8222-222222222222';
  const U3 = '33333333-3333-4333-8333-333333333333';
  const U_NEW = '44444444-4444-4444-8444-444444444444';
  const card = (uuid, q) => [uuid, q, `Answer to ${q}`, `Why ${q}`, [`wrong ${q} a`, `wrong ${q} b`, `wrong ${q} c`], 1];
  const fixtureTrack = (cardsA) => ({
    id: 'fixture-track',
    title: 'Fixture track',
    tiers: {
      beginner: [{ id: 'fixture-a', title: 'Fixture A', sources: [], cards: cardsA }],
    },
  });
  const deckCards = (normalised) => normalised.tiers[0].decks[0].cards;

  it('reordering cards does not re-number or re-assign any existing card', () => {
    const before = deckCards(normaliseTrack(fixtureTrack([card(U1, 'Q one'), card(U2, 'Q two'), card(U3, 'Q three')])));
    const after = deckCards(normaliseTrack(fixtureTrack([card(U3, 'Q three'), card(U1, 'Q one'), card(U2, 'Q two')])));
    const byQuestion = (rows) => new Map(rows.map((c) => [c.q, c.id]));
    expect(byQuestion(after)).toEqual(byQuestion(before));
  });

  it('inserting a new card keeps every existing id; the new card gets a UUID with no legacyId', () => {
    const before = deckCards(normaliseTrack(fixtureTrack([card(U1, 'Q one'), card(U2, 'Q two')])));
    const after = deckCards(normaliseTrack(fixtureTrack([card(U1, 'Q one'), card(U_NEW, 'Q new'), card(U2, 'Q two')])));
    expect(after.map((c) => c.id)).toEqual([U1, U_NEW, U2]);
    expect(after[0].id).toBe(before[0].id);
    expect(after[2].id).toBe(before[1].id);
    expect(after[1].legacyId).toBeUndefined();
    expect(after[1].rev).toBe(1);
  });

  it('a duplicated card gets a new UUID and starts unstudied (no legacyId carried over)', () => {
    const rows = deckCards(normaliseTrack(fixtureTrack([card(U1, 'Q one'), card(U_NEW, 'Q one')])));
    expect(rows[0].id).toBe(U1);
    expect(rows[1].id).toBe(U_NEW);
    expect(rows[1].legacyId).toBeUndefined();
  });
});

describe('PR 2: premium/free consistency (test area #12)', () => {
  it('premium puzzle stubs contain exactly {id, legacyId, deckId}', () => {
    const pub = buildPublicData();
    const premiumDecks = pub.tracks
      .flatMap((t) => t.tiers.flatMap((tier) => tier.decks))
      .filter((d) => !FREE_DECK_SET.has(d.id));
    const stubs = premiumDecks.flatMap((d) => d.puzzles);
    const expected = allExportedPuzzles(buildContentJson()).filter((p) => !FREE_DECK_SET.has(p.deckId)).length;
    expect(stubs.length).toBe(expected);
    expect(stubs.length).toBeGreaterThan(0);
    for (const s of stubs) expect(Object.keys(s).sort()).toEqual(['deckId', 'id', 'legacyId']);
  });

  it('premium card stubs carry rev + legacyId and no bodies', () => {
    const pub = buildPublicData();
    const premiumDecks = pub.tracks
      .flatMap((t) => t.tiers.flatMap((tier) => tier.decks))
      .filter((d) => !FREE_DECK_SET.has(d.id));
    expect(premiumDecks.length).toBeGreaterThan(0);
    for (const d of premiumDecks) {
      expect(d.cards.length).toBeGreaterThan(0);
      for (const c of d.cards) {
        expect(c.q).toBeUndefined();
        expect(c.a).toBeUndefined();
        expect(c.x).toBeUndefined();
        expect(c.wrong).toBeUndefined();
        expect(c.id).toMatch(UUID_V4);
        expect(Number.isInteger(c.rev) && c.rev >= 1).toBe(true);
        // All current premium cards are pre-migration, so each has a legacyId.
        expect(typeof c.legacyId).toBe('string');
      }
    }
  });

  it('no premium puzzle content appears in the public module (data-driven restricted-field scan)', () => {
    const content = buildContentJson();
    const pubText = JSON.stringify(buildPublicData());
    const committedText = readFileSync(join(ROOT, 'src', 'data', 'content-public.js'), 'utf8');
    // Content-bearing fields only: type/widget/tolerance/unit are not content
    // (a widget name or a number can legitimately appear elsewhere), and the
    // exact-key allowlist test above covers the stub shape by name.
    const CONTENT_FIELDS = ['prompt', 'items', 'answer', 'goal', 'x'];
    const allPuzzles = allExportedPuzzles(content);
    const premiumPuzzles = allPuzzles.filter((p) => !FREE_DECK_SET.has(p.deckId));
    const freePuzzles = allPuzzles.filter((p) => FREE_DECK_SET.has(p.deckId));
    // A goal JSON shared verbatim with a free puzzle is that free puzzle's
    // own content, not a leak (e.g. {"value":42}).
    const freeGoalJson = new Set(
      freePuzzles.filter((p) => p.goal && typeof p.goal === 'object').map((p) => JSON.stringify(p.goal)),
    );
    // A single plain word — or a generic short keyword phrase such as
    // "GROUP BY" / "ORDER BY", which legitimately appears in lesson
    // summaries — is not identifying content. Phrases of 20+ chars and
    // code-like items (punctuation, operators) are identifying and are
    // still checked; the prompt and explanation tripwires below always run.
    const isIdentifying = (s) => s.length >= 20 || /[`'"`;:(){}[\]<>\\/=+*@#$%^&|~]/.test(s);
    expect(premiumPuzzles.length).toBeGreaterThan(0);
    for (const p of premiumPuzzles) {
      for (const field of CONTENT_FIELDS) {
        const value = p[field];
        if (value === undefined || value === null) continue;
        const strings = Array.isArray(value)
          ? value.filter((v) => typeof v === 'string')
          : typeof value === 'string'
            ? [value]
            : typeof value === 'object'
              ? [JSON.stringify(value)]
              : [];
        for (const s of strings) {
          if (!s) continue;
          if (field === 'items' && !isIdentifying(s)) continue;
          if (field === 'goal' && freeGoalJson.has(s)) continue;
          expect(pubText, `premium puzzle ${p.deckId} ${field} leaked into the public build: ${s}`).not.toContain(s);
          expect(committedText, `premium puzzle ${p.deckId} ${field} leaked into content-public.js: ${s}`).not.toContain(s);
        }
      }
    }
  });
});

describe('PR 2: content artifacts are version 2 (test area #17)', () => {
  it('buildContentJson and buildPublicData both report version 2', () => {
    expect(buildContentJson().version).toBe(2);
    expect(buildPublicData().version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Lesson slide decks (carousel, 2026-11-23).
// Every lesson gets a derived deck: one Overview slide plus one slide per
// learn section (cap 5). Captions are verbatim lesson text — an overview
// paragraph or a learn section's first paragraph — never invented copy.
// Diagrams come from the small SVG kit (templates below); a section whose
// body carries a LayerStack uses the real stack items as its labels.
// The deck rides inside the lesson object, so the entitled API serves it
// with exactly the lesson's own gating, and the public build carries it
// only for the free lessons. Written BEFORE the implementation and observed
// failing on pristine code (no `slides` field anywhere).
// ---------------------------------------------------------------------------
const SLIDE_TEMPLATES = new Set([
  'layers',
  'flow',
  'comparison',
  'cycle',
  'client-server',
  'topology',
  'concept',
]);

describe('lesson slide decks (carousel)', () => {
  it('every lesson has a derived deck: 1 overview slide + one per learn section (cap 5)', () => {
    const full = buildContentJson();
    const ids = Object.keys(full.lessons);
    expect(ids).toHaveLength(222);
    for (const [id, lesson] of Object.entries(full.lessons)) {
      const slides = lesson.slides;
      expect(Array.isArray(slides), `${id}: slides is an array`).toBe(true);
      expect(slides.length, `${id}: deck size`).toBe(1 + Math.min(4, (lesson.learn || []).length));
      expect(slides.length, `${id}: at least 3 slides`).toBeGreaterThanOrEqual(3);
      expect(slides.length, `${id}: at most 5 slides`).toBeLessThanOrEqual(5);
      expect(slides[0].title, `${id}: first slide is the Overview`).toBe('Overview');
    }
  });

  it('every slide caption is verbatim lesson text; titles are the section headings', () => {
    const full = buildContentJson();
    for (const [id, lesson] of Object.entries(full.lessons)) {
      // Non-vacuous: a lesson with no deck makes every assertion below pass
      // without checking anything — the deck must exist first.
      expect(Array.isArray(lesson.slides) && lesson.slides.length, `${id}: deck is non-empty`).toBeGreaterThanOrEqual(3);
      const paragraphs = [
        ...(lesson.overview || []),
        ...(lesson.learn || []).flatMap((s) => (s.body || []).filter((p) => typeof p === 'string')),
      ];
      const headings = (lesson.learn || []).map((s) => s.heading);
      for (const [i, slide] of (lesson.slides || []).entries()) {
        expect(typeof slide.caption, `${id} slide ${i}: caption`).toBe('string');
        expect(slide.caption.trim().length, `${id} slide ${i}: caption non-empty`).toBeGreaterThan(0);
        expect(paragraphs, `${id} slide ${i}: caption is verbatim lesson text`).toContain(slide.caption);
        if (i === 0) {
          expect(slide.title, `${id} slide 0: title`).toBe('Overview');
        } else {
          expect(headings, `${id} slide ${i}: title is a learn heading`).toContain(slide.title);
        }
      }
    }
  });

  it('diagram templates come from the known kit set; stack sections use the real stack items', () => {
    const full = buildContentJson();
    for (const [id, lesson] of Object.entries(full.lessons)) {
      for (const [i, slide] of (lesson.slides || []).entries()) {
        expect(slide.diagram && typeof slide.diagram === 'object', `${id} slide ${i}: diagram`).toBe(true);
        expect(SLIDE_TEMPLATES.has(slide.diagram.template), `${id} slide ${i}: template ${slide.diagram.template}`).toBe(true);
        expect(Array.isArray(slide.diagram.labels), `${id} slide ${i}: labels is an array`).toBe(true);
      }
      // A learn section whose body carries a LayerStack renders as a layers
      // diagram labelled with the stack's real item names (lesson text).
      (lesson.learn || []).slice(0, 4).forEach((section, j) => {
        const stack = (section.body || []).find((p) => p && typeof p === 'object' && p.stack)?.stack;
        if (!stack) return;
        const slide = lesson.slides[j + 1];
        expect(slide.diagram.template, `${id}: stack section "${section.heading}" uses layers`).toBe('layers');
        expect(slide.diagram.labels, `${id}: stack labels are the item names`).toEqual(
          stack.items.map((it) => it.name),
        );
      });
    }
  });

  it('the public build carries slides only for the 5 free lessons — no premium slide text leaks', () => {
    const pub = buildPublicData();
    expect(Object.keys(pub.freeLessonContent).sort()).toEqual([...LIB_FREE_LESSONS].sort());
    for (const [id, lesson] of Object.entries(pub.freeLessonContent)) {
      expect(Array.isArray(lesson.slides), `${id}: free lesson has slides`).toBe(true);
      expect(lesson.slides.length, `${id}: free deck size`).toBeGreaterThanOrEqual(3);
    }
    // No premium lesson's slide caption appears anywhere in the public module.
    // (A caption shared verbatim with a free lesson's body is that free
    // lesson's own text, not a leak, so those are skipped.)
    const committedText = readFileSync(join(ROOT, 'src', 'data', 'content-public.js'), 'utf8');
    const full = buildContentJson();
    const freeParagraphs = new Set(
      Object.values(pub.freeLessonContent).flatMap((lesson) => [
        ...(lesson.overview || []),
        ...(lesson.learn || []).flatMap((s) => (s.body || []).filter((p) => typeof p === 'string')),
      ]),
    );
    for (const [id, lesson] of Object.entries(full.lessons)) {
      if (LIB_FREE_LESSONS.includes(id)) continue;
      for (const slide of lesson.slides || []) {
        if (freeParagraphs.has(slide.caption)) continue;
        expect(committedText, `${id}: premium slide caption leaked into the public module`).not.toContain(slide.caption);
      }
    }
  });
});
