import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labsApi } from './labs';

let calls;

beforeEach(() => {
  calls = [];
  globalThis.localStorage = { getItem: () => 'tok-123' };
  globalThis.fetch = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'sess-1', status: 'RUNNING' }),
    };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('labsApi', () => {
  it('calls relative /api/labs paths with the bearer token', async () => {
    await labsApi.start('cyber-nmap-001');
    expect(calls[0].url).toBe('/api/labs/cyber-nmap-001/start');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers.Authorization).toBe('Bearer tok-123');
  });

  it('wraps findings in a {findings} body', async () => {
    await labsApi.recordFindings('sess-1', { ports: [{ port: 22 }] });
    expect(JSON.parse(calls[0].opts.body)).toEqual({ findings: { ports: [{ port: 22 }] } });
  });

  it('posts a command to the session exec endpoint', async () => {
    await labsApi.exec('sess-1', 'nmap -sV target.lab');
    expect(calls[0].url).toBe('/api/labs/sessions/sess-1/exec');
    expect(calls[0].opts.method).toBe('POST');
    expect(JSON.parse(calls[0].opts.body)).toEqual({ command: 'nmap -sV target.lab' });
  });

  it('returns null on 204 (delete)', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 204, text: async () => '' }));
    expect(await labsApi.destroy('sess-1')).toBeNull();
  });

  it('throws the backend detail on error', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ detail: 'Unauthorized' }) }));
    await expect(labsApi.getSession('sess-1')).rejects.toThrow('Unauthorized');
  });

  it('omits the auth header when there is no token', async () => {
    globalThis.localStorage = { getItem: () => null };
    await labsApi.listDefinitions();
    expect(calls[0].opts.headers.Authorization).toBeUndefined();
  });
});
