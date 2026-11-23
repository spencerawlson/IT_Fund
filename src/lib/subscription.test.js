import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_LESSON_IDS, FREE_DECKS, FREE_LABS,
  isLessonFree, isDeckFree, isLabFree,
  clearSubscriptionCache, fetchStatus,
  ALLOWANCE_SECONDS, LAB_USAGE_WARN_15H_SECONDS, LAB_USAGE_WARN_18H_SECONDS,
  UNMETERED_USAGE, clearLabUsageCache, fetchLabUsage,
} from './subscription.js';
import { allDecks } from '../data/academy/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSrc = (p) => readFileSync(join(ROOT, p), 'utf8');

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

  it('marks exactly two labs as free (by lab ID, not slug)', () => {
    expect(isLabFree('net-vlan-001')).toBe(true);
    expect(isLabFree('py-basics-001')).toBe(true);
    expect(isLabFree('vlan-inter-vlan-routing')).toBe(false);
    expect(isLabFree('static-routing')).toBe(false);
    expect(isLabFree('nope')).toBe(false);
  });
});

describe('free tier: single source of truth (audit F-02)', () => {
  it('defines exactly 5 free lessons, 5 free decks, 2 free labs', () => {
    expect([...FREE_LESSON_IDS].sort()).toEqual(['cl-concepts', 'lx-cli', 'net-osi', 'py-basics', 'sec-concepts']);
    expect([...FREE_DECKS].sort()).toEqual(['cl-concepts', 'cy-linux', 'lx-cli', 'net-osi', 'py-basics']);
    expect([...FREE_LABS].sort()).toEqual(['net-vlan-001', 'py-basics-001']);
  });

  it('the 5 free decks hold 57 flashcards in total', () => {
    const total = [...FREE_DECKS].reduce((s, id) => {
      const deck = allDecks.find((d) => d.id === id);
      expect(deck, `free deck ${id} must exist`).toBeTruthy();
      return s + deck.cards.length;
    }, 0);
    expect(total).toBe(57);
  });

  it('free tier is unified: one opening lesson + its flashcards per track', () => {
    // The free tier covers the same five tracks as lessons and as decks.
    // The security track's ids differ (lesson sec-concepts, deck cy-linux) —
    // both stay free, so neither side may be "fixed" by dropping the other.
    expect(isLessonFree('net-osi')).toBe(true);
    expect(isLessonFree('sec-concepts')).toBe(true);
    expect(isLessonFree('py-basics')).toBe(true);
    expect(isLessonFree('lx-cli')).toBe(true);
    expect(isLessonFree('cl-concepts')).toBe(true);
    expect(isDeckFree('sec-concepts')).toBe(false); // lesson-free, deck-premium
    expect(isLessonFree('cy-linux')).toBe(false); // deck-free, lesson-premium
    // The overlap is free on both routes.
    for (const id of ['net-osi', 'py-basics', 'lx-cli', 'cl-concepts']) {
      expect(isLessonFree(id)).toBe(true);
      expect(isDeckFree(id)).toBe(true);
    }
  });

  it('LessonView and AcademyPlay import the free tier from subscription.js (no local duplicates)', () => {
    const lessonView = readSrc('src/pages/academy/LessonView.jsx');
    expect(lessonView).toContain("from '@/lib/subscription'");
    expect(lessonView).toContain('isLessonFree');
    expect(lessonView).not.toMatch(/const FREE_LESSON_IDS\s*=/);
    const academyPlay = readSrc('src/pages/AcademyPlay.jsx');
    expect(academyPlay).toContain("from '@/lib/subscription'");
    expect(academyPlay).toContain('isDeckFree');
    expect(academyPlay).not.toMatch(/const FREE_DECKS\s*=/);
  });
});

describe('fetchStatus fails closed (billing F-04)', () => {
  beforeEach(() => {
    clearSubscriptionCache();
    vi.unstubAllGlobals();
  });

  it('maps a 503 from /billing/status to subscribed: false with a billing-unavailable status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }));
    const s = await fetchStatus();
    expect(s.subscribed).toBe(false);
    expect(s.status).toBe('billing-unavailable');
  });

  it('maps a 200 subscribed response to subscribed: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ subscribed: true, status: 'active', current_period_end: '2026-12-11T00:00:00Z' }),
    }));
    const s = await fetchStatus();
    expect(s.subscribed).toBe(true);
    expect(s.status).toBe('active');
    expect(s.currentPeriodEnd).toBe('2026-12-11T00:00:00Z');
  });

  it('maps a 401 to anonymous, not subscribed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
    const s = await fetchStatus();
    expect(s.subscribed).toBe(false);
    expect(s.status).toBe('anonymous');
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

describe('fetchLabUsage fails closed (Phase 0 meter)', () => {
  beforeEach(() => {
    clearLabUsageCache();
    vi.unstubAllGlobals();
  });

  const usageResponse = (overrides = {}) => ({
    status: 200,
    ok: true,
    json: async () => ({
      metered: true,
      used_seconds: 26400,
      allowance_seconds: 72000,
      overage_seconds: 0,
      live_seconds: 3600,
      resets_at: '2026-04-17T00:00:00Z',
      ...overrides,
    }),
  });

  it('maps a 200 metered response to camelCase usage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(usageResponse()));
    const u = await fetchLabUsage();
    expect(u).toEqual({
      metered: true,
      usedSeconds: 26400,
      allowanceSeconds: 72000,
      overageSeconds: 0,
      liveSeconds: 3600,
      resetsAt: '2026-04-17T00:00:00Z',
    });
  });

  it('maps metered:false (free tier / guest) through, with no usage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(usageResponse({ metered: false, used_seconds: 0, live_seconds: 0, resets_at: null })));
    const u = await fetchLabUsage();
    expect(u.metered).toBe(false);
    expect(u.usedSeconds).toBe(0);
    expect(u.resetsAt).toBeNull();
  });

  it('maps a 401 to null (fail-closed, never a meter)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
    expect(await fetchLabUsage()).toBeNull();
  });

  it('maps a 503 to null (fail-closed)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }));
    expect(await fetchLabUsage()).toBeNull();
  });

  it('maps any other non-OK status to null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false }));
    expect(await fetchLabUsage()).toBeNull();
  });

  it('maps a network throw to null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network')));
    expect(await fetchLabUsage()).toBeNull();
  });

  it('maps a malformed body to null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => null }));
    expect(await fetchLabUsage()).toBeNull();
    clearLabUsageCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => { throw new Error('bad json'); } }));
    expect(await fetchLabUsage()).toBeNull();
  });

  it('caches the result for the session: one fetch for two calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    const first = await fetchLabUsage();
    const second = await fetchLabUsage();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('clearLabUsageCache lets the next call fetch again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(usageResponse());
    vi.stubGlobal('fetch', fetchMock);
    await fetchLabUsage();
    clearLabUsageCache();
    await fetchLabUsage();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('the allowance and warning constants are 20h / 15h / 18h', () => {
    expect(ALLOWANCE_SECONDS).toBe(72000);
    expect(LAB_USAGE_WARN_15H_SECONDS).toBe(54000);
    expect(LAB_USAGE_WARN_18H_SECONDS).toBe(64800);
  });

  it('UNMETERED_USAGE is the no-allowance object (free tier / guest)', () => {
    expect(UNMETERED_USAGE.metered).toBe(false);
    expect(UNMETERED_USAGE.allowanceSeconds).toBe(ALLOWANCE_SECONDS);
  });
});
