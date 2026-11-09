import { describe, expect, it, vi } from 'vitest';
import { ATTRIBUTION_STORAGE_KEY, captureAttributionTag, getAttributionTag } from './attribution';

const fakeStorage = (value = null) => {
  let stored = value;
  return {
    getItem: vi.fn(() => stored),
    setItem: vi.fn((k, v) => { stored = v; }),
    get stored() { return stored; },
  };
};

describe('captureAttributionTag', () => {
  it('stores a valid vtn_ tag from utm_content', () => {
    const storage = fakeStorage();
    captureAttributionTag('?utm_source=ventoryn&utm_content=vtn_abc123.def456', storage);
    expect(storage.stored).toBe('vtn_abc123.def456');
  });

  it('ignores a query string with no utm_content', () => {
    const storage = fakeStorage();
    captureAttributionTag('?ref=newsletter', storage);
    expect(storage.stored).toBeNull();
  });

  it('rejects a tag that is not Ventoryn-shaped', () => {
    const storage = fakeStorage();
    captureAttributionTag('?utm_content=' + encodeURIComponent('<script>alert(1)</script>'), storage);
    expect(storage.stored).toBeNull();
  });

  it('first touch only: an existing tag is never overwritten', () => {
    const storage = fakeStorage('vtn_first.aaa111');
    captureAttributionTag('?utm_content=vtn_second.bbb222', storage);
    expect(storage.stored).toBe('vtn_first.aaa111');
  });

  it('survives unavailable storage instead of throwing', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(() => captureAttributionTag('?utm_content=vtn_x.y', throwing)).not.toThrow();
  });

  it('no-ops without any storage (SSR)', () => {
    expect(() => captureAttributionTag('?utm_content=vtn_x.y', null)).not.toThrow();
  });
});

describe('getAttributionTag', () => {
  it('reads back a stored tag', () => {
    expect(getAttributionTag(fakeStorage('vtn_abc.def'))).toBe('vtn_abc.def');
  });

  it('returns null when nothing is stored', () => {
    expect(getAttributionTag(fakeStorage())).toBeNull();
  });

  it('returns null, never throws, when storage is unavailable', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); } };
    expect(getAttributionTag(throwing)).toBeNull();
  });
});

describe('storage key', () => {
  it('is namespaced to this app', () => {
    expect(ATTRIBUTION_STORAGE_KEY).toBe('rtc_attribution_tag');
  });
});
