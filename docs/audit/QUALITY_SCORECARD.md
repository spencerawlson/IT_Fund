# Quality Scorecard

## Pass 2 (2026-11-17), current

Computed by `node scripts/content-audit/scorecard.mjs` from the content itself. The
weights are this audit's own rubric, not an industry standard. Re-run the script for
up-to-date numbers.

| Component | Weight | Score | Measure |
|---|---|---|---|
| Structural | 10 | 10 | 0 Critical/High structural issues |
| Accuracy | 25 | 25 | 3,145 / 3,145 items read; 0 open accuracy findings |
| Distractors | 15 | 14.9 | 20 items still show a length or padding giveaway |
| Sourcing | 10 | 10 | 222 / 222 decks cite a registered source |
| Lessons | 15 | 13.4 | 222 / 222 have a worked example; 126 meet all five depth criteria |
| Alignment | 15 | 12.6 | CISSP domain mix 22.5% from exam weights (D7 still heavy) |
| Application | 5 | 4.2 | 552 / 2,212 CISSP-mapped items are scenario/judgement (target 30%) |
| Labs | 5 | 4.9 | 344 / 349 objectives hinted; 59 / 61 labs validate every objective |
| **Total** | 100 | **95** | |

**Limits of this score.** Every item was reviewed by an AI reviewer against current
official sources, but not by a human subject-matter expert. "0 open accuracy findings"
means nothing outstanding was found, not that the content is certified correct. A
human SME review of the CISSP and Security+ tracks is still the most valuable next step.

**Remaining gaps.** 96 lessons are still thin (fewer than three learn sections or
under 300 words). The CISSP pool is over-weighted on D7 and under-weighted on D2, D5
and D6. A third of CISSP items should be scenario questions; about a quarter are.

---

## Pass 1

Measured values only. Where something has not been measured yet, it says so —
no score is estimated.

| Dimension | Measure | Value | Status |
|---|---|---|---|
| Structural completeness | Items with question, answer, explanation, 3 distractors | 3,145 / 3,145 (100%) | Measured |
| Answer-key integrity | Distractor identical to the keyed answer | 0 | Measured |
| Technical accuracy (sample) | Sampled items with an accuracy defect | 6 / 126 (4.8%); 1 Critical | Sample only |
| Distractor quality | Answer-length giveaway | 345 items (11%) | Measured |
| Distractor quality | Padded-distractor candidates | 176 | Measured (needs review) |
| Sourcing | Lessons with further reading | 9 / 222 (4%) | Measured |
| Sourcing | Decks citing no source | 15 / 222 | Measured |
| Lesson depth | Lessons with worked examples | 63 / 222 (28%) | Measured |
| Lesson depth | Lessons under 300 words | 36 / 222 | Measured |
| CISSP balance | Questions in D5 / D6 vs D7 | 110 / 119 vs 1,182 | Measured |
| Objective mapping | Items mapped to an exam objective | 0 (domain-level only) | Measured |
| Review governance | Items with reviewer + review date | 0 | Measured |
| Labs | Simulated vs real-container | 32 / 29 | Measured |
| Labs | Behaviour verified end to end | — | **Not yet measured** |
| Video | Lessons with video / transcript | — | **Not yet measured** |
| Competitor parity | — | — | **Not yet researched** |
