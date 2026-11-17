// Print every card of the given decks (or whole tracks) for a line-by-line read.
//   node scripts/content-audit/dump.mjs <deckId|trackId> [...]
import { loadContent, decksOf } from './lib.mjs';

const want = new Set(process.argv.slice(2));
for (const { track, deck } of decksOf(loadContent())) {
  if (!want.has(deck.id) && !want.has(track.id)) continue;
  console.log(`## ${deck.id} — ${deck.title}`);
  deck.cards.forEach((c, i) => {
    console.log(`${i}| ${c.q}\n  A: ${c.a}\n  X: ${c.x}\n  W: ${c.wrong.join(' | ')}`);
  });
}
