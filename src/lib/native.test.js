import { describe, it, expect, beforeEach } from 'vitest';
import { challengeFor, handleNativeAuthUrl, makeVerifier, nativeHeadersFor, NATIVE_REDIRECT, getNativeToken } from './native';

// Minimal localStorage for the node test environment.
beforeEach(() => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
});

describe('PKCE', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))
      .toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('makes verifiers in the allowed charset and length, different every time', () => {
    const a = makeVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(makeVerifier()).not.toBe(a);
  });
});

describe('nativeHeadersFor', () => {
  const api = 'https://api.road2cissp.com/api';
  const guest = () => 'guest-123';

  it('adds the bearer token and guest id to API requests', () => {
    expect(nativeHeadersFor(`${api}/auth/me`, { apiBase: api, token: 'tok', guest }))
      .toEqual({ Authorization: 'Bearer tok', 'X-RTC-Guest': 'guest-123' });
  });

  it('sends only the guest id when signed out', () => {
    expect(nativeHeadersFor(`${api}/labs/x`, { apiBase: api, token: null, guest })).toEqual({ 'X-RTC-Guest': 'guest-123' });
  });

  it('never sends credentials anywhere else', () => {
    expect(nativeHeadersFor('https://evil.example/api/x', { apiBase: api, token: 'tok', guest })).toEqual({});
    expect(nativeHeadersFor('https://api.road2cissp.com.evil.example/', { apiBase: api, token: 'tok', guest })).toEqual({});
  });

  it('does nothing for the same-origin /api of the website', () => {
    expect(nativeHeadersFor('/api/auth/me', { apiBase: '/api', token: 'tok', guest })).toEqual({});
  });
});

describe('handleNativeAuthUrl', () => {
  const okFetch = (calls) => async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ token: 'session-token' }) };
  };

  it('ignores links that are not the sign-in callback', async () => {
    expect(await handleNativeAuthUrl('https://example.com/?code=x', okFetch([]))).toBeNull();
  });

  it('exchanges the code with the stored verifier and stores the token', async () => {
    localStorage.setItem('rtc_native_pkce', 'v'.repeat(64));
    const calls = [];
    expect(await handleNativeAuthUrl(`${NATIVE_REDIRECT}?code=abc`, okFetch(calls))).toBe('signed-in');
    expect(calls[0].body).toEqual({ code: 'abc', code_verifier: 'v'.repeat(64) });
    expect(getNativeToken()).toBe('session-token');
    expect(localStorage.getItem('rtc_native_pkce')).toBeNull(); // verifier is single-use
  });

  it('reports an error for a provider failure or a missing verifier', async () => {
    expect(await handleNativeAuthUrl(`${NATIVE_REDIRECT}?error=oauth`, okFetch([]))).toBe('error');
    expect(await handleNativeAuthUrl(`${NATIVE_REDIRECT}?code=abc`, okFetch([]))).toBe('error');
    expect(getNativeToken()).toBeNull();
  });

  it('reports an error when the server rejects the code', async () => {
    localStorage.setItem('rtc_native_pkce', 'v'.repeat(64));
    const reject = async () => ({ ok: false, json: async () => ({}) });
    expect(await handleNativeAuthUrl(`${NATIVE_REDIRECT}?code=abc`, reject)).toBe('error');
    expect(getNativeToken()).toBeNull();
  });
});
