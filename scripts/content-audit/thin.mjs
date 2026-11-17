// List lessons failing the scorecard's lesson-depth criteria.
//   node scripts/content-audit/thin.mjs [track]
import { loadContent, decksOf } from './lib.mjs';
const words = (s) => (String(s || '').match(/[A-Za-z0-9+#./-]+/g) || []).length;
const lessonWords = (l) => words(l.overview) + (l.learn || []).reduce((n, s) => n + words(s.heading) + (s.body || []).reduce((m, b) => m + (typeof b === 'string' ? words(b) : 0), 0), 0);
const content = loadContent();
const only = process.argv[2];
const counts = {};
for (const r of decksOf(content)) {
  const l = content.lessons[r.deck.id];
  if (!l || (only && r.track?.id !== only && !r.deck.id.startsWith(only))) continue;
  const miss = [];
  if (!l.overview) miss.push('overview');
  if ((l.learn || []).length < 3) miss.push(`sections=${(l.learn || []).length}`);
  if (!(l.examples || []).length) miss.push('example');
  if (!(l.cheatSheet && (l.cheatSheet.length ?? 1))) miss.push('cheatSheet');
  const w = lessonWords(l); if (w < 300) miss.push(`words=${w}`);
  if (miss.length) { console.log(r.deck.id.padEnd(34), miss.join(' ')); const t = r.deck.id.split('-')[0]; counts[t] = (counts[t] || 0) + 1; }
}
console.log(counts);
