// Client-side card-id translation (PR 3: compatibility layer).
//
// translateState(state, idMap) rewrites legacy (positional) card ids to their
// UUIDs per the frozen map, applying the §4.2 collision rules (contract §4):
// translate first, then combine with the mergeCards rule (higher box wins,
// tie -> later due, right/wrong/revSeen maxed), order-independent, exactly
// one entry per card. It also rewrites state.resume (plan step ids, tries /
// retried keys with -review / -warm suffix handling, puzzle steps) and adds
// deckId to every non-puzzle plan step. Unknown keys are preserved, never
// dropped. The function is pure (it never mutates its input) and idempotent.
//
// The map is legacyId -> { id, deckId }, built from the current public bundle
// by buildCardIdMap (allCards + puzzle stubs: legacyId -> id). A tab on the
// old bundle has no map and translates nothing — its ids are all positional
// and consistent, so there is nothing to translate.
import { allCards, allDecks } from '@/data/academy';
import { mergeCards } from './merge';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** A positional id: `<deckId>-<index>` for cards, `<deckId>-p<index>` for puzzles. */
const LEGACY_SHAPE = /-(p)?\d+$/;

const isUuid = (id) => typeof id === 'string' && UUID_V4.test(id);
const isLegacyShaped = (id) => typeof id === 'string' && !isUuid(id) && LEGACY_SHAPE.test(id);

/** Build the legacy -> UUID map from the current public bundle. */
export function buildCardIdMap(cards = allCards, decks = allDecks) {
  const map = new Map();
  for (const card of cards || []) {
    if (card?.legacyId) map.set(card.legacyId, { id: card.id, deckId: card.deckId });
  }
  for (const deck of decks || []) {
    for (const p of deck?.puzzles || []) {
      if (p?.legacyId) map.set(p.legacyId, { id: p.id, deckId: p.deckId ?? deck.id });
    }
  }
  return map;
}

/** Split a tries key / retried entry into its base card id and -review / -warm suffix. */
function splitSuffix(key) {
  if (typeof key !== 'string') return { base: key, suffix: '' };
  if (key.endsWith('-review')) return { base: key.slice(0, -'-review'.length), suffix: '-review' };
  if (key.endsWith('-warm')) return { base: key.slice(0, -'-warm'.length), suffix: '-warm' };
  return { base: key, suffix: '' };
}

/** Translate one bare card/puzzle id; returns null when the id has no map entry. */
function translateId(id, idMap) {
  const entry = idMap.get(id);
  return entry ? { id: entry.id, deckId: entry.deckId } : null;
}

function translateCards(cards, idMap) {
  const out = {};
  const unmapped = [];
  let translated = false;
  // Pass 1: keys that are already current (UUIDs, new cards, unknown ids)
  // land first, so a legacy key folding in afterwards can only combine —
  // never overwrite — the UUID-side record.
  for (const [key, record] of Object.entries(cards)) {
    if (idMap.has(key)) continue;
    if (isLegacyShaped(key)) unmapped.push(key);
    out[key] = record;
  }
  // Pass 2: legacy keys translate to their UUID, combining with the UUID
  // entry when one already exists (the §4.2 collision rule, via mergeCards).
  for (const [key, record] of Object.entries(cards)) {
    const entry = idMap.get(key);
    if (!entry) continue;
    translated = true;
    const target = entry.id;
    out[target] = out[target]
      ? mergeCards({ [target]: out[target] }, { [target]: record })[target]
      : record;
  }
  return { cards: out, translated, unmapped };
}

function translateResume(resume, idMap, uuidToDeck) {
  let translated = false;
  const unmapped = new Set();
  const plan = (resume.plan || []).map((step) => {
    if (!step || typeof step !== 'object') return step;
    const entry = translateId(step.id, idMap);
    if (!entry) {
      if (isLegacyShaped(step.id)) unmapped.add(step.id);
      // A UUID step without a deckId gains one when the card is known.
      if (step.k !== 'p' && step.deckId == null && uuidToDeck.has(step.id)) {
        return { ...step, deckId: uuidToDeck.get(step.id) };
      }
      return step;
    }
    translated = true;
    if (step.k === 'p') return { ...step, id: entry.id }; // puzzle steps carry no deckId
    return { ...step, id: entry.id, deckId: entry.deckId };
  });
  // tries: two passes so a UUID-side value wins on collision — it was
  // written by the new client and is strictly newer than any legacy key.
  const tries = {};
  for (const [key, value] of Object.entries(resume.tries || {})) {
    const { base, suffix } = splitSuffix(key);
    const entry = translateId(base, idMap);
    if (entry) {
      translated = true;
      tries[entry.id + suffix] = value;
    } else {
      if (isLegacyShaped(base)) unmapped.add(base);
      tries[key] = value;
    }
  }
  for (const [key, value] of Object.entries(resume.tries || {})) {
    const { base } = splitSuffix(key);
    if (!idMap.has(base) && !isLegacyShaped(base)) tries[key] = value;
  }
  const retried = [];
  for (const entryKey of resume.retried || []) {
    const { base, suffix } = splitSuffix(entryKey);
    const entry = translateId(base, idMap);
    if (entry) {
      translated = true;
      if (!retried.includes(entry.id + suffix)) retried.push(entry.id + suffix);
    } else {
      if (isLegacyShaped(base)) unmapped.add(base);
      if (!retried.includes(entryKey)) retried.push(entryKey);
    }
  }
  return {
    resume: { ...resume, plan, tries, retried },
    translated,
    unmapped: [...unmapped],
  };
}

/**
 * Translate a progress state from legacy (positional) card ids to UUIDs.
 * Returns { state, translated, unmapped }: `translated` is true when any key
 * was rewritten or cardIdVersion was set; `unmapped` lists legacy-shaped
 * ids with no frozen-map entry, preserved untouched in the output.
 */
export function translateState(state, idMap) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { state, translated: false, unmapped: [] };
  }
  const map = idMap instanceof Map ? idMap : new Map(Object.entries(idMap || {}));
  const uuidToDeck = new Map([...map.values()].map((e) => [e.id, e.deckId]));
  const unmapped = new Set();
  let translated = false;
  let next = { ...state };
  if (state.cards && typeof state.cards === 'object' && !Array.isArray(state.cards)) {
    const result = translateCards(state.cards, map);
    if (result.translated) translated = true;
    for (const key of result.unmapped) unmapped.add(key);
    next = { ...next, cards: result.cards };
  }
  if (state.resume && typeof state.resume === 'object' && !Array.isArray(state.resume)) {
    const result = translateResume(state.resume, map, uuidToDeck);
    if (result.translated) translated = true;
    for (const key of result.unmapped) unmapped.add(key);
    next = { ...next, resume: result.resume };
  }
  const hasCardData =
    (state.cards && typeof state.cards === 'object') || (state.resume && typeof state.resume === 'object');
  if (hasCardData && state.cardIdVersion !== 2) {
    next = { ...next, cardIdVersion: 2 };
    translated = true;
  }
  return { state: next, translated, unmapped: [...unmapped] };
}
