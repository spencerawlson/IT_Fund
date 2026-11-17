// Replace individual distractors by exact text: { "<cardId>": { "<old text>": "<new text>" } }
//   node scripts/content-audit/replace-options.mjs spec.json
import { readFileSync } from 'node:fs';
import { loadContent, decksOf } from './lib.mjs';
import { applyEdits } from './apply-edits.mjs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byId = {};
for (const { deck } of decksOf(loadContent())) deck.cards.forEach((c, i) => { byId[c.id] = { deck: deck.id, i, c }; });
const edits = {};
for (const [id, swaps] of Object.entries(spec)) {
  const hit = byId[id];
  if (!hit) throw new Error(`No card ${id}`);
  const wrong = hit.c.wrong.map((w) => (w in swaps ? swaps[w] : w));
  const missing = Object.keys(swaps).filter((o) => !hit.c.wrong.includes(o));
  if (missing.length) throw new Error(`${id}: not a current distractor: ${missing.join(' | ')}`);
  (edits[hit.deck] ||= {})[hit.i] = { wrong };
}
console.log(`edited ${applyEdits(edits)} cards`);
