import { describe, it, expect, beforeEach } from 'vitest';
import { setProgressAdapter, completeLesson, recordVerifiedLabCompletion, recordMissionCompletion, saveLessonProgress, clearLessonProgress, gradeCard, XP } from './academy';
import { isPassed } from './progress/engine';
import { memoryAdapter } from './progress/storage';
import { migratingAdapter } from './progress/migratingAdapter';

// Real catalogue ids (scripts/legacy-card-ids.json): fixtures use UUID-shaped
// ids derived from the real catalogue (test strategy §4, correction 7) —
// positional ids appear only in explicitly-legacy fixtures, never as
// current ids.
const UUID_0 = '8e8346a1-95b5-4133-9b6f-f5465012b3ce'; // py-basics-0
const UUID_1 = '7c7a2fa0-041b-46c4-b804-37defae1fa7d'; // py-basics-1

let store;
beforeEach(() => {
  store = memoryAdapter();
  setProgressAdapter(store);
});

describe('academy store', () => {
  it('persists through the adapter and keeps the best lesson score', () => {
    completeLesson('py-basics', 60);
    completeLesson('py-basics', 90);
    completeLesson('py-basics', 40);
    expect(store.load().lessons['py-basics'].best).toBe(90);
    expect(store.load().xp).toBe(XP.lessonComplete); // first completion only
  });

  it('saves and clears mid-lesson progress for the right lesson only', () => {
    saveLessonProgress({ deckId: 'py-basics', plan: [{ k: 'c', id: UUID_0, deckId: 'py-basics' }], index: 1, tries: {}, retried: [] });
    expect(store.load().resume.deckId).toBe('py-basics');
    clearLessonProgress('py-flow');
    expect(store.load().resume.deckId).toBe('py-basics');
    clearLessonProgress('py-basics');
    expect(store.load().resume).toBeNull();
  });

  it('drops a missed card back to the first review box', () => {
    gradeCard(UUID_0, true);
    gradeCard(UUID_0, true);
    expect(store.load().cards[UUID_0].box).toBe(3);
    gradeCard(UUID_0, false);
    expect(store.load().cards[UUID_0].box).toBe(1);
  });
});

describe('verified lab completions (Spencer rule, 2026-11-11)', () => {
  it('awards lab XP once and marks related lessons complete without a quiz score', () => {
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(true);
    const s = store.load();
    expect(s.labs['py-basics-001'].verified).toBe(true);
    expect(s.xp).toBe(XP.labComplete + XP.lessonComplete);
    expect(s.lessons['py-basics'].via).toBe('lab');
    expect(s.lessons['py-basics'].best).toBeUndefined(); // no invented score
    expect(isPassed(s, 'py-basics')).toBe(true);
    // A second verified completion of the same lab: no double award.
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(false);
    expect(store.load().xp).toBe(XP.labComplete + XP.lessonComplete);
  });

  it('keeps a guided lesson score when the lab completes an already-passed lesson', () => {
    completeLesson('py-basics', 80);
    const before = store.load().xp;
    expect(recordVerifiedLabCompletion('py-basics-001', ['py-basics'])).toBe(true);
    const s = store.load();
    expect(s.xp).toBe(before + XP.labComplete); // lab XP only, no lesson XP
    expect(s.lessons['py-basics'].best).toBe(80); // score preserved, no via
    expect(s.lessons['py-basics'].via).toBeUndefined();
  });

  it('a lab with no related lessons still earns its lab XP', () => {
    expect(recordVerifiedLabCompletion('sec-dns-typo-001', [])).toBe(true);
    expect(store.load().xp).toBe(XP.labComplete);
    expect(store.load().lessons).toEqual({});
  });
});

describe('mission completions (XP keyed to the mission, not the lab)', () => {
  it('awards the mission XP once and records it under the mission id', () => {
    expect(recordMissionCompletion('op-broken-shield', 80)).toBe(true);
    const s = store.load();
    expect(s.xp).toBe(80);
    expect(s.missions['op-broken-shield'].xp).toBe(80);
    // A replay earns nothing: no double award.
    expect(recordMissionCompletion('op-broken-shield', 80)).toBe(false);
    expect(store.load().xp).toBe(80);
  });

  it('pays the mission XP even when the lab was already completed standalone', () => {
    // The learner did the lab first (lab XP already banked) — the mission
    // still pays its own XP on first mission completion.
    expect(recordVerifiedLabCompletion('net-acl-001', ['net-security'])).toBe(true);
    const before = store.load().xp;
    expect(recordMissionCompletion('op-broken-shield', 80)).toBe(true);
    expect(store.load().xp).toBe(before + 80);
  });

  it('awards nothing for a zero amount', () => {
    expect(recordMissionCompletion('op-broken-shield', 0)).toBe(false);
    // Nothing was written at all: no XP, no mission record.
    expect(store.load()).toBeNull();
  });
});

describe('revSeen at grade time (PR 2, plan v2.2 §10 — confirmed by Spencer)', () => {
  it('records the card revision seen when grading', () => {
    gradeCard(UUID_0, true, undefined, 3);
    expect(store.load().cards[UUID_0].revSeen).toBe(3);
  });

  it('updates revSeen when the card is re-graded at a newer revision', () => {
    gradeCard(UUID_0, true, undefined, 1);
    gradeCard(UUID_0, true, undefined, 2);
    expect(store.load().cards[UUID_0].revSeen).toBe(2);
  });

  it('grading without a revision leaves revSeen unset (back-compat for old callers)', () => {
    gradeCard(UUID_0, true);
    expect(store.load().cards[UUID_0].revSeen).toBeUndefined();
  });
});

describe('returning learner through the migrating adapter (PR 3, §15)', () => {
  it('a six-month-old legacy blob loads translated, restores its resume, and writes back', () => {
    const legacy = {
      xp: 640,
      cards: { 'py-basics-0': { box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 } },
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: 'py-basics-0' }, { k: 'p', id: 'py-basics-p0' }],
        index: 1,
        tries: {},
        retried: [],
        at: 1100,
      },
      missions: { 'op-broken-shield': { xp: 80, at: 700 } },
    };
    const base = memoryAdapter(legacy);
    setProgressAdapter(migratingAdapter(base));
    // Any read goes through the adapter: grading forces a load, which
    // translates the legacy blob and writes the translated state back.
    gradeCard(UUID_1, true);
    const stored = base.load();
    expect(stored.cards[UUID_0]).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(stored.cards).not.toHaveProperty('py-basics-0');
    expect(stored.cards[UUID_1].box).toBe(2); // the new grade landed under the UUID
    expect(stored.resume.plan[0]).toEqual({ k: 'c', id: UUID_0, deckId: 'py-basics' });
    expect(stored.resume.index).toBe(1); // resume restored, not reset
    expect(stored.missions).toEqual({ 'op-broken-shield': { xp: 80, at: 700 } });
    expect(stored.cardIdVersion).toBe(2);
  });

  it('saved plans carry UUID ids with deckId on every non-puzzle step', () => {
    saveLessonProgress({
      deckId: 'py-basics',
      plan: [
        { k: 'w', id: UUID_1, deckId: 'py-basics' },
        { k: 'c', id: UUID_0, deckId: 'py-basics' },
        { k: 'p', id: '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e' },
      ],
      index: 2,
      tries: { [UUID_0]: true },
      retried: [],
    });
    const resume = store.load().resume;
    expect(resume.plan[0]).toEqual({ k: 'w', id: UUID_1, deckId: 'py-basics' });
    expect(resume.plan[1]).toEqual({ k: 'c', id: UUID_0, deckId: 'py-basics' });
    expect(resume.plan[2]).toEqual({ k: 'p', id: '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e' });
    expect(resume.plan[2].deckId).toBeUndefined(); // puzzle steps carry no deckId
  });
});
