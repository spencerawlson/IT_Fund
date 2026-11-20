import { describe, expect, it } from 'vitest';
import { translateState, buildCardIdMap } from './migrateCardIds';

// PR 3 tests (card UUID migration, plan v2.2 §5 / test strategy §19, §3, §4, §8, §9, §15).
// Written FIRST against the current code and observed FAILING: there is no
// translator — legacy keys pass through untouched, collisions keep both keys,
// resumes keep positional plan ids, and nothing sets cardIdVersion = 2.
// Fixture ids are REAL catalogue pairs from scripts/legacy-card-ids.json.
const UUID_0 = '8e8346a1-95b5-4133-9b6f-f5465012b3ce'; // py-basics-0
const UUID_1 = '7c7a2fa0-041b-46c4-b804-37defae1fa7d'; // py-basics-1
const UUID_2 = 'f7689284-1b74-4bfc-b51b-40939686b6ca'; // py-basics-2
const UUID_FLOW_0 = '33f20498-f6cc-410b-9a2e-a5e24bb48906'; // py-flow-0
const UUID_P0 = '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e'; // py-basics-p0 (puzzle)
const UUID_P1 = '35523068-b24c-406b-86f5-7b963876c599'; // py-basics-p1 (puzzle)

const MAP = new Map([
  ['py-basics-0', { id: UUID_0, deckId: 'py-basics' }],
  ['py-basics-1', { id: UUID_1, deckId: 'py-basics' }],
  ['py-basics-2', { id: UUID_2, deckId: 'py-basics' }],
  ['py-flow-0', { id: UUID_FLOW_0, deckId: 'py-flow' }],
  ['py-basics-p0', { id: UUID_P0, deckId: 'py-basics' }],
  ['py-basics-p1', { id: UUID_P1, deckId: 'py-basics' }],
]);

const card = (box, due, right, wrong, revSeen) => ({
  box,
  due,
  right,
  wrong,
  ...(revSeen !== undefined ? { revSeen } : {}),
});

describe('translateState — card keys (PR 3, §19)', () => {
  it('translates every legacy key to exactly one UUID with byte-identical values', () => {
    const state = {
      cards: {
        'py-basics-0': card(3, 100, 5, 2, 1),
        'py-basics-1': card(1, 50, 0, 1),
        'py-flow-0': card(5, 200, 9, 0, 1),
      },
      xp: 40,
    };
    const { state: out, translated, unmapped } = translateState(state, MAP);
    expect(translated).toBe(true);
    expect(unmapped).toEqual([]);
    expect(out.cards[UUID_0]).toEqual(card(3, 100, 5, 2, 1));
    expect(out.cards[UUID_1]).toEqual(card(1, 50, 0, 1));
    expect(out.cards[UUID_FLOW_0]).toEqual(card(5, 200, 9, 0, 1));
    expect(out.cards).not.toHaveProperty('py-basics-0');
    expect(out.cards).not.toHaveProperty('py-basics-1');
    expect(out.cards).not.toHaveProperty('py-flow-0');
    expect(out.xp).toBe(40); // non-card fields untouched
    expect(out.cardIdVersion).toBe(2);
    expect(state.cards).toHaveProperty('py-basics-0'); // input not mutated
  });

  it('combines a legacy entry with its UUID entry per the §4.2 collision rules', () => {
    // Test strategy §19 unit: legacy (box 2, right 3, wrong 1, due 100) +
    // UUID (box 3, right 1, wrong 2, due 50) -> box 3, right 3, wrong 2, due 50.
    const legacy = card(2, 100, 3, 1, 1);
    const uuid = card(3, 50, 1, 2, 1);
    const a = { cards: { 'py-basics-0': legacy, [UUID_0]: uuid } };
    const b = { cards: { [UUID_0]: uuid, 'py-basics-0': legacy } };
    for (const input of [a, b]) {
      const { state: out } = translateState(input, MAP);
      expect(Object.keys(out.cards)).toEqual([UUID_0]); // exactly one entry
      expect(out.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2, revSeen: 1 });
    }
  });

  it('breaks a collision box tie by later due and maxes revSeen', () => {
    const { state: out } = translateState(
      { cards: { 'py-basics-0': card(2, 10, 1, 0, 5), [UUID_0]: card(2, 20, 0, 1, 2) } },
      MAP,
    );
    expect(out.cards[UUID_0]).toEqual({ box: 2, due: 20, right: 1, wrong: 1, revSeen: 5 });
    // And the other order gives the same result (order-independence).
    const { state: out2 } = translateState(
      { cards: { [UUID_0]: card(2, 20, 0, 1, 2), 'py-basics-0': card(2, 10, 1, 0, 5) } },
      MAP,
    );
    expect(out2.cards[UUID_0]).toEqual(out.cards[UUID_0]);
  });

  it('is idempotent: translating the output again changes nothing', () => {
    const state = {
      cards: { 'py-basics-0': card(3, 100, 5, 2, 1), 'py-basics-1': card(1, 50, 0, 1) },
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: 'py-basics-0' }, { k: 'p', id: 'py-basics-p0' }],
        index: 1,
        tries: { 'py-basics-0': true },
        retried: [],
        at: 123,
      },
    };
    const first = translateState(state, MAP);
    expect(first.translated).toBe(true);
    const second = translateState(first.state, MAP);
    expect(second.translated).toBe(false);
    expect(second.state).toEqual(first.state);
    expect(second.unmapped).toEqual([]);
  });

  it('preserves unknown legacy keys, never drops them, and reports them as unmapped', () => {
    const state = {
      cards: {
        'py-basics-0': card(2, 10, 1, 0),
        'py-basics-999': card(4, 90, 7, 1), // deleted before the migration
        'net-basics-0': card(1, 20, 0, 0), // id that never existed in the catalogue
      },
    };
    const { state: out, translated, unmapped } = translateState(state, MAP);
    expect(translated).toBe(true); // py-basics-0 translated
    expect(out.cards[UUID_0]).toEqual(card(2, 10, 1, 0));
    expect(out.cards['py-basics-999']).toEqual(card(4, 90, 7, 1)); // preserved
    expect(out.cards['net-basics-0']).toEqual(card(1, 20, 0, 0)); // preserved
    expect(unmapped.sort()).toEqual(['net-basics-0', 'py-basics-999']);
  });

  it('passes through current UUID keys, including new cards with no legacyId', () => {
    const NEW_UUID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'; // a card authored after the migration
    const state = { cards: { [UUID_0]: card(2, 10, 1, 0), [NEW_UUID]: card(0, 0, 0, 0) } };
    const { state: out, translated, unmapped } = translateState(state, MAP);
    expect(out.cards[UUID_0]).toEqual(card(2, 10, 1, 0));
    expect(out.cards[NEW_UUID]).toEqual(card(0, 0, 0, 0));
    expect(unmapped).toEqual([]);
    expect(translated).toBe(true); // cardIdVersion was set
    expect(out.cardIdVersion).toBe(2);
  });

  it('does not add revSeen where neither side had one', () => {
    const { state: out } = translateState(
      { cards: { 'py-basics-0': card(2, 10, 1, 0), [UUID_0]: card(3, 20, 2, 1) } },
      MAP,
    );
    expect(out.cards[UUID_0].revSeen).toBeUndefined();
  });
});

describe('translateState — resume (PR 3, §4)', () => {
  it('translates plan step ids and adds deckId to every non-puzzle step', () => {
    const state = {
      resume: {
        deckId: 'py-basics',
        plan: [
          { k: 'w', id: 'py-flow-0' },
          { k: 'c', id: 'py-basics-0' },
          { k: 'p', id: 'py-basics-p0' },
          { k: 'c', id: 'py-basics-1' },
        ],
        index: 2,
        tries: {},
        retried: [],
        at: 500,
      },
    };
    const { state: out, translated } = translateState(state, MAP);
    expect(translated).toBe(true);
    expect(out.resume.plan).toEqual([
      { k: 'w', id: UUID_FLOW_0, deckId: 'py-flow' },
      { k: 'c', id: UUID_0, deckId: 'py-basics' },
      { k: 'p', id: UUID_P0 }, // puzzle steps get no deckId
      { k: 'c', id: UUID_1, deckId: 'py-basics' },
    ]);
    expect(out.resume.deckId).toBe('py-basics');
    expect(out.resume.index).toBe(2);
    expect(out.resume.at).toBe(500);
  });

  it('re-suffixes tries keys and retried entries (-review / -warm)', () => {
    const state = {
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: 'py-basics-0' }],
        index: 0,
        tries: {
          'py-basics-0': true,
          'py-basics-1-review': false,
          'py-flow-0-warm': true,
        },
        retried: ['py-basics-1-review', 'py-flow-0-warm'],
        at: 500,
      },
    };
    const { state: out } = translateState(state, MAP);
    expect(out.resume.tries).toEqual({
      [UUID_0]: true,
      [`${UUID_1}-review`]: false,
      [`${UUID_FLOW_0}-warm`]: true,
    });
    expect(out.resume.retried.sort()).toEqual([`${UUID_1}-review`, `${UUID_FLOW_0}-warm`].sort());
  });

  it('keeps an unmapped plan step (deleted card) instead of dropping it', () => {
    const state = {
      resume: {
        deckId: 'py-basics',
        plan: [
          { k: 'c', id: 'py-basics-0' },
          { k: 'c', id: 'py-basics-999' }, // deleted card
        ],
        index: 1,
        tries: { 'py-basics-999': false },
        retried: [],
        at: 500,
      },
    };
    const { state: out, unmapped } = translateState(state, MAP);
    expect(out.resume.plan).toEqual([
      { k: 'c', id: UUID_0, deckId: 'py-basics' },
      { k: 'c', id: 'py-basics-999' }, // preserved, no deckId to add
    ]);
    expect(out.resume.tries).toEqual({ 'py-basics-999': false });
    expect(unmapped).toContain('py-basics-999');
  });

  it('on a tries collision the UUID-side value wins (it was written by the new client)', () => {
    const state = {
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: 'py-basics-0' }],
        index: 0,
        tries: { 'py-basics-0': false, [UUID_0]: true },
        retried: [],
        at: 500,
      },
    };
    const { state: out } = translateState(state, MAP);
    expect(out.resume.tries).toEqual({ [UUID_0]: true });
  });
});

describe('translateState — partial states and value preservation (PR 3, §8, §3)', () => {
  it('does not throw on partial states', () => {
    expect(translateState(null, MAP)).toEqual({ state: null, translated: false, unmapped: [] });
    expect(translateState(undefined, MAP)).toEqual({ state: undefined, translated: false, unmapped: [] });
    expect(translateState({}, MAP)).toEqual({ state: {}, translated: false, unmapped: [] });
    const noCards = translateState({ xp: 10 }, MAP);
    expect(noCards.state).toEqual({ xp: 10 });
    expect(noCards.translated).toBe(false);
    const noResume = translateState({ cards: { 'py-basics-0': card(1, 1, 0, 0) } }, MAP);
    expect(noResume.state.cards[UUID_0]).toEqual(card(1, 1, 0, 0));
    expect(noResume.state.resume).toBeUndefined();
    const emptyCards = translateState({ cards: {}, resume: null }, MAP);
    expect(emptyCards.state.cardIdVersion).toBe(2);
  });

  it('leaves every non-card field byte-identical (progress surviving, §3)', () => {
    const state = {
      xp: 1250,
      days: { '2026-11-19': 120, '2026-11-20': 80 },
      streak: { count: 4, last: '2026-11-20' },
      cards: { 'py-basics-0': card(3, 100, 5, 2, 1), 'py-basics-1': card(1, 50, 0, 1) },
      bosses: { 'py-basics:beginner': 90 },
      badges: ['first-steps', 'streak-3'],
      bestCombo: 12,
      mastered: { 'py-basics': true },
      lessons: { 'py-basics': { best: 85, at: 1000 } },
      resume: null,
      exams: [{ id: 'exam-1', at: 900, total: 10, correct: 8, pct: 80, passed: true, perDomain: {} }],
      exam: null,
      secplusExams: [],
      secplusExam: null,
      labs: { 'py-basics-001': { verified: true, at: 800 } },
      missions: { 'op-broken-shield': { xp: 80, at: 700 } },
      seenCelebrations: ['first-steps'],
      futureField: { keep: 'me' },
    };
    const { state: out } = translateState(state, MAP);
    for (const key of Object.keys(state)) {
      if (key === 'cards') continue;
      expect(out[key], `field ${key} must be byte-identical`).toEqual(state[key]);
    }
    expect(Object.keys(out.cards).sort()).toEqual([UUID_0, UUID_1].sort());
  });
});

describe('translateState — deleted and restored cards (PR 3, §9)', () => {
  it('preserves a deleted card’s progress inertly; restoring it re-activates it', () => {
    const deleted = { cards: { 'py-basics-999': card(4, 90, 7, 1) } };
    const { state: out } = translateState(deleted, MAP);
    expect(out.cards['py-basics-999']).toEqual(card(4, 90, 7, 1)); // preserved, not dropped
    // Restore: the same id re-enters the map (same UUID it always had).
    const restoredMap = new Map([...MAP, ['py-basics-999', { id: '99999999-9999-4999-8999-999999999999', deckId: 'py-basics' }]]);
    const { state: reactivated } = translateState(out, restoredMap);
    expect(reactivated.cards['99999999-9999-4999-8999-999999999999']).toEqual(card(4, 90, 7, 1));
    expect(reactivated.cards).not.toHaveProperty('py-basics-999');
  });

  it('re-adding a deleted card with a new id starts unstudied; the old record stays inert', () => {
    const state = { cards: { 'py-basics-999': card(4, 90, 7, 1) } };
    const { state: out } = translateState(state, MAP);
    expect(out.cards['py-basics-999']).toEqual(card(4, 90, 7, 1)); // old record inert
    expect(out.cards).not.toHaveProperty(UUID_0); // the new id has no progress yet
  });
});

describe('translateState — returning learner, six-month-old blob (PR 3, §15)', () => {
  it('translates a real legacy blob fully, restores its resume, and keeps history', () => {
    const legacy = {
      xp: 640,
      days: { '2026-05-11': 90 },
      streak: { count: 2, last: '2026-05-11' },
      cards: { 'py-basics-0': card(3, 100, 5, 2, 1), 'py-flow-0': card(2, 90, 3, 1) },
      bosses: {},
      badges: ['first-steps'],
      bestCombo: 6,
      mastered: {},
      lessons: { 'py-basics': { best: 70, at: 1000 } },
      // No cardIdVersion: a version-1-era blob.
      resume: {
        deckId: 'py-basics',
        plan: [
          { k: 'w', id: 'py-flow-0' },
          { k: 'c', id: 'py-basics-0' },
          { k: 'p', id: 'py-basics-p0' },
        ],
        index: 1,
        tries: { 'py-flow-0-warm': true },
        retried: [],
        at: 1100,
      },
      exams: [{ id: 'exam-1', at: 900, total: 10, correct: 8, pct: 80, passed: true, perDomain: {} }],
      exam: null,
      secplusExams: [],
      secplusExam: null,
      labs: {},
      missions: { 'op-broken-shield': { xp: 80, at: 700 } },
      seenCelebrations: ['first-steps'],
    };
    const { state: out, translated, unmapped } = translateState(legacy, MAP);
    expect(translated).toBe(true);
    expect(unmapped).toEqual([]);
    expect(out.cardIdVersion).toBe(2);
    expect(out.cards[UUID_0]).toEqual(card(3, 100, 5, 2, 1));
    expect(out.cards[UUID_FLOW_0]).toEqual(card(2, 90, 3, 1));
    expect(out.resume.plan).toEqual([
      { k: 'w', id: UUID_FLOW_0, deckId: 'py-flow' },
      { k: 'c', id: UUID_0, deckId: 'py-basics' },
      { k: 'p', id: UUID_P0 },
    ]);
    expect(out.resume.index).toBe(1);
    expect(out.resume.tries).toEqual({ [`${UUID_FLOW_0}-warm`]: true });
    expect(out.exams).toEqual(legacy.exams);
    expect(out.missions).toEqual(legacy.missions);
    expect(out.seenCelebrations).toEqual(legacy.seenCelebrations);
  });
});

describe('buildCardIdMap — from the real public bundle', () => {
  it('covers exactly the frozen map: 3,229 cards + 76 puzzles', () => {
    const map = buildCardIdMap();
    expect(map.size).toBe(3229 + 76);
    expect(map.get('py-basics-0')).toEqual({ id: UUID_0, deckId: 'py-basics' });
    expect(map.get('py-basics-p0')).toEqual({ id: UUID_P0, deckId: 'py-basics' });
    // No entry maps to a positional id: every value is a UUID v4. (A bare
    // /-\d+$/ check is wrong here — a real UUID can end in an all-digit
    // segment, e.g. ...-504765908873 — so the assertion is the UUID shape.)
    const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const { id } of map.values()) {
      expect(id).toMatch(UUID_V4);
    }
  });
});
