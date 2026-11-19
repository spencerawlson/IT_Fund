# Quality Scorecard

## Re-score (2026-11-19), current — 93/100

Measured by hand against the rubric below on the combined tree: main
`99b68ed1` (PR #149 merged) with PRs #150, #151 and #152 applied, plus the
five scoring workstreams (CS0-004 alignment + accuracy read, further reading
everywhere, scorecard/llms.txt correction, lab integration). Full evidence:
`~/workspace/itfund-course-score/RESCORE-2026-11-19.md`. Previous scores on
the same rubric: 87/100 (Nov 18, 2026, same tree minus the five
workstreams), 76/100 on main `922b64c4` (Nov 18, 2026), 66/100
(Nov 17, 2026). **Do not quote 95 or 96** — neither is borne out by this
measurement. (96 is reachable only if Spencer publishes the 45 CISSP
scenario drafts — his decision, not yet made.)

| Dimension | Weight | Score | Measure |
|---|---|---|---|
| Accuracy | 30 | 29 | All 15 CS0-004 objectives verified covered against the official CS0-004 V4 objectives (Document Version 2.0); 14 more lessons read end-to-end (12 clean, 2 errors fixed: pandas is not stdlib, 802.11g mixed-network slowdown). No known errors remain. −1: not every lesson has been read end-to-end. |
| Coverage | 20 | 16 | CySA+ track fully objective-aligned (4 objectives were partial or missing); 39 cards appended (3,145 → 3,184, 0 duplicate groups); labs mapped on 105/222 lessons (was 66). No video layer, no study guide, no mind maps; the 45 CISSP scenario questions are still unpublished drafts. |
| Pedagogy | 25 | 23 | Further reading 67/222 → 222/222 lessons; lessons under 300 words 5 → 0 (`thin.mjs`); labs mapped on 105/222 lessons (47%, was 30%). Scenario questions still drafts; 117 lessons still have no mapped lab (needs new lab content). |
| Writing | 15 | 15 | Total lesson words 108,075 → 111,985; the 5 thin lessons deepened (cy-threat-intel, cl-core-services, py-flow, sec-malware, net-osi) plus py-flow's new "Common mistakes" section and 8 new CySA+ sections; new sections spot-checked and read well. |
| Consistency | 10 | 10 | This scorecard now states the honest measured number (93, not 95/96); `public/llms.txt` says "3,000+ flashcards" vs 3,184 actual; duplicates 0; longest-answer-is-correct 29.7% (cap 35%). |
| **Total** | 100 | **93** | |

**Limits of this score.** Every item was reviewed by an AI reviewer against
current official sources, but not by a human subject-matter expert. A human
SME review of the CISSP and Security+ tracks is still the most valuable next
step. This score is a hand measurement on the combined tree above; it is not
the output of `scripts/content-audit/scorecard.mjs` (see Pass 2 below).

**What is still open.** Accuracy −1: a full end-to-end read of every lesson
(222) — only sampled lessons have been read in full. Coverage −4: the 45
scenario questions still unpublished (worth ~+2 if published — Spencer's
decision); the rest is the video / study-guide / mind-map layer (Spencer's
call on scope and cost). Pedagogy −2: publishing the scenarios (~+1) and
labs on the remaining 117 lessons, which needs new lab content, not more
mapping. Writing −0: closed. Consistency −0: closed by this change
(scorecard + llms.txt corrected). Path to 96: publish the scenarios (~96)
— Spencer's decision; without it, the honest ceiling of this round is 93.

## Pass 2 (2026-11-17) — superseded

The table below is the old script-computed score
(`node scripts/content-audit/scorecard.mjs`), kept as history. Its rubric is
not the course rubric above, and its numbers are not borne out: it awarded
full Accuracy marks for "0 open accuracy findings" while the Nov 18 audit
found the CS0-004 alignment unverified and only sampled lessons read in full.
On the current tree the script now computes **96.7**, not 95 — neither figure
is the honest course score. Do not quote either.

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

**Remaining gaps (as written Nov 17, superseded by the re-score above).**
96 lessons are still thin (fewer than three learn sections or under 300
words). The CISSP pool is over-weighted on D7 and under-weighted on D2, D5
and D6. A third of CISSP items should be scenario questions; about a quarter
are.

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
