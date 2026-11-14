import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDeckCards,
  getDeckContent,
  getLessonContent,
  getModuleNote,
  fetchExam,
  resolveCards,
  clearContentCache,
  lessonTextFromContent,
  ContentError,
} from './content';
import { getDeck } from '../data/academy';

// The entitled content service is the boundary between the public bundle
// (free content only) and the API (premium content, entitlement-checked).
// These tests mock fetch; they never touch the network or the backend.

const premiumDeck = {
  deck: { id: 'cissp-d3', title: 'Security Architecture' },
  cards: [
    { id: 'cissp-d3-0', deckId: 'cissp-d3', trackId: 'cissp', q: 'Premium Q?', a: 'Premium A', e: 'Why', wrong: ['W1', 'W2', 'W3'] },
    { id: 'cissp-d3-1', deckId: 'cissp-d3', trackId: 'cissp', q: 'Premium Q2?', a: 'Premium A2', e: 'Why2', wrong: ['W1', 'W2', 'W3'] },
  ],
  puzzles: [],
};

function mockFetch(handler) {
  vi.stubGlobal('fetch', vi.fn(handler));
}

function okJson(payload) {
  return async () => ({ ok: true, status: 200, json: async () => payload });
}

beforeEach(() => { clearContentCache(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('bundled premium stubs carry no bodies', () => {
  it('a premium deck in the public module has stubs, not questions', () => {
    const deck = getDeck('cissp-d3');
    expect(deck).toBeDefined();
    expect(deck.cards.length).toBeGreaterThan(0);
    for (const card of deck.cards) {
      expect(card.q).toBeUndefined();
      expect(card.a).toBeUndefined();
      expect(card.id).toMatch(/^cissp-d3-\d+$/);
    }
    expect(deck.puzzles).toEqual([]);
  });
});

describe('getDeckCards / getDeckContent', () => {
  it('returns bundled cards for a free deck without fetching', async () => {
    mockFetch(vi.fn());
    const cards = await getDeckCards('net-osi');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(typeof card.q).toBe('string');
      expect(typeof card.a).toBe('string');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches a premium deck with the session cookie', async () => {
    mockFetch(okJson(premiumDeck));
    const { deck, cards, puzzles } = await getDeckContent('cissp-d3');
    expect(fetch).toHaveBeenCalledWith('/api/content/deck/cissp-d3', { credentials: 'include' });
    expect(deck.id).toBe('cissp-d3');
    expect(cards).toHaveLength(2);
    expect(cards[0].q).toBe('Premium Q?');
    expect(puzzles).toEqual([]);
  });

  it('caches a deck: the second call does not fetch again', async () => {
    mockFetch(okJson(premiumDeck));
    await getDeckCards('cissp-d3');
    await getDeckCards('cissp-d3');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces a 402 as a ContentError with the status', async () => {
    mockFetch(async () => ({ ok: false, status: 402, json: async () => ({ detail: 'Subscription required' }) }));
    await expect(getDeckCards('cissp-d3')).rejects.toMatchObject({ status: 402 });
    try {
      await getDeckCards('cissp-d3');
    } catch (err) {
      expect(err).toBeInstanceOf(ContentError);
    }
  });

  it('a failed fetch is not cached: the next call retries', async () => {
    mockFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(getDeckCards('cissp-d3')).rejects.toMatchObject({ status: 503 });
    mockFetch(okJson(premiumDeck));
    const cards = await getDeckCards('cissp-d3');
    expect(cards).toHaveLength(2);
  });
});

describe('getLessonContent', () => {
  it('returns bundled reading for a free lesson without fetching', async () => {
    mockFetch(vi.fn());
    const { content, cipherNote } = await getLessonContent('net-osi');
    expect(content).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(cipherNote === null || typeof cipherNote === 'string').toBe(true);
  });

  it('fetches a premium lesson body', async () => {
    const payload = { content: { learn: [{ heading: 'H', body: ['B'] }] }, cipherNote: 'Remember this.' };
    mockFetch(okJson(payload));
    const result = await getLessonContent('cissp-d3');
    expect(fetch).toHaveBeenCalledWith('/api/content/lesson/cissp-d3', { credentials: 'include' });
    expect(result.content.learn[0].heading).toBe('H');
    expect(result.cipherNote).toBe('Remember this.');
  });
});

describe('getModuleNote', () => {
  it('returns the full note when entitled', async () => {
    mockFetch(okJson({ body: 'Full note.', example: 'Ex.', tip: 'Tip.' }));
    const note = await getModuleNote('some-concept', 'Short detail.');
    expect(note.body).toBe('Full note.');
    expect(note.example).toBe('Ex.');
  });

  it('falls back to the short detail on 402', async () => {
    mockFetch(async () => ({ ok: false, status: 402, json: async () => ({}) }));
    const note = await getModuleNote('some-concept', 'Short detail.');
    expect(note).toEqual({ body: 'Short detail.' });
  });
});

describe('fetchExam', () => {
  it('asks the API for a fresh exam for the cert', async () => {
    const payload = { questions: [{ id: 'q-0', domain: 1, card: { id: 'c-0' }, options: ['A'], correct: 0 }], quotas: { 1: 1 }, shortfalls: [] };
    mockFetch(okJson(payload));
    const result = await fetchExam('secplus');
    expect(fetch).toHaveBeenCalledWith('/api/content/exam/secplus', { credentials: 'include' });
    expect(result.questions).toHaveLength(1);
  });
});

describe('resolveCards', () => {
  it('resolves stubs to full cards, fetching each deck once', async () => {
    mockFetch(okJson(premiumDeck));
    const stubs = [{ id: 'cissp-d3-0', deckId: 'cissp-d3', trackId: 'cissp' }, { id: 'cissp-d3-1', deckId: 'cissp-d3', trackId: 'cissp' }];
    const resolved = await resolveCards(stubs);
    expect(resolved.map((c) => c.id)).toEqual(['cissp-d3-0', 'cissp-d3-1']);
    expect(resolved[0].q).toBe('Premium Q?');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('drops stubs whose deck cannot be read and keeps the rest', async () => {
    mockFetch(async (url) => (
      url.includes('cissp-d3')
        ? { ok: true, status: 200, json: async () => premiumDeck }
        : { ok: false, status: 402, json: async () => ({}) }
    ));
    const stubs = [
      { id: 'cissp-d3-0', deckId: 'cissp-d3', trackId: 'cissp' },
      { id: 'cissp-d1-0', deckId: 'cissp-d1', trackId: 'cissp' },
    ];
    const resolved = await resolveCards(stubs);
    expect(resolved.map((c) => c.id)).toEqual(['cissp-d3-0']);
  });

  it('resolves free-deck stubs from the bundle without fetching', async () => {
    mockFetch(vi.fn());
    const free = getDeck('net-osi');
    const stubs = free.cards.slice(0, 2).map((c) => ({ id: c.id, deckId: c.deckId, trackId: c.trackId }));
    const resolved = await resolveCards(stubs);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].q).toBe(free.cards[0].q);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('lessonTextFromContent', () => {
  // Shaped like lesson 3.3 (net-security): Overview + Learn + architecture
  // + examples + cheat sheet — the reading body the student sees on the
  // page, and the only text Cypher may explain from.
  const lesson = {
    overview: [
      'Attackers who get onto a network, even as a guest, often start at Layer 2, where many switches trust by default.',
      'This lesson covers the classic Layer 2 attacks and their switch defences.',
    ],
    learn: [
      {
        heading: 'Layer 2 attacks and defences',
        body: [
          'DHCP snooping drops untrusted DHCP replies.',
          { stack: { title: 'The OSI model, top to bottom', items: [
            { badge: 'L7', name: 'Application', does: 'Where users live.', examples: 'HTTP, DNS' },
            { badge: 'L2', name: 'Data Link', does: 'Switching and framing.', examples: 'Ethernet' },
          ] } },
        ],
      },
    ],
    architecture: {
      diagram: '+---+\n| X |\n+---+',
      caption: 'A screened subnet sits between two firewalls.',
    },
    examples: [
      { title: 'DHCP starvation', code: 'dhcp-starve --interface eth0', explanation: 'The attacker exhausts the pool.' },
    ],
    cheatSheet: [['DHCP snooping', 'Drops untrusted DHCP replies.']],
  };

  it('flattens the reading body in page order', () => {
    const text = lessonTextFromContent(lesson);
    for (const fragment of [
      'Attackers who get onto a network',
      'Layer 2 attacks and defences',
      'DHCP snooping drops untrusted DHCP replies.',
      'The OSI model, top to bottom',
      'Application — Where users live. — Examples: HTTP, DNS',
      'A screened subnet sits between two firewalls.',
      'DHCP starvation',
      'dhcp-starve --interface eth0',
      'The attacker exhausts the pool.',
      'DHCP snooping: Drops untrusted DHCP replies.',
    ]) {
      expect(text).toContain(fragment);
    }
    // The ASCII diagram itself is not text the tutor should quote.
    expect(text).not.toContain('+---+');
    // Page order: overview first, cheat sheet last.
    expect(text.indexOf('Attackers who get onto a network')).toBeLessThan(text.indexOf('DHCP snooping:'));
  });

  it('returns empty text with no reading body', () => {
    expect(lessonTextFromContent(null)).toBe('');
    expect(lessonTextFromContent(undefined)).toBe('');
    expect(lessonTextFromContent({})).toBe('');
    expect(lessonTextFromContent({ content: null })).toBe('');
  });

  it('caps the text at 12,000 chars', () => {
    const big = { overview: ['x'.repeat(20000)] };
    const text = lessonTextFromContent(big);
    expect(text.length).toBeLessThanOrEqual(12000 + '[Lesson text truncated]'.length + 1);
    expect(text).toContain('[Lesson text truncated]');
  });
});
