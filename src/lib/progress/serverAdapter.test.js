import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serverAdapter } from './serverAdapter';
import { memoryAdapter } from './storage';

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
