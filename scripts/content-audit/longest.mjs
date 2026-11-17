// Share of items where the keyed answer is the longest option (by characters).
// With 4 options, an unbiased bank sits near 25%; far above that, "pick the
// longest" becomes a winning test-taking strategy.
import { loadContent, decksOf } from './lib.mjs';

export function longestRates(content) {
  const out = {};
  for (const { track, deck } of decksOf(content)) {
    const r = (out[track.id] ||= { items: 0, longest: 0 });
    for (const c of deck.cards) {
      r.items += 1;
      if (c.a.length > Math.max(...c.wrong.map((w) => w.length))) r.longest += 1;
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('longest.mjs')) {
  const rates = longestRates(loadContent());
  for (const [t, r] of Object.entries(rates)) console.log(t.padEnd(14), `${Math.round((100 * r.longest) / r.items)}%`.padStart(4), `(${r.longest}/${r.items})`);
}
