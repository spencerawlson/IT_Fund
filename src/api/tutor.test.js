import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamTutor } from './tutor';

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
