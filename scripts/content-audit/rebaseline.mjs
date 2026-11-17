// Lower the structural BASELINE caps in content-audit.test.js to today's counts.
// Refuses to raise a cap: a higher count means a regression to fix, not accept.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadContent, loadCatalog, structuralIssues, summarise } from './lib.mjs';

const file = join(ROOT, 'scripts', 'content-audit', 'content-audit.test.js');
let src = readFileSync(file, 'utf8');
const counts = summarise(structuralIssues(loadContent(), await loadCatalog())).byCheck;
const raised = [];
src = src.replace(/const BASELINE = \{([\s\S]*?)\};/, (m, body) => {
  const lines = body.split('\n').map((l) => {
    const k = l.match(/'([^']+)':\s*(\d+)/);
    if (!k) return l;
    const now = counts[k[1]] || 0;
    if (now > Number(k[2])) raised.push(`${k[1]} ${k[2]} -> ${now}`);
    return l.replace(/\d+/, String(Math.min(now, Number(k[2]))));
  });
  return `const BASELINE = {${lines.join('\n')}};`;
});
writeFileSync(file, src);
if (raised.length) { console.error(`Regressions (not raised): ${raised.join('; ')}`); process.exit(1); }
console.log('baseline lowered to', JSON.stringify(counts));
