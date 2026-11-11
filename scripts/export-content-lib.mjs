// Content export: splits the curriculum into the public subset (bundled with the
// app) and the full dataset (served by the entitled content API, backend/content.py).
//
// SOURCE OF TRUTH for content: the JS data files under src/data/ (edited by hand,
// as before). This module imports them, normalises them exactly like
// src/data/academy/index.js used to, and produces two artifacts:
//
//   backend/data/content.json  — EVERYTHING (all decks/cards, lesson bodies,
//                                module notes, puzzles, cipher notes). The
//                                backend loads it and gates premium items
//                                behind an active subscription.
//   src/data/content-public.js — the PUBLIC subset only: full structure
//                                (tracks/tiers/decks, titles, summaries, tags,
//                                card ids + counts) plus the FREE tier's card
//                                bodies, lesson bodies, puzzles and cipher
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
import { CIPHER_NOTES } from '../src/data/cipherNotes.js';

// Mirror of src/lib/subscription.js (the single source of truth for the free
// tier). Duplicated here because subscription.js imports React/AuthContext and
// cannot be imported by plain Node; scripts/export-content.test.js asserts the
// two stay identical.
export const FREE_LESSON_IDS = ['net-osi', 'sec-concepts', 'py-basics', 'lx-cli', 'cl-concepts'];
export const FREE_DECK_IDS = ['net-osi', 'cy-linux', 'py-basics', 'lx-cli', 'cl-concepts'];

const FREE_DECKS = new Set(FREE_DECK_IDS);

// Normalises the raw track files into tracks -> tiers -> decks -> cards with
// stable position-based ids. Identical to what src/data/academy/index.js did
// before the entitlement split (card ids are position-based: append new cards,
// don't reorder, or learners lose progress on them).
function normaliseTrack(raw) {
  const tiers = TIERS.map((tier) => ({
    ...tier,
    decks: (raw.tiers[tier.id] || []).map((deck) => ({
      ...deck,
      trackId: raw.id,
      tierId: tier.id,
      resources: (deck.sources || []).map((id) => ({ id, ...RESOURCES[id] })).filter((r) => r.url),
      puzzles: (interactive[deck.id] || []).map((p, i) => ({ ...p, id: `${deck.id}-p${i}` })),
      cards: deck.cards.map(([q, a, x, wrong], i) => ({
        id: `${deck.id}-${i}`,
        deckId: deck.id,
        trackId: raw.id,
        q,
        a,
        x,
        wrong,
      })),
    })),
  }));
  return { ...raw, tiers };
}

const RAW_TRACKS = [
  python, network, routing, security, cyber, cloud, awsSaa, cysa, awsSecurity, ai,
  cissp, linux, terraform, cpp, go, rust, sql, docker, kubernetes, git,
];

export const tracks = RAW_TRACKS.map(normaliseTrack);
export const allDecks = tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks));
export const allCards = allDecks.flatMap((d) => d.cards);

/** Full dataset for the backend (backend/data/content.json). */
export function buildContentJson() {
  return {
    version: 1,
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
    cipherNotes: CIPHER_NOTES,
  };
}

/**
 * Public subset for the app bundle (src/data/content-public.js). Premium decks
 * keep their structure (id/title/summary/tags/card ids + count) but their card
 * bodies and puzzles are replaced: cards become id-only stubs, puzzles become [].
 * Free decks keep their full cards and puzzles. Free lessons keep their full
 * reading bodies; premium lessons are absent entirely.
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
          puzzles: [],
          cards: deck.cards.map((c) => ({ id: c.id, deckId: c.deckId, trackId: c.trackId })),
        };
      }),
    })),
  }));
  const freeLessons = Object.fromEntries(
    FREE_LESSON_IDS.filter((id) => LESSON_CONTENT[id]).map((id) => [id, LESSON_CONTENT[id]]),
  );
  const freeCipherNotes = Object.fromEntries(
    FREE_LESSON_IDS.filter((id) => CIPHER_NOTES[id]).map((id) => [id, CIPHER_NOTES[id]]),
  );
  return {
    version: 1,
    tracks: publicTracks,
    freeLessonContent: freeLessons,
    freeCipherNotes,
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
