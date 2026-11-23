// Public academy data: structure + free-tier bodies only.
//
// `tracks` comes from the generated src/data/content-public.js (written by
// `node scripts/export-content.mjs` from the authoring sources in
// src/data/academy/*.js). Premium decks carry card STUBS here — { id, deckId,
// trackId, rev, legacyId } with no question, answer, or distractors — and
// puzzle STUBS — { id, legacyId, deckId } with no prompt, items, or answers.
// Their bodies live behind the entitled content API; read them through
// src/lib/content.js (getDeckContent / resolveCards), never by importing the
// authoring sources. Importing a track file directly would bundle every
// premium answer for anonymous visitors (audit P0-1).
//
// `lessonExcerpts` is the one exception, by Spencer's explicit decision (b),
// 2026-11-23: the overview's FIRST paragraph of every lesson, premium
// included, is public (paywall pages render it, the sitemap lists it). No
// other premium text is in this bundle — no second paragraph, no learn
// section, no card or puzzle body.
import { tracks, lessonExcerpts } from '../content-public';

export { TIERS, CISSP_DOMAINS, SECURITY_PLUS_DOMAINS, SAA_DOMAINS, CYSA_DOMAINS, AWS_SECURITY_DOMAINS, ROADMAP, RESOURCES, EXAM_OUTLINES } from './meta';

export { tracks, lessonExcerpts };

/** A lesson's public excerpt (overview first paragraph), or '' if none. */
export const getLessonExcerpt = (id) => lessonExcerpts[id] || '';

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
