// Merge two Academy progress states without losing anything. Used on first sign-in, when a learner
// who studied signed-out (local state) links an account that may already have server state, and on
// conflict retries. Pure and order-independent per field.
//
// Rules: XP/combo highest wins; each lesson keeps its best score (tie -> later attempt); each card
// keeps the more-advanced box (tie -> later due) with right/wrong counts maxed; each boss keeps the
// higher %; badges and mastered decks union; per-day XP maxed; streak with the higher count (tie ->
// later date); resume point from whichever was saved more recently; verified labs union (a lab
// verified on either device stays verified, so the one-time lab XP can never be re-earned).

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
    out[id] = { ...pick, right: Math.max(num(ca.right), num(cb.right)), wrong: Math.max(num(ca.wrong), num(cb.wrong)) };
  }
  return out;
}

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

/** Merge b into a, returning a new state. Missing sides are treated as empty. */
export function mergeProgress(a = {}, b = {}) {
  return {
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
  };
}
