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
