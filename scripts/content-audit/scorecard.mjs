// Measured quality score (0-100). Every component is computed from the
// content, the audit ledgers and the lab inventory — nothing is estimated.
// Usage: node scripts/content-audit/scorecard.mjs [--json]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadContent, loadCatalog, decksOf, structuralIssues, EXAM_KEYS } from './lib.mjs';

const readJson = (p, fallback) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), 'utf8')) : fallback);
const words = (s) => (String(s || '').match(/[A-Za-z0-9+#./-]+/g) || []).length;
const lessonWords = (l) => words(l.overview) + (l.learn || []).reduce((n, s) => n + words(s.heading) + (s.body || []).reduce((m, b) => m + (typeof b === 'string' ? words(b) : 0), 0), 0);
// A judgement / application stem (Bloom: apply or above), as CISSP asks.
export const APPLICATION_STEM = /^scenario:|\b(best|first|most|least|should|would you|recommend|which control|what do you do)\b/i;

// Component weights; they sum to 100.
export const WEIGHTS = {
  structural: 10, // nothing missing, nothing keyed wrong by construction
  accuracy: 25, // share of items read by the audit with no open accuracy defect
  distractors: 15, // no answer-length giveaway, no padded distractor
  sourcing: 10, // every deck cites at least one registered source
  lessons: 15, // overview, 3+ sections, worked example, cheat sheet, 300+ words
  alignment: 15, // CISSP questions track the exam weights; outlines registered
  application: 5, // CISSP-mapped items that test judgement, target 30%
  labs: 5, // objectives with hints and validators
};

export async function scorecard() {
  const content = loadContent();
  const catalog = await loadCatalog();
  const issues = structuralIssues(content, catalog);
  const ledger = readJson('docs/audit/review-ledger.json', { decks: {} });
  const reviewed = readJson('docs/audit/issues.json', []);
  const labs = readJson('docs/audit/labs.json', []);
  const rows = decksOf(content);
  const cards = rows.flatMap((r) => r.deck.cards.map((c) => ({ ...c, deck: r.deck })));
  const N = cards.length;
  const sev = (s) => issues.filter((i) => i.severity === s).length;
  const check = (c) => issues.filter((i) => i.check === c).length;

  const parts = {};
  parts.structural = { value: sev('Critical') + sev('High') === 0 ? 1 : Math.max(0, 1 - (sev('Critical') * 0.2 + sev('High') * 0.05)), detail: `${sev('Critical')} Critical, ${sev('High')} High structural issues` };

  const reviewedDecks = new Set(Object.keys(ledger.decks || {}));
  const reviewedCards = cards.filter((c) => reviewedDecks.has(c.deck.id)).length;
  const openAccuracy = reviewed.filter((i) => i.status === 'open' && /incorrect|ambiguous|multiple|outdated|oversimplified|source-dependent|imprecise/.test(i.category || '')).length;
  parts.accuracy = { value: N ? (reviewedCards / N) * (reviewedCards ? Math.max(0, 1 - openAccuracy / reviewedCards) : 0) : 0, detail: `${reviewedCards}/${N} items read; ${openAccuracy} open accuracy findings` };

  const DISTRACTOR_CHECKS = ['card-answer-length-giveaway', 'card-padded-distractor', 'card-colon-restatement'];
  const flagged = new Set(issues.filter((i) => DISTRACTOR_CHECKS.includes(i.check)).map((i) => i.contentId));
  parts.distractors = { value: Math.max(0, 1 - flagged.size / N), detail: `${flagged.size}/${N} items with a giveaway (${check('card-answer-length-giveaway')} length, ${check('card-padded-distractor')} padded, ${check('card-colon-restatement')} colon-restatement options)` };

  const sourced = rows.filter((r) => (r.deck.sources || []).some((s) => catalog.resources[s])).length;
  parts.sourcing = { value: sourced / rows.length, detail: `${sourced}/${rows.length} decks cite a registered source` };

  let lessonPts = 0;
  let full = 0;
  for (const r of rows) {
    const l = content.lessons[r.deck.id];
    if (!l) continue;
    const got = [Boolean(l.overview), (l.learn || []).length >= 3, (l.examples || []).length > 0, Boolean(l.cheatSheet && (l.cheatSheet.length ?? 1)), lessonWords(l) >= 300].filter(Boolean).length;
    lessonPts += got / 5;
    if (got === 5) full += 1;
  }
  parts.lessons = { value: lessonPts / rows.length, detail: `${full}/${rows.length} lessons meet all five criteria` };

  const doms = catalog.domains.cissp;
  const perDom = doms.map((d) => cards.filter((c) => (c.deck.cissp || []).includes(d.id)).length);
  const tot = perDom.reduce((a, b) => a + b, 0) || 1;
  const tvd = doms.reduce((s, d, i) => s + Math.abs(perDom[i] / tot - d.weight / 100), 0) / 2;
  const mappedExams = EXAM_KEYS.filter((k) => cards.some((c) => (c.deck[k] || []).length));
  const outlined = mappedExams.filter((k) => catalog.examOutlines[k]).length;
  parts.alignment = { value: 0.7 * (1 - tvd) + 0.3 * (outlined / mappedExams.length), detail: `CISSP distance from exam weights ${(tvd * 100).toFixed(1)}%; ${outlined}/${mappedExams.length} mapped exams have a registered outline` };

  const cisspItems = cards.filter((c) => (c.deck.cissp || []).length);
  const applied = cisspItems.filter((c) => APPLICATION_STEM.test(c.q)).length;
  parts.application = { value: Math.min(1, applied / cisspItems.length / 0.3), detail: `${applied}/${cisspItems.length} CISSP-mapped items test judgement (target 30%)` };

  const obj = labs.reduce((n, l) => n + l.objectives, 0);
  const hinted = labs.reduce((n, l) => n + l.objectivesWithHints, 0);
  const validated = labs.filter((l) => (l.validators || []).length >= l.objectives).length;
  parts.labs = { value: obj ? 0.5 * (hinted / obj) + 0.5 * (validated / labs.length) : 0, detail: `${hinted}/${obj} objectives hinted; ${validated}/${labs.length} labs validate every objective` };

  const total = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w * parts[k].value, 0);
  return { total: Math.round(total * 10) / 10, parts: Object.fromEntries(Object.entries(parts).map(([k, p]) => [k, { weight: WEIGHTS[k], score: Math.round(p.value * WEIGHTS[k] * 10) / 10, ...p }])) };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Z]):/, '/$1:')}` || process.argv[1]?.endsWith('scorecard.mjs')) {
  const s = await scorecard();
  if (process.argv.includes('--json')) console.log(JSON.stringify(s, null, 2));
  else {
    for (const [k, p] of Object.entries(s.parts)) console.log(`${k.padEnd(12)} ${String(p.score).padStart(5)} / ${p.weight}   ${p.detail}`);
    console.log(`${'TOTAL'.padEnd(12)} ${String(s.total).padStart(5)} / 100`);
  }
}
