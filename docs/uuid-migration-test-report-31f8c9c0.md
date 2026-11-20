# UUID migration — PR 2 test report

**PR:** 2 — Permanent Identity Foundation (UUID migration, plan v2.2 §4)
**Commit under test:** `31f8c9c0dedebfb2cf3e6b427eacea3b24604a27`
**Branch:** `pr2-identity-foundation` (from main `6fe58ba9559cdc390497324a9572a12f150d86b4`)
**Checkout:** fresh tree of main `6fe58ba9` downloaded via tarball into
`~/workspace/itfund-pr2-identity-foundation/`, verified byte-exact (1190/1190
blobs) before any change; remote head re-verified still `6fe58ba9` before branching.
**Date:** 2026-11-20 (EST). All suites run as user `nobody`, never as root.
Backend pytest run with ALL proxy vars unset.

## What PR 2 changes (scope)

- Stable UUID v4 ids for all 3,229 cards + 76 puzzles; canonical 6-element
  tuple `[uuid, question, answer, explanation, wrongOptions, revision]`.
- Frozen legacy map `scripts/legacy-card-ids.json` (3,229 card + 76 puzzle
  entries, CLOSED); assignment script `scripts/assign-card-ids.mjs`.
- Exporter emits `rev` + `legacyId` (map entries only); artifacts version 2.
- Premium puzzle stubs exactly `{id, legacyId, deckId}`; premium card stubs
  gain `rev` + `legacyId`; backend `_public_tracks` mirrors both.
- `revSeen` recorded at grade time (confirmed by Spencer 2026-11-20 ~15:56 EST).
- No client behaviour changes, no translation, no adapter/server work (PR 3).

## Test-first evidence (ordering rule)

PR 2 tests were written against the pre-migration code and observed failing
before the fix landed; no test was weakened to make it pass:

- `scripts/export-content.test.js`: 12 new PR 2 tests failed pre-fix
  (map census, map↔export match, UUID shape, rev, reorder/insert invariance,
  duplicate-card, premium stub keys, premium card stubs, restricted-field
  scan, version 2).
- `src/lib/academy.test.js`: 2 new revSeen tests failed pre-fix
  (record on grade; update on re-grade). The back-compat test (grading
  without a revision leaves `revSeen` unset) passed pre-fix, as expected.
- `scripts/content-audit/check-drafts.test.js`: all 3 tests failed pre-fix
  (clean 6-element draft mis-parsed; distractor-equals-answer not reported;
  4-element draft passed when it must fail).
- `scripts/assign-card-ids.test.js`: file failed to load pre-fix — the module
  `scripts/assign-card-ids.mjs` did not exist yet (5 tests, 0 ran).
- `src/lib/progress/merge.test.js`: the new revSeen-preservation test passed
  pre-fix — it is a guard, not a failing-first test (PR 1's merge spread
  already carries `revSeen` with the picked record).

Two pre-existing assertions encoded the OLD behaviour and were updated as
part of the change (not weakened): `export-content.test.js` "public module
carries exactly the free tier bodies" (`deck.puzzles` `[]` → puzzle stubs)
and `src/lib/content.test.js` (positional id pattern → UUID; `puzzles []` →
stubs, using `cissp-d1` which has puzzles — `cissp-d3` has none).

## Per-suite results — frontend (vitest)

Full run: **128 files, 1227 passed, 0 failed, 0 skipped** (baseline on main
`6fe58ba9` was 126 files / 1203 tests; +2 files / +24 tests are the new PR 2
tests). Command: `node ./node_modules/vitest/vitest.mjs run`.

| Suite | Command | Pass | Fail | Skipped | Duration |
|---|---|---|---|---|---|
| `scripts/assign-card-ids.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.0s |
| `scripts/content-audit/check-drafts.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 8.8s |
| `scripts/content-audit/content-audit.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.4s |
| `scripts/export-content.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 22 | 0 | 0 | 2.9s |
| `scripts/generate-counts.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.3s |
| `src/api/analytics.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.0s |
| `src/api/labs.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/api/tutor.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 10 | 0 | 0 | 0.0s |
| `src/api/voice.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 28 | 0 | 0 | 1.0s |
| `src/components/Celebration.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/components/CookieConsent.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.0s |
| `src/components/ErrorBoundary.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.0s |
| `src/components/FaqSection.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.0s |
| `src/components/SeatsPill.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.1s |
| `src/components/Seo.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.0s |
| `src/components/StudyMascot.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.1s |
| `src/components/UpgradePrompt.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.1s |
| `src/components/academy/QuizRun.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 1 | 0 | 0 | 0.1s |
| `src/components/academy/lesson/CypherNote.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.1s |
| `src/components/academy/lesson/FeedbackBar.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.1s |
| `src/components/academy/lesson/LessonBlueprint.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.0s |
| `src/components/academy/lesson/LessonPlayer.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.0s |
| `src/components/academy/lesson/MissionHandoff.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 11 | 0 | 0 | 3.3s |
| `src/components/academy/tutor/CypherFace.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 17 | 0 | 0 | 0.6s |
| `src/components/academy/tutor/CypherLessonPanel.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 29 | 0 | 0 | 1.2s |
| `src/components/academy/tutor/VoiceWaveform.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 15 | 0 | 0 | 0.1s |
| `src/components/alive.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.1s |
| `src/components/lab/LabGallery.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.1s |
| `src/components/lab/PacketBuilder.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.2s |
| `src/components/labs/FreeLabBadge.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 1 | 0 | 0 | 0.0s |
| `src/components/labs/NetworkScene3D.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.0s |
| `src/components/labs/useLabConsole.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.0s |
| `src/components/missions/CypherVoiceButton.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/components/missions/FirewallConsole.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/components/missions/IncidentReportForm.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/components/missions/MissionTopology.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.1s |
| `src/components/missions/SocClosing.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.2s |
| `src/components/missions/firewallCommands.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 14 | 0 | 0 | 0.1s |
| `src/components/shell/AppShell.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.2s |
| `src/components/three/BlueprintFallback.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 12 | 0 | 0 | 0.1s |
| `src/components/three/CypherCharacter.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 10 | 0 | 0 | 0.5s |
| `src/components/three/GltfSubject.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.1s |
| `src/components/three/MissionSocScene.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 23 | 0 | 0 | 0.1s |
| `src/components/three/MissionSocScene.tick.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.3s |
| `src/components/three/ModelViewer.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.0s |
| `src/components/three/RobotCharacter.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 12 | 0 | 0 | 0.4s |
| `src/components/three/WebglFallback.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.0s |
| `src/components/three/robotMouth.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.3s |
| `src/components/three/socDressing.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.0s |
| `src/components/three/socLayout.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 29 | 0 | 0 | 0.1s |
| `src/components/three/socSeating.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.1s |
| `src/components/viz/AccessPointSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 14 | 0 | 0 | 0.6s |
| `src/components/viz/CloudSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 13 | 0 | 0 | 0.6s |
| `src/components/viz/GitWorkflowSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 10 | 0 | 0 | 0.2s |
| `src/components/viz/LoadBalancerAnimation.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.2s |
| `src/components/viz/NasSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.3s |
| `src/components/viz/NgfwSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 13 | 0 | 0 | 0.6s |
| `src/components/viz/PatchPanelSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.3s |
| `src/components/viz/RackServerSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.3s |
| `src/components/viz/RouterSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.3s |
| `src/components/viz/ServerRackSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.2s |
| `src/components/viz/SwitchSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 11 | 0 | 0 | 0.4s |
| `src/components/viz/UpsSimulator.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 12 | 0 | 0 | 0.7s |
| `src/data/acronyms.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.2s |
| `src/data/blueprints.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.2s |
| `src/data/catalog/intro-it.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.0s |
| `src/data/cypherNotes.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.0s |
| `src/data/deckLabs.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.0s |
| `src/data/labLessons.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.0s |
| `src/data/mascotFacts.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.0s |
| `src/data/missions.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 21 | 0 | 0 | 0.0s |
| `src/data/protocolJourneys.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 17 | 0 | 0 | 0.1s |
| `src/lib/academy.cert-exam.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.0s |
| `src/lib/academy.exam.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 7 | 0 | 0 | 0.1s |
| `src/lib/academy.secplus-exam.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.1s |
| `src/lib/academy.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 12 | 0 | 0 | 0.1s |
| `src/lib/accessPoint.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 22 | 0 | 0 | 0.1s |
| `src/lib/analytics.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.0s |
| `src/lib/attribution.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 10 | 0 | 0 | 0.0s |
| `src/lib/cloud.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 20 | 0 | 0 | 0.1s |
| `src/lib/consent.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.0s |
| `src/lib/content.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 17 | 0 | 0 | 0.1s |
| `src/lib/design/cn.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.0s |
| `src/lib/design/legacyGlass.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 1 | 0 | 0 | 0.7s |
| `src/lib/design/tokens.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 14 | 0 | 0 | 0.1s |
| `src/lib/errors.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.0s |
| `src/lib/gitWorkflow.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 30 | 0 | 0 | 0.1s |
| `src/lib/labProgress.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.1s |
| `src/lib/loadBalancer.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.0s |
| `src/lib/milestones.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 15 | 0 | 0 | 0.0s |
| `src/lib/nas.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 18 | 0 | 0 | 0.1s |
| `src/lib/native.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 13 | 0 | 0 | 0.2s |
| `src/lib/networkRouter.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 17 | 0 | 0 | 0.0s |
| `src/lib/networkSwitch.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 17 | 0 | 0 | 0.1s |
| `src/lib/ngfw.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 15 | 0 | 0 | 0.1s |
| `src/lib/packetBuilder.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 26 | 0 | 0 | 0.0s |
| `src/lib/patchPanel.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.0s |
| `src/lib/progress/engine.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 28 | 0 | 0 | 0.2s |
| `src/lib/progress/merge.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 22 | 0 | 0 | 0.0s |
| `src/lib/progress/modules.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.0s |
| `src/lib/progress/serverAdapter.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 12 | 0 | 0 | 0.0s |
| `src/lib/rackServer.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 10 | 0 | 0 | 0.0s |
| `src/lib/serverRack.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 15 | 0 | 0 | 0.0s |
| `src/lib/subscription.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 11 | 0 | 0 | 0.0s |
| `src/lib/theme.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 11 | 0 | 0 | 0.1s |
| `src/lib/ups.test.js` | `node ./node_modules/vitest/vitest.mjs run` | 21 | 0 | 0 | 0.1s |
| `src/mobile-responsiveness.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 21 | 0 | 0 | 0.1s |
| `src/pages/Academy.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 2 | 0 | 0 | 0.1s |
| `src/pages/CisspRoadmap.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.0s |
| `src/pages/Contact.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.0s |
| `src/pages/Faq.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.0s |
| `src/pages/LabProgress.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 6 | 0 | 0 | 0.0s |
| `src/pages/LabRegistry.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.0s |
| `src/pages/LabWorkspace.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.1s |
| `src/pages/Landing.seats.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.6s |
| `src/pages/Landing.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 15 | 0 | 0 | 0.8s |
| `src/pages/MissionBriefing.opening.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 9 | 0 | 0 | 0.7s |
| `src/pages/MissionBriefing.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.1s |
| `src/pages/MissionWorkspace.debrief.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 1 | 0 | 0 | 0.5s |
| `src/pages/MissionWorkspace.flood.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.3s |
| `src/pages/MissionWorkspace.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 29 | 0 | 0 | 0.3s |
| `src/pages/Pricing.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 4 | 0 | 0 | 0.1s |
| `src/pages/Privacy.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 8 | 0 | 0 | 0.1s |
| `src/pages/SignIn.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 3 | 0 | 0 | 0.1s |
| `src/pages/academy/Courses.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 1 | 0 | 0 | 0.2s |
| `src/pages/academy/LessonView.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 16 | 0 | 0 | 0.6s |
| `src/pages/admin/Admin.test.jsx` | `node ./node_modules/vitest/vitest.mjs run` | 22 | 0 | 0 | 0.3s |
| `vercel-routes.test.mjs` | `node ./node_modules/vitest/vitest.mjs run` | 5 | 0 | 0 | 0.1s |

PR 1 regression suites, re-run as regression (all green):
`src/lib/progress/merge.test.js` (22 tests — merge value-correctness, 409,
offline-to-online, exam-merge, adapter write-back mechanics, field
preservation) and `src/lib/progress/serverAdapter.test.js` (12 tests —
offline retry, 409 current-scheme, offline-to-online).

PR 2 suites (new in this PR):
`scripts/export-content.test.js` (22 tests, incl. 12 new PR 2 tests),
`scripts/assign-card-ids.test.js` (5 tests), `scripts/content-audit/check-drafts.test.js`
(3 tests), `src/lib/academy.test.js` (12 tests, incl. 3 new revSeen tests),
`src/lib/progress/merge.test.js` (+1 revSeen-preservation test),
`src/lib/content.test.js` (17 tests, updated stub assertions).

## Per-suite results — backend (pytest)

Full run: **1199 passed, 1 skipped, 0 failed** (identical to the baseline on
main `6fe58ba9`: 1199 passed, 1 skipped). Command: `pytest -q` in `backend/`,
proxy vars unset. Top-level files (293 passed + 1 skipped) and labs files
(906 passed) reconcile to the full-run total.

| Suite | Command | Pass | Fail | Skipped | Duration |
|---|---|---|---|---|---|
| `backend/test_admin.py` | `pytest -q` (in `backend/`, proxy vars unset) | 36 | 0 | 0 | 5.80s |
| `backend/test_ai_tutor.py` | `pytest -q` (in `backend/`, proxy vars unset) | 37 | 0 | 0 | 3.13s |
| `backend/test_analytics.py` | `pytest -q` (in `backend/`, proxy vars unset) | 6 | 0 | 0 | 1.26s |
| `backend/test_auth.py` | `pytest -q` (in `backend/`, proxy vars unset) | 30 | 0 | 0 | 3.49s |
| `backend/test_billing.py` | `pytest -q` (in `backend/`, proxy vars unset) | 70 | 0 | 0 | 4.04s |
| `backend/test_content.py` | `pytest -q` (in `backend/`, proxy vars unset) | 21 | 0 | 0 | 2.04s |
| `backend/test_cors_native.py` | `pytest -q` (in `backend/`, proxy vars unset) | 3 | 0 | 0 | 1.19s |
| `backend/test_db.py` | `pytest -q` (in `backend/`, proxy vars unset) | 4 | 0 | 0 | 1.18s |
| `backend/test_enrollment.py` | `pytest -q` (in `backend/`, proxy vars unset) | 24 | 0 | 1 | 2.24s |
| `backend/test_main.py` | `pytest -q` (in `backend/`, proxy vars unset) | 9 | 0 | 0 | 8.29s |
| `backend/test_main_migrations.py` | `pytest -q` (in `backend/`, proxy vars unset) | 3 | 0 | 0 | 1.46s |
| `backend/test_native_auth.py` | `pytest -q` (in `backend/`, proxy vars unset) | 10 | 0 | 0 | 1.41s |
| `backend/test_progress.py` | `pytest -q` (in `backend/`, proxy vars unset) | 10 | 0 | 0 | 1.59s |
| `backend/test_public.py` | `pytest -q` (in `backend/`, proxy vars unset) | 4 | 0 | 0 | 1.10s |
| `backend/test_voice.py` | `pytest -q` (in `backend/`, proxy vars unset) | 26 | 0 | 0 | 1.81s |
| `backend/labs/test_aws_cli.py` | `pytest -q` (in `backend/`, proxy vars unset) | 40 | 0 | 0 | 0.06s |
| `backend/labs/test_aws_iam.py` | `pytest -q` (in `backend/`, proxy vars unset) | 36 | 0 | 0 | 0.06s |
| `backend/labs/test_blue_team.py` | `pytest -q` (in `backend/`, proxy vars unset) | 9 | 0 | 0 | 1.75s |
| `backend/labs/test_cloud_shells.py` | `pytest -q` (in `backend/`, proxy vars unset) | 10 | 0 | 0 | 1.10s |
| `backend/labs/test_devops_tools.py` | `pytest -q` (in `backend/`, proxy vars unset) | 8 | 0 | 0 | 0.04s |
| `backend/labs/test_docker_cap.py` | `pytest -q` (in `backend/`, proxy vars unset) | 3 | 0 | 0 | 0.03s |
| `backend/labs/test_docker_fundamentals.py` | `pytest -q` (in `backend/`, proxy vars unset) | 35 | 0 | 0 | 0.06s |
| `backend/labs/test_docker_provider.py` | `pytest -q` (in `backend/`, proxy vars unset) | 21 | 0 | 0 | 0.08s |
| `backend/labs/test_docker_siem.py` | `pytest -q` (in `backend/`, proxy vars unset) | 9 | 0 | 0 | 1.02s |
| `backend/labs/test_eigrp_labs.py` | `pytest -q` (in `backend/`, proxy vars unset) | 7 | 0 | 0 | 1.06s |
| `backend/labs/test_k8s_lab.py` | `pytest -q` (in `backend/`, proxy vars unset) | 47 | 0 | 0 | 0.06s |
| `backend/labs/test_lab_images.py` | `pytest -q` (in `backend/`, proxy vars unset) | 25 | 0 | 0 | 0.18s |
| `backend/labs/test_labs.py` | `pytest -q` (in `backend/`, proxy vars unset) | 28 | 0 | 0 | 2.11s |
| `backend/labs/test_linux_terminal.py` | `pytest -q` (in `backend/`, proxy vars unset) | 60 | 0 | 0 | 0.12s |
| `backend/labs/test_missions.py` | `pytest -q` (in `backend/`, proxy vars unset) | 26 | 0 | 0 | 4.10s |
| `backend/labs/test_missions_flood.py` | `pytest -q` (in `backend/`, proxy vars unset) | 11 | 0 | 0 | 1.78s |
| `backend/labs/test_network_shells.py` | `pytest -q` (in `backend/`, proxy vars unset) | 30 | 0 | 0 | 1.12s |
| `backend/labs/test_open_access_smoke.py *` | `pytest -q` (in `backend/`, proxy vars unset) | 1 | 0 | 0 | 1.26s |
| `backend/labs/test_pentest_lab.py` | `pytest -q` (in `backend/`, proxy vars unset) | 34 | 0 | 0 | 0.05s |
| `backend/labs/test_pentest_web.py` | `pytest -q` (in `backend/`, proxy vars unset) | 15 | 0 | 0 | 0.45s |
| `backend/labs/test_portblast_workflow.py` | `pytest -q` (in `backend/`, proxy vars unset) | 22 | 0 | 0 | 0.05s |
| `backend/labs/test_python_basics.py` | `pytest -q` (in `backend/`, proxy vars unset) | 10 | 0 | 0 | 0.04s |
| `backend/labs/test_python_lab.py` | `pytest -q` (in `backend/`, proxy vars unset) | 9 | 0 | 0 | 0.04s |
| `backend/labs/test_python_netauto.py` | `pytest -q` (in `backend/`, proxy vars unset) | 7 | 0 | 0 | 0.04s |
| `backend/labs/test_python_tools.py` | `pytest -q` (in `backend/`, proxy vars unset) | 18 | 0 | 0 | 0.05s |
| `backend/labs/test_rip_labs.py` | `pytest -q` (in `backend/`, proxy vars unset) | 9 | 0 | 0 | 1.09s |
| `backend/labs/test_routing_labs.py` | `pytest -q` (in `backend/`, proxy vars unset) | 7 | 0 | 0 | 1.02s |
| `backend/labs/test_sectools.py` | `pytest -q` (in `backend/`, proxy vars unset) | 14 | 0 | 0 | 0.04s |
| `backend/labs/test_session_limits.py *` | `pytest -q` (in `backend/`, proxy vars unset) | 6 | 0 | 0 | 1.10s |
| `backend/labs/test_siem_hunting.py` | `pytest -q` (in `backend/`, proxy vars unset) | 12 | 0 | 0 | 1.02s |
| `backend/labs/test_subnetting.py` | `pytest -q` (in `backend/`, proxy vars unset) | 32 | 0 | 0 | 2.43s |
| `backend/labs/test_terminal.py` | `pytest -q` (in `backend/`, proxy vars unset) | 19 | 0 | 0 | 1.30s |
| `backend/labs/test_terraform_aws.py` | `pytest -q` (in `backend/`, proxy vars unset) | 36 | 0 | 0 | 0.06s |
| `backend/labs/test_terraform_azure.py` | `pytest -q` (in `backend/`, proxy vars unset) | 36 | 0 | 0 | 0.07s |
| `backend/labs/test_terraform_fundamentals.py` | `pytest -q` (in `backend/`, proxy vars unset) | 37 | 0 | 0 | 0.06s |
| `backend/labs/test_terraform_gcp.py` | `pytest -q` (in `backend/`, proxy vars unset) | 36 | 0 | 0 | 0.07s |
| `backend/labs/test_terraform_k8s_docker.py` | `pytest -q` (in `backend/`, proxy vars unset) | 31 | 0 | 0 | 0.06s |
| `backend/labs/test_terraform_proxmox.py` | `pytest -q` (in `backend/`, proxy vars unset) | 55 | 0 | 0 | 0.08s |
| `backend/labs/test_topology.py` | `pytest -q` (in `backend/`, proxy vars unset) | 26 | 0 | 0 | 0.05s |
| `backend/labs/test_vuln_scanning.py` | `pytest -q` (in `backend/`, proxy vars unset) | 29 | 0 | 0 | 0.05s |

\* `test_open_access_smoke.py` (1 test) and `test_session_limits.py`
(2 of its 6 tests) fail when run in isolation but pass in the full-suite run
— see U-PR2-3 below. Counts above are the full-run results.

## Build

`node ./node_modules/vite/bin/vite.js build` — **passed** (built in 16.87s).
Pre-existing chunk-size warning (some chunks > 500 kB after minification)
unchanged by this PR.

## Skipped tests

| Test | Reason | Owner |
|---|---|---|
| `backend/test_enrollment.py::test_simultaneous_checkouts_never_oversell_on_postgres` | Needs `ENROLLMENT_PG_URL` (a Postgres database); runs in CI's migrations job | Spencer |

## Verification data (census, map, bundle)

- Assignment script run on the real tree: assigned 3,229 card UUIDs + 76
  puzzle UUIDs (3,229 cards, 76 puzzles total). Second run is a verified
  no-op (0 assigned, "already assigned: map matches the files").
- Independent AST check of the rewritten sources: all 3,229 card tuples are
  6-element, all with valid UUID v4 ids and numeric revs; all 76 puzzles
  carry `uuid` + `rev: 1`.
- Frozen map: 3,229 card + 76 puzzle entries; every entry
  `{legacyId, id, deckId, rev}` with a unique UUID v4 and rev 1; every map
  pair matches the export in both directions (test-enforced).
- Export census: 21 tracks, 222 decks, 3,229 cards, 222/222 lessons with
  content, 426 notes, 76 puzzles; free tier 5 decks (57 cards), 5 lessons.
- Drift tests pass: committed `backend/data/content.json` and
  `src/data/content-public.js` match a fresh build.
- Premium leakage: audit canary set stays green; data-driven restricted-field
  scan passes (69 premium puzzle stubs; prompt/explanation/identifying items
  absent from the public module). Negative control: the scan fires on an
  injected premium prompt, so the pass is live, not vacuous.
- Bundle delta (measured, closes the plan's unverified estimate):
  `src/data/content-public.js` raw 780,648 → 1,098,376 bytes (+317,728,
  +40.7%); gzipped 61,496 → 147,953 bytes (+86,457). UUIDs are high-entropy,
  so the gzipped ratio worsens more than the raw size. See U-PR2-1.
- `backend/data/content.json` raw 4,310,796 → 4,638,041 bytes (+327,245).

## Manual / scripted checks — NOT RUN in PR 2

| Check | Status | Reason |
|---|---|---|
| Spencer's validation test (plan §7 #3) on a real progress snapshot | NOT RUN | Needs a real progress snapshot + the PR 3 adapter to interpret UUID vs legacy ids |
| Two-device scripted check (#5) | NOT RUN | Needs the PR 3 compatibility layer (old + new client) |
| Cross-version checks (#13/#14) | NOT RUN | Need the PR 3 client marker + server normalisation |
| Click-through (§18: guided lesson, flashcard deck, boss, exam) | NOT RUN | Needs a running build + live browser; this subagent cannot operate one. `vite build` passes; the click-through is deferred to PR 3, which covers the same paths end to end with the adapter in place |

## Unresolved issues

| ID | Severity | Issue | Owner | Mitigation / gate |
|---|---|---|---|---|
| U-PR2-1 | Low | Public bundle grows: `content-public.js` gzipped 61,496 → 147,953 bytes (+86,457). Cause: UUIDs are random hex (high entropy) vs the old shared-prefix positional ids. No correctness impact. | Spencer | Informational. No action required for this PR; a future size optimisation (if wanted) is a separate decision, not a gate. |
| U-PR2-2 | Low | Report home undecided (plan v2.2 §12 open point 3) — plan default used: report committed in the branch as `docs/uuid-migration-test-report-<short-sha>.md` + summarized in the PR body. Carried from PR 1. | Spencer | Does not block this PR. |
| U-PR2-3 | Medium | 3 backend labs tests fail when run in isolation but pass in the full-suite run: `labs/test_open_access_smoke.py::test_a_brand_new_visitor_can_complete_a_lab`, `labs/test_session_limits.py::test_one_visitor_cannot_hoard_live_sessions_over_http`, `labs/test_session_limits.py::test_exiting_a_lab_frees_a_slot`. Re-verified on this commit (3 failed, 4 passed in isolation; all pass in the full run). Pre-existing test-order dependence, proven on pristine main `8661007e` in PR 1; out of PR 2 scope. | Spencer | Does not block this PR (full suite is green). |
| U-PR2-4 | Medium | Gate 0 (blocking, before PR 4): the production backend target is unverified — `vercel.json` defines a backend service behind `/api` while `src/api/progress.js` says production is `api.road2cissp.com` via `VITE_API_BASE_URL`. Cannot be verified from code. | Spencer | Blocks PR 4 Gate 0, not PR 2. |

## Sign-off

- Commit under test: `31f8c9c0dedebfb2cf3e6b427eacea3b24604a27`
- Frontend: 1227 passed, 0 failed, 0 skipped (128 files).
- Backend: 1199 passed, 0 failed, 1 skipped (55 files).
- Build: passed.
- Unresolved issues: 4 (0 Critical, 0 High, 2 Medium, 2 Low). No Critical or
  High issue blocks this PR's gate.
- **Recommendation: PR 2's gate is met — ready for Spencer's review.**
  Spencer's explicit go is still required to merge; this report never
  substitutes for it. No merge, no deploy by the implementer.
