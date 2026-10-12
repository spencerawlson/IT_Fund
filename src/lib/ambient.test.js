import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAmbientEnabled, setAmbientEnabled, applyAmbientPreference } from './ambient.js';

describe('ambient background preference', () => {
  let store;
  let dataset;

  beforeEach(() => {
    store = {};
    dataset = {};
    const storageStub = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; },
    };
    vi.stubGlobal('localStorage', storageStub);
    vi.stubGlobal('document', { documentElement: { dataset } });
  });

  it('defaults to enabled when nothing is stored', () => {
    expect(getAmbientEnabled()).toBe(true);
  });

  it('persists the choice and applies the html attribute', () => {
    setAmbientEnabled(false);
    expect(store['itfund-ambient-bg']).toBe('off');
    expect(dataset.ambient).toBe('off');
    expect(getAmbientEnabled()).toBe(false);

    setAmbientEnabled(true);
    expect(store['itfund-ambient-bg']).toBe('on');
    expect(dataset.ambient).toBe('on');
    expect(getAmbientEnabled()).toBe(true);
  });

  it('applyAmbientPreference reflects the stored value', () => {
    applyAmbientPreference();
    expect(dataset.ambient).toBe('on');
    store['itfund-ambient-bg'] = 'off';
    applyAmbientPreference();
    expect(dataset.ambient).toBe('off');
  });

  it('fails open (enabled) when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    });
    expect(getAmbientEnabled()).toBe(true);
  });
});
