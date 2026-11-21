// Merge two Academy progress states without losing anything. Used on first sign-in, when a learner
// who studied signed-out (local state) links an account that may already have server state, and on
// conflict retries. Pure and order-independent per field.
//
// Rules: XP/combo highest wins; each lesson keeps its best score (tie -> later attempt); each card
// keeps the more-advanced box (tie -> later due) with right/wrong counts maxed; each boss keeps the
// higher %; badges and mastered decks union; per-day XP maxed; streak with the higher count (tie ->
// later date); resume point from whichever was saved more recently; verified labs union (a lab
// verified on either device stays verified, so the one-time lab XP can never be re-earned).
// Exam histories union by attempt id (newest first, capped at 20); an in-progress exam session
// keeps the finished copy, else the later-started one, and per-cert sessions follow the same rule;
// missions union by mission id (the earlier completion wins); seen celebrations union; cardIdVersion
// is carried through (newer wins); any unknown top-level key is carried forward, and on a value
// conflict the server side wins with a console warning — so a future state field can never
// silently vanish again (PR 1: progress integrity).

const num = (x) => (typeof x === 'number' ? x : 0);

function mergeMax(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(num(out[k]), num(v));
  return out;
}

function mergeCards(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, cb] of Object.entries(b)) {
    const ca = out[id];
    if (!ca) {
      out[id] = cb;
      continue;
    }
    const pick = num(ca.box) > num(cb.box) ? ca : num(cb.box) > num(ca.box) ? cb : num(ca.due) >= num(cb.due) ? ca : cb;
    // revSeen is a high-water mark (PR 3, §4.2 collision rule): the merged
    // record keeps the MAXIMUM revision seen on either side, whichever side
    // held the higher box. It is only present when at least one side had it.
    const merged = { ...pick, right: Math.max(num(ca.right), num(cb.right)), wrong: Math.max(num(ca.wrong), num(cb.wrong)) };
    if (ca.revSeen !== undefined || cb.revSeen !== undefined) {
      merged.revSeen = Math.max(num(ca.revSeen), num(cb.revSeen));
    }
    out[id] = merged;
  }
  return out;
}

// Exported for the card-id translator (src/lib/progress/migrateCardIds.js):
// combining a legacy entry with its UUID entry is exactly this rule.
export { mergeCards };

function mergeLessons(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, lb] of Object.entries(b)) {
    const la = out[id];
    if (!la) {
      out[id] = lb;
      continue;
    }
    let winner = la;
    if (num(lb.best) > num(la.best)) winner = lb;
    else if (num(lb.best) === num(la.best)) winner = num(lb.at) > num(la.at) ? lb : la;
    // A server-verified lab completion marks the lesson complete (via: 'lab')
    // without a quiz score — that provenance survives the merge even when the
    // other side holds the higher guided score, so a cross-device sync can
    // never un-complete a lesson. The best score is kept from the winner.
    out[id] = (la.via === 'lab' || lb.via === 'lab') ? { ...winner, via: 'lab' } : winner;
  }
  return out;
}

function mergeLabs(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, lb] of Object.entries(b)) {
    const la = out[id];
    if (!la) {
      out[id] = lb;
      continue;
    }
    // Verified once, verified forever: keep the earliest verification time.
    out[id] = { verified: true, at: Math.min(num(la.at) || Infinity, num(lb.at) || Infinity) };
    if (!Number.isFinite(out[id].at)) out[id].at = la.at ?? lb.at ?? 0;
  }
  return out;
}

function mergeStreak(a = { count: 0, last: null }, b = { count: 0, last: null }) {
  if (num(a.count) !== num(b.count)) return num(a.count) > num(b.count) ? a : b;
  return String(a.last || '') >= String(b.last || '') ? a : b;
}

function mergeResume(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return num(a.at) >= num(b.at) ? a : b;
}

// Exam-history cap: academy.js caps each history at 20 attempts
// (EXAM_HISTORY_LIMIT / SECPLUS_EXAM_HISTORY_LIMIT / CERT_EXAM_HISTORY_LIMIT).
const EXAM_HISTORY_LIMIT = 20;

/** Union two exam-history arrays by attempt id, newest first, capped at 20. */
function mergeExamHistory(a = [], b = []) {
  const byId = new Map();
  for (const attempt of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!attempt || attempt.id == null) continue;
    const prev = byId.get(attempt.id);
    // Keep the most recent attempt per id; on a tie the server side (b,
    // iterated last) wins, so the result is deterministic.
    if (!prev || num(attempt.at) >= num(prev.at)) byId.set(attempt.id, attempt);
  }
  return [...byId.values()].sort((x, y) => num(y.at) - num(x.at)).slice(0, EXAM_HISTORY_LIMIT);
}

function isFinishedExam(session) {
  return !!session && session.finishedAt != null;
}

/**
 * Merge two copies of one exam session (exam / secplusExam / one certExams entry).
 * A finished session always wins over an unfinished one; between two finished
 * sessions the later finish wins; between two unfinished ones the later start
 * wins. A missing side keeps the other side's session.
 */
function mergeExamSession(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  const aDone = isFinishedExam(a);
  const bDone = isFinishedExam(b);
  if (aDone !== bDone) return aDone ? a : b;
  if (aDone && num(a.finishedAt) !== num(b.finishedAt)) {
    return num(a.finishedAt) > num(b.finishedAt) ? a : b;
  }
  if (num(a.startedAt) !== num(b.startedAt)) {
    return num(a.startedAt) > num(b.startedAt) ? a : b;
  }
  return b;
}

/** Per-cert exam sessions: the session rule applied independently per cert. */
function mergeCertExams(a = {}, b = {}) {
  const out = { ...(a || {}) };
  for (const [certId, sessionB] of Object.entries(b || {})) {
    out[certId] = mergeExamSession(out[certId], sessionB);
  }
  return out;
}

/**
 * Union mission completions by mission id. The same mission on both sides
 * keeps the earlier completion; a tie on time keeps the higher XP, so the
 * merge is deterministic either way round.
 */
function mergeMissions(a = {}, b = {}) {
  const out = { ...(a || {}) };
  for (const [id, mb] of Object.entries(b || {})) {
    const ma = out[id];
    if (!ma) {
      out[id] = mb;
      continue;
    }
    if (num(mb.at) < num(ma.at)) out[id] = mb;
    else if (num(mb.at) === num(ma.at) && num(mb.xp) > num(ma.xp)) out[id] = mb;
  }
  return out;
}

/** Union seen celebrations with no duplicates; sorted so the merge is order-independent. */
function mergeSeenCelebrations(a = [], b = []) {
  return [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])].sort();
}

/** A top-level key holding an exam history: `exams`, `secplusExams`, `<certId>Exams`. */
function isHistoryKey(key) {
  return key === 'exams' || key.endsWith('Exams');
}

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** cardIdVersion is carried through; the newer (higher) version wins. */
function mergeCardIdVersion(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  return b;
}

/** Merge b into a, returning a new state. Missing sides are treated as empty. */
export function mergeProgress(a = {}, b = {}) {
  const out = {
    xp: Math.max(num(a.xp), num(b.xp)),
    bestCombo: Math.max(num(a.bestCombo), num(b.bestCombo)),
    days: mergeMax(a.days, b.days),
    bosses: mergeMax(a.bosses, b.bosses),
    cards: mergeCards(a.cards, b.cards),
    lessons: mergeLessons(a.lessons, b.lessons),
    labs: mergeLabs(a.labs, b.labs),
    mastered: { ...(a.mastered || {}), ...(b.mastered || {}) },
    badges: [...new Set([...(a.badges || []), ...(b.badges || [])])],
    streak: mergeStreak(a.streak, b.streak),
    resume: mergeResume(a.resume, b.resume),
    exams: mergeExamHistory(a.exams, b.exams),
    exam: mergeExamSession(a.exam, b.exam),
    secplusExams: mergeExamHistory(a.secplusExams, b.secplusExams),
    secplusExam: mergeExamSession(a.secplusExam, b.secplusExam),
    certExams: mergeCertExams(a.certExams, b.certExams),
    missions: mergeMissions(a.missions, b.missions),
    seenCelebrations: mergeSeenCelebrations(a.seenCelebrations, b.seenCelebrations),
  };

  // cardIdVersion is carried through (newer wins); it only appears in the
  // output when at least one side defines it.
  const cardIdVersion = mergeCardIdVersion(a.cardIdVersion, b.cardIdVersion);
  if (cardIdVersion !== undefined) out.cardIdVersion = cardIdVersion;

  // Catch-all: any other top-level key is carried forward from either side,
  // so a future state field can never silently vanish again. Per-cert exam
  // histories (`<certId>Exams`) get the history rule; on a value conflict
  // for any other key the server side (b) wins and a warning is logged.
  const handled = new Set(Object.keys(out));
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (handled.has(key)) continue;
    if (isHistoryKey(key)) {
      out[key] = mergeExamHistory(a[key], b[key]);
      continue;
    }
    const aHas = Object.prototype.hasOwnProperty.call(a, key);
    const bHas = Object.prototype.hasOwnProperty.call(b, key);
    if (aHas && bHas) {
      if (deepEqual(a[key], b[key])) {
        out[key] = a[key];
      } else {
        console.warn(`[mergeProgress] conflicting values for unknown field "${key}"; keeping server side`);
        out[key] = b[key];
      }
    } else if (aHas) {
      out[key] = a[key];
    } else {
      out[key] = b[key];
    }
  }
  return out;
}
