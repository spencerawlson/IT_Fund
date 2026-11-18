// Lint a drafts file (content-drafts/**/*.json) with the SAME structural checks
// the published bank passes (lib.mjs structuralIssues): distractor count, empty
// fields, duplicate options, padded distractors, colon-restatement tails,
// answer-length giveaways — plus exact-duplicate questions against the whole
// existing bank. Drafts are merged in as one extra deck so the cross-bank
// duplicate check sees them; only issues on draft cards are reported.
//
//   node scripts/content-audit/check-drafts.mjs content-drafts/cissp/<file>.json
//
// Exits 1 when any draft has an issue. Accuracy is NOT checked here — that is
// the human review the drafts are waiting for.
import { readFileSync } from 'node:fs';
import { loadCatalog, loadContent, structuralIssues } from './lib.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/content-audit/check-drafts.mjs <drafts.json>');
  process.exit(2);
}
const drafts = JSON.parse(readFileSync(file, 'utf8'));
const content = loadContent();
const catalog = await loadCatalog();

const cards = drafts.items.map((it) => {
  const [q, a, x, wrong] = it.card;
  return { id: `draft-${it.draftId}`, q, a, x, wrong };
});
const cissp = content.tracks.find((t) => t.id === 'cissp');
cissp.tiers[0].decks.push({
  id: 'drafts', title: 'Drafts', sources: ['cissp-outline'], cissp: [...new Set(drafts.items.map((i) => i.domain))], cards,
});

const issues = structuralIssues(content, catalog).filter((i) => String(i.contentId || '').startsWith('draft-'));
const answerLongest = cards.filter((c) => c.a.length > Math.max(...c.wrong.map((w) => w.length))).length;
const byDomain = drafts.items.reduce((m, i) => ({ ...m, [i.domain]: (m[i.domain] || 0) + 1 }), {});

console.log(`${cards.length} draft cards (by domain: ${JSON.stringify(byDomain)})`);
console.log(`correct answer is the longest option on ${answerLongest} of ${cards.length} cards`);
for (const i of issues) console.log(`${i.severity}\t${i.check}\t${i.contentId}\t${i.detail}`);
console.log(issues.length ? `${issues.length} issue(s)` : 'no structural issues');
process.exit(issues.length ? 1 : 0);
