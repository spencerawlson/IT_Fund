const KEY = 'netos-progress-v1';

export function getAllProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getProgress(moduleId) {
  const all = getAllProgress();
  return all[moduleId] || { flashcards: null, quiz: null };
}

export function saveFlashcardProgress(moduleId, known, total) {
  const all = getAllProgress();
  const prev = all[moduleId]?.flashcards;
  const bestKnown = prev ? Math.max(prev.bestKnown ?? 0, known) : known;
  all[moduleId] = {
    ...(all[moduleId] || {}),
    flashcards: { known, total, bestKnown },
  };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function saveQuizScore(moduleId, score, total) {
  const all = getAllProgress();
  const prev = all[moduleId]?.quiz;
  const bestScore = prev ? Math.max(prev.bestScore, score) : score;
  all[moduleId] = {
    ...(all[moduleId] || {}),
    quiz: { bestScore, total, lastScore: score },
  };
  localStorage.setItem(KEY, JSON.stringify(all));
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