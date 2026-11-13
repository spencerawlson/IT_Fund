import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakVoice, fetchVoiceStatus } from './voice';

let calls;

function jsonResponse(body, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => body,
  };
}

beforeEach(() => {
  calls = [];
  globalThis.fetch = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    return jsonResponse({ character: 'cypher', text: 'Hello.', audio_b64: null, mime: 'audio/mpeg', cached: false, fallback: true, reason: 'voice_not_configured' });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('speakVoice', () => {
  it('posts {character, text} to /api/voice/speak with the session cookie', async () => {
    const envelope = await speakVoice({ character: 'cypher', text: 'Hello.' });
    expect(calls[0].url).toBe('/api/voice/speak');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.credentials).toBe('include');
    expect(JSON.parse(calls[0].opts.body)).toEqual({ character: 'cypher', text: 'Hello.' });
    expect(envelope.fallback).toBe(true);
    expect(envelope.audio_b64).toBeNull();
  });

  it('turns a 401 into a learner-friendly sign-in message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Unauthorized' }, 401));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Sign in to hear Cipher speak.');
  });

  it('turns a 402 into a subscription message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'Subscription required' }, 402));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('active subscription');
  });

  it('never puts key material in the error message', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ detail: 'ELEVENLABS_API_KEY is missing' }, 500));
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.toThrow('Cipher’s voice isn’t available right now.');
    await expect(speakVoice({ character: 'cypher', text: 'Hi.' })).rejects.not.toThrow(/ELEVENLABS/);
  });
});

describe('fetchVoiceStatus', () => {
  it('returns the status envelope when the backend answers JSON', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ configured: false, characters: { cypher: false } }));
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: { cypher: false } });
  });

  it('returns an unconfigured envelope for a non-JSON or failed response', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse('<html/>', 200, 'text/html'));
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: {} });
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    await expect(fetchVoiceStatus()).resolves.toEqual({ configured: false, characters: {} });
  });
});
