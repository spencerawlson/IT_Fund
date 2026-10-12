# Security Governance at Scale — Multi-Account Structure and Compliance — Avatar Tutor Script

**Lesson ID:** awss-governance
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~5 minutes (~763 words)

## Spoken script

**[HOOK — 0:00]**
Security at the scale of one account is a checklist. Security at the scale of a
hundred accounts is a system of government: who may create accounts, what
guardrails apply automatically, where the audit trail lives, and how you prove
any of it to a regulator. The specialty exam treats governance as
architecture, not paperwork.

**[WHY IT MATTERS — ~0:25]**
This lesson covers governing AWS at scale: the multi-account structure, the
management account's austere role, Control Tower guardrails, delegated
administration, continuous compliance with Config, and the audit evidence
pipeline. In real organisations these decisions are nearly irreversible once
the estate grows — the exam tests whether you would lay the foundations
correctly on day one.

**[SECTION — The multi-account foundation — ~0:50]**
The recommended structure is a management account plus separate accounts per
workload and environment, governed by SCPs with centralised logging. The
account boundary is the strongest isolation AWS offers: a compromised workload
can never reach billing, Organisations, or SCP controls if those live in an
account that runs nothing. The most privileged account does the least — no
workloads in the management account, ever.

New accounts should be born compliant. Control Tower's Account Factory
provisions standardised, pre-approved accounts with baselines applied
automatically — logging destinations, guardrails, encryption defaults — so
teams never start from an empty, ungoverned account. Guardrails come in two
flavours: preventive guardrails — SCPs — block non-compliant actions before
they happen, while detective guardrails — Config rules — flag them after the
fact. Prevent what you can; detect the rest. Daily security operations run from
a delegated administrator account, not the management account. GuardDuty,
Security Hub, and Macie are managed centrally from the delegated account,
keeping the management account's attack surface minimal. And the audit trail
lives in a dedicated log archive account: immutable, centralised CloudTrail
and Config logs from every account, protected with MFA Delete so even a
compromised admin cannot erase history.

**[SECTION — Continuous compliance and audit evidence — ~2:25]**
Compliance at scale is continuous or it is fiction. Deploy Config conformance
packs — the CIS benchmark pack, for example — across the organisation through a
Config aggregator, and non-compliant resources plus their history become
exportable evidence. Continuous evidence beats point-in-time screenshots, and
it is what auditors actually want: proof that the control held every day, not
just on assessment day.

AWS Audit Manager turns Config and CloudTrail data into auditor-ready reports
mapped to frameworks like CIS, PCI, and HIPAA. AWS Artifact supplies the other
half of due diligence: on-demand third-party audit reports — SOC 2, ISO
27001 — proving AWS's own controls without auditing the provider yourself.
Governance needs a written baseline to automate against: the required SCPs,
Config rules, logging destinations, encryption defaults, and network patterns,
codified and enforced rather than documented and hoped for. A tagging strategy
belongs in that baseline and enforced by policy, because SCPs, Config rules,
cost allocation, and finding routing all key off consistent tags — untagged
resources escape governance entirely.

During an incident, the architecture pays for itself: cross-account CloudTrail
is queried from the log archive account with Athena or CloudTrail Lake over the
centralised bucket — one query surface for every account. Findings route
automatically through Security Hub custom insights and EventBridge rules,
directed by account, severity, and resource tags to the owning team's channel.
And the minimum audit trail an SCS-C02 architect should design for is explicit:
organisation-wide CloudTrail with log validation to a locked archive, Config
recording everywhere, and at least a year of retention. You cannot investigate
what you did not record.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: workloads in the management account — the most privileged
account must run nothing. Two: preventive versus detective guardrails — SCPs
block, Config rules flag; the exam tests which one stops the action. Three:
treating compliance as a point-in-time exercise — auditors want continuous
evidence from Config history, not assessment-day screenshots.

**[RECAP — ~5:05]**
Governance is architecture. The management account runs nothing and stays
locked down; per-workload and per-environment accounts are governed by SCPs
with centralised logging. Control Tower's Account Factory births accounts
compliant — preventive SCP guardrails block, detective Config guardrails flag.
Daily security operations run from a delegated administrator account, and the
audit trail lives in a tamper-evident log archive account. Prove compliance
continuously: Config conformance packs through an aggregator, Audit Manager
mapping evidence to frameworks, Artifact covering AWS's own controls, a
written baseline codified and enforced, and tags driving it all. Minimum audit
trail: validated organisation-wide CloudTrail to a locked archive, Config
everywhere, a year or more of retention.

## On-screen visuals

- HOOK: one account's checklist beside a hundred accounts' system of
  government — who creates, what applies automatically, where the trail lives.
- FOUNDATION SECTION: the management account empty and locked down, workload
  accounts governed by SCPs; Account Factory stamping out compliant accounts
  with baselines; preventive versus detective guardrails; the delegated admin
  account operating security tooling; the log archive account sealed.
- COMPLIANCE SECTION: a conformance pack deploying CIS rules across the
  organisation with history exporting as evidence; Audit Manager mapping to
  frameworks; the written baseline as code; findings routing by account,
  severity, and tag to the owning team.
- COMMON MISTAKES: three trap cards — "nothing runs in the management
  account", "SCPs block, Config flags", "evidence must be continuous".
- RECAP: the cheat-sheet terms as a clean summary card.
