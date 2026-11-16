import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readConsent,
  writeConsent,
  openConsentSettings,
  CONSENT_KEY,
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
} from './consent';

// Minimal window/localStorage stand-in: consent.js only touches
// window.localStorage + window.dispatchEvent/addEventListener.
function installFakeWindow() {
  const store = new Map();
  const listeners = {};
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    dispatchEvent: (event) => {
      for (const cb of listeners[event.type] || []) cb(event);
      return true;
    },
    addEventListener: (type, cb) => {
      (listeners[type] ||= []).push(cb);
    },
    removeEventListener: (type, cb) => {
      listeners[type] = (listeners[type] || []).filter((fn) => fn !== cb);
    },
  };
  return store;
}

describe('consent storage (R-04)', () => {
  let savedWindow;

  beforeEach(() => {
    savedWindow = globalThis.window;
    installFakeWindow();
  });

  afterEach(() => {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  });

  it('is undecided (null) before any choice', () => {
    expect(readConsent()).toBe(null);
  });

  it('round-trips accept and decline', () => {
    writeConsent(true);
    expect(readConsent()).toBe('accepted');
    expect(globalThis.window.localStorage.getItem(CONSENT_KEY)).toBe('accepted');
    writeConsent(false);
    expect(readConsent()).toBe('declined');
  });

  it('treats a garbage stored value as undecided', () => {
    globalThis.window.localStorage.setItem(CONSENT_KEY, 'maybe');
    expect(readConsent()).toBe(null);
  });

  it('dispatches a change event on write', () => {
    const seen = [];
    globalThis.window.addEventListener(CONSENT_CHANGE_EVENT, () => seen.push('change'));
    writeConsent(true);
    expect(seen).toEqual(['change']);
  });

  it('openConsentSettings dispatches the open event', () => {
    const seen = [];
    globalThis.window.addEventListener(CONSENT_OPEN_EVENT, () => seen.push('open'));
    openConsentSettings();
    expect(seen).toEqual(['open']);
  });

  it('returns null with no window (SSR / prerender)', () => {
    delete globalThis.window;
    expect(readConsent()).toBe(null);
    expect(() => writeConsent(true)).not.toThrow();
    expect(() => openConsentSettings()).not.toThrow();
  });
});
