// Mark decks as fully read in docs/audit/review-ledger.json.
//   node scripts/content-audit/ledger.mjs <deckId|trackId> [...]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadContent, decksOf } from './lib.mjs';

const file = join(ROOT, 'docs', 'audit', 'review-ledger.json');
const ledger = JSON.parse(readFileSync(file, 'utf8'));
const want = new Set(process.argv.slice(2));
let n = 0;
for (const { track, deck } of decksOf(loadContent())) {
  if (!want.has(track.id) && !want.has(deck.id)) continue;
  ledger.decks[deck.id] = { reviewed: new Date().toISOString().slice(0, 10), by: 'AI content audit (not a human SME)', items: deck.cards.length };
  n += 1;
}
writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`ledger: ${n} decks marked, ${Object.keys(ledger.decks).length} total`);
