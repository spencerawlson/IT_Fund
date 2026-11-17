// Append learn sections to lessons (src/data/catalog/lessons/<track>.js).
//   node scripts/content-audit/add-sections.mjs sections.json
// sections.json: { "<deckId>": [{ "heading": "", "body": ["para", ...] }, ...] }
// Each section is appended at the end of the lesson's `learn: [` array.
// A heading the lesson already has is refused rather than duplicated.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const DIR = join(ROOT, 'src', 'data', 'catalog', 'lessons');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

export function addSections(spec) {
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
      const learn = lines.slice(start, end).findIndex((l) => l === '    learn: [');
      if (learn < 0) throw new Error(`${id}: no learn array`);
      let close = start + learn + 1;
      while (close < end && lines[close] !== '    ],') close += 1;
      if (close >= end) throw new Error(`${id}: learn array not closed`);
      const existing = lines.slice(start, close).join('\n');
      const block = [];
      for (const s of spec[id]) {
        if (!s.heading || !s.body?.length) throw new Error(`${id}: section needs heading and body`);
        if (existing.includes(`heading: ${q(s.heading)}`)) throw new Error(`${id}: already has "${s.heading}"`);
        block.push('      {', `        heading: ${q(s.heading)},`, '        body: [');
        for (const b of s.body) block.push(`          ${q(b)},`);
        block.push('        ],', '      },');
      }
      lines.splice(close, 0, ...block);
      pending.delete(id);
      touched = true;
    }
    if (touched) writeFileSync(p, lines.join('\n'));
  }
  if (pending.size) throw new Error(`Lessons not found: ${[...pending].join(', ')}`);
  return Object.keys(spec).length;
}

if (process.argv[1]?.endsWith('add-sections.mjs')) {
  console.log(`sections added to ${addSections(JSON.parse(readFileSync(process.argv[2], 'utf8')))} lessons`);
}
