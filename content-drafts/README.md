# Content drafts — awaiting human review

Nothing in this folder is published. The app never imports it, and the content
exporter (`scripts/export-content.mjs`) never reads it. Drafts stay here until a
person has reviewed them.

## Current drafts

| File | What | Items |
|---|---|---|
| `cissp/2026-11-18-d2-d5-d6-scenarios.json` | CISSP managerial scenario questions for the thinnest domains (audit R-0009) — **published 2026-11-19** | 45 published (Domain 2 ×15, Domain 5 ×15, Domain 6 ×15); 0 remaining |

Each item records its draft id, its CISSP domain, the 2024 outline objective it
targets, the deck it would join, and the card itself:
`[question, answer, explanation, [three wrong options]]`, the same shape as
`src/data/academy/*.js`.

## How to review

For each item, check:

1. **The answer is right**, and it is the *best* answer from a CISSP
   (managerial, risk-based) point of view, not just a technically possible one.
2. **Every wrong option is wrong**, but plausible: something a practitioner
   might really choose.
3. **The explanation teaches**: it says why the answer is right and why the
   others are not.
4. **The wording is original.** These were written from the ISC2 outline and
   the standards cited in the explanations, not from any prep provider's
   questions.

Mark an item approved, edit it, or delete it.

## How to publish approved items

1. Append approved cards to the **end** of the target deck's `cards` array in
   `src/data/academy/cissp.js`. Card ids are position-based (`<deckId>-<index>`),
   so inserting or reordering would move learners' progress onto other cards.
2. Run the checks:
   - `node scripts/content-audit/check-drafts.mjs <drafts file>`: the same
     structural checks the published bank passes (it should report no issues).
   - The normal content pipeline and tests (`node scripts/export-content.mjs`,
     then the vitest suite).
3. Delete the published items from the drafts file so they cannot be added twice.

The structural checker cannot judge accuracy. Only the human review above does.
