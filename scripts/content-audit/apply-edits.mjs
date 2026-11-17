// Apply reviewed card edits to the authoring sources IN PLACE, by deck id and
// card index, so card ids (`<deckId>-<index>`) and learner progress never move.
//
//   node scripts/content-audit/apply-edits.mjs edits.json
//
// edits.json: { "<deckId>": { "<index>": { "q"?: "", "a"?: "", "x"?: "", "wrong"?: ["","",""] } } }
// Only the listed fields change. Every card must be a one-line array literal
// (the house format); anything else is refused rather than guessed at.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const DIR = join(ROOT, 'src', 'data', 'academy');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
export const serialise = (card) => {
  const [qq, a, x, wrong] = card;
  const parts = [q(qq), q(a)];
  if (x !== undefined || wrong) parts.push(q(x ?? ''));
  if (wrong) parts.push(`[${wrong.map(q).join(', ')}]`);
  return `[${parts.join(', ')}]`;
};

/** Locate every deck's card lines in a track source: { deckId: [lineIndex,...] }. */
export function cardLines(lines) {
  const out = {};
  let deck = null;
  let inCards = false;
  for (let i = 0; i < lines.length; i++) {
    const id = lines[i].match(/^\s*id: '([^']+)',\s*$/);
    if (id) { deck = id[1]; inCards = false; continue; }
    if (deck && /^\s*cards: \[\s*$/.test(lines[i])) { inCards = true; out[deck] = []; continue; }
    if (inCards && /^\s*\],?\s*$/.test(lines[i])) { inCards = false; continue; }
    if (inCards && /^\s*\[/.test(lines[i])) out[deck].push(i);
  }
  return out;
}

export function applyEdits(edits) {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.js') && !f.includes('.test.'));
  const pending = new Set(Object.keys(edits));
  let changed = 0;
  for (const f of files) {
    const p = join(DIR, f);
    const lines = readFileSync(p, 'utf8').split('\n');
    const map = cardLines(lines);
    let touched = false;
    for (const deckId of Object.keys(edits)) {
      if (!map[deckId]) continue;
      pending.delete(deckId);
      for (const [idx, patch] of Object.entries(edits[deckId])) {
        const li = map[deckId][Number(idx)];
        if (li === undefined) throw new Error(`${deckId}-${idx}: no such card`);
        const raw = lines[li];
        const indent = raw.match(/^\s*/)[0];
        const body = raw.trim().replace(/,$/, '');
        let card;
        try { card = Function(`"use strict"; return (${body});`)(); } catch (e) { throw new Error(`${deckId}-${idx}: not a one-line card (${e.message})`); }
        if (!Array.isArray(card) || card.length < 2) throw new Error(`${deckId}-${idx}: unexpected card shape`);
        if (patch.wrong && patch.wrong.length !== 3) throw new Error(`${deckId}-${idx}: wrong must have 3 options`);
        const next = [patch.q ?? card[0], patch.a ?? card[1], patch.x ?? card[2], patch.wrong ?? card[3]];
        lines[li] = `${indent}${serialise(next)},`;
        touched = true;
        changed += 1;
      }
    }
    if (touched) writeFileSync(p, lines.join('\n'));
  }
  if (pending.size) throw new Error(`Decks not found: ${[...pending].join(', ')}`);
  return changed;
}

if (process.argv[1]?.endsWith('apply-edits.mjs')) {
  const edits = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(`edited ${applyEdits(edits)} cards`);
}
