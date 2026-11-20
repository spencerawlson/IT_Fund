// PR 2 — draft cards are 6-element tuples [uuid, q, a, x, wrong, rev]
// (plan v2.2 §4). The checker must read the new shape and reject the old
// 4-element shape. Written BEFORE the implementation and observed failing
// on the pre-migration code (the 6-element fixture is mis-parsed, the
// 4-element fixture passes when it should fail).
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'content-audit', 'check-drafts.mjs');

function runDrafts(items) {
  const dir = mkdtempSync(join(tmpdir(), 'check-drafts-'));
  const file = join(dir, 'drafts.json');
  writeFileSync(file, JSON.stringify({ items }));
  try {
    return spawnSync(process.execPath, [SCRIPT, file], { cwd: ROOT, encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Synthetic question, unique across the bank; answer is not the longest
// option, explanation differs from the answer, no padded distractors.
const CLEAN_CARD_6 = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'A vendor technician needs temporary access to a single staging server during a planned maintenance window. Which access control best fits this need?',
  'Time-bound, least-privilege access for that one server.',
  'Access should match the task, the system, and the window — nothing broader and nothing longer.',
  [
    'Standing administrator access for all servers in the environment.',
    'Shared credentials for the whole support team to use as needed.',
    'Unrestricted network access for the duration of the window.',
  ],
  1,
];

describe('check-drafts.mjs — 6-element tuple shape (PR 2)', () => {
  it('a structurally clean 6-element draft passes with "no structural issues"', () => {
    const r = runDrafts([{ draftId: 'test-clean', domain: 2, card: CLEAN_CARD_6 }]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('no structural issues');
  });

  it('a 6-element draft whose distractor is identical to the answer fails Critical', () => {
    const bad = [...CLEAN_CARD_6];
    bad[4] = [CLEAN_CARD_6[2], CLEAN_CARD_6[4][1], CLEAN_CARD_6[4][2]];
    const r = runDrafts([{ draftId: 'test-dup', domain: 2, card: bad }]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('card-answer-is-distractor');
    expect(r.stdout).toContain('Critical');
  });

  it('a 4-element draft (old shape) fails instead of passing silently', () => {
    const old = [CLEAN_CARD_6[1], CLEAN_CARD_6[2], CLEAN_CARD_6[3], CLEAN_CARD_6[4]];
    const r = runDrafts([{ draftId: 'test-old', domain: 2, card: old }]);
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/6-element|six|tuple|uuid/i);
  });
});
