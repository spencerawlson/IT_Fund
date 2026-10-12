# Reporting & Stakeholder Communication: Making Security Change Decisions — Avatar Tutor Script

**Lesson ID:** cysa-reporting
**Track:** CompTIA CySA+ (CS0-003)
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
The best analysis in the world is worthless if it never changes a decision.
Reporting is how security work becomes business action — how an incident
becomes funding, a vulnerability trend becomes a policy change, the SOC's
daily grind becomes a board-level conversation about risk.

**[WHY IT MATTERS — ~0:25]**
Analysts get promoted on this skill, not just on technical depth. The exam
tests whether you can write for the audience in front of you — executives,
boards, regulators Make it land.

**[SECTION — Metrics that mean something — ~0:50]**
The distinction the exam tests: metrics measure activity; KPIs tie
measurements to business objectives. "We closed 400 tickets" is a metric. "We
reduced mean time to remediate critical vulnerabilities from 30 days to 9 days
against our 14-day SLA" is a KPI — it connects the work to an objective the
business chose. Executives fund KPIs. They skim metrics.

MTTD and MTTR belong in reporting as trend metrics — not single numbers but
direction over time, showing whether detection and response are getting faster
or slower. Trend reporting — alert volume, true positive rate, MTTR plotted
across quarters — turns operational data into a story about program health.

Vulnerability programs have their own essentials. Vulnerability aging: how
long findings remain open past their remediation SLAs. Scan coverage: the
percentage of assets scanned during the period. Unscanned assets are
unmeasured risk. With mean time to remediate by severity, they answer the only
question leadership actually asks: are we getting safer or not?

**[SECTION — Communicating with stakeholders — ~1:55]**
Different stakeholders need different reports from the same facts. An
executive incident summary contains business impact, scope, actions taken, and
next steps — no technical jargon. Executives need decisions, not packet
captures: what happened, what it costs, what is being done. Log dumps and file hashes belong in the technical
appendix, not the briefing.

When the board asks "are we secure," the correct answer is risk framing —
never a yes. No honest analyst claims absolute security. The professional
answer describes residual risk in business terms: what the program covers,
where the gaps are, what the trends show, what investment would change.

A stakeholder communication matrix makes notification systematic: a plan
defining who gets told what, when, and by whom during an incident —
executives, legal, PR, IT, HR, customers — so notification is a procedure, not
an improvisation. The SOC shift handoff note keeps continuity so nothing falls between shifts.

**[SECTION — Compliance, legal, and the post-incident record — ~3:00]**
Several compliance frameworks require vulnerability management reporting as a
condition of doing business — PCI DSS, HIPAA, SOC 2 each demand evidence that
vulnerabilities are found, tracked, and remediated on defined timelines.
Compliance reporting is not overhead on the security program. For regulated
organizations it is one of the program's primary products.

Breach notification has formal requirements: what happened, the data types
affected, the steps taken, what affected individuals should do — and the
timelines are law, not courtesy. Under GDPR, supervisory authorities must be
notified within 72 hours of becoming aware of a qualifying breach.
Attorney-client privilege protects the investigation when legal counsel directs it.

The lessons-learned report is the final reporting product of every incident:
a blameless post-incident analysis with assigned action items and owners. It
differs from a forensic report, which documents evidence and technical
findings for potential legal use — the incident report covers timeline and
business impact, the forensic report covers artifacts and analysis. Responsible disclosure — coordinated, factual
public statements made after remediation — is how the organization talks to
the outside world without creating new liability.

**[COMMON MISTAKES — ~4:05]**
Three traps. One: answering "are we secure" with yes. Frame residual risk in
business terms. Two: confusing metrics with KPIs. Activity counts do not fund
programs; measurements tied to objectives do. Three: burying executives in
technical detail. Lead with impact and decisions; the hashes go in the
appendix.

**[RECAP — ~4:25]**
Metrics count activity; KPIs tie it to objectives — and quarterly trends turn
numbers into evidence of program health. Executives get impact, scope,
actions, and next steps, no jargon; the board gets risk framing, never a yes;
a communication matrix makes notification a procedure. Compliance frameworks
demand reporting as a product, breach notifications carry legal timelines
like GDPR's 72 hours, counsel protects the investigation, and every incident
ends in a blameless lessons-learned report with owners. Analysis that changes decisions.

## On-screen visuals

- HOOK: analyst's findings flowing into a boardroom decision — funding
 approved, policy changed.
- Metrics: metric vs KPI split cards ("400 tickets closed" vs "MTTR 30 → 9
 days against a 14-day SLA"); trend lines across four quarters for MTTD,
 MTTR, alert volume, true positive rate; vulnerability aging and scan
 coverage gauges.
- Stakeholders: executive summary page (impact, scope, actions, next steps)
 vs technical appendix (hashes, logs); "are we secure" answered with a risk
 framing graphic; communication matrix grid (who/what/when/by whom); shift
 handoff note.
- Compliance/legal: PCI DSS / HIPAA / SOC 2 reporting requirements checklist;
 breach notification contents and GDPR 72-hour timeline; counsel directing
 the investigation under privilege; lessons-learned vs forensic report
 comparison.
- RECAP: the cheat-sheet terms as a clean summary card.
