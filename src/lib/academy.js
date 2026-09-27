// Academy game engine: XP, levels, streaks, badges, and Leitner spaced repetition.
// All state is local to the browser (localStorage), matching src/lib/progress.js.
import { useSyncExternalStore } from 'react';

const KEY = 'itfund-academy-v1';
const EVENT = 'itfund-academy-change';
const DAY = 24 * 60 * 60 * 1000;

// Leitner boxes: 0 = unseen, 1..5 = learning -> mastered. Interval in days until due again.
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16];
export const MAX_BOX = 5;
export const DAILY_GOAL_XP = 100;
export const BOSS_PASS_PCT = 80;
export const TIER_UNLOCK_MASTERY = 60;

export const XP = {
  flashKnown: 10,
  flashAgain: 2,
  quizCorrect: 15,
  bossWin: 200,
  deckMastered: 100,
  puzzleSolved: 20,
  lessonComplete: 30,
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

const EMPTY = { xp: 0, days: {}, streak: { count: 0, last: null }, cards: {}, bosses: {}, badges: [], bestCombo: 0, mastered: {}, lessons: {} };

let cache = null;

function read() {
  if (cache) return cache;
  try {
    cache = { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep the in-memory state for this session.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb) {
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
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

export function isTierUnlocked(state, track, tierIndex) {
  if (tierIndex === 0) return true;
  // Sticky: once you've studied a tier, a later drop in the previous tier's mastery won't re-lock it.
  if (track.tiers[tierIndex].decks.some((d) => d.cards.some((c) => state.cards[c.id]))) return true;
  const prevTier = track.tiers[tierIndex - 1];
  if ((state.bosses[bossKey(track.id, prevTier.id)] || 0) >= BOSS_PASS_PCT) return true;
  return mastery(state, prevTier.decks.flatMap((d) => d.cards)) >= TIER_UNLOCK_MASTERY;
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
