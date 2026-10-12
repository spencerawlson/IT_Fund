# Compliance, Frameworks & Third-Party Risk: Laws, Audits and Vendor Trust — Avatar Tutor Script

**Lesson ID:** cy-governance
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Someone has to decide what "secure enough" means, prove it to outsiders, and
keep vendors honest: the laws that constrain you, the frameworks that
organise you, the audits that verify you, and the contracts that bind your
third parties.

**[WHY IT MATTERS — 0:25]**
This lesson maps the compliance landscape Security+ tests — HIPAA, SOX, PCI
DSS, GDPR and friends — plus the frameworks, privacy principles, and
vendor-risk practices behind them.

**[SECTION — The compliance landscape — 0:50]**
Start with health and finance. HIPAA protects health information held by
covered entities and their business associates, with breach notification
within 60 days. Sarbanes-Oxley demands reliable financial reporting — which
forces controlled IT systems under Section 404. The GLBA Safeguards Rule
requires written security programs at financial institutions — even car
dealerships offering financing.

California's CCPA and CPRA grant consumers rights to know, delete, and opt
out of the sale or sharing of personal data. FERPA guards student education
records. FISMA makes federal systems continuously manage risk through the
NIST Risk Management Framework.

PCI DSS is an industry standard, not a law — but its twelve requirement
families bind anyone handling card data, and transaction volume decides
between self-assessment and an on-site Report on Compliance. GDPR adds
data-subject rights — access, rectification, erasure, portability,
objection — and the ePrivacy Directive layers cookie consent on top.

**[SECTION — Frameworks that organise security — 2:10]**
The NIST Risk Management Framework runs seven steps, with authorisation as
an explicit risk decision: Prepare, Categorize, Select, Implement, Assess,
Authorize, Monitor.

ISO 27001 states the certifiable requirements for an information security
management system; ISO 27002 is the companion code of practice, and ISO
27701 extends both into privacy.

The CIS Controls version 8 organise eighteen controls into Implementation
Groups: IG1 is basic cyber hygiene every organisation should reach; IG2 and
IG3 add depth. SOC 2 reports on five trust services criteria — Security plus
Availability, Processing Integrity, Confidentiality, and Privacy as needed.

NIST CSF 2.0 added Govern as a sixth top-level function above the original
five. For cloud, the CSA Cloud Controls Matrix maps provider controls to
ISO, SOC 2, and others — while FedRAMP standardises authorisation for US
federal cloud use.

**[SECTION — Privacy principles and data rights — 3:45]**
Two principles do most of the work. Data minimisation: collect and keep only
what you need. Purpose limitation: use data only for the purpose collected.
Know your data regimes: PII identifies a person, PHI is health data, PCI is
cardholder data — each triggering different laws.

Data sovereignty means data answers to the laws where it resides, driving
residency and cloud-region choices. The right to erasure is easy to promise
and hard to deliver: every copy must be found across backups, logs, and
vendor systems.

The controller decides purposes and means and carries primary
accountability; the processor acts only on instructions. Cross-border
transfers need an adequacy decision, Standard Contractual Clauses, or
Binding Corporate Rules — high-risk processing triggers a Data Protection
Impact Assessment first.

**[SECTION — Policies, audits, and third-party risk — 5:00]**
Policies set intent. Acceptable use defines permitted behaviour and
consequences. Data retention sets how long each type lives and how it dies.
BYOD rests on MDM enrolment plus containerisation. And the IR trio: the
policy authorises, the plan organises, the playbook executes. NIST 800-63B
says: long passphrases, no forced rotation without cause, and checks against
breached lists.

Internal audits serve management and can run continuously; external audits
serve regulators or customers and are point-in-time. Findings mean a control
failed and demand dated responses.

Vet vendors before signing — security posture, financial health, compliance
evidence, incident history — because leverage evaporates after the contract
is signed. Demand right-to-audit clauses. Define SLAs with measurement and
remedies. Remember fourth-party risk: your vendors' vendors. Offboard
completely — orphaned vendor VPN accounts are a classic breach path.

**[COMMON MISTAKES — 6:10]**
Three traps. One: calling PCI DSS a law. It is an industry standard —
binding through contracts, not legislation. Two: confusing the IR policy,
plan, and playbook. Policy authorises, plan organises, playbook executes.
Three: signing first and vetting later. Security requirements belong in
procurement.

**[RECAP — 6:35]**
HIPAA guards health data with 60-day breach notice; SOX 404 controls IT
behind financial reporting; PCI DSS binds card handlers through twelve
families; GDPR grants access, rectification, erasure, portability, and
objection. The NIST RMF runs Prepare through Monitor with Authorize as a
risk decision; 27001 is certifiable, 27002 is guidance; CIS IG1 is basic
hygiene; SOC 2 covers five trust criteria; CSF 2.0 adds Govern. Minimise
data, limit its purpose, respect sovereignty — deliver erasure for real,
anonymised not merely de-identified. Controllers decide, processors follow.
Audit internally for management, externally for regulators. Vet vendors
before signing, write SLAs with remedies, watch fourth parties, offboard
completely.

## On-screen visuals

- HOOK: four pillars — laws, frameworks, audits, contracts — holding up a
  "secure enough" roof.
- Compliance: law-by-law cards — HIPAA 60-day notice, SOX 404, GLBA, CCPA
  rights, PCI DSS 12 families with SAQ-vs-ROC volume gate, GDPR rights
  list; "industry standard, not a law" stamp on PCI DSS.
- Frameworks: RMF seven-step staircase with Authorize highlighted; 27001 vs
  27002 vs 27701 split; CIS IG1/IG2/IG3 tiers; SOC 2 five criteria; CSF 2.0
  six functions with Govern on top; CCM mapping web.
- Privacy: minimisation and purpose-limitation gates; data regime labels —
  PII, PHI, PCI; erasure hunting copies across backups, logs, vendors;
  anonymisation vs de-identification; controller-vs-processor decision flow.
- Policies/audits/vendors: policy stack — AUP, retention, BYOD; IR policy/
  plan/playbook trio; internal vs external audit comparison; vendor vetting
  checklist with right-to-audit and SLA remedies; fourth-party chain and
  offboarding checklist.
- RECAP: the cheat-sheet table as a summary card.
