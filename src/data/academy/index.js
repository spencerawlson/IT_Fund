// Public academy data: structure + free-tier bodies only.
//
// `tracks` comes from the generated src/data/content-public.js (written by
// `node scripts/export-content.mjs` from the authoring sources in
// src/data/academy/*.js). Premium decks carry card STUBS here — { id, deckId,
// trackId } with no question, answer, or distractors — and empty puzzles.
// Their bodies live behind the entitled content API; read them through
// src/lib/content.js (getDeckContent / resolveCards), never by importing the
// authoring sources. Importing a track file directly would bundle every
// premium answer for anonymous visitors (audit P0-1).
//
// Structure-only consumers (counts, titles, tags, resources) use this module
// as before: tracks, allDecks, allCards, getTrack, getDeck, decksForDomain,
// trackResources. Anything that shows a question or an answer must resolve
// the cards first.
import { tracks } from '../content-public';

export { TIERS, CISSP_DOMAINS, SECURITY_PLUS_DOMAINS, SAA_DOMAINS, CYSA_DOMAINS, AWS_SECURITY_DOMAINS, ROADMAP, RESOURCES, EXAM_OUTLINES } from './meta';

export { tracks };

export const allDecks = tracks.flatMap((t) => t.tiers.flatMap((tier) => tier.decks));
export const allCards = allDecks.flatMap((d) => d.cards);

export const getTrack = (id) => tracks.find((t) => t.id === id);
export const getDeck = (id) => allDecks.find((d) => d.id === id);

/** Every resource cited by a track's decks, de-duplicated. */
export function trackResources(track) {
  const seen = new Map();
  track.tiers.forEach((tier) => tier.decks.forEach((d) => d.resources.forEach((r) => seen.set(r.id, r))));
  return [...seen.values()];
}

/** Decks that feed a CISSP domain, across every track. */
export const decksForDomain = (domainId) => allDecks.filter((d) => (d.cissp || []).includes(domainId));
