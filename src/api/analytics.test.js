import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logCypherEvent } from './analytics';

let calls;

beforeEach(() => {
  calls = [];
  globalThis.fetch = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 201, json: async () => ({ ok: true, event_id: 1 }) };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logCypherEvent', () => {
  it('posts the event with ids to /api/analytics/events', async () => {
    await logCypherEvent({ event: 'hint_viewed', lesson_id: 'net-security', mission_id: 'op-broken-shield', meta: { objective_id: 'guest-blocked' } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/analytics/events');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.credentials).toBe('include');
    expect(JSON.parse(calls[0].opts.body)).toEqual({
      event: 'hint_viewed',
      lesson_id: 'net-security',
      mission_id: 'op-broken-shield',
      meta: { objective_id: 'guest-blocked' },
    });
  });

  it('never throws when the analytics endpoint is unreachable', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    await expect(logCypherEvent({ event: 'panel_opened' })).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});
