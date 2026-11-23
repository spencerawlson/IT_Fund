# PR 4 — Dry-run migration report (rehearsal 1, fixture-based)

- **Content commit:** `6ef63defb50ac3c4eb5ffe2feae2cdfaa25db9ca` (content.json version 2)
- **Frozen map:** 3229 cards + 76 puzzles (closed, PR 2)
- **Database:** scratch only (`localhost:5432/itfund_pr4_rehearsal`) — read-only dry run, no writes

## What this rehearsal is — and is not

- This rehearsal runs against **fixture rows seeded in a scratch database**, not production data. No production dump was taken and no production data was read: the production-dump rehearsals (plan §8, rehearsals 1 and 2 against the latest / a fresh dump) are separate operations, each needing Spencer's own explicit approval (plan §6.5).
- The dry run **cannot show anonymous browsers' localStorage** (uncountable by design). That is why the client translation is always-on and `legacyId` is permanent: the server-side numbers here are a floor, not a ceiling. Nothing in this report means 'no legacy keys exist anywhere'.
- Dummy/reserved accounts **cannot be distinguished** in the users table (no marker column exists): all rows are counted together, not assumed apart.

## 1. Row counts

- Total `Progress` rows: **13**
- Rows with non-empty `state`: 13
- Rows with at least one legacy card key: 8
- Rows with zero legacy keys (already clean): 5
- Rows the migration would change: 10
- Rows already carrying `cardIdVersion: 2`: 2

## 2. Key inventory

- Distinct legacy card keys found: 3229
- Distinct legacy puzzle keys in `resume` plans: 1
- Keys found that are **not** in the frozen map (unmapped): 1 — py-basics-999
- Keys in the frozen map never seen in any row: 75 (expected: most of the catalogue — a fixture rehearsal only touches a few decks)

## 3. Collision check

- Two legacy ids mapping to one UUID: **0** (must be zero — hard failure if not)
- One legacy id mapping to two UUIDs: **0** (must be zero — hard failure if not)
- Rows already containing BOTH a legacy key and its UUID (§4.2 collision case): 3 — each resolves per the deterministic rules (higher box wins, tie -> later due, right/wrong/revSeen maxed), none discarded

## 4. Value integrity

- Rows verified: 13
- Value mismatches (non-collision `{ box, due, right, wrong }` not byte-identical after translation, or an untouched top-level key changed): **0** (must be zero)
- Untouched top-level keys (`lessons`, `bosses`, `labs`, `missions`, `xp`, `streak`, `badges`, `mastered`, `exams`, `exam`, `secplusExams`, `secplusExam`, `certExams`, `seenCelebrations`) changed: none

## 5. Size check

- Largest `state` JSON before translation: 192,938 bytes
- Largest `state` JSON after translation: 255,127 bytes
- Largest row: user `pr4-m` (3,229 cards)
- Cap (`MAX_BYTES`): 262,144 bytes
- Rows within 10% of the cap: 1 (within 10% of the cap)

## 6. Resume-plan inventory

- Rows with a non-null `resume`: 2
- Plan steps referencing legacy card ids: 1
- Plan steps referencing legacy puzzle ids: 1
- Plan steps referencing ids absent from the current catalogue (already-dangling — listed, preserved, not dropped): 1 — py-basics-999

## 7. Version distribution

- Rows already carrying `cardIdVersion: 2`: 2 (should be zero pre-migration in production; fixtures include already-migrated rows by design)
- Rows with unexpected top-level keys: ['customNote'] (these are the keys the merge catch-all must carry, §4.1)

## 8. Timing

- Wall-clock time for the full translation: 0.026 s for 13 rows (sizes the production maintenance window, if any — the migration runs at startup)

## Verdict

**Zero hard failures.** No unmapped keys unexplained (1 unmapped, all preserved by design), zero value mismatches, no row within 10% of the cap unexplained.
The 1 row(s) within 10% of the cap is the synthetic worst-case fixture row (`pr4-m`, all 3,229 catalogue cards in one row) — it exists to stress this check and still fits under the cap. A real learner row that close to the cap would need investigation before cutover.
