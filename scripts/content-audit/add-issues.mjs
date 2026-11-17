// Append findings to docs/audit/issues.json from a compact JSON list:
// [{ "severity", "category", "file", "contentId", "original", "problem", "sourceUrl"?, "status"? , "fix"? }]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const file = join(ROOT, 'docs', 'audit', 'issues.json');
const issues = JSON.parse(readFileSync(file, 'utf8'));
const add = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let next = issues.length + 1;
for (const a of add) {
  issues.push({
    id: `R-${String(next++).padStart(4, '0')}`,
    severity: a.severity,
    category: a.category,
    file: a.file,
    contentId: a.contentId,
    original: a.original,
    problem: a.problem,
    evidence: a.evidence || 'Read during the full track review.',
    proposedCorrection: a.fix || 'Applied in docs/audit/edits/.',
    sourceUrl: a.sourceUrl || '',
    sourceDate: new Date().toISOString().slice(0, 10),
    confidence: a.confidence || 'high',
    humanReview: Boolean(a.humanReview),
    status: a.status || 'fixed',
  });
}
writeFileSync(file, `${JSON.stringify(issues, null, 2)}\n`);
console.log(`issues: ${issues.length}`);
