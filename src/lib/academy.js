// Academy game engine: XP, levels, streaks, badges, and Leitner spaced repetition.
// All state is local to the browser (localStorage), matching src/lib/progress.js.
import { useSyncExternalStore } from 'react';
import { localStorageAdapter } from './progress/storage';
import { allDecks, allCards } from '../data/academy';
import { CISSP_DOMAINS } from '../data/academy/meta';

const KEY = 'itfund-academy-v1';
const EVENT = 'itfund-academy-change';
const DAY = 24 * 60 * 60 * 1000;

// Leitner boxes: 0 = unseen, 1..5 = learning -> mastered. Interval in days until due again.
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16];
export const MAX_BOX = 5;
export const DAILY_GOAL_XP = 100;
export const BOSS_PASS_PCT = 80;

export const XP = {
  flashKnown: 10,
  flashAgain: 2,
  quizCorrect: 15,
  bossWin: 200,
  deckMastered: 100,
  puzzleSolved: 20,
  lessonComplete: 30,
  examPerCorrect: 1,
};

const RANKS = [
  { level: 1, title: 'Recruit' },
  { level: 3, title: 'Help Desk Hero' },
  { level: 5, title: 'Junior Analyst' },
  { level: 8, title: 'Network Technician' },
  { level: 11, title: 'Security Analyst' },
  { level: 14, title: 'Security Engineer' },
  { level: 17, title: 'Cloud Security Architect' },
  { level: 20, title: 'Security Manager' },
  { level: 24, title: 'CISSP-Ready' },
];

export const BADGES = {
  'first-steps': { title: 'First Steps', desc: 'Review your first card.', icon: 'Footprints' },
  'streak-3': { title: 'On a Roll', desc: 'Study 3 days in a row.', icon: 'Flame' },
  'streak-7': { title: 'Week Warrior', desc: 'Study 7 days in a row.', icon: 'Flame' },
  'streak-30': { title: 'Unbreakable', desc: 'Study 30 days in a row.', icon: 'Flame' },
  'combo-10': { title: 'Combo Breaker', desc: 'Answer 10 quiz questions in a row correctly.', icon: 'Zap' },
  'deck-master': { title: 'Deck Master', desc: 'Fully master any deck.', icon: 'Layers' },
  'boss-slayer': { title: 'Boss Slayer', desc: 'Defeat your first tier boss.', icon: 'Swords' },
  'flawless': { title: 'Flawless', desc: 'Beat a boss without losing a heart.', icon: 'Crown' },
  'century': { title: 'Century', desc: 'Get 100 cards to the mastered box.', icon: 'Award' },
  'cissp-ready': { title: 'CISSP-Ready', desc: 'Reach 80% readiness in all 8 CISSP domains.', icon: 'ShieldCheck' },
};

const EMPTY = { xp: 0, days: {}, streak: { count: 0, last: null }, cards: {}, bosses: {}, badges: [], bestCombo: 0, mastered: {}, lessons: {}, resume: null, exams: [], exam: null };

let cache = null;
// Persistence goes through an adapter (src/lib/progress/storage.js) so a server-backed store
// can replace localStorage without touching any page.
let adapter = localStorageAdapter(KEY);

/** Swap the persistence backend (tests, or a future server adapter). */
export function setProgressAdapter(next) {
  adapter = next;
  cache = null;
}

function read() {
  if (!cache) cache = { ...EMPTY, ...(adapter.load() || {}) };
  return cache;
}

function write(next) {
  cache = next;
  adapter.save(next);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb) {
  const offExternal = adapter.onExternalChange(() => {
    cache = null;
    cb();
  });
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    offExternal();
  };
}

export function useAcademy() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function resetAcademy() {
  write({ ...EMPTY });
}

const today = () => new Date().toISOString().slice(0, 10);

function withXp(state, amount) {
  const d = today();
  const days = { ...state.days, [d]: (state.days[d] || 0) + amount };
  let streak = state.streak;
  if (streak.last !== d) {
    const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    streak = { count: streak.last === yesterday ? streak.count + 1 : 1, last: d };
  }
  return { ...state, xp: state.xp + amount, days, streak };
}

function withBadges(state, extra = []) {
  const earned = new Set(state.badges);
  const add = (id) => earned.add(id);
  if (Object.keys(state.cards).length > 0) add('first-steps');
  if (state.streak.count >= 3) add('streak-3');
  if (state.streak.count >= 7) add('streak-7');
  if (state.streak.count >= 30) add('streak-30');
  if (state.bestCombo >= 10) add('combo-10');
  if (Object.values(state.cards).filter((c) => c.box >= MAX_BOX).length >= 100) add('century');
  extra.forEach(add);
  return earned.size === state.badges.length ? state : { ...state, badges: [...earned] };
}

/** Record a flashcard or quiz answer against the spaced-repetition schedule. */
export function gradeCard(cardId, correct, xpAmount) {
  const state = read();
  const prev = state.cards[cardId] || { box: 0, right: 0, wrong: 0 };
  // Known on first sight skips straight to box 2; a miss always drops back to box 1.
  const box = !correct ? 1 : prev.box === 0 ? 2 : Math.min(MAX_BOX, prev.box + 1);
  const card = {
    box,
    due: Date.now() + BOX_INTERVAL_DAYS[box] * DAY,
    right: prev.right + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
  };
  const amount = xpAmount ?? (correct ? XP.flashKnown : XP.flashAgain);
  write(withBadges(withXp({ ...state, cards: { ...state.cards, [cardId]: card } }, amount)));
}

export function awardXp(amount, badges = []) {
  write(withBadges(withXp(read(), amount), badges));
}

export function recordCombo(combo) {
  const state = read();
  if (combo <= state.bestCombo) return;
  write(withBadges({ ...state, bestCombo: combo }));
}

export function recordBoss(key, pct, livesLost) {
  const state = read();
  const passed = pct >= BOSS_PASS_PCT;
  const best = Math.max(state.bosses[key] || 0, pct);
  let next = { ...state, bosses: { ...state.bosses, [key]: best } };
  const extra = [];
  if (passed) {
    extra.push('boss-slayer');
    if (livesLost === 0) extra.push('flawless');
    if (!(state.bosses[key] >= BOSS_PASS_PCT)) next = withXp(next, XP.bossWin);
  }
  write(withBadges(next, extra));
  return passed;
}

/** Records a finished guided lesson (best accuracy kept); first completion earns a bonus. */
export function completeLesson(deckId, pct) {
  const state = read();
  const prev = state.lessons?.[deckId];
  let next = { ...state, lessons: { ...state.lessons, [deckId]: { best: Math.max(prev?.best || 0, pct), at: Date.now() } } };
  if (!prev) next = withXp(next, XP.lessonComplete);
  write(withBadges(next));
}

/** Awards the one-time bonus the first time every card in a deck reaches the top box. */
export function checkDeckMastered(deck) {
  const state = read();
  if (state.mastered?.[deck.id] || mastery(state, deck.cards) < 100) return false;
  const next = withXp({ ...state, mastered: { ...state.mastered, [deck.id]: true } }, XP.deckMastered);
  write(withBadges(next, ['deck-master']));
  return true;
}

export function grantBadge(id) {
  const state = read();
  if (!state.badges.includes(id)) write({ ...state, badges: [...state.badges, id] });
}

// ---------- derived values ----------

export const xpForLevel = (level) => 50 * (level - 1) * level;

export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const rank = [...RANKS].reverse().find((r) => level >= r.level).title;
  return { level, rank, into: xp - floor, needed: ceil - floor, pct: Math.round(((xp - floor) / (ceil - floor)) * 100) };
}

export function cardState(state, cardId) {
  return state.cards[cardId] || { box: 0, due: 0, right: 0, wrong: 0 };
}

/** 0-100: average Leitner box across the cards, unseen cards count as 0. */
export function mastery(state, cards) {
  if (!cards.length) return 0;
  const sum = cards.reduce((s, c) => s + (state.cards[c.id]?.box || 0), 0);
  return Math.round((sum / (cards.length * MAX_BOX)) * 100);
}

export function dueCards(state, cards, now = Date.now()) {
  return cards.filter((c) => {
    const s = state.cards[c.id];
    return s && s.box > 0 && s.due <= now;
  });
}

export const bossKey = (trackId, tier) => `${trackId}:${tier}`;

/**
 * Remembers where you are inside a lesson (step order, position, first-try results) so
 * closing the tab and coming back resumes on the same question. One lesson at a time.
 */
export function saveLessonProgress(progress) {
  write({ ...read(), resume: { ...progress, at: Date.now() } });
}

export function clearLessonProgress(deckId) {
  const state = read();
  if (state.resume?.deckId === deckId) write({ ...state, resume: null });
}

export function xpToday(state) {
  return state.days[today()] || 0;
}

/** Streak counts only if you studied today or yesterday. */
export function liveStreak(state) {
  const { count, last } = state.streak;
  if (!last) return 0;
  const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
  return last === today() || last === yesterday ? count : 0;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build multiple-choice questions from flashcards. Distractors come from the
 * card's own `wrong` list when provided, otherwise from other answers in the pool.
 */
export function buildQuestions(cards, pool, count) {
  return shuffle(cards)
    .slice(0, count)
    .map((card) => {
      const others = shuffle(pool.filter((p) => p.id !== card.id && p.a !== card.a).map((p) => p.a));
      const wrong = [...(card.wrong || []), ...others].filter((w, i, arr) => w !== card.a && arr.indexOf(w) === i).slice(0, 3);
      const options = shuffle([card.a, ...wrong]);
      return { card, options, correct: options.indexOf(card.a) };
    });
}

// -------------------------------------------------------------------------------------------------
// CISSP practice exam: a timed, domain-weighted test-day simulator.
//
// Deck -> domain mapping reuses the curated `cissp` tags on each deck (see
// src/data/academy/*.js). A deck tagged with several domains (e.g. cissp: [4, 7])
// counts toward its PRIMARY domain (the first tag) for quota math, so the eight
// quotas always sum to the exam length. Sampling is without replacement per
// domain; if a domain's pool is ever smaller than its quota, the shortfall is
// filled from the global pool and reported.
// -------------------------------------------------------------------------------------------------

export const EXAM_QUESTION_COUNT = 100;
export const EXAM_DURATION_MIN = 180;
export const EXAM_PASS_PCT = 70;
export const EXAM_HISTORY_LIMIT = 20;

/** Deck id -> primary CISSP domain id (first curated tag), derived from the data. */
export const DECK_DOMAIN = Object.fromEntries(allDecks.map((d) => [d.id, (d.cissp || [])[0] || null]));

/** Per-domain question quotas for an exam of `total` questions (largest remainder). */
export function examDomainQuotas(total = EXAM_QUESTION_COUNT) {
  const rows = CISSP_DOMAINS.map((d) => ({ id: d.id, exact: (d.weight / 100) * total, n: 0 }));
  rows.forEach((r) => {
    r.n = Math.floor(r.exact);
  });
  let remainder = total - rows.reduce((s, r) => s + r.n, 0);
  const byFrac = [...rows].sort((a, b) => b.exact - b.n - (a.exact - a.n));
  for (let i = 0; remainder > 0; i++, remainder--) byFrac[i % byFrac.length].n += 1;
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

/**
 * Build one exam: domain-weighted sampling without replacement, option order and
 * question order shuffled. Returns { questions, quotas, shortfalls } where each
 * question is { id, domain, card, options, correct }.
 */
export function buildPracticeExam({ count = EXAM_QUESTION_COUNT } = {}) {
  const quotas = examDomainQuotas(count);
  const byDomain = {};
  for (const card of allCards) {
    const dom = DECK_DOMAIN[card.deckId];
    if (dom) (byDomain[dom] ??= []).push(card);
  }
  const picked = []; // [{ card, domain }]
  const shortfalls = [];
  for (const d of CISSP_DOMAINS) {
    const pool = shuffle(byDomain[d.id] || []);
    const take = pool.slice(0, quotas[d.id]);
    take.forEach((card) => picked.push({ card, domain: d.id }));
    if (take.length < quotas[d.id]) shortfalls.push(d.id);
  }
  if (shortfalls.length) {
    const seen = new Set(picked.map((p) => p.card.id));
    const missing = count - picked.length;
    const rest = shuffle(allCards.filter((c) => !seen.has(c.id))).slice(0, missing);
    rest.forEach((card) => picked.push({ card, domain: DECK_DOMAIN[card.deckId] || shortfalls[0] }));
  }
  const questions = shuffle(
    picked.slice(0, count).map(({ card, domain }) => {
      const q = buildQuestions([card], allCards, 1)[0];
      return { id: card.id, domain, card, options: q.options, correct: q.correct };
    }),
  );
  return { questions, quotas, shortfalls };
}

/** Score a finished exam. answers: { [questionId]: chosenOptionIndex }. */
export function scoreExam(questions, answers) {
  const perDomain = {};
  for (const d of CISSP_DOMAINS) perDomain[d.id] = { total: 0, correct: 0, pct: 0, passed: false };
  const missed = [];
  let correct = 0;
  for (const q of questions) {
    const pd = perDomain[q.domain] ?? (perDomain[q.domain] = { total: 0, correct: 0, pct: 0, passed: false });
    pd.total += 1;
    if (answers[q.id] === q.correct) {
      correct += 1;
      pd.correct += 1;
    } else {
      missed.push(q);
    }
  }
  for (const d of CISSP_DOMAINS) {
    const pd = perDomain[d.id];
    pd.pct = pd.total ? Math.round((pd.correct / pd.total) * 100) : 0;
    pd.passed = pd.pct >= EXAM_PASS_PCT;
  }
  const pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  return { total: questions.length, correct, pct, passed: pct >= EXAM_PASS_PCT, perDomain, missed };
}

// ---------- exam session (persisted in academy state, so a refresh resumes) ----------

/** Start a new exam. The deadline timestamp is persisted: refreshes don't reset the clock. */
export function startPracticeExam() {
  const { questions, quotas } = buildPracticeExam();
  const exam = {
    id: `exam-${Date.now()}`,
    startedAt: Date.now(),
    deadline: Date.now() + EXAM_DURATION_MIN * 60 * 1000,
    questions,
    quotas,
    answers: {},
    flagged: [],
    index: 0,
    finishedAt: null,
    result: null,
  };
  const state = read();
  write({ ...state, exam });
  return exam;
}

export function answerExamQuestion(qid, optionIdx) {
  const state = read();
  if (!state.exam || state.exam.finishedAt) return;
  write({ ...state, exam: { ...state.exam, answers: { ...state.exam.answers, [qid]: optionIdx } } });
}

export function toggleExamFlag(qid) {
  const state = read();
  if (!state.exam || state.exam.finishedAt) return;
  const flagged = state.exam.flagged.includes(qid)
    ? state.exam.flagged.filter((f) => f !== qid)
    : [...state.exam.flagged, qid];
  write({ ...state, exam: { ...state.exam, flagged } });
}

export function setExamIndex(index) {
  const state = read();
  if (!state.exam || state.exam.finishedAt) return;
  write({ ...state, exam: { ...state.exam, index } });
}

/** Finish the exam: score it, save the attempt to history, award XP. Returns the finished exam. */
export function finishPracticeExam() {
  const state = read();
  const exam = state.exam;
  if (!exam || exam.finishedAt) return exam;
  const result = scoreExam(exam.questions, exam.answers);
  const attempt = {
    id: exam.id,
    at: Date.now(),
    total: result.total,
    correct: result.correct,
    pct: result.pct,
    passed: result.passed,
    perDomain: Object.fromEntries(CISSP_DOMAINS.map((d) => [d.id, result.perDomain[d.id].pct])),
  };
  const exams = [attempt, ...(state.exams || [])].slice(0, EXAM_HISTORY_LIMIT);
  const finished = { ...exam, finishedAt: Date.now(), result };
  write(withBadges(withXp({ ...state, exams, exam: finished }, result.correct * XP.examPerCorrect)));
  return finished;
}

/** Discard the current (or finished) exam without recording an attempt. */
export function clearPracticeExam() {
  const state = read();
  if (state.exam) write({ ...state, exam: null });
}

export function examHistory(state) {
  return state.exams || [];
}
