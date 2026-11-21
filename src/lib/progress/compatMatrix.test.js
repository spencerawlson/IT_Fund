import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { mergeProgress } from './merge';

// PR 3 live compatibility matrix (plan v2.2 §5 / test strategy §13, §14, §5, §3).
// GATED: only runs with PR3_LIVE_NEW (new-backend base URL), PR3_LIVE_OLD
// (old-backend base URL), PR3_COOKIES_NEW and PR3_COOKIES_OLD (JSON files
// {sub: {"rtc_session": raw}} written by ~/workspace/bin/seed_pr3_matrix_users.py).
// The servers are scratch uvicorn instances on file SQLite — never production.
// Every assertion checks the STATE, not just the 200: a 200 with wrong state
// is a FAILURE.
const NEW = process.env.PR3_LIVE_NEW;
const OLD = process.env.PR3_LIVE_OLD;
const LIVE = Boolean(NEW && OLD && process.env.PR3_COOKIES_NEW && process.env.PR3_COOKIES_OLD);

const UUID_0 = '8e8346a1-95b5-4133-9b6f-f5465012b3ce'; // py-basics-0
const UUID_1 = '7c7a2fa0-041b-46c4-b804-37defae1fa7d'; // py-basics-1
const UUID_P0 = '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e'; // py-basics-p0 (puzzle)

function cookies(path, sub) {
  const all = JSON.parse(readFileSync(path, 'utf8'));
  const jar = all[sub];
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(base, cookie, method, state, version, marked) {
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  if (marked) headers['X-Card-Id-Version'] = '2';
  if (version != null) headers['If-Match'] = String(version);
  const res = await fetch(`${base}/api/academy/progress`, {
    method,
    headers,
    body: state === undefined ? undefined : JSON.stringify({ state }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

describe.skipIf(!LIVE)('live compatibility matrix (PR 3, §13/§14/§5/§3)', () => {
  const newCookies = () => cookies(process.env.PR3_COOKIES_NEW, 'matrix-a');
  const oldCookies = () => cookies(process.env.PR3_COOKIES_OLD, 'matrix-b');

  it('#13 old client / new backend: legacy PUT, dual-keyed GET, UUID-only marked GET', async () => {
    const c = cookies(process.env.PR3_COOKIES_NEW, 'matrix-a');
    const legacy = {
      xp: 640,
      cards: {
        'py-basics-0': { box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 },
        'py-basics-1': { box: 1, due: 50, right: 0, wrong: 1 },
      },
      badges: ['first-steps'],
      missions: { 'op-broken-shield': { xp: 80, at: 700 } },
    };
    // Old client: no marker, first load, no prior new-client interaction.
    const put = await api(NEW, c, 'PUT', legacy, 0, false);
    expect(put.status).toBe(200);
    expect(put.body.version).toBe(1);

    const unmarked = await api(NEW, c, 'GET', undefined, undefined, false);
    expect(unmarked.status).toBe(200);
    expect(unmarked.body.state.cards[UUID_0]).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(unmarked.body.state.cards['py-basics-0']).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(unmarked.body.state.cards[UUID_1]).toEqual({ box: 1, due: 50, right: 0, wrong: 1 });
    expect(unmarked.body.state.cards['py-basics-1']).toEqual({ box: 1, due: 50, right: 0, wrong: 1 });
    expect(unmarked.body.state.xp).toBe(640);
    expect(unmarked.body.state.badges).toEqual(['first-steps']);
    expect(unmarked.body.state.missions).toEqual({ 'op-broken-shield': { xp: 80, at: 700 } });

    const marked = await api(NEW, c, 'GET', undefined, undefined, true);
    expect(marked.status).toBe(200);
    expect(Object.keys(marked.body.state.cards).sort()).toEqual([UUID_0, UUID_1].sort());
    expect(marked.body.version).toBe(1); // display never wrote
  });

  it('#14 new client / old backend: UUID state round-trips opaquely, marker is inert', async () => {
    const c = oldCookies();
    const uuidState = {
      xp: 40,
      cards: { [UUID_0]: { box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 } },
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: UUID_0, deckId: 'py-basics' }, { k: 'p', id: UUID_P0 }],
        index: 1,
        tries: {},
        retried: [],
        at: 500,
      },
    };
    const put = await api(OLD, c, 'PUT', uuidState, 0, true);
    expect(put.status).toBe(200);
    expect(put.body.version).toBe(1);

    // Old backend stores opaquely: both GETs return exactly what was PUT.
    const unmarked = await api(OLD, c, 'GET', undefined, undefined, false);
    expect(unmarked.status).toBe(200);
    expect(unmarked.body.state).toEqual(uuidState);
    const marked = await api(OLD, c, 'GET', undefined, undefined, true);
    expect(marked.status).toBe(200);
    expect(marked.body.state).toEqual(uuidState); // marker is inert pre-PR-3
  });

  it('#5 two-device live: new device + old device converge on the new backend', async () => {
    const c = cookies(process.env.PR3_COOKIES_NEW, 'matrix-c');
    // Device 1 (new client): UUID state.
    const put1 = await api(NEW, c, 'PUT', { cards: { [UUID_0]: { box: 3, due: 50, right: 1, wrong: 2 } } }, 0, true);
    expect(put1.status).toBe(200);
    // Device 2 (old client): first load sees its legacy key with the same values.
    const d2get = await api(NEW, c, 'GET', undefined, undefined, false);
    expect(d2get.body.state.cards['py-basics-0']).toEqual({ box: 3, due: 50, right: 1, wrong: 2 });
    // Device 2 merges the dual-keyed server copy into its own legacy local
    // state, exactly as its client code does, then pushes the merged state.
    const d2local = { cards: { 'py-basics-0': { box: 2, due: 100, right: 3, wrong: 1 }, 'py-basics-1': { box: 1, due: 50, right: 0, wrong: 1 } } };
    const merged = mergeProgress(d2local, d2get.body.state);
    const put2 = await api(NEW, c, 'PUT', merged, 1, false);
    expect(put2.status).toBe(200);
    // Device 1 re-reads: exactly one UUID entry per card, combined per §4.2.
    const d1get = await api(NEW, c, 'GET', undefined, undefined, true);
    expect(Object.keys(d1get.body.state.cards).sort()).toEqual([UUID_0, UUID_1].sort());
    expect(d1get.body.state.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2 });
    expect(d1get.body.state.cards[UUID_1]).toEqual({ box: 1, due: 50, right: 0, wrong: 1 });
    // Device 2 re-reads: dual-keyed combined state.
    const d2get2 = await api(NEW, c, 'GET', undefined, undefined, false);
    expect(d2get2.body.state.cards['py-basics-0']).toEqual({ box: 3, due: 50, right: 3, wrong: 2 });
  });

  it('#3 returning learner live: six-month-old legacy blob survives the cutover intact', async () => {
    const c = cookies(process.env.PR3_COOKIES_NEW, 'matrix-d');
    const legacy = {
      xp: 640,
      days: { '2026-05-11': 90 },
      streak: { count: 2, last: '2026-05-11' },
      cards: { 'py-basics-0': { box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 } },
      bosses: {},
      badges: ['first-steps'],
      bestCombo: 6,
      mastered: {},
      lessons: { 'py-basics': { best: 70, at: 1000 } },
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
    const put = await api(NEW, c, 'PUT', legacy, 0, false);
    expect(put.status).toBe(200);
    const marked = await api(NEW, c, 'GET', undefined, undefined, true);
    expect(marked.status).toBe(200);
    const s = marked.body.state;
    expect(s.cardIdVersion).toBe(2);
    expect(Object.keys(s.cards)).toEqual([UUID_0]);
    expect(s.cards[UUID_0]).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(s.resume.plan).toEqual([
      { k: 'w', id: '33f20498-f6cc-410b-9a2e-a5e24bb48906', deckId: 'py-flow' },
      { k: 'c', id: UUID_0, deckId: 'py-basics' },
      { k: 'p', id: UUID_P0 },
    ]);
    expect(s.resume.index).toBe(1);
    expect(s.resume.tries).toEqual({ '33f20498-f6cc-410b-9a2e-a5e24bb48906-warm': true });
    expect(s.exams).toEqual(legacy.exams);
    expect(s.missions).toEqual(legacy.missions);
    expect(s.seenCelebrations).toEqual(['first-steps']);
    expect(s.xp).toBe(640);
    expect(marked.body.version).toBe(1);
  });
});
