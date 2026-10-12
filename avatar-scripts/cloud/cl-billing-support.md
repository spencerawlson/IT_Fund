# Pricing, Support & Governance Basics: Don't Get Surprised by the Bill — Avatar Tutor Script

**Lesson ID:** cl-billing-support
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~670 words)

## Spoken script

**[HOOK — 0:00]**
Cloud bills surprise people because everything is metered and nothing stops
you from spending. Cost control and basic account governance belong on day
one — not after the first shocking invoice. This lesson is the cheapest
insurance in the track.

**[WHY IT MATTERS — ~0:25]**
FinOps is now an exam domain and a job skill: engineers who can explain what
things cost get trusted with bigger decisions. And practically, every
architecture you will ever design has a price tag — learn to read it before
you build, not after.

**[SECTION — Pricing models — ~0:50]**
On-demand pricing is flexible and the most expensive per hour — the default,
and the one you pay when you have not thought about it. Reserved Instances
and Savings Plans give large discounts for committing to steady usage for one
to three years: predictability bought with commitment. Spot instances are the
cheapest — up to about 90% off — but AWS can reclaim them with two minutes'
notice. So they suit interruptible jobs: batch processing, CI pipelines,
anything that can die mid-run without tragedy.

Then the charge that ambushes architects: egress. Data leaving the cloud to
the internet, or crossing regions, is charged; ingress is usually free. An
architecture that moves a lot of data out can cost far more than the compute
itself. Always ask where the data flows, not just where it sits.

**[SECTION — Keeping costs visible — ~1:55]**
Tag every resource — owner, environment, cost-center. Tags are how costs get
allocated, how ownership is found, how automation and policy target the right
things. Untagged resources are mystery spend.

Set a budget alert on day one of any account, so you are notified when spend
crosses a threshold. It is the smoke detector of cloud finance: cheap,
simple, embarrassing to lack after an incident.

Rightsizing — matching instance size to actual usage — is often the quickest
cost win. Most over-provisioned instances were sized by guesswork on day one
and never revisited. FinOps is the discipline around all of this:
collaborative cloud financial management across engineering and finance, in a
cycle of inform, optimise, and operate. And TCO — total cost of ownership —
comparisons must include the hidden on-premises costs: power, cooling, staff,
hardware refresh. Cloud looks expensive until you price the building.

**[SECTION — Account governance — ~3:00]**
The root account has unrestricted power and cannot be limited by IAM
policies. That sentence should scare you a little. Enable MFA on it, lock
the credentials away, and do daily work through role-based admin accounts
instead. Root is for emergencies and account-level changes — never for
Tuesday.

A landing zone is a pre-configured, secure multi-account baseline —
accounts, logging, guardrails, networking — that every new workload starts
from. Instead of each team inventing its own foundations, the organisation
builds one safe starting point. AWS Control Tower and Azure Landing Zones
build one for you. Governance that arrives before the workload is governance
that actually works.

**[COMMON MISTAKES — ~3:55]**
Three traps. One: assuming ingress and egress cost the same. Data in is
usually free; data out is charged — design accordingly. Two: treating the
root account like an admin login. MFA it, lock it away, never use it daily.
Three: comparing cloud costs to on-premises hardware alone. TCO includes
power, cooling, staff, and refresh — price the whole building.

**[RECAP — ~4:15]**
On-demand is flexible and priciest; Reserved and Savings Plans discount one-
to three-year commitments; Spot is up to 90% off but reclaimable in two
minutes — batch and CI only. Egress is charged, ingress usually free. Tag
everything, set budget alerts on day one, rightsize relentlessly, and run
FinOps as inform, optimise, operate — with TCO that prices the whole
building. The root account gets MFA and a locked drawer, never daily use;
and every workload starts from a landing zone — Control Tower or Azure
Landing Zones. Day-one discipline, not post-invoice regret. That is the
lesson.

## On-screen visuals

- HOOK: shocking cloud invoice morphing into a calm dashboard with budget
  alerts.
- Pricing models: three pricing cards — on-demand, reserved/savings plans,
  spot (with 2-minute reclaim warning); egress vs ingress cost arrows on a
  data-flow diagram.
- Keeping costs visible: tagged resources rolling up into cost-center
  reports; budget alert threshold with notification; rightsizing — oversized
  instance shrinking to actual usage; FinOps inform → optimise → operate
  cycle; TCO comparison including power, cooling, staff, refresh.
- Account governance: root account in a vault with MFA; role-based admin
  accounts for daily work; landing zone as a pre-built foundation with
  accounts, logging, guardrails, networking.
- RECAP: the cheat-sheet terms as a clean summary card.
