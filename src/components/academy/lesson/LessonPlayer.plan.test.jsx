import { describe, expect, it, beforeEach } from 'vitest';
import { planLesson, toStep } from './LessonPlayer';
import { getDeck, allCards } from '@/data/academy';
import { setProgressAdapter, saveLessonProgress } from '@/lib/academy';
import { memoryAdapter } from '@/lib/progress/storage';
import { migratingAdapter } from '@/lib/progress/migratingAdapter';

// PR 3, plan v2.2 §18 click-through — at the logic level with the exported
// planLesson / toStep and real bundle data (no jsdom / testing-library in
// devDeps, so no React render: the click path is plan -> save -> reload ->
// resolve, which is exactly what the component does on every navigation).
// Real fixture ids from scripts/legacy-card-ids.json.
const UUID_0 = '8e8346a1-95b5-4133-9b6f-f5465012b3ce'; // py-basics-0
const UUID_1 = '7c7a2fa0-041b-46c4-b804-37defae1fa7d'; // py-basics-1
const UUID_FLOW_0 = '33f20498-f6cc-410b-9a2e-a5e24bb48906'; // py-flow-0
const UUID_P0 = '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e'; // py-basics-p0 (puzzle)

function buildBundle() {
  const deck = getDeck('py-basics');
  const fullDeck = {
    ...deck,
    cards: deck.cards?.length ? deck.cards : allCards.filter((c) => c.deckId === 'py-basics'),
    puzzles: deck.puzzles || [],
  };
  const cardsById = new Map(allCards.map((c) => [c.id, c]));
  const cardsByDeck = new Map();
  for (const c of allCards) {
    if (!cardsByDeck.has(c.deckId)) cardsByDeck.set(c.deckId, []);
    cardsByDeck.get(c.deckId).push(c);
  }
  const warmupCards = allCards.filter((c) => c.deckId === 'py-flow').slice(0, 2);
  return { fullDeck, cardsById, cardsByDeck, warmupCards };
}

describe('LessonPlayer plan — click-through (PR 3, §18)', () => {
  let store;
  let bundle;

  beforeEach(() => {
    store = memoryAdapter({});
    setProgressAdapter(store);
    bundle = buildBundle();
  });

  it('a fresh plan resolves every step, with deckId on every non-puzzle step', () => {
    const plan = planLesson({}, bundle.fullDeck, bundle.warmupCards);
    expect(plan.length).toBeGreaterThan(0);
    const steps = plan.map((item) => toStep(item, bundle)).filter(Boolean);
    expect(steps.length).toBe(plan.length); // nothing drops out
    for (const item of plan) {
      if (item.k === 'p') {
        expect(item.deckId).toBeUndefined();
      } else {
        expect(item.deckId, `step ${item.id} must carry deckId`).toBeTruthy();
        // UUIDs, not positional ids (a bare /-\d+$/ check is wrong — a real
        // UUID can end in an all-digit segment — so the assertion is the
        // UUID shape).
        expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }
    }
    // Warm-ups resolve to cards from the other deck, questions to this deck.
    const warm = steps.filter((s) => s.warmup);
    expect(warm.length).toBe(bundle.warmupCards.length);
    expect(warm.every((s) => s.card.deckId === 'py-flow')).toBe(true);
  });

  it('a saved mid-lesson plan reloads and resumes at the saved index', () => {
    const plan = planLesson({}, bundle.fullDeck, bundle.warmupCards);
    saveLessonProgress({ deckId: 'py-basics', plan, index: 2, tries: {}, retried: [] });
    const saved = store.load().resume;
    expect(saved.deckId).toBe('py-basics');
    expect(saved.index).toBe(2);
    // Reloading the saved plan resolves every step again (this is what the
    // component does when the learner re-opens the lesson).
    const steps = saved.plan.map((item) => toStep(item, bundle)).filter(Boolean);
    expect(steps.length).toBe(saved.plan.length);
    expect(steps[2].id).toBe(`${saved.plan[2].id}`); // resume lands on the saved step
  });

  it('a retry step appended on a miss resolves with the -review suffix', () => {
    const plan = planLesson({}, bundle.fullDeck, bundle.warmupCards);
    const missed = plan.find((item) => item.k === 'c');
    const retry = { k: 'r', id: missed.id, deckId: missed.deckId };
    const step = toStep(retry, bundle);
    expect(step).not.toBeNull();
    expect(step.review).toBe(true);
    expect(step.id).toBe(`${missed.id}-review`);
    expect(step.card.id).toBe(missed.id);
  });

  it('a legacy saved plan (positional ids) loads translated and resolves', () => {
    // The old client saved this resume; the migrating adapter translates it
    // on load, so the component never sees a positional id.
    const legacy = {
      cards: { 'py-basics-0': { box: 2, due: 10, right: 1, wrong: 0 } },
      resume: {
        deckId: 'py-basics',
        plan: [
          { k: 'w', id: 'py-flow-0' },
          { k: 'c', id: 'py-basics-0' },
          { k: 'p', id: 'py-basics-p0' },
          { k: 'c', id: 'py-basics-1' },
        ],
        index: 1,
        tries: { 'py-flow-0-warm': true },
        retried: [],
        at: 500,
      },
    };
    const base = memoryAdapter(legacy);
    const adapter = migratingAdapter(base);
    setProgressAdapter(adapter);
    // A read through the adapter translates the legacy resume and writes
    // the translated copy back to storage.
    const loaded = adapter.load();
    expect(loaded.resume.plan).toEqual([
      { k: 'w', id: UUID_FLOW_0, deckId: 'py-flow' },
      { k: 'c', id: UUID_0, deckId: 'py-basics' },
      { k: 'p', id: UUID_P0 },
      { k: 'c', id: UUID_1, deckId: 'py-basics' },
    ]);
    const stored = base.load();
    expect(stored.resume.plan).toEqual(loaded.resume.plan); // the stored copy is translated
    const steps = stored.resume.plan.map((item) => toStep(item, bundle)).filter(Boolean);
    expect(steps.length).toBe(4); // nothing drops out, including the puzzle
    expect(steps[1].card.id).toBe(UUID_0);
    expect(steps[1].warmup).toBe(false);
    expect(steps[0].warmup).toBe(true);
  });
});
