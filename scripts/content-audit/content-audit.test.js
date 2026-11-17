import { describe, it, expect } from 'vitest';
import { loadContent, loadCatalog, structuralIssues, summarise, buildInventory } from './lib.mjs';
import { longestRates } from './longest.mjs';

// Automated STRUCTURAL validation of the whole content bank (Phase 9 of the
// educational audit). It never judges technical truth — that needs a source
// or an expert and lives in docs/audit/issues.json. What it guarantees:
//   - no Critical/High structural problem ever ships (empty question/answer,
//     a distractor identical to the answer, a missing explanation, a deck
//     mapped to a non-existent exam domain, the same question twice in one
//     deck, an expired exam outline);
//   - the known Low/Medium backlog only shrinks: each check is capped at its
//     2026-11-16 baseline, so new content cannot add to it. Lower a cap when
//     you fix items; never raise one to make a failing change pass.
const BASELINE = {
  'card-answer-length-giveaway': 255,
  'card-padded-distractor': 118,
  'card-colon-restatement': 855,
  'lesson-no-examples': 159,
  'cross-track-duplicate-reworded': 47,
  'deck-no-sources': 15,
  'near-duplicate-question': 7,
  'duplicate-question': 1,
};

describe('content bank — structural validation', async () => {
  const content = loadContent();
  const catalog = await loadCatalog();
  const issues = structuralIssues(content, catalog);
  const summary = summarise(issues);

  it('has no Critical or High structural issues', () => {
    const bad = issues.filter((i) => i.severity === 'Critical' || i.severity === 'High');
    expect(bad.map((i) => `${i.severity} ${i.check} ${i.contentId}: ${i.detail}`)).toEqual([]);
  });

  it('does not grow the known Low/Medium backlog past its baseline', () => {
    const grown = Object.entries(summary.byCheck)
      .filter(([check, n]) => n > (BASELINE[check] ?? 0))
      .map(([check, n]) => `${check}: ${n} (baseline ${BASELINE[check] ?? 0})`);
    expect(grown).toEqual([]);
  });

  it('every card has a question, answer, explanation and three distractors', () => {
    const inv = buildInventory(content, catalog);
    expect(inv.totals.cards).toBeGreaterThan(3000);
    for (const t of content.tracks) for (const tier of t.tiers) for (const d of tier.decks) for (const c of d.cards) {
      expect(c.q && c.a && c.x, c.id).toBeTruthy();
      expect(c.wrong, c.id).toHaveLength(3);
    }
  });

  it('every deck source id resolves to a registered resource', () => {
    const ids = new Set(Object.keys(catalog.resources));
    const missing = [];
    for (const t of content.tracks) for (const tier of t.tiers) for (const d of tier.decks) {
      for (const s of d.sources || []) if (!ids.has(s)) missing.push(`${d.id}:${s}`);
    }
    expect(missing).toEqual([]);
  });

  it('every course certification resolves to a known certification', () => {
    const missing = catalog.courses.flatMap((c) => (c.certifications || []).filter((k) => !catalog.certifications[k]).map((k) => `${c.slug}:${k}`));
    expect(missing).toEqual([]);
  });

  it('every exam outline the curriculum is written against is still in force', () => {
    const today = new Date().toISOString().slice(0, 10);
    const expired = Object.entries(catalog.examOutlines).filter(([, o]) => o.validUntil && o.validUntil < today).map(([k]) => k);
    expect(expired).toEqual([]);
  });

  it('no track lets "pick the longest option" win (answer longest in at most 35% of items)', () => {
    const over = Object.entries(longestRates(content)).filter(([, r]) => r.longest / r.items > 0.35).map(([t, r]) => `${t}: ${r.longest}/${r.items}`);
    expect(over).toEqual([]);
  });

  it('every exam outline past its review-by date has been re-checked', () => {
    const today = new Date().toISOString().slice(0, 10);
    const stale = Object.entries(catalog.examOutlines).filter(([, o]) => o.reviewBy && o.reviewBy < today).map(([k]) => k);
    expect(stale).toEqual([]);
  });
});
