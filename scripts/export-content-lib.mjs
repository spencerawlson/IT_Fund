// Content export: splits the curriculum into the public subset (bundled with the
// app) and the full dataset (served by the entitled content API, backend/content.py).
//
// SOURCE OF TRUTH for content: the JS data files under src/data/ (edited by hand,
// as before). This module imports them, normalises them exactly like
// src/data/academy/index.js used to, and produces two artifacts:
//
//   backend/data/content.json  — EVERYTHING (all decks/cards, lesson bodies,
//                                module notes, puzzles, cypher notes). The
//                                backend loads it and gates premium items
//                                behind an active subscription.
//   src/data/content-public.js — the PUBLIC subset only: full structure
//                                (tracks/tiers/decks, titles, summaries, tags,
//                                card ids + counts) plus the FREE tier's card
//                                bodies, lesson bodies, puzzles and cypher
//                                notes. Premium bodies NEVER appear here.
//
// The app bundle imports only the public module (via src/data/academy/index.js),
// so an anonymous visitor's JS contains no premium lesson text, card answers,
// or exam questions. Run `node scripts/export-content.mjs` after any curriculum
// edit; scripts/export-content.test.js fails the build if the artifacts drift
// from the sources.
//
// FREE TIER (must match src/lib/subscription.js exactly — the test enforces it):
// 3 free lessons (reading) and 5 free decks (flashcards). Lesson-free and
// deck-free are different sets by design (see subscription.js).

import python from '../src/data/academy/python.js';
import network from '../src/data/academy/network.js';
import routing from '../src/data/academy/routing.js';
import security from '../src/data/academy/security.js';
import cyber from '../src/data/academy/cyber.js';
import cloud from '../src/data/academy/cloud.js';
import awsSaa from '../src/data/academy/aws-saa.js';
import cysa from '../src/data/academy/cysa.js';
import awsSecurity from '../src/data/academy/aws-security.js';
import ai from '../src/data/academy/ai.js';
import cissp from '../src/data/academy/cissp.js';
import linux from '../src/data/academy/linux.js';
import terraform from '../src/data/academy/terraform.js';
import cpp from '../src/data/academy/cpp.js';
import go from '../src/data/academy/go.js';
import rust from '../src/data/academy/rust.js';
import sql from '../src/data/academy/sql.js';
import docker from '../src/data/academy/docker.js';
import kubernetes from '../src/data/academy/kubernetes.js';
import git from '../src/data/academy/git.js';
import introIt from '../src/data/academy/intro-it.js';
import interactive from '../src/data/academy/interactive.js';
import {
  TIERS,
  RESOURCES,
  CISSP_DOMAINS,
  SECURITY_PLUS_DOMAINS,
  SAA_DOMAINS,
  CYSA_DOMAINS,
  AWS_SECURITY_DOMAINS,
} from '../src/data/academy/meta.js';
import { LESSON_CONTENT } from '../src/data/catalog/lessonContent.js';
import { MODULE_NOTES } from '../src/data/moduleNotes/index.js';
import { CYPHER_NOTES } from '../src/data/cypherNotes.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Frozen legacy map (PR 2, plan v2.2 §4): pre-migration positional ids paired
// with their UUIDs. CLOSED — it never grows. A card/puzzle whose UUID is not
// in the map is a NEW one: it exports with the UUID and no legacyId (never
// an invented positional id). Loaded lazily so importing this module never
// fails at import time; the first normaliseTrack call fails loudly instead —
// silently exporting without legacyIds would corrupt the migration.
const LEGACY_MAP_PATH = join(dirname(fileURLToPath(import.meta.url)), 'legacy-card-ids.json');
let legacyByUuid = null;
function loadLegacyMap() {
  if (legacyByUuid) return legacyByUuid;
  let raw;
  try {
    raw = JSON.parse(readFileSync(LEGACY_MAP_PATH, 'utf8'));
  } catch {
    throw new Error('export-content: frozen legacy map missing — run node scripts/assign-card-ids.mjs first');
  }
  legacyByUuid = new Map();
  for (const entries of [raw.cards || [], raw.puzzles || []]) {
    for (const e of entries) {
      if (legacyByUuid.has(e.id)) throw new Error(`export-content: duplicate uuid ${e.id} in the legacy map`);
      legacyByUuid.set(e.id, e);
    }
  }
  return legacyByUuid;
}

// Mirror of src/lib/subscription.js (the single source of truth for the free
// tier). Duplicated here because subscription.js imports React/AuthContext and
// cannot be imported by plain Node; scripts/export-content.test.js asserts the
// two stay identical.
export const FREE_LESSON_IDS = ['net-osi', 'sec-concepts', 'py-basics', 'lx-cli', 'cl-concepts'];
export const FREE_DECK_IDS = ['net-osi', 'cy-linux', 'py-basics', 'lx-cli', 'cl-concepts'];

const FREE_DECKS = new Set(FREE_DECK_IDS);

// Normalises the raw track files into tracks -> tiers -> decks -> cards with
// stable UUID ids (PR 2). Card tuples are 6 elements:
//   [uuid, question, answer, explanation, wrongOptions, revision]
// and puzzles carry `uuid` + `rev`. The identity is the UUID: inserting or
// reordering cards never re-numbers an existing card. `legacyId` is attached
// only for pre-migration cards/puzzles found in the frozen map.
export function normaliseTrack(raw) {
  const legacy = loadLegacyMap();
  const tiers = TIERS.map((tier) => ({
    ...tier,
    decks: (raw.tiers[tier.id] || []).map((deck) => ({
      ...deck,
      trackId: raw.id,
      tierId: tier.id,
      resources: (deck.sources || []).map((id) => ({ id, ...RESOURCES[id] })).filter((r) => r.url),
      puzzles: (interactive[deck.id] || []).map((p) => {
        const { uuid, rev, ...rest } = p;
        if (!uuid || !UUID_V4.test(uuid)) {
          throw new Error(`export-content: deck ${deck.id} has a puzzle without a UUID v4 id`);
        }
        const entry = legacy.get(uuid);
        return {
          ...rest,
          id: uuid,
          deckId: deck.id,
          rev: rev ?? 1,
          ...(entry ? { legacyId: entry.legacyId } : {}),
        };
      }),
      cards: deck.cards.map(([uuid, q, a, x, wrong, rev = 1]) => {
        if (!uuid || !UUID_V4.test(uuid)) {
          throw new Error(`export-content: deck ${deck.id} has a card without a UUID v4 id (tuple: ${JSON.stringify([uuid, q])})`);
        }
        const entry = legacy.get(uuid);
        return {
          id: uuid,
          deckId: deck.id,
          trackId: raw.id,
          q,
          a,
          x,
          wrong,
          rev,
          ...(entry ? { legacyId: entry.legacyId } : {}),
        };
      }),
    })),
  }));
  return { ...raw, tiers };
}

const RAW_TRACKS = [
  python, network, routing, security, cyber, cloud, awsSaa, cysa, awsSecurity, ai,
  cissp, linux, terraform, cpp, go, rust, sql, docker, kubernetes, git, introIt,
];

export const tracks = RAW_TRACKS.map(normaliseTrack);
export const allDecks = tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks));
export const allCards = allDecks.flatMap((d) => d.cards);

/** Full dataset for the backend (backend/data/content.json). */
export function buildContentJson() {
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    source: 'scripts/export-content.mjs',
    freeDecks: [...FREE_DECK_IDS],
    freeLessons: [...FREE_LESSON_IDS],
    domains: {
      cissp: CISSP_DOMAINS,
      secplus: SECURITY_PLUS_DOMAINS,
      saa: SAA_DOMAINS,
      cysa: CYSA_DOMAINS,
      awss: AWS_SECURITY_DOMAINS,
    },
    tracks,
    lessons: LESSON_CONTENT,
    notes: MODULE_NOTES,
    cipherNotes: CYPHER_NOTES,
  };
}

/**
 * Public subset for the app bundle (src/data/content-public.js). Premium decks
 * keep their structure (id/title/summary/tags/card ids + count) but their card
 * bodies and puzzle bodies are replaced: cards become stubs (id, rev,
 * legacyId), puzzles become stubs ({id, legacyId, deckId}) — exactly those
 * keys, no restricted fields. Free decks keep their full cards and puzzles.
 * Free lessons keep their full reading bodies; premium lessons are absent
 * entirely.
 */
export function buildPublicData() {
  const publicTracks = tracks.map((track) => ({
    ...track,
    tiers: track.tiers.map((tier) => ({
      ...tier,
      decks: tier.decks.map((deck) => {
        if (FREE_DECKS.has(deck.id)) return deck;
        return {
          ...deck,
          puzzles: deck.puzzles.map((p) => ({
            id: p.id,
            ...(p.legacyId ? { legacyId: p.legacyId } : {}),
            deckId: deck.id,
          })),
          cards: deck.cards.map((c) => ({
            id: c.id,
            deckId: c.deckId,
            trackId: c.trackId,
            rev: c.rev,
            ...(c.legacyId ? { legacyId: c.legacyId } : {}),
          })),
        };
      }),
    })),
  }));
  const freeLessons = Object.fromEntries(
    FREE_LESSON_IDS.filter((id) => LESSON_CONTENT[id]).map((id) => [id, LESSON_CONTENT[id]]),
  );
  const freeCypherNotes = Object.fromEntries(
    FREE_LESSON_IDS.filter((id) => CYPHER_NOTES[id]).map((id) => [id, CYPHER_NOTES[id]]),
  );
  return {
    version: 2,
    tracks: publicTracks,
    freeLessonContent: freeLessons,
    freeCipherNotes: freeCypherNotes,
  };
}

/** Census of the full dataset (for the test + the CLI report). */
export function census() {
  const lessonCount = Object.keys(LESSON_CONTENT).length;
  return {
    tracks: tracks.length,
    decks: allDecks.length,
    cards: allCards.length,
    lessons: lessonCount,
    lessonsWithContent: Object.keys(LESSON_CONTENT).length,
    notes: Object.keys(MODULE_NOTES).length,
    puzzles: allDecks.reduce((s, d) => s + (d.puzzles?.length || 0), 0),
    freeDecks: FREE_DECK_IDS.length,
    freeCards: allDecks
      .filter((d) => FREE_DECKS.has(d.id))
      .reduce((s, d) => s + d.cards.length, 0),
    freeLessons: FREE_LESSON_IDS.length,
  };
}
