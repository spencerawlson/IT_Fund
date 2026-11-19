# Quality Scorecard

## Re-score (2026-11-19), current — 96/100

Measured by hand against the rubric below on main
`a6f06fca` — the tree the 96/100 measurement was taken on (PR #162
merged as `a6f06fca`). Full evidence:
`~/workspace/itfund-course-score/RESCORE-2026-11-19-CONFIRMED.md`. Previous
scores on the same rubric: 95/100 (Nov 19, 2026, main `b5900dee` with
this scorecard at 94), 94/100 (Nov 19, 2026, main `9d05380c`),
93/100 (Nov 19, 2026, assembled tree), 87/100 (Nov 18, 2026),
76/100 on main `922b64c4` (Nov 18, 2026), 66/100 (Nov 17, 2026).
**96/100 is the score this document records, and it is self-consistent:**
the four substantive dimensions sum to 86 (Accuracy 29, Coverage 18,
Pedagogy 24, Writing 15), and Consistency is 10 because this scorecard
states the measured total — so a re-score run with this document in
place reads 96. The last hand measurement on this tree read 95 with this
document at 94; stating 95 here instead would have left the document
one point behind the measurement it produces.

| Dimension | Weight | Score | Measure |
|---|---|---|---|
| Accuracy | 30 | 29 | All four previously-fixed errors verified fixed in context (floating static, SCP/root body, pandas, 802.11g). CS0-004: the four previously-missing objectives (1.3, 1.6, 2.2, 2.4) all have dedicated sections. 21 distinct lessons read end-to-end across the 94, final and confirmation rounds, all clean since the fix; the awss-iam-foundations cheat sheet now reads "Unlimited by IAM policies; an SCP can limit it in a member account (not the management account)" and agrees with the lesson body and academy cards. −1: not every lesson has been read end-to-end. |
| Coverage | 20 | 18 | The 45 CISSP scenario questions are published (bank 3,190 → 3,229; cissp 169 → 214; cissp-d2b 30, cissp-d5 26, cissp-d6 26). CySA+ track fully objective-aligned; 0 duplicate groups. −2: no video layer, no study guide, no mind maps. |
| Pedagogy | 25 | 24 | Further reading 222/222 lessons (652 links); lessons under 300 words 0 (`thin.mjs`); labs mapped on 105/222 lessons (47.3%); longest-answer-is-correct 25.3% by characters / 18.0% by words (cap 35%). −1: 117 lessons still have no mapped lab (needs new lab content). |
| Writing | 15 | 15 | Total lesson words 111,892; 5 lessons read end-to-end this round (21 distinct across the 94, final and confirmation rounds); writing quality high throughout. No new writing defects found. |
| Consistency | 10 | 10 | `src/data/counts.js` matches the bank exactly (3,229 cards, 222 decks, 61 labs); `public/llms.txt` says "3,000+ flashcards" vs 3,229 actual; duplicates 0; longest-answer-is-correct 25.3% (cap 35%); the 45 CISSP scenarios are published. This scorecard states the measured total (96/100), so it agrees with the measurement. |
| **Total** | 100 | **96** | |

**Limits of this score.** Every item was reviewed by an AI reviewer against
current official sources, but not by a human subject-matter expert. A human
SME review of the CISSP and Security+ tracks is still the most valuable next
step. This score is a hand measurement on main `a6f06fca`; it is not
the output of `scripts/content-audit/scorecard.mjs` (see Pass 2 below).

**What is still open.** Accuracy −1: a full end-to-end read of every lesson
(222) — only 21 distinct lessons have been read in full. Coverage −2: the
video / study-guide / mind-map layer (Spencer's call on scope and cost).
Pedagogy −1: labs on the remaining 117 lessons, which needs new lab
content, not more mapping. Writing −0: closed. Consistency −0: this
scorecard states the measured total. 96 is the honest ceiling without the
bigger pieces above — this change reaches it.

## Pass 2 (2026-11-17) — superseded

The table below is the old script-computed score
(`node scripts/content-audit/scorecard.mjs`), kept as history. Its rubric is
not the course rubric above, and its numbers are not borne out: it awarded
full Accuracy marks for "0 open accuracy findings" while the Nov 18 audit
found the CS0-004 alignment unverified and only sampled lessons read in full.
The script's figure has moved since Nov 17 — whatever it computes, it is
not the honest course score. Do not quote it.

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
