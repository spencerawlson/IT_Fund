// Insert worked examples into lesson bodies (src/data/catalog/lessons/<track>.js).
//   node scripts/content-audit/add-examples.mjs examples.json
// examples.json: { "<deckId>": [{ "title": "", "code": "", "explanation": "" }, ...] }
// The block is inserted just before the lesson's `cheatSheet:` (or appended
// before the lesson's closing brace). Lessons that already have examples are
// refused rather than overwritten.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const DIR = join(ROOT, 'src', 'data', 'catalog', 'lessons');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

export function addExamples(spec) {
  const pending = new Set(Object.keys(spec));
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js'))) {
    const p = join(DIR, f);
    const lines = readFileSync(p, 'utf8').split('\n');
    let touched = false;
    for (const id of [...pending]) {
      const start = lines.findIndex((l) => l === `  '${id}': {` || l === `  ${id}: {`);
      if (start < 0) continue;
      let end = start + 1;
      while (end < lines.length && lines[end] !== '  },') end += 1;
      if (lines.slice(start, end).some((l) => /^ {4}examples: \[/.test(l))) throw new Error(`${id} already has examples`);
      let at = lines.slice(start, end).findIndex((l) => /^ {4}cheatSheet: \[/.test(l));
      at = at < 0 ? end : start + at;
      const block = ['    examples: ['];
      for (const ex of spec[id]) {
        if (!ex.title || !ex.code) throw new Error(`${id}: example needs title and code`);
        block.push('      {', `        title: ${q(ex.title)},`, `        code: ${q(ex.code)},`);
        if (ex.explanation) block.push(`        explanation: ${q(ex.explanation)},`);
        block.push('      },');
      }
      block.push('    ],');
      lines.splice(at, 0, ...block);
      pending.delete(id);
      touched = true;
    }
    if (touched) writeFileSync(p, lines.join('\n'));
  }
  if (pending.size) throw new Error(`Lessons not found: ${[...pending].join(', ')}`);
  return Object.keys(spec).length;
}

if (process.argv[1]?.endsWith('add-examples.mjs')) {
  console.log(`examples added to ${addExamples(JSON.parse(readFileSync(process.argv[2], 'utf8')))} lessons`);
}
