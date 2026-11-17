import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTutorStatus, streamTutor } from './tutor';

const enc = new TextEncoder();
const sse = (text) => `data: ${JSON.stringify({ t: text })}\n\n`;

function okStream(chunks, failAfter) {
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (failAfter !== undefined && i === failAfter) {
            throw new TypeError('Failed to fetch');
          }
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: enc.encode(chunks[i++]) };
        },
      }),
    },
  };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('streamTutor', () => {
  it('streams SSE tokens and resolves the full text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okStream([sse('Hello '), sse('world')])));
    const seen = [];
    const full = await streamTutor({ mode: 'chat' }, { onToken: (t) => seen.push(t) });
    expect(full).toBe('Hello world');
    expect(seen).toEqual(['Hello ', 'world']);
  });

  it('maps a failed fetch to a plain-language message, never "Failed to fetch"', async () => {
    // Live defect (2026-11-16): a transient first tap in the lesson panel
    // showed the raw fetch TypeError; a retry cleared it. The panel now
    // gets a message a learner can act on.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(streamTutor({ mode: 'chat' }))
      .rejects.toThrow('The tutor couldn’t be reached. Check your connection and try again.');
  });

  it('maps a mid-stream drop the same way', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okStream([sse('Hello ')], 1)));
    await expect(streamTutor({ mode: 'chat' }))
      .rejects.toThrow('The tutor couldn’t be reached. Check your connection and try again.');
  });

  it('rethrows an abort untouched — the caller treats it as a cancel, not an error', async () => {
    const abort = new DOMException('The user aborted a request.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn(async () => { throw abort; }));
    await expect(streamTutor({ mode: 'chat' })).rejects.toThrow(abort);
  });

  it('keeps the friendly HTTP-status messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 429, json: async () => ({}),
    })));
    await expect(streamTutor({ mode: 'chat' }))
      .rejects.toThrow('You’ve hit the tutor limit for now. Try again a bit later.');
  });

  it('passes a server-sent error through verbatim', async () => {
    const errEvent = `data: ${JSON.stringify({ error: 'The model is busy right now.' })}\n\n`;
    vi.stubGlobal('fetch', vi.fn(async () => okStream([errEvent])));
    await expect(streamTutor({ mode: 'chat' }))
      .rejects.toThrow('The model is busy right now.');
  });
});

describe('fetchTutorStatus', () => {
  const jsonRes = (body) => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => body,
  });

  it('returns the parsed body when the backend answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonRes({ enabled: true })));
    await expect(fetchTutorStatus()).resolves.toEqual({ enabled: true });
  });

  it('reports off on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, headers: { get: () => 'application/json' } })));
    await expect(fetchTutorStatus()).resolves.toEqual({ enabled: false });
  });

  it('reports off when the answer is not JSON (static host serving index.html)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: { get: () => 'text/html' } })));
    await expect(fetchTutorStatus()).resolves.toEqual({ enabled: false });
  });

  it('never rejects when the fetch itself fails — a failed status check means "off", not an uncaught error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(fetchTutorStatus()).resolves.toEqual({ enabled: false });
  });
});
