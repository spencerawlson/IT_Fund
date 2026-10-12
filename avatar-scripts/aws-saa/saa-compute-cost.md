# Compute Cost Optimisation — Pricing Models, Rightsizing and Scheduling — Avatar Tutor Script

**Lesson ID:** saa-compute-cost
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~799 words)

## Spoken script

**[HOOK — 0:00]**
Compute is usually the largest line on an AWS bill, and the exam treats cost
optimisation as a design discipline. The same
workload can cost triple or a third depending on three decisions: which pricing
model matches its shape, whether it is sized correctly, and whether it runs
only when needed.

**[WHY IT MATTERS — ~0:25]**
The mental model: pay for flexibility where you need it, commit where
you are certain, and never pay for idle. The exam's cost questions are almost
always a matching exercise — steady-state, spiky, or interruptible.

**[SECTION — The pricing ladder — ~0:50]**
On-Demand is the top of the ladder: no commitment, highest price, the right
choice for unpredictable, spiky, or short-lived workloads — the startup whose
traffic cannot be forecast buys flexibility here. Spot instances are the bottom:
spare EC2 capacity at discounts up to around 90%, reclaimable with two minutes'
notice, perfect for fault-tolerant batch jobs that run nightly and tolerate
interruption. Spot Fleets improve on single requests by diversifying across
instance pools and maintaining target capacity as prices shift.

Steady-state workloads commit. Reserved Instances lock a configuration for one
or three years at a deep discount; Savings Plans commit to a dollar-per-hour
spend instead — a Compute Savings Plan applies across instance families,
regions, operating systems, Fargate, and even Lambda, trading a slightly
smaller discount for far more flexibility. An EC2
Instance Savings Plan goes deeper but stays narrow: one family, one region.
The web tier running 24/7 for two years is the textbook commitment case: a
Compute Savings Plan for flexibility, or an EC2 Instance Savings Plan if the
family is certain. Unpredictable traffic stays On-Demand. Nightly interruptible
batch goes Spot.

**[SECTION — Rightsizing and scheduling — ~2:05]**
The most expensive instance is the one doing nothing. Compute Optimizer applies
machine learning to CloudWatch history and recommends smaller instance types,
and the exam expects you to reach for it whenever a question mentions
over-provisioned or underutilised fleets. The quieter version of the same
waste is the over-provisioned Auto Scaling minimum: capacity that never scales
in still bills around the clock.

Scheduling attacks the time dimension. A development environment used eight
hours a day on weekdays has no business running the other 128 hours — Instance
Scheduler stops and starts resources on a timetable. Idle resources that nobody
remembers are found through Cost Explorer and Trusted Advisor, which flag the
unattached volumes and forgotten instances every account accumulates. Graviton
changes the price-performance math: ARM-based instances delivering materially
better price-performance — AWS cites up to 40% — for compatible workloads. And
Lambda inverts the comparison for spiky APIs: when traffic is intermittent,
paying per request beats paying per hour for an idle instance. Fargate
sits between: pay-per-use containers without server management, cheaper than
idle EC2 at low utilisation, more expensive than well-packed EC2 at sustained
high utilisation.

**[SECTION — Structure and visibility — ~3:20]**
Multiple AWS accounts are a cost-management tool, not just a security one.
Separate accounts isolate each team's spend for chargeback, let service control
policies guard the expensive actions, and still aggregate under consolidated
billing so volume discounts apply across the organisation. The Cost and Usage
Report provides the line-item detail — every hour of every resource — that
feeds serious analysis and anomaly detection.

Dedicated tenancy has its own pricing shape. Dedicated Instances
run on isolated hardware billed per instance — the compliance answer for
noisy-neighbour concerns. Dedicated Hosts allocate whole physical servers,
billed per host, for socket-based licensing: bring your own Oracle or
Windows Server licenses and the host-level visibility satisfies the auditors.
The Free Tier deserves caution because the exam sets traps there: it covers
specific usage amounts of specific services — and nothing else. Forgotten
resources keep billing after the trial project ends, and services the tier
does not cover, like NAT gateway hours and data transfer, bill from the first
byte.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: committing with Savings Plans to a workload whose traffic is
unpredictable — commit only to the steady baseline you can measure. Two:
assuming the Free Tier covers everything — NAT gateways and data transfer bill
from the first byte. Three: when the question prizes flexibility across
families and services, the Compute Savings Plan beats the narrower EC2
Instance plan.

**[RECAP — ~5:05]**
Compute cost is a design discipline. Climb the pricing ladder by workload
shape: On-Demand for the unpredictable, Spot for the interruptible, Savings
Plans for the steady-state. Right-size with Compute Optimizer, schedule what sleeps with
Instance Scheduler, and mind the ASG minimum that never scales in. Graviton
improves price-performance, Lambda wins for spiky traffic, Fargate splits the
difference. Structure spend with multiple accounts under consolidated billing,
read the CUR for the truth, and never mistake the Free Tier for a free account.

## On-screen visuals

- HOOK: a bill with three highlighted decisions — pricing model, sizing, and
  schedule — labelled "triple or a third".
- PRICING LADDER SECTION: the ladder from On-Demand at the top to Spot at the
  bottom; a Compute Savings Plan flexing across families, regions, Fargate, and
  Lambda beside the narrower EC2 Instance plan; workload shapes matched to
  rungs.
- RIGHTSIZING SECTION: Compute Optimizer recommending a smaller instance from
  CloudWatch history; a weekday timetable stopping dev instances at night; a
  Graviton price-performance comparison bar.
- STRUCTURE SECTION: multiple accounts under consolidated billing with volume
  discounts; the CUR as line-item detail; the Free Tier trap — NAT gateway
  hours and data transfer billing from the first byte.
- COMMON MISTAKES: three trap cards — "commit only to measured baselines",
  "free tier ≠ free account", "flexibility means Compute plan".
- RECAP: the cheat-sheet terms as a clean summary card.
