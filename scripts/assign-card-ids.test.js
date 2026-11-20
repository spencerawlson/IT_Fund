// PR 2 — assignment script guards (plan v2.2 §4, test area #10).
// scripts/assign-card-ids.mjs assigns UUID v4 ids to every card and puzzle,
// writes the frozen map scripts/legacy-card-ids.json, and hard-fails on a
// duplicate UUID or on one legacy id mapping to two UUIDs. Written BEFORE
// the implementation and observed failing on the pre-migration code (the
// module does not exist yet, so this file fails to load until it lands).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assignCardIds } from './assign-card-ids.mjs';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TRACK_MODULES = ['src/data/academy/fixture-track.js'];
const INTERACTIVE_MODULE = 'src/data/academy/interactive.js';

function fixtureTrack(cards) {
  // Single-quoted, repo-style tuples (the script inserts 'uuid', after `[`).
  const sq = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
  const value = (el) => (Array.isArray(el) ? `[${el.map(sq).join(', ')}]` : typeof el === 'number' ? String(el) : sq(el));
  const tuples = cards.map((t) => `[${t.map(value).join(', ')}]`).join(',\n        ');
  return `export default {
  id: 'fixture-track',
  title: 'Fixture track',
  tiers: {
    beginner: [{ id: 'fixture-a', title: 'Fixture A', sources: [], cards: [
        ${tuples},
      ] }],
  },
};
`;
}

function fixtureInteractive(puzzles) {
  return `export default { 'fixture-a': ${JSON.stringify(puzzles)} };\n`;
}

function makeRoot({ cards, puzzles }) {
  const root = mkdtempSync(join(tmpdir(), 'assign-ids-'));
  mkdirSync(join(root, 'src', 'data', 'academy'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), fixtureTrack(cards));
  writeFileSync(join(root, 'src', 'data', 'academy', 'interactive.js'), fixtureInteractive(puzzles));
  return root;
}

const FOUR = [
  ['Q one', 'A one', 'X one', ['w1', 'w2', 'w3']],
  ['Q two', 'A two', 'X two', ['w4', 'w5', 'w6']],
];
const ONE_PUZZLE = [{ type: 'numeric', prompt: 'Fixture puzzle?', answer: 7, x: 'Because seven.' }];

describe('assign-card-ids.mjs', () => {
  it('assigns UUIDs to every card and puzzle and writes the frozen map', async () => {
    const root = makeRoot({ cards: FOUR, puzzles: ONE_PUZZLE });
    try {
      const result = await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      expect(result.cardsAssigned).toBe(2);
      expect(result.puzzlesAssigned).toBe(1);
      const map = JSON.parse(readFileSync(join(root, 'scripts', 'legacy-card-ids.json'), 'utf8'));
      expect(map.cards).toHaveLength(2);
      expect(map.puzzles).toHaveLength(1);
      expect(map.cards[0]).toEqual({ legacyId: 'fixture-a-0', id: expect.stringMatching(UUID_V4), deckId: 'fixture-a', rev: 1 });
      expect(map.cards[1].legacyId).toBe('fixture-a-1');
      expect(map.puzzles[0]).toEqual({ legacyId: 'fixture-a-p0', id: expect.stringMatching(UUID_V4), deckId: 'fixture-a', rev: 1 });
      const trackText = readFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), 'utf8');
      expect(trackText).toContain(`'${map.cards[0].id}', 'Q one'`);
      expect(trackText).toContain(`'${map.cards[1].id}', 'Q two'`);
      expect(trackText).toContain(', 1]');
      const interactiveText = readFileSync(join(root, 'src', 'data', 'academy', 'interactive.js'), 'utf8');
      expect(interactiveText).toContain(`uuid: '${map.puzzles[0].id}'`);
      expect(interactiveText).toContain('rev: 1');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a second run is a no-op: files byte-identical, map unchanged', async () => {
    const root = makeRoot({ cards: FOUR, puzzles: ONE_PUZZLE });
    try {
      await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      const before = {
        track: readFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), 'utf8'),
        interactive: readFileSync(join(root, 'src', 'data', 'academy', 'interactive.js'), 'utf8'),
        map: readFileSync(join(root, 'scripts', 'legacy-card-ids.json'), 'utf8'),
      };
      const result = await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      expect(result.cardsAssigned).toBe(0);
      expect(result.puzzlesAssigned).toBe(0);
      expect(readFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), 'utf8')).toBe(before.track);
      expect(readFileSync(join(root, 'src', 'data', 'academy', 'interactive.js'), 'utf8')).toBe(before.interactive);
      expect(readFileSync(join(root, 'scripts', 'legacy-card-ids.json'), 'utf8')).toBe(before.map);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hard-fails when the same UUID appears on two cards', async () => {
    const dup = '55555555-5555-4555-8555-555555555555';
    const cards = [
      [dup, 'Q one', 'A one', 'X one', ['w1', 'w2', 'w3'], 1],
      [dup, 'Q two', 'A two', 'X two', ['w4', 'w5', 'w6'], 1],
    ];
    const root = makeRoot({ cards, puzzles: [] });
    try {
      await expect(assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE }))
        .rejects.toThrow(/duplicate uuid/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hard-fails when one legacy id maps to two UUIDs (map disagrees with the file)', async () => {
    const root = makeRoot({ cards: FOUR, puzzles: [] });
    try {
      await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      const map = JSON.parse(readFileSync(join(root, 'scripts', 'legacy-card-ids.json'), 'utf8'));
      // Tamper: give the first card a DIFFERENT uuid than the map records.
      const other = '66666666-6666-4666-8666-666666666666';
      const trackText = readFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), 'utf8');
      writeFileSync(
        join(root, 'src', 'data', 'academy', 'fixture-track.js'),
        trackText.replace(map.cards[0].id, other),
      );
      await expect(assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE }))
        .rejects.toThrow(/legacy.*two|two.*uuid|mismatch/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reuses the map UUID for an unassigned position instead of inventing a new one', async () => {
    const root = makeRoot({ cards: FOUR, puzzles: [] });
    try {
      const first = await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      const map = JSON.parse(readFileSync(join(root, 'scripts', 'legacy-card-ids.json'), 'utf8'));
      expect(first.cardsAssigned).toBe(2);
      // Strip the uuids back to 4-element tuples, keep the map: the script
      // must recover the SAME uuids from the map, not assign fresh ones.
      const stripped = fixtureTrack(FOUR);
      writeFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), stripped);
      const second = await assignCardIds({ root, trackModules: TRACK_MODULES, interactiveModule: INTERACTIVE_MODULE });
      expect(second.cardsAssigned).toBe(2);
      const trackText = readFileSync(join(root, 'src', 'data', 'academy', 'fixture-track.js'), 'utf8');
      expect(trackText).toContain(`'${map.cards[0].id}', 'Q one'`);
      expect(trackText).toContain(`'${map.cards[1].id}', 'Q two'`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
