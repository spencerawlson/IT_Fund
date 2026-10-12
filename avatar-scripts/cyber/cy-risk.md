# Risk Management & Business Continuity: Measuring Risk and Staying Alive — Avatar Tutor Script

**Lesson ID:** cy-risk
**Track:** Cybersecurity Operations
**Estimated runtime:** ~6 minutes (~786 words)

## Spoken script

**[HOOK — 0:00]**
Security exists to manage risk, not to eliminate it. And risk is a business
language, not a technical one. Leaders decide how much risk to accept; your
job is to measure it honestly, price it in dollars or clear ratings, and
drive it down to the line they drew. The CISO who speaks risk gets budget;
the one who speaks vulnerabilities gets blank stares.

**[WHY IT MATTERS — 0:25]**
This lesson covers how risks are assessed and answered, what a business
impact analysis produces, and how continuity planning keeps the organisation
alive when controls fail. It is the management layer of security — and a
heavy exam domain.

**[SECTION — Measuring and answering risk — 0:50]**
Two ways to measure. Qualitative assessments rate risks high, medium, or low
— fast and cheap. Quantitative assessments put numbers on them: single loss
expectancy times annualised rate of occurrence gives annualised loss
expectancy, in dollars. Use qualitative for speed; use quantitative when you
need to justify a budget. A fifty-thousand-dollar loss with a one-in-two-year
rate is twenty-five thousand dollars of annual risk — and a control cheaper
than that pays for itself.

A risk matrix plots likelihood against impact, so the red corner — high
likelihood times high impact — demands action first. Inherent risk is what
you face before controls; residual risk is what remains after. The goal is
never zero risk; it is residual risk at or below the appetite leadership
set.

Four answers exist for any risk. Mitigate it with controls. Transfer it with
insurance or outsourcing — though transfer never removes your residual
liability. Accept it with formal sign-off: a documented decision with an
expiry date, not neglect. Or avoid it by stopping the activity entirely.

**[SECTION — Business impact analysis and continuity — 2:15]**
The business impact analysis identifies critical functions, sets recovery
time and recovery point objectives for each, and maps the dependencies they
need. Its outputs — not anyone's gut feeling — drive the continuity budget.

Maximum tolerable downtime caps it all: the RTO must fit inside the MTD, or
recovery is theatre.

Two plans, two owners. The business continuity plan keeps the whole
organisation running and belongs to business leadership. The disaster
recovery plan restores IT systems and belongs to IT. DRP is a subset of BCP
— do not invert them. Succession planning names trained backups for every
critical role, because incidents do not wait for the one expert to return.

Match alternate sites to RTO: hot sites run ready for seconds-to-minutes
recovery, warm sites need hours, cold sites are empty space for days-long
rebuilds. Separate primary and recovery sites geographically: one regional
disaster must not take both — and think power grids and flood plains, not
just mileage.

**[SECTION — Backups, testing, and communication — 3:40]**
Backup types, and the trade-off. Full backups copy everything. Incremental
copies changes since the last backup of any kind — fast daily, slow to
restore, because you replay the whole chain. Differential copies changes
since the last full — the middle path. Align backup frequency to the
recovery point objective: a weekly tape cannot serve a four-hour RPO.

Test in stages. Tabletops talk through a scenario. Functional exercises
actually fail systems over. Full-interruption tests run the business from
the alternate site. Escalate gradually — the most realistic tests risk real
disruption. Test generators under load monthly: an untested generator is a
hope, not a control.

Continuity lives or dies on communication: who contacts whom, over which
out-of-band channels, with pre-drafted messages for staff, customers,
regulators, and media. Rehearse call trees — a drill finds the dead branches
before two in the morning does.

**[COMMON MISTAKES — 4:50]**
Three traps. One: chasing zero risk. The goal is residual risk at or below
appetite — zero is not on the menu. Two: confusing BCP with DRP. Business
continuity belongs to business leadership and covers the organisation; DR
belongs to IT and restores systems. Three: "accepting" risk by ignoring it.
Acceptance is a documented, signed, expiring decision — anything else is
neglect wearing a nicer name.

**[RECAP — 5:15]**
Measure qualitatively for speed, quantitatively in dollars for budgets —
SLE times ARO is ALE. Plot likelihood against impact; manage inherent down
to residual, at or below appetite. Answer with mitigate, transfer, accept,
or avoid — acceptance signed and expiring. The BIA sets RTO and RPO per
critical function; the RTO must fit inside the MTD. BCP is business-owned,
DRP is IT-owned and sits inside BCP. Hot, warm, and cold sites match your
RTO; separate them geographically. Full, incremental, and differential
backups trade daily speed against restore speed — align frequency to RPO.
Test from tabletop to full interruption, test generators under load, and
rehearse the call trees.

## On-screen visuals

- HOOK: a risk dial being turned down to a line labelled "appetite" —
  management, not elimination.
- Risk: qualitative ratings vs quantitative ALE calculation ($50k × 0.5 =
  $25k); risk matrix with the red corner glowing; inherent-to-residual
  risk bar; the four response options as a decision tree.
- BIA/continuity: BIA outputs — critical functions, RTO/RPO, dependencies;
  MTD cap with the RTO fitting inside; BCP vs DRP ownership split; hot/warm/
  cold site readiness ladder; geographically separated sites on different
  power grids.
- Backups/testing: full vs incremental vs differential restore chains; test
  realism ladder — tabletop to full interruption; generator under load;
  call-tree drill finding a dead branch.
- RECAP: the cheat-sheet table as a summary card.
