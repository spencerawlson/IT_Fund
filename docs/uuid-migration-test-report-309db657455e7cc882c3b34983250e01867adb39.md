# UUID migration — PR 3 Compatibility Layer: test report

- **PR:** PR 3 (Compatibility Layer), branch `pr3-compatibility-layer`
- **Code commit:** `309db657455e7cc882c3b34983250e01867adb39` (16 files, +1,636 / −32 vs main)
- **Base:** main `0f153d206cb5030fca99eae3132c77779c165377` (PR #166 merged, verified via API before building and again before pushing)
- **Date:** 2026-11-20 (EST)
- **Scope:** compatibility-contract.md in full. No Alembic, no data migration, no dry run, no production operation, no production data touched.
- **Decision in force:** dual-keyed GET is YES (Spencer, 2026-11-20 ~16:53 EST). GET without the `X-Card-Id-Version` marker returns BOTH keys per card (UUID + legacy, same values); GET with the marker returns UUID-only. The R16 badge side effect (an old client may earn the century badge early; cosmetic, never revoked, no progress lost) is ACCEPTED.

## Tests-first evidence (observed failing on the old code, before any fix)

| Test | Observed failure on old code |
|---|---|
| `merge.test.js` — revSeen max across a merge | FAILED: expected 5, got 2 (revSeen rode with the higher-box record) |
| `src/api/progress.test.js` — marker on GET / PUT / 409 | 3/3 FAILED: `X-Card-Id-Version` header was `undefined` |
| `migrateCardIds.test.js` (17 tests) | Suite failed to load: module did not exist |
| `serverAdapter.test.js` — PR 3 describe (7 tests) | Suite failed to load: `migrateCardIds` import did not exist |
| `academy.test.js` — returning-learner describe (2 tests) | Suite failed to load: `migratingAdapter` did not exist |
| `backend/test_progress.py` — 8 new tests | 5 FAILED (PUT translation ×3, dual-keyed GET, marker GET). 2 passed vacuously on the old opaque store (unmapped keys preserved; no legacy key invented for new cards) — they are guards that must keep passing, not failing-first evidence. The 8th (PUT combine) was not selected by the pre-fix filter run. |

## Per-suite results (post-fix)

| Suite | Result |
|---|---|
| Frontend vitest (full) | **1,260 passed, 0 failed, 4 skipped** — 132 files (131 passed, 1 skipped: the gated `compatMatrix.test.js`, see below). Baseline on main 0f153d20: 1,227 passed / 0 failed (128 files). Net new: +33 tests (+3 files); the merge revSeen test replaced the PR 2 ride-along test 1-for-1. |
| Backend pytest (full) | **1,207 passed, 0 failed, 1 skipped** (40.86 s). Baseline on main: 1,199 passed / 1 skipped. Net new: +8 tests in `test_progress.py` (18 in the file now). |
| Live compatibility matrix (`compatMatrix.test.js`, gated) | **4/4 passed** against live scratch backends (see below). Skipped in the full run (no env vars set) — that is the 4 skipped frontend tests. |
| ESLint (`node ./node_modules/eslint/bin/eslint.js . --quiet`) | Clean (exit 0). One error found and fixed during the run: unused import `clearLessonProgress` in the new `LessonPlayer.plan.test.jsx`. |
| Vite build (`node ./node_modules/vite/bin/vite.js build`) | Passes (17.56 s). Pre-existing chunk-size warning (>500 kB chunks) unchanged. |
| PR 1 suites (regression) | 33/33 pass (inside the full frontend run). |
| PR 2 suites (regression) | 24 new tests pass (inside the full frontend run). |
| §18 click-through (`LessonPlayer.plan.test.jsx`) | 4/4 pass at the logic level with exported `planLesson` / `toStep` and real bundle data: fresh plan resolves every step with deckId on every non-puzzle step; saved mid-lesson plan reloads and resumes at the saved index; retry step resolves with the `-review` suffix; a legacy saved plan loads translated and resolves. No jsdom / testing-library in devDeps, so no React render — reported honestly. |

## Live compatibility matrix (areas #13, #14, #5, #3)

Two scratch uvicorn servers on file SQLite (never production): NEW = this PR's code on port 8101, OLD = pre-PR-3 code from main 0f153d20 on port 8102. Users seeded with the backend's own `auth.identity` / `auth.sessions` helpers. Every assertion checks the STATE, not just the 200.

| Check | Result |
|---|---|
| #13 old client / new backend | PASS. Legacy PUT (no marker, first load, no prior new-client interaction) → stored UUID-only; unmarked GET dual-keyed with identical values under both keys; marked GET UUID-only; version stayed 1 (display never wrote). |
| #14 new client / old backend | PASS. UUID PUT (marker sent, old backend ignores it) → both GETs return the state verbatim; marker is inert pre-PR-3. |
| #5 two-device live | PASS. New device PUTs UUID state; old device GETs dual-keyed, merges with its own legacy local state (real `mergeProgress`), PUTs the merged state; new device re-reads exactly one UUID entry per card, combined per §4.2; old device re-reads dual-keyed combined state. |
| #3 returning learner live | PASS. Six-month-old legacy blob (positional ids, no `cardIdVersion`, mid-lesson resume, exam history, missions) PUT by an unmarked client → marked GET shows `cardIdVersion: 2`, UUID-only cards with byte-identical values, translated resume (plan ids + deckIds, tries re-suffixed), exams/missions/`seenCelebrations`/XP intact, version 1. |

## What PR 3 implements

- `src/lib/progress/migrateCardIds.js` (new, pure): `translateState` + `buildCardIdMap` (3,229 cards + 76 puzzles from the public bundle). Translate first, then `mergeCards` (§4.2: higher box, tie → later due, right/wrong/revSeen maxed, order-independent, idempotent). Resume plan ids, tries/retried keys (`-review` / `-warm`), deckId on every non-puzzle plan step, `cardIdVersion = 2`. Unknown keys preserved, never dropped; unmapped legacy ids reported.
- `src/lib/progress/migratingAdapter.js` (new): translates on `load()` and `save()`; write-back to storage on first load, listeners notified exactly once, no loop, no repeat notification; write-back never pushes by itself.
- `src/lib/progress/serverAdapter.js`: local base goes through the migrating adapter; 409 path, `sync()` and `flush()` push `local.load()` (the stored, translated state), never the in-memory merge — so a mixed-scheme merge against an old backend can never be pushed.
- `src/lib/progress/merge.js`: `mergeCards` exported; `revSeen` is now a high-water mark (max across the merge). The PR 2 ride-along test was updated to the max rule (same precedent as PR 2 updating two pre-existing assertions).
- `src/components/academy/lesson/LessonPlayer.jsx`: `planLesson` stores `deckId` in every plan step (warm-up, question, retry push in `onComplete`); `savedStubs` uses `i.deckId` directly; the `replace(/-\d+$/, '')` parse is DELETED — `grep` shows zero hits in `src/`. `planLesson` / `toStep` exported for the click-through test.
- `src/api/progress.js`: new client sends `X-Card-Id-Version: 2` on progress GET and PUT.
- `backend/progress_ids.py` (new, pure): mirrors the JS translator (`translate_state`, `dual_key_state`, `build_id_map` from `content.json`) plus the `_combine_records` §4.2 rule.
- `backend/progress_api.py`: PUT translates legacy keys through the frozen map before storing (both clients) — the stored row is always UUID-only. GET with the marker returns the stored state as-is; GET without the marker returns dual-keyed state (stored row never dual-keyed). No schema change; If-Match / 409 / 428 / 413 / rate-limit untouched; 409 returns the stored row unchanged. If `content.json` cannot be read, normalisation degrades to a no-op (opaque storage, as before PR 3) with a warning log, rather than taking progress down with content.

## Skipped tests

| Test | Reason | Owner |
|---|---|---|
| `backend/test_enrollment.py::test_simultaneous_checkouts_never_oversell_on_postgres` | Needs `ENROLLMENT_PG_URL`; runs in CI's migrations job | Spencer |
| `src/lib/progress/compatMatrix.test.js` (4 tests) in the full run | Gated on `PR3_LIVE_NEW` / `PR3_LIVE_OLD` / cookie files; run separately against live scratch backends — 4/4 passed (see matrix above) | — |

## Unresolved issues

| ID | Severity | Issue | Owner |
|---|---|---|---|
| U-PR3-1 | Low | Public bundle size: main entry chunk `index-*.js` measured on a fresh build of main 0f153d20 vs this PR — raw 1,440,909 → 1,443,955 (+3,046 bytes); gzipped 429,133 → 430,222 (+1,089 bytes). Informational only. | Spencer |
| U-PR3-2 | Low | Report home still undecided (plan v2.2 §12 open point 3). Plan default used, as in PR 1/PR 2: report committed in branch + summarised in PR body. | Spencer |
| U-PR3-3 | Medium | 3 backend labs tests fail in isolation (`labs/test_open_access_smoke.py` 1, `labs/test_session_limits.py` 2) but pass in the full suite — pre-existing test-order dependence, proven on pristine main in PR 1, re-verified in the full run only for PR 3. Out of PR 3 scope. | Spencer |
| U-PR3-4 | Medium | Gate 0 production backend target unverified — blocks PR 4, not PR 3. `vercel.json` defines a backend service behind `/api` while `src/api/progress.js` says production is `api.road2cissp.com` via `VITE_API_BASE_URL`; cannot be verified from code. | Spencer |
| U-PR3-5 | Low | Dual-keyed GET covers cards only (contract §3, explicit). An old client loading a resume saved by the new client (UUID plan steps) fails to restore it and starts a fresh lesson session; graded progress is intact. Changing this needs Spencer's call. | Spencer |

## Verified edge cases (handled, not open)

- A real UUID can end in an all-digit final segment (found in the frozen map: `b55b04fd-c6ce-4b91-9d2c-504765908873`). The translator classifies legacy-shaped keys by UUID-shape-first, so such UUIDs are never mistaken for positional ids; a bare `/-\\d+$/` check would misclassify them (the first version of the map test did exactly that and was corrected to assert UUID v4 shape).
- `translateState` never mutates its input; translating its own output is a no-op (`translated: false`).
- The migrating adapter's write-back does not loop: a second `load()` finds nothing to translate and notifies no one.

## Deferred (not PR 3 scope)

- Spencer's validation test #3, two-device check #5, cross-version #13/#14, §18 click-through: DONE in this PR (see matrix + click-through above) — nothing deferred from PR 2 remains.
- PR 4 (Migration and Cutover): data migration, production backend identification (Gate 0, U-PR3-4), verified restorable backup, two read-only dry runs, approval per production op. Nothing from PR 4 was started.

## Deploy notes (read before merging)

- Merging PR 3 auto-deploys the new client on Vercel.
- The backend restart that activates server normalisation is a separate step: pull + restart `itfund-backend` on FedServ. Until that restart, the new client still translates locally (its own progress is UUID-only), but the server stores opaquely and serves unmarked GETs without dual-keying.
- The data migration still does not run — that is PR 4.
