// Assign stable UUID v4 ids to every card and puzzle in the authoring
// sources (src/data/academy/*.js + interactive.js) and write the frozen
// legacy map scripts/legacy-card-ids.json (plan v2.2 §4, PR 2).
//
// Canonical tuple shape after this script runs:
//   [uuid, question, answer, explanation, wrongOptions, revision]
// (rev 6th, default 1). Puzzles gain `uuid` + `rev: 1` properties.
//
// Rules (hard failures — the script exits 1 and writes nothing):
// - The same UUID on two cards/puzzles is refused.
// - One legacy id mapping to two UUIDs (the map disagrees with the file)
//   is refused.
// - A tuple with any element count other than 4 (unassigned) or 6
//   (assigned) is refused.
//
// Map rules:
// - legacyId is the pre-migration positional id: <deckId>-<index> for cards,
//   <deckId>-p<index> for puzzles.
// - If the map already has a UUID for a legacy id, that UUID is REUSED
//   (never invent a second one for the same position).
// - The map is CLOSED once created: it never grows. A card with no map
//   entry is a NEW card — it keeps its UUID and gets NO legacyId.
// - If no map file exists yet, it is built from the current positions
//   (first run / recovery after a lost map).
// - A second run with everything assigned and the map matching is a no-op:
//   nothing is written, exit 0.
//
// The script is purely text-based (acorn AST + offset edits): it rewrites
// only the tuple brackets / puzzle braces, preserving all other formatting.
//
// Usage: node scripts/assign-card-ids.mjs [--root <dir>]
//   --root defaults to the repo root (two levels up from this script).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as acorn from 'acorn';

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TIER_ORDER = ['beginner', 'intermediate', 'advanced'];

// Same track list as scripts/export-content.mjs (the exporter is the only
// other reader of these files). The census test guards this list: the map
// must hold exactly 3,229 cards + 76 puzzles.
export const TRACK_MODULES = [
  'src/data/academy/python.js',
  'src/data/academy/network.js',
  'src/data/academy/routing.js',
  'src/data/academy/security.js',
  'src/data/academy/cyber.js',
  'src/data/academy/cloud.js',
  'src/data/academy/aws-saa.js',
  'src/data/academy/cysa.js',
  'src/data/academy/aws-security.js',
  'src/data/academy/ai.js',
  'src/data/academy/cissp.js',
  'src/data/academy/linux.js',
  'src/data/academy/terraform.js',
  'src/data/academy/cpp.js',
  'src/data/academy/go.js',
  'src/data/academy/rust.js',
  'src/data/academy/sql.js',
  'src/data/academy/docker.js',
  'src/data/academy/kubernetes.js',
  'src/data/academy/git.js',
  'src/data/academy/intro-it.js',
];
export const INTERACTIVE_MODULE = 'src/data/academy/interactive.js';
export const MAP_REL_PATH = join('scripts', 'legacy-card-ids.json');

function parseModule(src, file) {
  try {
    return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (err) {
    throw new Error(`assign-card-ids: cannot parse ${file}: ${err.message}`);
  }
}

function propName(prop) {
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal') return String(prop.key.value);
  return null;
}

function propOf(obj, name) {
  return (obj.properties || []).find((p) => p.type === 'Property' && propName(p) === name) || null;
}

function stringValue(node) {
  return node && node.type === 'Literal' && typeof node.value === 'string' ? node.value : null;
}

/** Decks of one track file, in exporter order (TIER_ORDER, then source order). */
function decksOfTrack(ast, file) {
  const def = (ast.body || []).find((n) => n.type === 'ExportDefaultDeclaration');
  if (!def || def.declaration.type !== 'ObjectExpression') {
    throw new Error(`assign-card-ids: ${file} has no default-export object`);
  }
  const tiersProp = propOf(def.declaration, 'tiers');
  if (!tiersProp || tiersProp.value.type !== 'ObjectExpression') {
    throw new Error(`assign-card-ids: ${file} has no tiers object`);
  }
  const decks = [];
  for (const tierProp of tiersProp.value.properties) {
    const tierId = propName(tierProp);
    if (!TIER_ORDER.includes(tierId) || tierProp.value.type !== 'ArrayExpression') continue;
    for (const deckNode of tierProp.value.elements || []) {
      if (!deckNode || deckNode.type !== 'ObjectExpression') continue;
      const id = stringValue(propOf(deckNode, 'id')?.value);
      const cardsProp = propOf(deckNode, 'cards');
      if (!id || !cardsProp || cardsProp.value.type !== 'ArrayExpression') continue;
      decks.push({ tierId, tierRank: TIER_ORDER.indexOf(tierId), deckId: id, cardsNode: cardsProp.value });
    }
  }
  decks.sort((a, b) => a.tierRank - b.tierRank);
  return decks;
}

/** Puzzle arrays of interactive.js: deckId -> [puzzle object nodes]. */
function puzzlesOfInteractive(ast, file) {
  const def = (ast.body || []).find((n) => n.type === 'ExportDefaultDeclaration');
  if (!def || def.declaration.type !== 'ObjectExpression') {
    throw new Error(`assign-card-ids: ${file} has no default-export object`);
  }
  const out = new Map();
  for (const p of def.declaration.properties || []) {
    if (p.type !== 'Property') continue;
    const deckId = propName(p);
    if (!deckId || p.value.type !== 'ArrayExpression') continue;
    out.set(deckId, (p.value.elements || []).filter((el) => el && el.type === 'ObjectExpression'));
  }
  return out;
}

function loadMap(mapPath) {
  if (!existsSync(mapPath)) return null;
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  if (!Array.isArray(map.cards) || !Array.isArray(map.puzzles)) {
    throw new Error(`assign-card-ids: ${mapPath} is not a {cards, puzzles} map`);
  }
  const byLegacy = new Map();
  const byUuid = new Map();
  for (const entries of [map.cards, map.puzzles]) {
    for (const e of entries) {
      if (!UUID_V4.test(e.id || '')) throw new Error(`assign-card-ids: map entry ${e.legacyId} has no UUID v4 id`);
      if (byUuid.has(e.id)) throw new Error(`assign-card-ids: duplicate uuid ${e.id} in the map`);
      if (byLegacy.has(e.legacyId)) throw new Error(`assign-card-ids: duplicate legacy id ${e.legacyId} in the map`);
      byUuid.set(e.id, e);
      byLegacy.set(e.legacyId, e);
    }
  }
  return { ...map, byLegacy, byUuid };
}

/**
 * Assign UUIDs under `root`. `trackModules` / `interactiveModule` are paths
 * relative to root (defaults: the real 21 tracks + interactive.js).
 * Returns { cardsAssigned, puzzlesAssigned, cardsTotal, puzzlesTotal, mapPath }.
 * Throws on any hard failure; on failure NOTHING is written.
 */
export async function assignCardIds({ root, trackModules = TRACK_MODULES, interactiveModule = INTERACTIVE_MODULE }) {
  const mapPath = join(root, MAP_REL_PATH);
  const existing = loadMap(mapPath);
  const mapByLegacy = existing?.byLegacy ?? new Map();
  const uuidOwner = new Map(); // uuid -> "card <legacyId>" | "puzzle <legacyId>"

  // Claim a uuid for a legacy id, enforcing the two hard-failure rules.
  function claim(kind, legacyId, uuid) {
    if (!UUID_V4.test(uuid)) throw new Error(`assign-card-ids: ${kind} ${legacyId} has no UUID v4 id (${uuid})`);
    const prev = uuidOwner.get(uuid);
    if (prev) throw new Error(`assign-card-ids: duplicate uuid ${uuid} (${prev} and ${kind} ${legacyId})`);
    uuidOwner.set(uuid, `${kind} ${legacyId}`);
    const mapped = mapByLegacy.get(legacyId);
    if (mapped && mapped.id !== uuid) {
      throw new Error(
        `assign-card-ids: legacy id ${legacyId} maps to two UUIDs: ${mapped.id} (map) vs ${uuid} (file)`,
      );
    }
    return mapped?.id ?? uuid;
  }

  const newMapCards = [];
  const newMapPuzzles = [];
  const fileEdits = new Map(); // file path -> [{ start, end, text }]

  function edit(file, start, end, text) {
    if (!fileEdits.has(file)) fileEdits.set(file, []);
    fileEdits.get(file).push({ start, end, text });
  }

  let cardsTotal = 0;
  let puzzlesTotal = 0;
  let cardsAssigned = 0;
  let puzzlesAssigned = 0;

  // --- Cards ---------------------------------------------------------------
  const deckOrder = []; // { deckId } in exporter order, for the puzzle pass
  for (const rel of trackModules) {
    const file = join(root, rel);
    const src = readFileSync(file, 'utf8');
    const decks = decksOfTrack(parseModule(src, rel), rel);
    for (const deck of decks) {
      deckOrder.push(deck.deckId);
      const tuples = (deck.cardsNode.elements || []).filter((el) => el);
      tuples.forEach((tuple, i) => {
        cardsTotal += 1;
        const legacyId = `${deck.deckId}-${i}`;
        if (tuple.type !== 'ArrayExpression') {
          throw new Error(`assign-card-ids: ${rel} deck ${deck.deckId} card ${i} is not a tuple array`);
        }
        const els = tuple.elements || [];
        if (els.length === 6) {
          const uuid = stringValue(els[0]);
          const rev = els[5]?.type === 'Literal' && typeof els[5].value === 'number' ? els[5].value : null;
          if (!uuid || rev === null) {
            throw new Error(`assign-card-ids: ${rel} deck ${deck.deckId} card ${i} has a malformed 6-element tuple`);
          }
          claim('card', legacyId, uuid);
          if (!existing) newMapCards.push({ legacyId, id: uuid, deckId: deck.deckId, rev });
        } else if (els.length === 4) {
          const mapped = mapByLegacy.get(legacyId);
          const uuid = mapped?.id ?? randomUUID();
          claim('card', legacyId, uuid);
          edit(file, tuple.start + 1, tuple.start + 1, `'${uuid}', `);
          const last = els[els.length - 1];
          const beforeClose = src.slice(last.end, tuple.end - 1);
          edit(file, tuple.end - 1, tuple.end - 1, beforeClose.includes(',') ? ' 1' : ', 1');
          cardsAssigned += 1;
          if (!existing && !mapped) newMapCards.push({ legacyId, id: uuid, deckId: deck.deckId, rev: 1 });
        } else {
          throw new Error(
            `assign-card-ids: ${rel} deck ${deck.deckId} card ${i} has ${els.length} elements (expected 4 or 6)`,
          );
        }
      });
    }
  }

  // --- Puzzles -------------------------------------------------------------
  const interactiveFile = join(root, interactiveModule);
  const interactiveSrc = readFileSync(interactiveFile, 'utf8');
  const puzzlesByDeck = puzzlesOfInteractive(parseModule(interactiveSrc, interactiveModule), interactiveModule);
  for (const deckId of deckOrder) {
    const puzzles = puzzlesByDeck.get(deckId) || [];
    puzzles.forEach((puzzle, i) => {
      puzzlesTotal += 1;
      const legacyId = `${deckId}-p${i}`;
      const uuidProp = propOf(puzzle, 'uuid');
      const revProp = propOf(puzzle, 'rev');
      const uuidInFile = uuidProp ? stringValue(uuidProp.value) : null;
      const revInFile = revProp?.value.type === 'Literal' && typeof revProp.value.value === 'number'
        ? revProp.value.value
        : null;
      if (uuidInFile && revInFile !== null) {
        claim('puzzle', legacyId, uuidInFile);
        if (!existing) newMapPuzzles.push({ legacyId, id: uuidInFile, deckId, rev: revInFile });
        return;
      }
      const mapped = mapByLegacy.get(legacyId);
      const uuid = uuidInFile ?? mapped?.id ?? randomUUID();
      claim('puzzle', legacyId, uuid);
      const parts = [];
      if (!uuidInFile) parts.push(`uuid: '${uuid}'`);
      if (revInFile === null) parts.push('rev: 1');
      const insert = puzzle.properties.length ? ` ${parts.join(', ')},` : ` ${parts.join(', ')}`;
      edit(interactiveFile, puzzle.start + 1, puzzle.start + 1, insert);
      puzzlesAssigned += 1;
      if (!existing && !mapped) newMapPuzzles.push({ legacyId, id: uuid, deckId, rev: revInFile ?? 1 });
    });
  }

  // Puzzles in decks no track file names (defensive: the census test would
  // catch a real miss, but never silently drop a puzzle from the map).
  for (const [deckId, puzzles] of puzzlesByDeck) {
    if (deckOrder.includes(deckId)) continue;
    puzzles.forEach((puzzle, i) => {
      puzzlesTotal += 1;
      const legacyId = `${deckId}-p${i}`;
      const uuidProp = propOf(puzzle, 'uuid');
      const uuidInFile = uuidProp ? stringValue(uuidProp.value) : null;
      if (uuidInFile) {
        claim('puzzle', legacyId, uuidInFile);
        if (!existing) newMapPuzzles.push({ legacyId, id: uuidInFile, deckId, rev: 1 });
        return;
      }
      const mapped = mapByLegacy.get(legacyId);
      const uuid = mapped?.id ?? randomUUID();
      claim('puzzle', legacyId, uuid);
      edit(interactiveFile, puzzle.start + 1, puzzle.start + 1, ` uuid: '${uuid}', rev: 1,`);
      puzzlesAssigned += 1;
      if (!existing && !mapped) newMapPuzzles.push({ legacyId, id: uuid, deckId, rev: 1 });
    });
  }

  // --- Write (only after every validation passed) --------------------------
  for (const [file, edits] of fileEdits) {
    const src = readFileSync(file, 'utf8');
    const sorted = [...edits].sort((a, b) => b.start - a.start);
    let out = src;
    for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    writeFileSync(file, out, 'utf8');
  }
  if (!existing) {
    mkdirSync(dirname(mapPath), { recursive: true });
    writeFileSync(
      mapPath,
      `${JSON.stringify(
        { version: 1, generatedBy: 'scripts/assign-card-ids.mjs', cards: newMapCards, puzzles: newMapPuzzles },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
  return { cardsAssigned, puzzlesAssigned, cardsTotal, puzzlesTotal, mapPath };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const rootIdx = process.argv.indexOf('--root');
  const root = rootIdx >= 0 && process.argv[rootIdx + 1]
    ? process.argv[rootIdx + 1]
    : join(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const r = await assignCardIds({ root });
    console.log(
      `assigned ${r.cardsAssigned} card UUIDs + ${r.puzzlesAssigned} puzzle UUIDs ` +
        `(${r.cardsTotal} cards, ${r.puzzlesTotal} puzzles total)`,
    );
    console.log(r.cardsAssigned + r.puzzlesAssigned === 0
      ? 'already assigned: map matches the files, nothing written.'
      : `map: ${r.mapPath}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
