import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { progressApi } from './progress';

// PR 3 (card UUID migration, plan v2.2 §5 / compatibility-contract §2).
// Written FIRST against the current code and observed FAILING: the client
// sends no X-Card-Id-Version header, so the server cannot tell a new client
// from an old one and cannot shape the GET response.
describe('progressApi — client marker (PR 3)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ state: {}, version: 0 }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends X-Card-Id-Version: 2 on progress GET', async () => {
    await progressApi.get();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('GET');
    expect(init.headers['X-Card-Id-Version']).toBe('2');
  });

  it('sends X-Card-Id-Version: 2 on progress PUT, alongside If-Match', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ version: 3 }),
    });
    await progressApi.put({ xp: 10 }, 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.headers['X-Card-Id-Version']).toBe('2');
    expect(init.headers['If-Match']).toBe('2');
    expect(JSON.parse(init.body)).toEqual({ state: { xp: 10 } });
  });

  it('still surfaces a 409 with the server copy for the merge path', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 409,
      ok: false,
      text: async () => JSON.stringify({ state: { xp: 99 }, version: 5 }),
    });
    await expect(progressApi.put({ xp: 1 }, 0)).rejects.toMatchObject({
      status: 409,
      server: { state: { xp: 99 }, version: 5 },
    });
    expect(fetchMock.mock.calls[0][1].headers['X-Card-Id-Version']).toBe('2');
  });
});
