import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_LESSON_IDS, FREE_DECKS, FREE_LABS,
  isLessonFree, isDeckFree, isLabFree,
  clearSubscriptionCache, fetchStatus,
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
