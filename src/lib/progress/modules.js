// Library (module browse) progress: flashcards + quiz scores per module.
//
// This used to be an ad-hoc localStorage blob (`netos-progress-v1`, a leftover key from a
// previous product name) living next to the Academy's adapter-based progress. It now goes
// through the same adapter interface (`./storage.js`), so it is testable and behaves the
// same when storage is blocked — and a future server adapter can pick it up the same way.
//
// The Academy (`src/lib/academy.js`, key `itfund-academy-v1`) tracks a different content
// model (tracks/decks/XP); this module tracks the Library's per-module flashcards/quiz.
// Same persistence pattern, separate namespaces on purpose.
import { localStorageAdapter, memoryAdapter } from './storage';

const KEY = 'itfund-modules-v1';
const LEGACY_KEY = 'netos-progress-v1';

let adapter = null;

function getAdapter() {
  if (!adapter) {
    adapter = typeof localStorage === 'undefined' ? memoryAdapter() : localStorageAdapter(KEY);
    // One-time migration from the pre-production key. Runs once: after copying, the legacy
    // key is removed so this never fires again.
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw && !adapter.load()) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') adapter.save(data);
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Storage blocked: the in-memory adapter still works for this session.
    }
  }
  return adapter;
}

/** Test seam: swap the persistence backend. */
export function __setAdapter(next) {
  adapter = next;
}

function loadAll() {
  return getAdapter().load() || {};
}

function saveAll(all) {
  getAdapter().save(all);
}

export function getAllProgress() {
  return loadAll();
}

export function getProgress(moduleId) {
  const all = loadAll();
  return all[moduleId] || { flashcards: null, quiz: null };
}

export function saveFlashcardProgress(moduleId, known, total) {
  const all = loadAll();
  const prev = all[moduleId]?.flashcards;
  const bestKnown = prev ? Math.max(prev.bestKnown ?? 0, known) : known;
  all[moduleId] = {
    ...(all[moduleId] || {}),
    flashcards: { known, total, bestKnown },
  };
  saveAll(all);
}

export function saveQuizScore(moduleId, score, total) {
  const all = loadAll();
  const prev = all[moduleId]?.quiz;
  const bestScore = prev ? Math.max(prev.bestScore ?? 0, score) : score;
  all[moduleId] = {
    ...(all[moduleId] || {}),
    quiz: { bestScore, total, lastScore: score },
  };
  saveAll(all);
}

export function getOverallProgress(moduleId) {
  const p = getProgress(moduleId);
  let sum = 0;
  let count = 0;
  if (p.flashcards && p.flashcards.total > 0) {
    sum += p.flashcards.known / p.flashcards.total;
    count++;
  }
  if (p.quiz && p.quiz.total > 0) {
    sum += p.quiz.bestScore / p.quiz.total;
    count++;
  }
  return count > 0 ? Math.round((sum / count) * 100) : 0;
}
