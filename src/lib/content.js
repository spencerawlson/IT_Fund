// Entitled content service: the only way the app reads premium lesson bodies,
// card answers, module notes, and exam questions. Those are served by the
// backend (/api/content/*) after an entitlement check — they never enter the
// public JS bundle. Free content is bundled (src/data/content-public.js) and
// is never fetched.
//
// All fetches send credentials (the session cookie), so they also work from
// Capacitor origins. Responses are cached in-memory for the session: a deck
// fetched once is reused by the flashcards, the guided lesson, the boss, and
// the review queue without another round trip.
import { getDeck } from '../data/academy';
import { freeLessonContent, freeCipherNotes } from '../data/content-public';
import { isLessonFree, isDeckFree } from './subscription';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ContentError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ContentError';
    this.status = status;
  }
}

const cache = new Map(); // key -> Promise (in-flight or resolved)

/** Fetch JSON with the session cookie; non-2xx becomes a ContentError. */
async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    throw new ContentError(res.status, `Content request failed: ${res.status} ${path}`);
  }
  return res.json();
}

function cached(key, load) {
  if (!cache.has(key)) cache.set(key, load().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

/** Test-only: drop the in-memory cache (fetch is mocked per test). */
export function clearContentCache() {
  cache.clear();
}

/**
 * Full cards + puzzles for one deck. Free decks come from the bundle (no
 * network); premium decks come from the API (401 anonymous, 402 signed-in
 * non-subscriber). Returns { deck, cards, puzzles }.
 */
export function getDeckContent(deckId) {
  return cached(`deck:${deckId}`, async () => {
    if (isDeckFree(deckId)) {
      const deck = getDeck(deckId);
      if (!deck) throw new ContentError(404, `Unknown deck: ${deckId}`);
      return { deck, cards: deck.cards, puzzles: deck.puzzles || [] };
    }
    return fetchJson(`/content/deck/${deckId}`);
  });
}

/** Just the cards for one deck (the common case). */
export function getDeckCards(deckId) {
  return getDeckContent(deckId).then((d) => d.cards);
}

/**
 * Reading body + cipher note for one lesson. Free lessons come from the
 * bundle; premium lessons from the API. Returns { content, cipherNote }
 * where content is null for lessons taught through practice alone.
 */
export function getLessonContent(lessonId) {
  return cached(`lesson:${lessonId}`, async () => {
    if (isLessonFree(lessonId)) {
      return { content: freeLessonContent[lessonId] || null, cipherNote: freeCipherNotes[lessonId] || null };
    }
    return fetchJson(`/content/lesson/${lessonId}`);
  });
}

/**
 * One module study note. Any failure — no full note (404), anonymous (401),
 * or non-subscriber (402) — falls back to the concept's short detail, which
 * is the same fallback the bundled getNote() has always used.
 */
export async function getModuleNote(key, fallbackDetail) {
  const fallback = { body: fallbackDetail };
  try {
    const note = await fetchJson(`/content/note/${encodeURIComponent(key)}`);
    return { body: note.body, example: note.example, tip: note.tip };
  } catch {
    return fallback;
  }
}

/** A freshly built timed exam for one cert (server-side pools). */
export function fetchExam(certId) {
  return fetchJson(`/content/exam/${certId}`);
}

/**
 * Resolve stub cards ({ id, deckId, trackId }) to full cards. Decks are
 * fetched once each (cached); stubs whose deck cannot be read (e.g. a
 * lapsed subscription mid-session) are dropped, never faked.
 */
export async function resolveCards(stubCards) {
  const deckIds = [...new Set((stubCards || []).map((s) => s.deckId))];
  const byId = new Map();
  for (const deckId of deckIds) {
    let cards;
    try {
      cards = await getDeckCards(deckId);
    } catch {
      continue; // deck unreadable: drop its stubs, keep the rest
    }
    for (const card of cards) byId.set(card.id, card);
  }
  // Stubs whose card no longer exists (content changed since the review
  // queue was built) are dropped, never faked.
  return (stubCards || []).map((s) => byId.get(s.id)).filter(Boolean);
}
