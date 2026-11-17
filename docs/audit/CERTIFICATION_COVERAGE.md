# Certification Coverage (pass 1 — domain level)

Coverage is measured from the deck → exam-domain mappings in the content
(`deck.cissp`, `deck.secplus`, `deck.saa`, `deck.cysa`, `deck.awss`). It is
**domain-level breadth only**: the content has no per-objective mapping yet,
so "objective fully covered / partially covered / missing" cannot be stated
honestly until that mapping exists (see roadmap step 3).

## Outline versions recorded in the codebase

| Exam | Outline recorded | Valid until | Source |
|---|---|---|---|
| CISSP | 2024 outline, effective 15 April 2024 | 2027-04-15 | ISC2 exam outline page |
| Security+ | SY0-701 | 2027-06-11 | CompTIA |
| AWS SAA | SAA-C03 (comment only) | not recorded | — |
| CySA+ | CS0-003 (comment only) | not recorded | — |
| AWS Security Specialty | SCS-C02 (comment only) | not recorded | — |
| Network+, CCNA, Linux+, ITF+, CCSP, PCEP, CKA, Terraform, AWS CCP/AI Practitioner | **no outline recorded** | — | — |

The codebase treats the current CISSP outline as valid until 15 April 2027.
**The content of the revised CISSP outline has not been verified in this pass**;
before 15 April 2027 the CISSP mapping must be re-checked against the outline
ISC2 publishes, and `EXAM_OUTLINES` should gain the remaining exams so the
automated "outline expired" check covers them too.

## CISSP — mapped questions vs. exam weight

| Domain | Weight | Decks | Questions mapped |
|---|---|---|---|
| 1 Security and Risk Management | 16% | 18 | 340 |
| 2 Asset Security | 10% | 9 | 112 |
| 3 Security Architecture and Engineering | 13% | 27 | 442 |
| 4 Communication and Network Security | 13% | 27 | 334 |
| 5 Identity and Access Management | 13% | 9 | **110** |
| 6 Security Assessment and Testing | 12% | 8 | **119** |
| 7 Security Operations | 13% | 64 | **1,182** |
| 8 Software Development Security | 10% | 12 | 157 |

Domain 7 has ~10x the questions of Domains 5 and 6 at the same exam weight,
because the 37-deck cyber track maps to D7. Breadth exists in every domain;
**depth for the CISSP exam is thinnest in D2, D5 and D6**, and most mapped
items are technical recall rather than CISSP-style managerial judgement.

## Security+ SY0-701

| Domain | Weight | Decks | Questions |
|---|---|---|---|
| 1 General Security Concepts | 12% | 6 | 134 |
| 2 Threats, Vulnerabilities & Mitigations | 22% | 11 | 247 |
| 3 Security Architecture | 18% | 9 | 213 |
| 4 Security Operations | 28% | 10 | 287 |
| 5 Security Program Management & Oversight | 20% | 7 | 188 |

Security+ is the most evenly covered exam, roughly in line with the weights.

## Smaller certification tracks

| Exam | Domains | Questions per domain |
|---|---|---|
| AWS SAA | 4 | 54 / 54 / 54 / 36 |
| CySA+ | 4 | 60 / 40 / 40 / 20 |
| AWS Security Specialty | 6 | 24 / 29 / 32 / 26 / 28 / 22 |

These are introductions, not full exam-prep banks: 20–60 items per domain is
well below what a learner needs to be exam-ready.

## Not yet assessed

- Network+, CCNA, Linux+, ITF+, CCSP, PCEP, CKA, Terraform Associate, AWS CCP
  and AI Practitioner are referenced by courses but have **no domain mapping**,
  so coverage cannot be measured for them.
- Objective-level coverage for every exam (needs the per-card objective field).
