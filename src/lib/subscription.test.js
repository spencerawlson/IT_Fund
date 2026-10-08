import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isDeckFree, isLabFree, clearSubscriptionCache } from './subscription.js';

describe('free-tier boundaries', () => {
  it('marks the first deck of each track as free', () => {
    expect(isDeckFree('net-osi')).toBe(true);
    expect(isDeckFree('cy-linux')).toBe(true);
    expect(isDeckFree('py-basics')).toBe(true);
    expect(isDeckFree('lx-cli')).toBe(true);
    expect(isDeckFree('cl-concepts')).toBe(true);
  });

  it('marks other decks as premium', () => {
    expect(isDeckFree('cy-soc')).toBe(false);
    expect(isDeckFree('net-ports')).toBe(false);
    expect(isDeckFree('nope')).toBe(false);
  });

  it('marks exactly one lab as free', () => {
    expect(isLabFree('vlan-inter-vlan-routing')).toBe(true);
    expect(isLabFree('static-routing')).toBe(false);
    expect(isLabFree('nope')).toBe(false);
  });
});

describe('useSubscription hook', () => {
  beforeEach(() => {
    clearSubscriptionCache();
    vi.unstubAllGlobals();
  });

  it('is exported and the cache can be cleared without throwing', () => {
    expect(() => clearSubscriptionCache()).not.toThrow();
  });
});
