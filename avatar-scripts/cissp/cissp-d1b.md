# Domain 1: GRC Deep Dive (16%): Plans, Tests, Controls and Personnel — Avatar Tutor Script

**Lesson ID:** cissp-d1b
**Track:** CISSP Domains
**Estimated runtime:** ~6 minutes (~798 words)

## Spoken script

**[HOOK — 0:00]**
This is where Domain 1 gets mechanical: what's inside a continuity plan, how
recovery tests rank from harmless to terrifying, how controls get classified
two ways, and how people themselves get controlled. The exam adores this
machinery.

**[WHY IT MATTERS — ~0:25]**
Governance, risk and compliance is where security becomes a system instead of a
collection of tools. When the exam asks what's in a plan, which test to run
first, or whether a guideline is mandatory, it's checking whether you know the
machinery — not whether you have opinions about it. Learn it precisely.

**[SECTION — Continuity: plans and analysis — ~0:50]**
The business continuity plan keeps critical business functions running during a
disruption; the disaster recovery plan restores IT systems. The DRP is the
IT-focused subset of the wider BCP effort — and the BCP is owned by the
business, not just IT. That ownership matters: IT can rebuild servers, but only
the business can say which functions matter most.

A BCP contains the Business Impact Analysis, recovery strategies, plan
invocation procedures, roles and responsibilities, communications plans, and
plan maintenance. A DRP contains system recovery procedures, RTO and RPO
targets, backup and restore steps, and alternate site details.

The Business Impact Analysis is the engine behind both. It identifies critical
functions and their dependencies, the maximum tolerable downtime, RTO and RPO
targets, and the financial and operational impacts of disruption. The BIA
drives the priorities of both the BCP and the DRP.

Two metrics, often confused. RTO is how fast a function must be restored. RPO
is how much data loss is tolerable. RTO must sit within the maximum tolerable
downtime, and RPO sets how often you back up. RTO is the ambulance arrival
time; RPO is how much blood you can afford to lose — which is why it
determines how often the donor visits.

**[SECTION — Testing recovery — ~2:40]**
From least to most disruptive: checklist or read-through review, structured
walkthrough — the tabletop — where the team discusses the plan step by step,
simulation where the team practises in a mock scenario, parallel test where
recovery systems run alongside production, and full interruption where
production actually fails over.

Walkthroughs are cheap and discussion-based, good for finding plan gaps.
Simulations add realism without touching production. Parallel tests validate
the plan closely but need duplicate capacity — you're running two of
everything. Full interruption is the most realistic and the riskiest, so it's
done rarely and carefully. Match the test's realism to your appetite for
risk.

**[SECTION — Controls: types and categories — ~3:50]**
Control types describe intent — what the control does. Preventive controls stop
incidents: firewall rules. Detective controls spot them in progress: an IDS.
Corrective controls restore afterwards: backups. Deterrent controls discourage
the attacker: warning signs, policies. Recovery controls restore operations:
failover. Compensating controls substitute when the primary control isn't
feasible.

Control categories describe where the control lives. Administrative: policies,
training, procedures. Technical: firewalls, encryption, authentication enforced
by systems. Physical: guards, locks, cameras. A single control has both a type
and a category — a firewall is technical and preventive; a guard is physical
and deterrent.

One more hierarchy: policy, standards, procedures, guidelines. The policy
states mandatory high-level intent and needs senior management sign-off.
Standards give mandatory specifics. Procedures are step-by-step instructions.
Guidelines are recommended, not mandatory. Intent, specifics, steps, advice —
each level more detailed and less binding than the last.

**[SECTION — Personnel security — ~4:55]**
People are both an asset and a risk. Separation of duties splits critical
tasks so fraud needs collusion. Mandatory vacations force someone else to
perform a person's duties, which can surface fraud or irregularities — the
fraudster can't keep the plates spinning while someone else is at their desk.
Job rotation reduces both fraud opportunity and single points of knowledge.

Separation of duties prevents unilateral fraud. Mandatory vacations detect
ongoing fraud. Job rotation limits how long any one person holds a sensitive
position unobserved. Prevent, detect, rotate — the exam expects you to know
which does what.

**[COMMON MISTAKES — ~4:50]**
Three traps. One: confusing types with categories. Preventive is what it does;
technical is how it's built. A control always has one of each. Two: treating
guidelines as mandatory. Guidelines are recommended — policy is intent,
standards are mandatory specifics, procedures are steps. Three: misordering
the DR tests. Checklist, walkthrough, simulation, parallel, full interruption
— least to most disruptive.

**[RECAP — ~5:15]**
The BCP keeps business functions running and is business-owned; the DRP
restores IT. The BIA identifies critical functions, dependencies, MTD, RTO and
RPO, and drives both plans. RTO is restoration speed, RPO is tolerable data
loss. Recovery tests escalate from checklist to walkthrough to simulation to
parallel to full interruption. Control types describe intent — preventive,
detective, corrective, deterrent, recovery, compensating — and categories
describe location: administrative, technical, physical. Policy states intent,
standards give specifics, procedures give steps, guidelines recommend.
Personnel security runs prevent, detect, rotate: separation of duties, mandatory
vacations, job rotation.

## On-screen visuals

- HOOK: governance machinery — gears labelled plans, tests, controls, people.
- Continuity: plans and analysis: BCP vs DRP content comparison table; the BIA
  as an input feeding both plans; RTO/RPO dual-timeline diagram.
- Testing recovery: five-step ladder from checklist to full interruption, with
  disruptiveness and cost annotated per rung.
- Controls: types and categories: type-by-category matrix with firewall, IDS
  and guard placed; the policy-to-guideline hierarchy as a descending pyramid.
- Personnel security: three-card set — prevent (separation of duties), detect
  (mandatory vacations), rotate (job rotation).
- RECAP: the cheat-sheet rows as a clean summary card.
