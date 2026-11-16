# Question Bank Audit (pass 1)

3,145 questions in 222 decks. Format: one stem, one keyed answer, three
distractors, one explanation (`[q, a, x, wrong]`), shuffled at runtime.

## Automated structural results (whole bank)

From `scripts/content-audit` (counted, 2026-11-16, after this branch's fixes):

| Check | Count | Severity | Meaning |
|---|---|---|---|
| Empty question / answer / explanation | 0 | — | every item is complete |
| Distractor identical to the answer | 0 | — | (4 false alarms from an early, too-loose comparison were ruled out) |
| Wrong distractor count | 0 | — | all items have 3 |
| Same question twice in one deck | 0 | — | |
| Answer-length giveaway | 345 | Low | keyed answer > 2x the longest distractor |
| Padded distractor (candidate) | 176 | Low | a distractor carries an explanatory tail the answer lacks |
| Cross-track duplicate, reworded answers | 47 | Low | same term taught in two tracks; answers must agree |
| Near-duplicate wording within a track | 7 | Low | |
| Exact duplicate, same answer | 1 | Low | |

Interpretation:

- The bank is **structurally clean**: nothing is missing, nothing is keyed
  wrong by construction.
- **Answer-length giveaway (11% of items)** and **padded distractors** are the
  same underlying problem: test-wise learners can pick the odd one out by
  shape, not knowledge. PR #101 rebalanced length; some of the padding it
  added reads artificially (e.g. `"concat("Hi", name), joining the pieces
  together"`). The padded-distractor check is a *candidate* list — many
  flagged items are deliberate misconception distractors and should stay.
- The 47 cross-track duplicates (mostly `security` vs `cyber`) are acceptable
  reinforcement **if** both answers agree; a consistency read is pending.

## Sample findings (126 items, all tracks)

See [`issues.json`](issues.json): 1 Critical (fixed), 1 multiple-defensible,
2 imprecise, 1 outdated, 1 source-dependent definition, and one systemic
High finding — **implausible distractors** in the cyber, Security+ scenario
and CySA+ decks ("A fishing net", "Customers are lying", "Outages build
character"). Scenario questions only teach judgement when every option is a
plausible practitioner choice.

## Classification status (Phase 4)

| Dimension | Status |
|---|---|
| Certification + domain | Recorded per **deck** (cissp 141 decks, secplus 43, saa 11, cysa 8, awss 10), not per question |
| Objective (sub-domain) | **Not recorded** anywhere |
| Difficulty | Per deck tier only (beginner / intermediate / advanced) |
| Cognitive level (Bloom) | **Not recorded** |
| Question type | Single-best-answer only; no multi-select, ordering or drag-and-drop items in the exam banks (puzzles exist separately) |
| Review status / reviewer / date | **Not recorded** |

Per-question objective, Bloom level and review metadata are needed before the
bank can claim exam-objective coverage at the depth of professional providers.
Adding them is a data-model change (new optional fields keyed by card id, so
ids and progress are untouched) — proposed in the roadmap, not done here.

## CISSP managerial items

CISSP-specific items (`cissp` track): 169. The "capstone" scenario decks
(`cissp-cap-d*`) are the right style — BEST-answer, business-impact framing —
but there are few of them. Expanding managerial scenarios is a top roadmap
item and must be written and reviewed by a qualified human; this audit does
not auto-generate exam questions for publication.
