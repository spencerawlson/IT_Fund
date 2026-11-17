// Turn { deckId: { index: [wrongIndex, "new text"] } } into a full apply-edits
// payload (replacing one distractor per card) and apply it.
//   node scripts/content-audit/lengthen.mjs edits.json
import { readFileSync } from 'node:fs';
import { loadContent, decksOf } from './lib.mjs';
import { applyEdits } from './apply-edits.mjs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const decks = Object.fromEntries(decksOf(loadContent()).map(({ deck }) => [deck.id, deck]));
const edits = {};
for (const [deckId, cards] of Object.entries(spec)) {
  edits[deckId] = {};
  for (const [i, [j, text]] of Object.entries(cards)) {
    const wrong = [...decks[deckId].cards[Number(i)].wrong];
    wrong[j] = text;
    edits[deckId][i] = { wrong };
  }
}
console.log(`edited ${applyEdits(edits)} cards`);
