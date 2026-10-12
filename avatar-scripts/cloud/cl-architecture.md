# Well-Architected Design: Build It to Survive — Avatar Tutor Script

**Lesson ID:** cl-architecture
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~630 words)

## Spoken script

**[HOOK — 0:00]**
Cloud makes it cheap to build systems that survive failure — but only if you
design for it. The Well-Architected Framework and a handful of patterns
cover most of what good cloud architecture means. This lesson is the
checklist behind every resilient system you will ever build.

**[WHY IT MATTERS — ~0:25]**
Architecture questions are where cloud exams separate memorisers from
thinkers: given a scenario, which pattern fits? And in the job, these
patterns are the difference between a 3 AM page and a quiet night. Design decisions compound — get them right early; changing them later means migrating live systems.

**[SECTION — The Well-Architected Framework — ~0:50]**
AWS's framework has six pillars: operational excellence, security,
reliability, performance efficiency, cost optimisation, and sustainability —
the most recent, added in 2021, which minimises the environmental impact of
workloads. Azure and Google publish equivalent frameworks. Different names, same concerns — learn the ideas once. Think of the
pillars as the review checklist: every significant design should be able to
answer what it does for each one.

**[SECTION — Scaling and resilience patterns — ~1:30]**
Horizontal scaling adds more instances; vertical scaling makes one instance
bigger. Horizontal is the cloud-native answer — but it demands stateless
application tiers, where any instance can serve any request. So keep sessions
in a shared cache or database, never in instance memory. An Auto Scaling
group maintains and adjusts the instance count based on health and demand,
replacing failed instances automatically — self-healing by headcount. The group's health checks decide what counts as failed, so define them honestly.

Loose coupling means components interact through queues or APIs so a failure
in one does not cascade into the next. SQS for queues, SNS for pub/sub,
EventBridge for events — these decouple services on AWS. A slow downstream
service becomes a queue depth metric, not an outage.

For the database: a multi-AZ deployment keeps a synchronous standby in
another AZ with automatic failover — resilience. Read replicas are different:
they scale reads, are often asynchronous, and are not a failover guarantee.
The exam loves this distinction: standby is for survival, replicas are for
scale.

**[SECTION — Disaster recovery strategies — ~2:50]**
From cheapest and slowest to most expensive and fastest: backup and restore;
pilot light — core data replicated with minimal services running, scaled up
on failover; warm standby — a scaled-down but fully working copy; and
multi-site active/active. Choose by the RTO and RPO the business actually
needs — not by the most impressive diagram. Recovery objectives are business
decisions first, technical designs second.

**[SECTION — Deploying safely — ~3:30]**
Immutable infrastructure replaces servers with new images rather than
patching them in place — eliminating configuration drift, because no server
lives long enough to drift. Blue/green deployment runs two environments and
switches traffic to the new one, with instant rollback by switching back.
A canary release shifts a small share of traffic to the new version first
and watches the metrics before going further. Replace, switch, or
trickle — three ways to deploy without betting the business on any single release. All three share one property: the previous version stays available until the new one proves itself.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: calling read replicas a failover solution. They scale
reads; the synchronous multi-AZ standby is the failover. Two: patching
servers in place and calling it immutable. Immutable means replace, not
repair. Three: picking a DR strategy by prestige. Match RTO and RPO to what
the business needs — backup and restore is a valid answer.

**[RECAP — ~4:40]**
Six pillars — operational excellence, security, reliability, performance
efficiency, cost optimisation, and sustainability, the 2021 addition. Scale
horizontally with stateless tiers and Auto Scaling; decouple with SQS, SNS,
and EventBridge; survive database failure with multi-AZ synchronous
standbys — replicas are for reads. Recover on the DR ladder from
backup/restore through pilot light and warm standby to active/active, chosen
by RTO and RPO. Deploy by replacing (immutable), switching (blue/green), or
trickling (canary). Build it to survive. That is well-architected.

## On-screen visuals

- HOOK: fragile single server vs resilient multi-AZ architecture absorbing
 a failure.
- Framework: six pillars as columns — sustainability highlighted as the
 2021 addition; Azure/Google equivalents noted.
- Scaling: horizontal (more instances) vs vertical (bigger instance);
 stateless tier with sessions in shared cache; Auto Scaling group
 replacing a failed instance; loose coupling via SQS/SNS/EventBridge;
 multi-AZ standby with automatic failover vs async read replicas.
- DR: ladder graphic — backup/restore → pilot light → warm standby →
 active/active — with cost/speed tradeoff and RTO/RPO selectors.
- Deploying: immutable replacement vs in-place patching; blue/green
 traffic switch with instant rollback; canary trickling traffic while
 metrics are watched.
- RECAP: the cheat-sheet terms as a clean summary card.
