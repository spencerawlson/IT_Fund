# PR 1 — Progress Integrity: test report

**Commit under test:** `28b59bc040b1b547f1ace7defaaf9febd3c648d0` (branch `pr1-progress-integrity`, short `28b59bc0`)
**Base:** remote main `8661007e46754b710807f26123bf830338ee66dc` (short `8661007e`, PR #164), verified via the GitHub API immediately before branching — unchanged, zero open PRs at the time.
**Checkout:** work copy `~/workspace/itfund-pr1-progress-integrity/` (copy of the main-`8661007e` snapshot; the Rederive snapshot stays pristine). Branch pushed with `~/workspace/bin/gh_push_itfund_branch.py` (scoped delta push, commits authored as spencerawlson).
**Date:** 2026-11-20. **Implementer:** Everest (subagent, on Spencer's explicit go to implement PR 1).

This report is committed in the branch as `docs/uuid-migration-test-report-28b59bc0.md` (the plan v2.2 §12 open point 3 recommended default — Spencer has not decided the report's home; this uses the default and flags it as unresolved issue U2 below) and attached to the PR. It is regenerated per commit: the suites below were run against the tree of code commit `28b59bc0…` (the 4 code/test files) plus this report file; the branch head contains exactly those 5 files, so these results stand for the branch head. (Branch-push mechanics: the push helper builds each commit on main from exactly the listed files, so the head commit carries all 5 files together rather than a report-only follow-up.)

## Pre-fix baseline (test-first evidence)

Before any production code changed, the 33 PR 1 tests were run against main `8661007e` and observed failing as specified: **33 run — 15 passed, 18 failed, 0 skipped** (11 merge field-preservation failures M1–M11, 7 offline-retry failures R1–R7). Full evidence: `~/workspace/your_files/card-uuid-migration-plan/pr1-failing-tests-report.md`. No production file was changed to produce those failures.

## Totals

- **Frontend (vitest): 126 files — 1203 passed, 0 failed, 0 skipped.** Command: `node ./node_modules/vitest/vitest.mjs run` (as user `nobody`, never root).
- **Backend (pytest): 55 files — 1199 passed, 0 failed, 1 skipped.** Command: `python -m pytest -q` in `backend/` (venv `~/workspace/.venvs/itfund-audit`, all proxy vars unset).
- **PR 1 suites: 33/33 pass** (`src/lib/progress/merge.test.js` 21/21, `src/lib/progress/serverAdapter.test.js` 12/12) — the 18 previously-failing tests now pass; the 15 previously-passing still pass.
- **Lint:** full `eslint . --quiet` clean. **Build:** `vite build` passes (18.77 s; chunk-size warning is pre-existing).

## Per-suite results — frontend (vitest)

| Suite | Pass | Fail | Skipped | Duration |
|---|---:|---:|---:|---:|
| `scripts/content-audit/content-audit.test.js` | 8 | 0 | 0 | 0.39 s |
| `scripts/export-content.test.js` | 10 | 0 | 0 | 0.73 s |
| `scripts/generate-counts.test.js` | 3 | 0 | 0 | 0.19 s |
| `src/api/analytics.test.js` | 2 | 0 | 0 | 0.01 s |
| `src/api/labs.test.js` | 6 | 0 | 0 | 0.01 s |
| `src/api/tutor.test.js` | 10 | 0 | 0 | 0.07 s |
| `src/api/voice.test.js` | 28 | 0 | 0 | 1.08 s |
| `src/components/Celebration.test.jsx` | 6 | 0 | 0 | 0.03 s |
| `src/components/CookieConsent.test.jsx` | 3 | 0 | 0 | 0.02 s |
| `src/components/ErrorBoundary.test.jsx` | 3 | 0 | 0 | 0.00 s |
| `src/components/FaqSection.test.jsx` | 3 | 0 | 0 | 0.06 s |
| `src/components/SeatsPill.test.jsx` | 5 | 0 | 0 | 0.10 s |
| `src/components/Seo.test.jsx` | 4 | 0 | 0 | 0.01 s |
| `src/components/StudyMascot.test.jsx` | 7 | 0 | 0 | 0.07 s |
| `src/components/UpgradePrompt.test.jsx` | 2 | 0 | 0 | 0.03 s |
| `src/components/academy/QuizRun.test.jsx` | 1 | 0 | 0 | 0.01 s |
| `src/components/academy/lesson/CypherNote.test.jsx` | 2 | 0 | 0 | 0.02 s |
| `src/components/academy/lesson/FeedbackBar.test.jsx` | 5 | 0 | 0 | 0.02 s |
| `src/components/academy/lesson/LessonBlueprint.test.jsx` | 2 | 0 | 0 | 0.06 s |
| `src/components/academy/lesson/LessonPlayer.test.jsx` | 6 | 0 | 0 | 0.01 s |
| `src/components/academy/lesson/MissionHandoff.test.jsx` | 11 | 0 | 0 | 3.29 s |
| `src/components/academy/tutor/CypherFace.test.jsx` | 17 | 0 | 0 | 0.55 s |
| `src/components/academy/tutor/CypherLessonPanel.test.jsx` | 29 | 0 | 0 | 0.99 s |
| `src/components/academy/tutor/VoiceWaveform.test.jsx` | 15 | 0 | 0 | 0.10 s |
| `src/components/alive.test.jsx` | 7 | 0 | 0 | 0.02 s |
| `src/components/lab/LabGallery.test.jsx` | 7 | 0 | 0 | 0.03 s |
| `src/components/lab/PacketBuilder.test.jsx` | 2 | 0 | 0 | 0.09 s |
| `src/components/labs/FreeLabBadge.test.jsx` | 1 | 0 | 0 | 0.02 s |
| `src/components/labs/NetworkScene3D.test.jsx` | 8 | 0 | 0 | 0.02 s |
| `src/components/labs/useLabConsole.test.js` | 8 | 0 | 0 | 0.01 s |
| `src/components/missions/CypherVoiceButton.test.jsx` | 6 | 0 | 0 | 0.10 s |
| `src/components/missions/FirewallConsole.test.jsx` | 6 | 0 | 0 | 0.11 s |
| `src/components/missions/IncidentReportForm.test.jsx` | 6 | 0 | 0 | 0.02 s |
| `src/components/missions/MissionTopology.test.jsx` | 8 | 0 | 0 | 0.03 s |
| `src/components/missions/SocClosing.test.jsx` | 4 | 0 | 0 | 0.20 s |
| `src/components/missions/firewallCommands.test.js` | 14 | 0 | 0 | 0.06 s |
| `src/components/shell/AppShell.test.jsx` | 9 | 0 | 0 | 0.24 s |
| `src/components/three/BlueprintFallback.test.jsx` | 12 | 0 | 0 | 0.02 s |
| `src/components/three/CypherCharacter.test.jsx` | 10 | 0 | 0 | 0.30 s |
| `src/components/three/GltfSubject.test.jsx` | 4 | 0 | 0 | 0.07 s |
| `src/components/three/MissionSocScene.test.jsx` | 23 | 0 | 0 | 0.09 s |
| `src/components/three/MissionSocScene.tick.test.jsx` | 4 | 0 | 0 | 0.19 s |
| `src/components/three/ModelViewer.test.jsx` | 4 | 0 | 0 | 0.06 s |
| `src/components/three/RobotCharacter.test.jsx` | 12 | 0 | 0 | 0.89 s |
| `src/components/three/WebglFallback.test.jsx` | 2 | 0 | 0 | 0.01 s |
| `src/components/three/robotMouth.test.js` | 6 | 0 | 0 | 0.36 s |
| `src/components/three/socDressing.test.js` | 7 | 0 | 0 | 0.01 s |
| `src/components/three/socLayout.test.js` | 29 | 0 | 0 | 0.03 s |
| `src/components/three/socSeating.test.js` | 2 | 0 | 0 | 0.13 s |
| `src/components/viz/AccessPointSimulator.test.jsx` | 14 | 0 | 0 | 0.69 s |
| `src/components/viz/CloudSimulator.test.jsx` | 13 | 0 | 0 | 0.46 s |
| `src/components/viz/GitWorkflowSimulator.test.jsx` | 10 | 0 | 0 | 0.30 s |
| `src/components/viz/LoadBalancerAnimation.test.jsx` | 3 | 0 | 0 | 0.20 s |
| `src/components/viz/NasSimulator.test.jsx` | 8 | 0 | 0 | 0.27 s |
| `src/components/viz/NgfwSimulator.test.jsx` | 13 | 0 | 0 | 0.71 s |
| `src/components/viz/PatchPanelSimulator.test.jsx` | 6 | 0 | 0 | 0.28 s |
| `src/components/viz/RackServerSimulator.test.jsx` | 7 | 0 | 0 | 0.20 s |
| `src/components/viz/RouterSimulator.test.jsx` | 9 | 0 | 0 | 0.40 s |
| `src/components/viz/ServerRackSimulator.test.jsx` | 9 | 0 | 0 | 0.30 s |
| `src/components/viz/SwitchSimulator.test.jsx` | 11 | 0 | 0 | 0.42 s |
| `src/components/viz/UpsSimulator.test.jsx` | 12 | 0 | 0 | 0.79 s |
| `src/data/acronyms.test.js` | 6 | 0 | 0 | 0.28 s |
| `src/data/blueprints.test.js` | 5 | 0 | 0 | 0.23 s |
| `src/data/catalog/intro-it.test.js` | 9 | 0 | 0 | 0.02 s |
| `src/data/cypherNotes.test.js` | 2 | 0 | 0 | 0.00 s |
| `src/data/deckLabs.test.js` | 6 | 0 | 0 | 0.01 s |
| `src/data/labLessons.test.js` | 7 | 0 | 0 | 0.06 s |
| `src/data/mascotFacts.test.js` | 4 | 0 | 0 | 0.05 s |
| `src/data/missions.test.js` | 21 | 0 | 0 | 0.01 s |
| `src/data/protocolJourneys.test.js` | 17 | 0 | 0 | 0.08 s |
| `src/lib/academy.cert-exam.test.js` | 7 | 0 | 0 | 0.01 s |
| `src/lib/academy.exam.test.js` | 7 | 0 | 0 | 0.07 s |
| `src/lib/academy.secplus-exam.test.js` | 6 | 0 | 0 | 0.07 s |
| `src/lib/academy.test.js` | 9 | 0 | 0 | 0.07 s |
| `src/lib/accessPoint.test.js` | 22 | 0 | 0 | 0.01 s |
| `src/lib/analytics.test.js` | 3 | 0 | 0 | 0.01 s |
| `src/lib/attribution.test.js` | 10 | 0 | 0 | 0.06 s |
| `src/lib/cloud.test.js` | 20 | 0 | 0 | 0.01 s |
| `src/lib/consent.test.js` | 6 | 0 | 0 | 0.01 s |
| `src/lib/content.test.js` | 17 | 0 | 0 | 0.08 s |
| `src/lib/design/cn.test.js` | 2 | 0 | 0 | 0.07 s |
| `src/lib/design/legacyGlass.test.js` | 1 | 0 | 0 | 0.12 s |
| `src/lib/design/tokens.test.js` | 14 | 0 | 0 | 0.01 s |
| `src/lib/errors.test.js` | 6 | 0 | 0 | 0.00 s |
| `src/lib/gitWorkflow.test.js` | 30 | 0 | 0 | 0.03 s |
| `src/lib/labProgress.test.js` | 8 | 0 | 0 | 0.01 s |
| `src/lib/loadBalancer.test.js` | 9 | 0 | 0 | 0.01 s |
| `src/lib/milestones.test.js` | 15 | 0 | 0 | 0.02 s |
| `src/lib/nas.test.js` | 18 | 0 | 0 | 0.02 s |
| `src/lib/native.test.js` | 13 | 0 | 0 | 0.16 s |
| `src/lib/networkRouter.test.js` | 17 | 0 | 0 | 0.08 s |
| `src/lib/networkSwitch.test.js` | 17 | 0 | 0 | 0.10 s |
| `src/lib/ngfw.test.js` | 15 | 0 | 0 | 0.01 s |
| `src/lib/packetBuilder.test.js` | 26 | 0 | 0 | 0.09 s |
| `src/lib/patchPanel.test.js` | 9 | 0 | 0 | 0.01 s |
| `src/lib/progress/engine.test.js` | 28 | 0 | 0 | 0.10 s |
| `src/lib/progress/merge.test.js` | 21 | 0 | 0 | 0.02 s |
| `src/lib/progress/modules.test.js` | 3 | 0 | 0 | 0.01 s |
| `src/lib/progress/serverAdapter.test.js` | 12 | 0 | 0 | 0.03 s |
| `src/lib/rackServer.test.js` | 10 | 0 | 0 | 0.06 s |
| `src/lib/serverRack.test.js` | 15 | 0 | 0 | 0.01 s |
| `src/lib/subscription.test.js` | 11 | 0 | 0 | 0.03 s |
| `src/lib/theme.test.js` | 11 | 0 | 0 | 0.03 s |
| `src/lib/ups.test.js` | 21 | 0 | 0 | 0.10 s |
| `src/mobile-responsiveness.test.jsx` | 21 | 0 | 0 | 0.14 s |
| `src/pages/Academy.test.jsx` | 2 | 0 | 0 | 0.10 s |
| `src/pages/CisspRoadmap.test.jsx` | 5 | 0 | 0 | 0.00 s |
| `src/pages/Contact.test.jsx` | 4 | 0 | 0 | 0.01 s |
| `src/pages/Faq.test.jsx` | 9 | 0 | 0 | 0.06 s |
| `src/pages/LabProgress.test.jsx` | 6 | 0 | 0 | 0.10 s |
| `src/pages/LabRegistry.test.jsx` | 4 | 0 | 0 | 0.00 s |
| `src/pages/LabWorkspace.test.jsx` | 9 | 0 | 0 | 0.07 s |
| `src/pages/Landing.seats.test.jsx` | 3 | 0 | 0 | 0.31 s |
| `src/pages/Landing.test.jsx` | 15 | 0 | 0 | 0.47 s |
| `src/pages/MissionBriefing.opening.test.jsx` | 9 | 0 | 0 | 0.80 s |
| `src/pages/MissionBriefing.test.jsx` | 3 | 0 | 0 | 0.09 s |
| `src/pages/MissionWorkspace.debrief.test.jsx` | 1 | 0 | 0 | 0.57 s |
| `src/pages/MissionWorkspace.flood.test.jsx` | 4 | 0 | 0 | 0.30 s |
| `src/pages/MissionWorkspace.test.jsx` | 29 | 0 | 0 | 0.27 s |
| `src/pages/Pricing.test.jsx` | 4 | 0 | 0 | 0.09 s |
| `src/pages/Privacy.test.jsx` | 8 | 0 | 0 | 0.07 s |
| `src/pages/SignIn.test.jsx` | 3 | 0 | 0 | 0.09 s |
| `src/pages/academy/Courses.test.jsx` | 1 | 0 | 0 | 0.17 s |
| `src/pages/academy/LessonView.test.jsx` | 16 | 0 | 0 | 0.49 s |
| `src/pages/admin/Admin.test.jsx` | 22 | 0 | 0 | 0.18 s |
| `vercel-routes.test.mjs` | 5 | 0 | 0 | 0.01 s |

## Per-suite results — backend (pytest)

| Suite | Pass | Fail | Skipped | Duration |
|---|---:|---:|---:|---:|
| `./test_admin.py` | 36 | 0 | 0 | 3.91 s |
| `./test_ai_tutor.py` | 37 | 0 | 0 | 1.59 s |
| `./test_analytics.py` | 6 | 0 | 0 | 0.18 s |
| `./test_auth.py` | 30 | 0 | 0 | 2.58 s |
| `./test_billing.py` | 70 | 0 | 0 | 2.49 s |
| `./test_content.py` | 21 | 0 | 0 | 0.75 s |
| `./test_cors_native.py` | 3 | 0 | 0 | 0.01 s |
| `./test_db.py` | 4 | 0 | 0 | 0.07 s |
| `./test_enrollment.py` | 24 | 0 | 1 | 0.92 s |
| `./test_main.py` | 9 | 0 | 0 | 6.15 s |
| `./test_main_migrations.py` | 3 | 0 | 0 | 0.15 s |
| `./test_native_auth.py` | 10 | 0 | 0 | 0.73 s |
| `./test_progress.py` | 10 | 0 | 0 | 0.60 s |
| `./test_public.py` | 4 | 0 | 0 | 0.07 s |
| `./test_voice.py` | 26 | 0 | 0 | 0.74 s |
| `labs/test_aws_cli.py` | 40 | 0 | 0 | 0.01 s |
| `labs/test_aws_iam.py` | 36 | 0 | 0 | 0.02 s |
| `labs/test_blue_team.py` | 9 | 0 | 0 | 0.04 s |
| `labs/test_cloud_shells.py` | 10 | 0 | 0 | 0.01 s |
| `labs/test_devops_tools.py` | 8 | 0 | 0 | 0.00 s |
| `labs/test_docker_cap.py` | 3 | 0 | 0 | 0.00 s |
| `labs/test_docker_fundamentals.py` | 35 | 0 | 0 | 0.02 s |
| `labs/test_docker_provider.py` | 21 | 0 | 0 | 0.05 s |
| `labs/test_docker_siem.py` | 9 | 0 | 0 | 0.01 s |
| `labs/test_eigrp_labs.py` | 7 | 0 | 0 | 0.05 s |
| `labs/test_k8s_lab.py` | 47 | 0 | 0 | 0.00 s |
| `labs/test_lab_images.py` | 25 | 0 | 0 | 0.19 s |
| `labs/test_labs.py` | 28 | 0 | 0 | 1.20 s |
| `labs/test_linux_terminal.py` | 60 | 0 | 0 | 0.02 s |
| `labs/test_missions.py` | 26 | 0 | 0 | 3.09 s |
| `labs/test_missions_flood.py` | 11 | 0 | 0 | 0.78 s |
| `labs/test_network_shells.py` | 30 | 0 | 0 | 0.08 s |
| `labs/test_open_access_smoke.py` | 1 | 0 | 0 | 0.03 s |
| `labs/test_pentest_lab.py` | 34 | 0 | 0 | 0.00 s |
| `labs/test_pentest_web.py` | 15 | 0 | 0 | 0.37 s |
| `labs/test_portblast_workflow.py` | 22 | 0 | 0 | 0.00 s |
| `labs/test_python_basics.py` | 10 | 0 | 0 | 0.00 s |
| `labs/test_python_lab.py` | 9 | 0 | 0 | 0.00 s |
| `labs/test_python_netauto.py` | 7 | 0 | 0 | 0.00 s |
| `labs/test_python_tools.py` | 18 | 0 | 0 | 0.00 s |
| `labs/test_rip_labs.py` | 9 | 0 | 0 | 0.05 s |
| `labs/test_routing_labs.py` | 7 | 0 | 0 | 0.04 s |
| `labs/test_sectools.py` | 14 | 0 | 0 | 0.00 s |
| `labs/test_session_limits.py` | 6 | 0 | 0 | 0.09 s |
| `labs/test_siem_hunting.py` | 12 | 0 | 0 | 0.03 s |
| `labs/test_subnetting.py` | 32 | 0 | 0 | 4.81 s |
| `labs/test_terminal.py` | 19 | 0 | 0 | 0.29 s |
| `labs/test_terraform_aws.py` | 36 | 0 | 0 | 0.02 s |
| `labs/test_terraform_azure.py` | 36 | 0 | 0 | 0.02 s |
| `labs/test_terraform_fundamentals.py` | 37 | 0 | 0 | 0.00 s |
| `labs/test_terraform_gcp.py` | 36 | 0 | 0 | 0.02 s |
| `labs/test_terraform_k8s_docker.py` | 31 | 0 | 0 | 0.02 s |
| `labs/test_terraform_proxmox.py` | 55 | 0 | 0 | 0.02 s |
| `labs/test_topology.py` | 26 | 0 | 0 | 0.01 s |
| `labs/test_vuln_scanning.py` | 29 | 0 | 0 | 0.00 s |

## Skipped tests

| Test | Reason | Owner |
|---|---|---|
| `backend/test_enrollment.py::test_simultaneous_checkouts_never_oversell_on_postgres` | Needs `ENROLLMENT_PG_URL` (a Postgres database); skipped in this sandbox, which has no Postgres | Spencer — the test runs in CI's `migrations` job (Postgres service; runs `pytest -q test_enrollment.py -k simultaneous`) |

## Unresolved issues

| # | Severity | Issue | Owner | Mitigation / gate effect |
|---|---|---|---|---|
| U1 | Medium | 3 backend labs tests fail when run **in isolation** but pass in the full-suite run: `labs/test_open_access_smoke.py::test_a_brand_new_visitor_can_complete_a_lab`, `labs/test_session_limits.py::test_one_visitor_cannot_hoard_live_sessions_over_http`, `labs/test_session_limits.py::test_exiting_a_lab_frees_a_slot`. Pre-existing test-order dependence, **not** a PR 1 regression: the same 2 files run in isolation against the pristine main-`8661007e` snapshot fail with the identical 3 failures, and the backend tree is byte-identical between the snapshot and this branch (only test artifacts, removed after the runs). The full-suite run — the supported run — is green. | Spencer | None needed for this PR. Fixing the order-dependence is out of PR 1 scope. Does not block G-PR1 (the regression baseline is the full-suite run, which is green). |
| U2 | Low | Report home (plan v2.2 §12 open point 3) undecided: this report uses the plan's recommended default (committed in the branch + attached to the PR). | Spencer | Confirm the home at the review gate, or leave the default. Does not block G-PR1. |

## Manual / scripted checks — NOT RUN

| Check | Reason |
|---|---|
| Cross-version checks #13/#14 (old/new client × new/old backend) | PR 3 scope — no identity change exists yet to check against. |
| Two-device check #5 | PR 3 scope. |
| Spencer's validation test #3 | PR 3/4 scope (real progress snapshot). |
| Click-through (guided lesson, deck, boss, exam) | Not required by the PR 1 exit criteria (plan §3.4); the changed code paths are covered by the 33 unit tests above. A live click-through is Spencer's call at the review gate. |
| Dry-run report | PR 4 deliverable only. |

## What changed (commit 28b59bc0…)

- `src/lib/progress/merge.js` — `mergeProgress` rewrite: every state field gets an explicit rule; the 11-field whitelist is gone. New: exam histories (`exams`, `secplusExams`, `<certId>Exams`) union by attempt id, newest first, capped at 20; exam sessions (`exam`, `secplusExam`, per-cert `certExams`) finished-wins else later `startedAt`; `missions` union by id (earlier completion wins); `seenCelebrations` union (sorted, order-independent); `cardIdVersion` carried through (newer wins); catch-all carries unknown top-level keys forward (server side wins on conflict, console warning). The 11 existing field rules are unchanged.
- `src/lib/progress/serverAdapter.js` — offline retry path: `pending` flag set on `save()` and cleared only when a push succeeds; retry timer with backoff (5 s, 15 s, 30 s, capped at 60 s, with jitter) re-attempting the latest local state; browser `online`-event listener (guarded by `typeof window !== 'undefined'`) for immediate retry; `flush()` pushes whenever `pending` is true and reports success/failure; `sync()` failure leaves the adapter pending so the retry ladder re-attempts the sync, local copy untouched. Debounce interval, 409 merge-then-retry flow, and `MAX_RETRIES = 3` unchanged.
- `src/lib/progress/merge.test.js`, `src/lib/progress/serverAdapter.test.js` — the PR 1 regression tests (written first, observed failing on `8661007e`); **not weakened, deleted, or modified to make them pass**. The 2 value-correctness guard tests still pass.
- No identity change: no UUIDs, no tuple changes, no exporter changes, no frozen map, no client marker, no server normalisation, no Alembic migration, no production-data change, no subscription/pricing change.

## Sign-off

- **Commit under test:** `28b59bc040b1b547f1ace7defaaf9febd3c648d0` (branch `pr1-progress-integrity`, onto main `8661007e46754b710807f26123bf830338ee66dc`).
- **Totals:** frontend 1203 passed / 0 failed / 0 skipped (126 files); backend 1199 passed / 0 failed / 1 skipped (55 files); PR 1 suites 33/33.
- **Unresolved issues:** 2 (0 Critical, 0 High, 1 Medium, 1 Low).
- **Gate recommendation:** the G-PR1 exit criteria are met — merge-preservation tests written first and observed failing, `mergeProgress` preserves every state field with correct values, failed pushes retry automatically with no duplicate version bumps, 409 recovery preserves the full state shape, and the full regression baseline is green. **Spencer's explicit go to merge is still required; this report never substitutes for it. DO NOT MERGE without that go. DO NOT DEPLOY — the backend restart is Spencer's separate step and is not needed for this PR (no backend change).**
