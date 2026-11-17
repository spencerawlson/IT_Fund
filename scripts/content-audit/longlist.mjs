// List cards whose keyed answer is the longest option: deck|index|longestWrongIdx|answerLen|answer || longest wrong
import { loadContent, decksOf } from './lib.mjs';

const want = new Set(process.argv.slice(2));
for (const { track, deck } of decksOf(loadContent())) {
  if (!want.has(track.id) && !want.has(deck.id)) continue;
  deck.cards.forEach((c, i) => {
    const lens = c.wrong.map((w) => w.length);
    const m = Math.max(...lens);
    if (c.a.length > m) console.log(`${deck.id}|${i}|${lens.indexOf(m)}|${c.a.length}|${c.a} || ${c.wrong[lens.indexOf(m)]}`);
  });
}
