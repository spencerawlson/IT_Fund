# D1 Capstone: Scenario Judgment — Thinking Like a Risk Advisor — Avatar Tutor Script

**Lesson ID:** cissp-cap-d1
**Track:** CISSP Domains
**Estimated runtime:** ~5 minutes (~679 words)

## Spoken script

**[HOOK — 0:00]**
Domain 1 scenarios test whether you think like a risk advisor or a
technician. The exam will hand you a crisis — a vulnerability with no patch,
a plan that doesn't match the analysis, a new law, an executive who wants an
exception — and reward the answer that follows the risk process: assess,
choose a treatment, document, and get the right owner to accept what
remains. This lesson drills the patterns.

**[WHY IT MATTERS — ~0:25]**
Scenario questions are where CISSP candidates bleed points. The facts are
always messy and the "obvious" technical answer is usually a distractor. The
examiners are checking one thing: do you follow the risk process under
pressure? These four patterns cover most of what Domain 1 will throw at you.

**[SECTION — When you cannot fix it, compensate — ~0:50]**
Remediation isn't always available. No patch exists, or the business can't
tolerate the downtime. So what does the risk advisor do? The CISSP answer is
never "do nothing" — and it's rarely "pull the plug unilaterally," which is
just panic with extra steps. It's a compensating control: something that
reduces the likelihood or impact while the risk is formally tracked. A WAF
rule in front of the unpatchable database. Network segmentation around the
fragile system. Different mechanism, equivalent protection.

But a compensating control is not a shrug. It must be documented,
time-bound where possible, and tied to risk acceptance by the appropriate
owner. Here's why: a "temporary" control without an owner and a review date
becomes a permanent shadow control — unreviewed, unowned, and eventually
forgotten. The pattern the exam wants: compensate, document, assign an
owner, set a review date.

And keep the risk treatment order in your head: avoid, transfer, mitigate,
accept — in that thinking order. Compensating controls live in the mitigate
step. If even mitigation isn't possible, the remaining risk gets formally
accepted by someone with the authority to accept it. There is always a
named human at the end of the chain.

**[SECTION — Assess first, exceptions through process — ~2:50]**
New regulation, new threat, new business demand — the first step is almost
always to assess the gap between what is required and what exists. A new
privacy law takes effect in six months: you perform a gap analysis of current
controls against the regulation, then build the roadmap. Action without
assessment is guessing, and the exam punishes guessing. You can't plan
remediation until you know what's missing. Assess first, always.

Same discipline applies when the BIA and the plan disagree. The BIA sets a
four-hour RTO; the DR plan restores in twelve. The first move isn't buying
hardware or rewriting the plan over the weekend — it's reporting the gap to
management and initiating a strategy review. The BIA defines the
requirement; the plan must meet it; the gap is a risk decision for
management.

Policy exceptions are legitimate, but only through the exception process:
documented business justification, risk analysis, compensating controls,
expiry date, and sign-off by the risk owner. A senior executive requesting
an MFA exception for convenience gets the same process as everyone else.
Seniority is not a control. The exam will dress this up as deference to
authority — don't bow. The process is the answer.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: choosing the heroic technical action — disconnect the
database, shut everything down — instead of the compensating control with
documented acceptance. Heroics fail the risk-advisor test. Two: acting
before assessing. New regulation, new threat, new demand — gap analysis
first, always. Three: granting policy exceptions by seniority or
convenience. Exceptions go through the formal process or they don't happen:
justification, risk sign-off, compensating controls, expiry.

**[RECAP — ~5:00]**
When you can't remediate, compensate: reduce likelihood or impact another
way, document it, tie it to risk acceptance by the right owner, and give it
a review date — ownerless temporary controls become permanent shadows. Think
in treatment order: avoid, transfer, mitigate, accept. New regulation or
threat? Gap analysis first, roadmap second. BIA versus plan gap? Report to
management and review the strategy. Policy exceptions are legitimate only
through the formal process — documented justification, risk analysis,
compensating controls, expiry, risk-owner sign-off. And seniority is never a
control.

## On-screen visuals

- HOOK: a crisis scenario card — unpatchable vulnerability, ticking clock —
  with the risk-advisor vs technician choice.
- When you cannot fix it, compensate: compensating control bridging the gap
  to the unpatchable system; the treatment-order ladder
  (avoid-transfer-mitigate-accept); documented control with owner and review
  date.
- Assess first, exceptions through process: gap-analysis-first flowchart;
  BIA-vs-plan gap escalation path to management; the policy-exception
  process checklist.
- RECAP: the cheat-sheet rows as a clean summary card.
