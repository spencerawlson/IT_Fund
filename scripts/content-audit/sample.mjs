// Deterministic review sample: N cards per track, spread across its decks
// (every k-th deck, middle card). Usage: node scripts/content-audit/sample.mjs <n> [trackIds,...]
import { loadContent, decksOf } from './lib.mjs';
const n = Number(process.argv[2] || 6);
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const content = loadContent();
const byTrack = new Map();
for (const r of decksOf(content)) {
  if (only && !only.has(r.track.id)) continue;
  if (!byTrack.has(r.track.id)) byTrack.set(r.track.id, []);
  byTrack.get(r.track.id).push(r);
}
for (const [t, rows] of byTrack) {
  const step = Math.max(1, Math.floor(rows.length / n));
  const picks = [];
  for (let i = 0; i < rows.length && picks.length < n; i += step) {
    const d = rows[i].deck;
    picks.push(d.cards[Math.floor(d.cards.length / 2)]);
  }
  console.log(`\n### ${t}`);
  for (const c of picks) console.log(`[${c.id}] Q: ${c.q}\n   A: ${c.a}\n   W: ${c.wrong.join(' | ')}\n   X: ${c.x}`);
}
