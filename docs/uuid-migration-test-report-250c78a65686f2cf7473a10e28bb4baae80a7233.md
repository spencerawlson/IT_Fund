# UUID migration — PR 4 Migration and Cutover: test report

- **PR:** PR 4 (Migration and Cutover), branch `pr4-migration-cutover`
- **Code commit:** `250c78a65686f2cf7473a10e28bb4baae80a7233` (8 files, +1,531 / −0 vs main; verified byte-exact against the remote branch tree, all 8 blob SHAs match)
- **Base:** main `6ef63defb50ac3c4eb5ffe2feae2cdfaa25db9ca` (PR #167 merged, verified via API before building and again immediately before pushing)
- **Date:** 2026-11-23 (EST, early hours)
- **Scope:** plan v2.2 §6 in full, except the production operations in §6.5, which are NOT in this PR — each needs its own explicit approval, and the merge authorises none of them. No client files. No exporter files. No content changes. No Gate 2 (append-only rule stays).
- **Decision in force:** dual-keyed GET is YES (Spencer, 2026-11-20 ~16:53). Gate 0 is RESOLVED in this PR (see below): the production backend is the FedServ backend at https://api.road2cissp.com.
- **Merge pre-approval:** Spencer pre-approved the PR 4 merge on 2026-11-22 23:39 EST — merge when tests are green and dry-run rehearsal 1 is done, without coming back for a merge go. Production cutover operations still each need their own explicit approval, one at a time.

## Gate 0 — production backend target (RESOLVED)

The Vercel dashboard could not be read directly (the Vercel connector is not connected), so the target was settled with live evidence instead of the dashboard check the plan names:

1. The live production client bundle (www.road2cissp.com/assets/index-DL9os1Fb.js, 1.44 MB, downloaded 2026-11-22) contains **9 occurrences of `https://api.road2cissp.com/api` and zero relative `/api/academy` calls** — `VITE_API_BASE_URL` is set to https://api.road2cissp.com/api in the production Vercel build, so the client calls the api origin directly, not the Vercel /api rewrite. The bundle also contains `X-Card-Id-Version` (the PR 3 build is live).
2. api.road2cissp.com is live behind Cloudflare: /health `{"status":"ok"}`, /health/db `{"db":"ok"}`, /api/content/deck/py-basics returns v2 content (first card UUID 8e8346a1-95b5-4133-9b6f-f5465012b3ce + legacyId "py-basics-0"); responses carry Server: cloudflare + CF-RAY and **no x-vercel-* headers**.
3. **The Vercel backend service exists but is broken: www.road2cissp.com/api/health returns 500 FUNCTION_INVOCATION_FAILED** (Server: Vercel, X-Vercel-Id present) — it cannot serve production traffic. vercel.json on main defines both services (frontend + backend entrypoint `main:app`), the definition exists, the service just fails on invocation.
4. DNS lookups from the sandbox are unreliable (api.road2cissp.com resolved to 198.18.172.132, a sandbox-proxy range) and were not relied on.

**Consequence: the PR 4 migration + restart target FedServ, as the plan assumes. The Vercel backend 500 is a NEW finding to flag to Spencer (it is not a fallback backend).**

## Tests-first evidence (observed failing on the old code, before any fix)

| Test | Observed failure on old code |
|---|---|
| `test_main_migrations.py` — `test_pr4_migration_is_chained_from_pr3_head` | FAILED: head was still `5e1a7c3d9b20`, "no migration exists on top of the PR 3 head" |
| `test_progress_migration.py` — `test_migrate_translates_fixture_rows` (pg + sqlite) | FAILED: upgrade was a no-op (head == old head), rows stayed legacy-keyed |
| `test_progress_migration.py` — forced-error / kill / validation-gate / dry-run tests | FAILED: `progress_migration` module did not exist / dry-run script did not exist |
| `test_progress_migration.py` — `test_concurrent_upgrades_serialise` | FAILED: version stayed at the old head after both processes |
| `test_progress_migration.py` — `test_migrate_is_idempotent` (pg + sqlite) | Passed VACUOUSLY on the old code (a no-op upgrade is trivially idempotent) — guards that must keep passing, not failing-first evidence. The non-vacuous assertion (the first run must actually translate row pr4-a) was added to the test before implementation. |

## Per-suite results (post-fix)

| Suite | Result |
|---|---|
| Backend pytest (full) | **1,224 passed, 0 failed, 1 skipped** (76.55 s). Baseline on main 6ef63def: 1,207 passed / 1 skipped. Net new: **+17 tests** (16 in `test_progress_migration.py`, 1 chain test in `test_main_migrations.py`). |
| PR 4 new suites (targeted run) | **20 passed, 0 failed** (33.85 s): migration translation (pg + sqlite), idempotence (pg + sqlite), forced-error rollback / single-transaction proof (pg + sqlite), kill mid-migration (pg + sqlite), concurrent-upgrade serialisation (Postgres), validation-gate stale content (pg + sqlite), validation-gate frozen-map mismatch (pg + sqlite), dry-run script read-only + report (pg + sqlite), MAX_BYTES drift guard, Alembic chain assertion. |
| Frontend vitest (full) | **1,260 passed, 0 failed, 4 skipped** — 132 files (131 passed, 1 skipped: the gated `compatMatrix.test.js`, see below). Two consecutive full runs green (92.82 s logged run). Baseline on main: 1,260 passed / 4 skipped. Net new: 0 tests (PR 4 has no client files). See U-PR4-1 for the one flaky first run. |
| ESLint (`node ./node_modules/eslint/bin/eslint.js . --quiet`) | Clean (exit 0). |
| Vite build (`node ./node_modules/vite/bin/vite.js build`) | Passes (17.50 s). Pre-existing chunk-size warning (>500 kB chunks) unchanged; index chunk 1,443.96 kB, same as PR 3. |
| PR 1 suites (regression) | Pass inside the full runs (0 failures in any of their files). Targeted re-check: `merge.test.js` + `serverAdapter.test.js` = **41 passed** (the files have grown since PR 1's original 33 — PR 3 added 7 tests to `serverAdapter.test.js`). |
| PR 2 suites (regression) | Pass inside the full runs (0 failures in any of their files). |
| PR 3 suites (regression) | Pass inside the full runs (0 failures in any of their files: `migrateCardIds.test.js`, `serverAdapter.test.js`, `test_progress.py`). |
| Fault-injection detail | Kill mid-migration (SIGKILL at 0.5 s into a multi-second upgrade, 1,500 rows × 100 cards): version stayed at the old head, zero rows partially translated; re-run completed; third run changed zero rows — on Postgres AND SQLite. Forced error after 3 translated rows: zero rows changed, version unchanged, error loud. Concurrent upgrades: both processes exit 0, version at the new head, rows migrated exactly once. Validation gate: v1 content and frozen-map mismatch both refused before touching any row, naming the mismatch. |

## Skipped tests

| Test | Reason | Owner |
|---|---|---|
| Backend: enrollment Postgres test (1 skipped in the full run) | Needs `ENROLLMENT_PG_URL` (a real Postgres); same skip as every prior PR | Spencer |
| Frontend: `src/lib/progress/compatMatrix.test.js` (4 tests) | Gated — needs live scratch backends via env vars; not set in this run. Same skip as PR 3. The #13/#14/#5 matrix was run live in PR 3 against scratch backends (4/4); PR 4 changes no client/server protocol, so those results stand. | Everest |

## Unresolved issues

| ID | Issue | Severity | Owner |
|---|---|---|---|
| U-PR4-1 | Frontend first full run showed 2 failures; the failing file/test names were not captured (output was tail-limited) and **two immediate full reruns were green (1,260 passed)**. No client files changed in this PR, so the PR cannot have caused them. Treated as flaky; recorded here instead of hidden. | Low | Everest |
| U-PR4-2 | With-header (`X-Card-Id-Version: 2`) UUID-only progress GET still not live-observed (browser cannot send custom headers). Same code path, covered by PR 3's tests. Carried from PR 3. | Low | Spencer |
| U-PR3-1 | Bundle gzipped delta (informational). PR 4 adds no client code — no new delta. | Low (info) | — |
| U-PR3-2 | Report home undecided (plan default used). | Low | Spencer |
| U-PR3-3 | 3 backend labs tests fail in isolation, pass in the full run (pre-existing test-order dependence, proven on pristine main). | Medium | Spencer |
| U-PR3-5 | Dual-keyed GET covers cards only; an old client loading a new-client resume starts a fresh lesson session (graded progress intact) — needs his call. | Low | Spencer |
| — | U-PR3-4 (Gate 0 target unverified) is **RESOLVED** by this PR — see Gate 0 above. | — | — |

## Manual / scripted checks — NOT RUN (with reasons)

These are post-merge, production-dependent checks. They cannot run before the production operations in plan §6.5, each of which needs its own explicit approval. None is claimed or implied green here.

| Check | Status | Reason |
|---|---|---|
| Spencer's validation test (#3) — his account + one free-tier browser, review queue / mastery % / due counts match pre-migration exactly | NOT RUN | Needs the production migration to have run (operation 5) and his live accounts (operation 6) |
| Two-device scripted check (#5) | NOT RUN | Same — post-cutover, against production |
| Cross-version checks (#13 old/new, #14 new/old) | NOT RUN against the migrated backend | Ran live in PR 3 (4/4) against scratch backends; PR 4 changes no protocol. Re-running them against production is part of operation 6. |
| Click-through (§18): one guided lesson, one flashcard deck, one boss assessment, one exam start/finish on the migrated build | NOT RUN | Needs the migrated build live (operation 5) |
| Cutover verification (`GET /api/content/deck/<premium-id>` UUID ids; `GET /api/academy/progress` translated state) | NOT RUN | Needs operation 5 (pull + restart) |

## Dry-run report (plan §8) — separate file

`docs/dry-run-report-pr4-rehearsal1.md` (content commit `6ef63defb50ac3c4eb5ffe2feae2cdfaa25db9ca`). **Fixture-based rehearsal: 13 fixture rows in a scratch Postgres database — no production data was read and no production dump was taken.** Results: 13 rows, 10 would change, 1 unmapped key (`py-basics-999`, preserved by design), 0 value mismatches, 0 collisions (two legacy → one UUID: 0; one legacy → two UUIDs: 0), 3 dual-keyed collision rows resolved per §4.2, largest row 255,127 bytes after translation (synthetic all-3,229-cards fixture row `pr4-m`, still under the 262,144-byte cap), 0.026 s. **Zero hard failures.** The production-dump rehearsals (plan §8 rehearsals 1 and 2 against the latest / a fresh dump) are separate operations under §6.5 — each needs its own approval.

## Production operations still needing Spencer's per-op approval (plan §6.5)

The merge authorises NONE of these. Each is a separate ask, a separate go:

1. Take the production backup (`pg_dump` of the production database, or `progress` + `users`).
2. Restore the backup into a scratch database to verify it (read-only verification).
3. Dump production progress data for dry-run rehearsal 1 (production-dump version; restore into scratch; produce report 1).
4. Dump production progress data for dry-run rehearsal 2 (fresh dump, immediately before the deploy; produce report 2).
5. Pull + restart the backend on FedServ to run the Alembic data migration (this is the production write).
6. Verify on Spencer's own account + one free-tier browser (read-only checks against live production).
7. Any database restore (last resort only, per `rollback-forward-recovery.md` §PR 4) — with the data-loss consequence stated at the time.

## Sign-off

- **Commit under test:** `250c78a65686f2cf7473a10e28bb4baae80a7233` (branch `pr4-migration-cutover`, base main `6ef63defb50ac3c4eb5ffe2feae2cdfaa25db9ca`).
- **Totals:** backend 1,224 passed / 0 failed / 1 skipped; frontend 1,260 passed / 0 failed / 4 skipped; ESLint clean; Vite build passes; PR 4 fault-injection suite 20/20 green on Postgres + SQLite.
- **Unresolved issues:** 6 open (1 Low new, 1 Low carried, 1 Low info, 1 Medium pre-existing, 1 Low carried, plus the flaky-run note) — none Critical or High, none blocks the merge gate.
- **Gate recommendation:** MERGE — tests green, dry-run rehearsal 1 (fixture-based) done with zero hard failures, Gate 0 resolved. Spencer's merge pre-approval of 2026-11-22 23:39 EST applies. The merge alone authorises no production operation; the §6.5 list above still needs a separate go per operation.
