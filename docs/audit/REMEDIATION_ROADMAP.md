# Remediation Roadmap

Prioritised by educational impact. "Human" means a qualified reviewer must
approve before publishing; nothing in the exam banks is auto-generated for
publication.

## Audit phases — status

| Phase | Deliverable | Status |
|---|---|---|
| 1 Inventory | CONTENT_AUDIT.md, inventory.json, labs.json | **Done** |
| 2 Technical accuracy | issues.json | **Sample done** (126 items, every track); full review pending |
| 3 Certification alignment | CERTIFICATION_COVERAGE.md | **Domain level done**; objective level blocked on step 3 below |
| 4 Question quality | QUESTION_AUDIT.md | **Structural done**; per-item classification pending |
| 5 Lesson quality | (lesson metrics in inventory.json) | Metrics done; template + per-lesson review pending |
| 6 Labs & missions | LAB_VALIDATION.md | Not started (inventory only) |
| 7 Competitor benchmark | COMPETITOR_BENCHMARK.md | Not started |
| 8 Video readiness | VIDEO_READINESS.md | Not started |
| 9 QA automation | scripts/content-audit + content-audit.test.js | **Done** (structural); runs in CI with the test suite |
| 10 Scorecard + roadmap | QUALITY_SCORECARD.md, this file | Pass-1 versions |

## Priority backlog

1. **Fix accuracy defects as found** (ongoing). Critical/High first; every fix
   cites a source and keeps the card id. Open: R-0002 to R-0006 (issues.json).
2. **Rewrite implausible distractors in scenario decks** (R-0008, High, human).
   Start with Security+ and CySA+ scenario decks, then cyber. Target: zero joke
   options; every distractor a plausible practitioner choice.
3. **Add per-question metadata** (data model): exam objective id, Bloom level,
   reviewer, review date, source. Optional fields keyed by card id — no id or
   progress change. Unlocks objective-level coverage and "unreviewed content"
   detection in CI.
4. **CISSP depth** (R-0009, High, human): managerial scenario items for
   Domains 2, 5 and 6 first; re-check the D7 mapping of the cyber track.
5. **Sourcing** (R-0012): 1–3 primary sources per lesson, starting with
   exam-mapped tracks; RFC/Cisco sources for the 10 routing decks.
6. **Answer-length / padded distractors** (345 + 176 items): review the
   candidate list deck by deck; lower the CI baseline as items are fixed.
7. **Exam outline register**: record outline versions and expiry for every
   certification a course claims (Network+, CCNA, SAA-C03, CS0-003, SCS, …),
   and verify the revised CISSP outline before 2027-04-15.
8. **Lesson template + depth**: objectives, prerequisites, worked example,
   architecture note, knowledge check, references — applied first to the 36
   lessons under 300 words and the 159 without examples.
9. **Phases 6–8**: lab behaviour validation, competitor benchmark (public,
   authorised material only), video readiness.

## Next audit pass

Continue the accuracy review deck by deck (exam-mapped tracks first:
cissp → security → cysa → aws-security → aws-saa → network → routing → cyber),
then Phases 6, 8 and 7.
