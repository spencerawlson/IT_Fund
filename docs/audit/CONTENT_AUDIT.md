# Road to CISSP — Content Audit (pass 1: inventory + representative sample)

Audit date: 2026-11-16 · Branch: `audit/educational-quality` · Status: **pass 1 of N**

This pass inventories every educational asset and reviews a representative
sample from every track. It does **not** yet cover every question; the
remaining review is scheduled in [REMEDIATION_ROADMAP.md](REMEDIATION_ROADMAP.md).
All numbers below are counted from the repository, not estimated.

## How to reproduce

```bash
node scripts/content-audit/run.mjs        # writes inventory.json, structural-issues.json, labs.json
node scripts/content-audit/sample.mjs 6   # the deterministic review sample (6 per track)
node ./node_modules/vitest/vitest.mjs run scripts/content-audit   # automated structural validation
```

Sources read: `backend/data/content.json` (the full generated dataset, premium
included), `src/data/catalog/*`, `src/data/academy/meta.js`, `backend/labs/definitions/*`.

## Inventory (published content)

| Asset | Count | Notes |
|---|---|---|
| Tracks | 21 | One per course |
| Courses / career paths | 21 / 13 | `src/data/catalog` |
| Decks (= lessons) | 222 | Every deck has a lesson body |
| Questions (flashcards / quiz items) | **3,145** | Every one has an answer, an explanation and 3 distractors |
| Interactive puzzles | 76 | order / numeric / widget (`interactive.js`) |
| Module study notes | 426 | `src/data/moduleNotes` |
| Labs | 61 | **32 simulated** (mock command interpreter), **29 real Docker containers** when enabled |
| Lab objectives | 349 | 344 have hints |
| Registered sources | 92 | after this pass's fix (was 83) |
| Certifications referenced | 16 | after this pass's fix (was 14) |
| Free tier | 5 decks (57 cards), 5 lessons | the rest is premium, served by the content API |

Per-track question counts: cyber 980, aws-saa 198, cysa 160, aws-security 161,
cissp 169, security 124, network 111, cloud 112, routing 102, linux 100,
ai 98, python 97, terraform 93, cpp 90, intro-it 70, and 80 each for go, rust,
sql, docker, kubernetes, git.

Machine-readable: [`inventory.json`](inventory.json) (every deck with its lesson
metrics and exam mappings), [`labs.json`](labs.json).

## Published vs. placeholder

- Every one of the 222 decks has a lesson body; no empty lesson shells were found.
- Lesson depth varies widely: 166–960 words (median 370); **36 lessons are
  under 300 words**, **159 have no worked examples**, **213 have no further
  reading**.
- **No content carries a review date or reviewer.** There is no way to tell
  when a lesson or question was last checked against its source. This is the
  single biggest process gap versus professional providers (see roadmap).
- Labs are honest about execution today: `labs.json` records 32 as simulated.
  Whether every page that presents a simulated lab avoids the words "real
  terminal" is checked in the lab-validation pass, not yet.

## Representative sample review (technical accuracy)

126 questions — 6 per track across all 21 tracks, spread over decks and tiers
(`sample.mjs`) — were reviewed for correctness, ambiguity, distractor quality
and explanation quality. That is ~4% of the bank.

| Result | Count |
|---|---|
| Incorrect technical statement | 1 (Critical — fixed) |
| Multiple defensible answers | 1 |
| Oversimplified / imprecise | 2 |
| Outdated detail | 1 |
| Definition that varies across sources | 1 |
| Systemic: implausible "joke" distractors | recurring in cyber, Security+ scenario and CySA+ decks |

Overall the sampled content is accurate and well explained — Linux, Terraform,
SQL, Rust, Go and C++ samples had no accuracy findings. The weaknesses are in
**assessment design** (distractors, coverage balance) and **sourcing**, not in
widespread factual error. Full findings with evidence and sources:
[`issues.json`](issues.json).

## Fixed in this branch (high confidence, ids unchanged)

| Id | Fix |
|---|---|
| R-0001 | `rt-static-5`: floating static route question taught the AD rule backwards (Critical) |
| R-0007 | `it-files-cli-5`: answer-key typo (trailing full stop in a path) |
| R-0010 | 9 cited sources (NIST SP 800-30/34/52/53/210, ISO 27001, AWS SAA/SCS, CySA+) registered so they render |
| R-0011 | AWS SAA and AWS Security Specialty courses now show their certification |

Card ids are position-based; every fix edits text in place, so learner
progress is preserved. `content.json` / `content-public.js` were regenerated.
