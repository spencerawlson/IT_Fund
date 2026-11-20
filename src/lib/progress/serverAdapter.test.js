import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serverAdapter } from './serverAdapter';
import { memoryAdapter } from './storage';
import { translateState } from './migrateCardIds';

function fakeClient(initial = { state: {}, version: 0 }) {
  let server = { ...initial };
  return {
    server: () => server,
    get: vi.fn(async () => ({ ...server })),
    put: vi.fn(async (state, version) => {
      if (version !== server.version) {
        throw Object.assign(new Error('conflict'), { status: 409, server: { ...server } });
      }
      server = { state, version: server.version + 1 };
      return { version: server.version };
    }),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('serverAdapter', () => {
  it('debounces save() then pushes with the current version', async () => {
    const client = fakeClient();
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 5 });
    expect(client.put).not.toHaveBeenCalled(); // still within the debounce window
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.put).toHaveBeenCalledWith({ xp: 5 }, 0);
    expect(client.server().version).toBe(1);
  });

  it('sync() adopts server state when local is empty', async () => {
    const client = fakeClient({ state: { xp: 42 }, version: 3 });
    const base = memoryAdapter({});
    const a = serverAdapter({ base, client });
    await a.sync();
    expect(base.load()).toEqual({ xp: 42 });
    expect(client.put).not.toHaveBeenCalled();
  });

  it('sync() merges local with server and uploads the result', async () => {
    const client = fakeClient({ state: { xp: 10, badges: ['s'] }, version: 1 });
    const base = memoryAdapter({ xp: 40, badges: ['l'] });
    const a = serverAdapter({ base, client });
    await a.sync();
    const merged = base.load();
    expect(merged.xp).toBe(40);
    expect(merged.badges.sort()).toEqual(['l', 's']);
    expect(client.put).toHaveBeenCalledWith(merged, 1); // uploaded at the server's version
  });

  it('resolves a version conflict by merging the server copy and retrying', async () => {
    const client = fakeClient({ state: { xp: 100 }, version: 5 });
    const base = memoryAdapter({ xp: 7 });
    const a = serverAdapter({ base, client, debounceMs: 1 });
    a.save({ xp: 7 }); // adapter's version is still 0, but server is at 5 -> 409
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();
    // After merge+retry the server holds the merged state at a bumped version.
    expect(client.server().state.xp).toBe(100); // higher xp preserved by merge
    expect(client.server().version).toBe(6);
  });

  it('flush() pushes a pending write immediately', async () => {
    const client = fakeClient();
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 100000 });
    a.save({ xp: 1 });
    await a.flush();
    expect(client.put).toHaveBeenCalledWith({ xp: 1 }, 0);
  });
});

// PR 1 regression tests (card UUID migration, plan v2.1 §4.5 / test strategy §20).
// Written FIRST against the current code and observed FAILING: a failed network
// push is dropped — save() clears `dirty` when the debounce timer fires, push()
// returns false with no re-arm, and flush() no-ops once `dirty` is false.
// There is no pending flag, no retry timer, and no `online` retry. These tests
// prove the gap before the retry path is implemented. Backoff ladder follows
// the v2.1 §4.5 example (5 s, 15 s, 30 s, capped at 60 s, with jitter); the
// tests advance timers generously so jitter cannot make them flaky.
describe('serverAdapter — offline retry (PR 1 regression)', () => {
  // Client whose first N puts fail with a network error, then behave normally.
  // Optionally applies the write server-side and then loses the response.
  function flakyClient({ failPuts = 0, failGets = 0, loseResponseOnce = false } = {}) {
    let server = { state: {}, version: 0 };
    let puts = 0;
    let gets = 0;
    let lost = false;
    return {
      server: () => server,
      get: vi.fn(async () => {
        gets += 1;
        if (gets <= failGets) throw new Error('network down');
        return { ...server };
      }),
      put: vi.fn(async (state, version) => {
        puts += 1;
        if (puts <= failPuts) throw new Error('network down');
        if (version !== server.version) {
          throw Object.assign(new Error('conflict'), { status: 409, server: { ...server } });
        }
        server = { state, version: server.version + 1 };
        if (loseResponseOnce && !lost) {
          lost = true;
          throw new Error('response lost');
        }
        return { version: server.version };
      }),
    };
  }

  // In the vitest node environment there is no `window`, and globalThis is
  // not an EventTarget (probe: Event/EventTarget exist, dispatchEvent does
  // not). Give the test a real EventTarget as `window` so the adapter's
  // `window.addEventListener('online', …)` can register and the test can
  // dispatch the event. The implementation listens on `window` in the
  // browser; this shim is the test stand-in for it.
  function ensureWindow() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      globalThis.window = new EventTarget();
    }
    return globalThis.window;
  }

  it('retries a failed push automatically, with no further save() call', async () => {
    const client = flakyClient({ failPuts: 1 });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 5 });
    await vi.advanceTimersByTimeAsync(2000); // debounce fires: put #1 fails
    expect(client.put).toHaveBeenCalledTimes(1);
    expect(client.server().version).toBe(0); // nothing landed yet
    await vi.advanceTimersByTimeAsync(90000); // retry ladder, no further save()
    expect(client.put).toHaveBeenCalledTimes(2); // retried automatically
    expect(client.server().version).toBe(1);
    expect(client.server().state).toEqual({ xp: 5 });
  });

  it('keeps retrying while offline until the push lands', async () => {
    const client = flakyClient({ failPuts: 3 });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 9 });
    await vi.advanceTimersByTimeAsync(2000); // put #1 fails
    await vi.advanceTimersByTimeAsync(120000); // ladder: 5 s, 15 s, 30 s (+jitter)
    expect(client.put).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(client.server().version).toBe(1);
    expect(client.server().state).toEqual({ xp: 9 });
  });

  it('flush() attempts a pending push after a failed debounced push', async () => {
    const client = flakyClient({ failPuts: 1 });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 1 });
    await vi.advanceTimersByTimeAsync(2000); // debounce fired, push failed, dirty cleared
    expect(client.put).toHaveBeenCalledTimes(1);
    await a.flush(); // must not no-op: a push is still pending
    expect(client.put).toHaveBeenCalledTimes(2);
    expect(client.server().state).toEqual({ xp: 1 });
  });

  it('an online event triggers an immediate retry of a pending push', async () => {
    const win = ensureWindow();
    const client = flakyClient({ failPuts: 1 });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 3 });
    await vi.advanceTimersByTimeAsync(2000); // put #1 fails
    expect(client.put).toHaveBeenCalledTimes(1);
    win.dispatchEvent(new Event('online')); // connectivity returns
    await vi.advanceTimersByTimeAsync(0); // let the retry run, no timer wait
    expect(client.put).toHaveBeenCalledTimes(2); // immediate retry, not the next tick
    expect(client.server().state).toEqual({ xp: 3 });
  });

  it('a retry pushes the latest state, not a stale snapshot', async () => {
    const client = flakyClient({ failPuts: 1 });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 1 }); // state A
    a.save({ xp: 2 }); // state B, re-arms the debounce
    await vi.advanceTimersByTimeAsync(2000); // push(B) fails
    expect(client.put).toHaveBeenCalledWith({ xp: 2 }, 0);
    await vi.advanceTimersByTimeAsync(90000); // retry ladder
    expect(client.server().state).toEqual({ xp: 2 }); // latest, not A
    expect(client.server().version).toBe(1);
  });

  it('a lost response is recovered through the 409 merge path without duplicating the write', async () => {
    const client = flakyClient({ loseResponseOnce: true });
    const a = serverAdapter({ base: memoryAdapter({}), client, debounceMs: 2000 });
    a.save({ xp: 5 });
    await vi.advanceTimersByTimeAsync(2000); // put #1 lands server-side, response lost
    expect(client.server().version).toBe(1);
    await vi.advanceTimersByTimeAsync(90000); // retry -> 409 -> merge -> retry
    expect(client.server().version).toBe(2); // exactly one more accepted write
    expect(client.server().state.xp).toBe(5);
    expect(a.load().xp).toBe(5); // local copy agrees with the server
  });

  it('a failed sync is retried automatically and leaves the local copy untouched', async () => {
    const client = flakyClient({ failGets: 1 });
    const base = memoryAdapter({ xp: 40, badges: ['l'] });
    const a = serverAdapter({ base, client, debounceMs: 2000 });
    await expect(a.sync()).rejects.toThrow('network down');
    expect(base.load()).toEqual({ xp: 40, badges: ['l'] }); // local untouched, no merge happened
    expect(client.get).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(90000); // retry ladder, no new save()
    expect(client.get).toHaveBeenCalledTimes(2); // sync re-attempted
    expect(base.load().xp).toBe(40); // local stands (server was empty)
    expect(base.load().badges).toEqual(['l']);
  });
});

// PR 3 tests (card UUID migration, plan v2.2 §5 / test strategy §6, §22, §5).
// Written FIRST against the current code and observed FAILING: there is no
// migrating adapter — serverAdapter loads legacy keys verbatim, a mixed-scheme
// 409 merge keeps both keys for one card, and no write-back ever happens.
// Fixture ids are REAL catalogue pairs from scripts/legacy-card-ids.json.
describe('serverAdapter — compatibility layer (PR 3)', () => {
  const UUID_0 = '8e8346a1-95b5-4133-9b6f-f5465012b3ce'; // py-basics-0
  const UUID_1 = '7c7a2fa0-041b-46c4-b804-37defae1fa7d'; // py-basics-1
  const UUID_FLOW_0 = '33f20498-f6cc-410b-9a2e-a5e24bb48906'; // py-flow-0

  // A fake NEW backend: PUT translates legacy keys through the frozen map
  // (the same rule as the real server) and stores UUID-only; GET with the
  // marker returns the stored state as-is, GET without it returns dual-keyed.
  function newBackendClient(initial = { state: {}, version: 0 }) {
    let server = { ...initial };
    const idMap = new Map([
      ['py-basics-0', { id: UUID_0, deckId: 'py-basics' }],
      ['py-basics-1', { id: UUID_1, deckId: 'py-basics' }],
      ['py-flow-0', { id: UUID_FLOW_0, deckId: 'py-flow' }],
    ]);
    // Minimal in-test model of the server's PUT normalisation: reuse the
    // real translator (same §4.2 rules); the real server logic is proven
    // separately in backend/test_progress.py.
    return {
      server: () => server,
      get: vi.fn(async (marked = true) => {
        if (marked) return { ...server };
        // Dual-keyed shape for unmarked (old) clients: UUID entry + legacy entry.
        const dual = { ...server.state, cards: { ...(server.state.cards || {}) } };
        for (const [legacy, { id }] of idMap) {
          if (dual.cards[id]) dual.cards[legacy] = dual.cards[id];
        }
        return { state: dual, version: server.version };
      }),
      put: vi.fn(async (state, version) => {
        if (version !== server.version) {
          throw Object.assign(new Error('conflict'), { status: 409, server: { ...server } });
        }
        server = { state: translateState(state, idMap).state, version: server.version + 1 };
        return { version: server.version };
      }),
    };
  }

  it('translates a legacy local state on load and writes it back immediately', async () => {
    const client = newBackendClient();
    const base = memoryAdapter({
      xp: 40,
      cards: { 'py-basics-0': { box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 } },
    });
    const a = serverAdapter({ base, client });
    const loaded = a.load();
    expect(loaded.cards[UUID_0]).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(loaded.cards).not.toHaveProperty('py-basics-0');
    expect(loaded.cardIdVersion).toBe(2);
    // Written back to storage on first load — the stored copy is translated.
    expect(base.load().cards[UUID_0]).toEqual({ box: 3, due: 100, right: 5, wrong: 2, revSeen: 1 });
    expect(base.load().cards).not.toHaveProperty('py-basics-0');
    expect(client.put).not.toHaveBeenCalled(); // write-back does not push by itself
  });

  it('write-back notifies exactly once, and not again on later loads', async () => {
    const client = newBackendClient();
    const base = memoryAdapter({ cards: { 'py-basics-0': { box: 2, due: 10, right: 1, wrong: 0 } } });
    const a = serverAdapter({ base, client });
    const seen = [];
    a.onExternalChange((state) => seen.push(state));
    a.load();
    expect(seen).toHaveLength(1);
    expect(seen[0].cards[UUID_0]).toEqual({ box: 2, due: 10, right: 1, wrong: 0 });
    a.load();
    a.load();
    expect(seen).toHaveLength(1); // no loop, no repeat notification
  });

  it('write-back then save() pushes the translated state plus the new grade, once', async () => {
    const client = newBackendClient();
    const base = memoryAdapter({ cards: { 'py-basics-0': { box: 2, due: 10, right: 1, wrong: 0 } } });
    const a = serverAdapter({ base, client, debounceMs: 2000 });
    a.load(); // write-back
    const translated = base.load();
    a.save({ ...translated, cards: { ...translated.cards, [UUID_0]: { box: 3, due: 200, right: 2, wrong: 0 } } });
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.put).toHaveBeenCalledTimes(1);
    const pushed = client.put.mock.calls[0][0];
    expect(pushed.cards[UUID_0]).toEqual({ box: 3, due: 200, right: 2, wrong: 0 });
    expect(pushed.cards).not.toHaveProperty('py-basics-0');
    expect(client.server().state.cards[UUID_0].box).toBe(3);
  });

  it('a mixed-scheme 409 merges to exactly one UUID entry per card', async () => {
    // Server holds the UUID entry; local holds the legacy entry for the same card.
    const client = newBackendClient({
      state: { cards: { [UUID_0]: { box: 3, due: 50, right: 1, wrong: 2, revSeen: 1 } } },
      version: 5,
    });
    const base = memoryAdapter({ cards: { 'py-basics-0': { box: 2, due: 100, right: 3, wrong: 1, revSeen: 1 } } });
    const a = serverAdapter({ base, client, debounceMs: 1 });
    a.save(base.load()); // adapter version is 0, server is at 5 -> 409
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();
    const row = client.server().state;
    expect(Object.keys(row.cards)).toEqual([UUID_0]); // exactly one entry per card
    expect(row.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2, revSeen: 1 });
    expect(base.load().cards).not.toHaveProperty('py-basics-0');
  });

  it('two devices converge: after sync() on both, neither holds a legacy key', async () => {
    const client = newBackendClient();
    // Device A: new client, UUID state.
    const baseA = memoryAdapter({ cards: { [UUID_0]: { box: 3, due: 50, right: 1, wrong: 2 } } });
    const deviceA = serverAdapter({ base: baseA, client, debounceMs: 1 });
    // Device B: legacy local state (an old tab that never migrated).
    const baseB = memoryAdapter({ cards: { 'py-basics-0': { box: 2, due: 100, right: 3, wrong: 1 } } });
    const deviceB = serverAdapter({ base: baseB, client, debounceMs: 1 });
    await deviceA.sync();
    await deviceB.sync(); // B translates on load, merges, uploads the combined state
    const row = client.server().state;
    expect(Object.keys(row.cards)).toEqual([UUID_0]);
    expect(row.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2 });
    expect(baseA.load().cards).not.toHaveProperty('py-basics-0');
    expect(baseB.load().cards).not.toHaveProperty('py-basics-0');
    // A re-syncs and sees the same combined state — no second entry appears.
    await deviceA.sync();
    expect(Object.keys(client.server().state.cards)).toEqual([UUID_0]);
    expect(client.server().state.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2 });
  });

  it('a legacy blob loads through the adapter with its resume restored', async () => {
    const client = newBackendClient();
    const base = memoryAdapter({
      cards: { 'py-basics-0': { box: 2, due: 10, right: 1, wrong: 0 } },
      resume: {
        deckId: 'py-basics',
        plan: [{ k: 'c', id: 'py-basics-0' }, { k: 'p', id: 'py-basics-p0' }],
        index: 1,
        tries: {},
        retried: [],
        at: 500,
      },
    });
    const a = serverAdapter({ base, client });
    const loaded = a.load();
    expect(loaded.resume.plan[0]).toEqual({ k: 'c', id: UUID_0, deckId: 'py-basics' });
    expect(loaded.resume.plan[1].id).toBe('6a4f89a7-e1f1-4040-b904-ba2aff82cc8e');
    expect(loaded.resume.index).toBe(1);
  });

  it('sync() against an old backend pushes the translated state, never legacy keys', async () => {
    // Combination C (new client / old backend): the old backend stores
    // opaquely, so the client must never push a mixed-scheme merge — the
    // merged state is translated before it leaves the device.
    let server = {
      state: { cards: { 'py-basics-0': { box: 2, due: 100, right: 3, wrong: 1 } } },
      version: 1,
    };
    const oldBackend = {
      get: vi.fn(async () => ({ ...server })),
      put: vi.fn(async (state, version) => {
        if (version !== server.version) {
          throw Object.assign(new Error('conflict'), { status: 409, server: { ...server } });
        }
        server = { state, version: server.version + 1 };
        return { version: server.version };
      }),
    };
    const base = memoryAdapter({ cards: { [UUID_0]: { box: 3, due: 50, right: 1, wrong: 2 } } });
    const a = serverAdapter({ base, client: oldBackend });
    await a.sync();
    expect(Object.keys(server.state.cards)).toEqual([UUID_0]);
    expect(server.state.cards[UUID_0]).toEqual({ box: 3, due: 50, right: 3, wrong: 2 });
    expect(base.load().cards).not.toHaveProperty('py-basics-0');
  });
});
