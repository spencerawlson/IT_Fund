# Backup and Disaster Recovery — RTO, RPO and the Four Strategies — Avatar Tutor Script

**Lesson ID:** saa-backup-dr
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~774 words)

## Spoken script

**[HOOK — 0:00]**
Every disaster-recovery decision is a negotiation between two numbers: how long
you can be down, and how much data you can afford to lose. The winning design
is the cheapest one that still meets both — not the most elaborate one you can
draw.

**[WHY IT MATTERS — ~0:25]**
Recovery is a system you operate, not a document you file. The exam tests
whether you can match a strategy's cost and recovery profile to the business
requirement — and in real work the same discipline decides whether an outage
is a bad afternoon or a company-ending event. An untested plan is a hope, and
hope is not an architecture.

**[SECTION — RTO, RPO, and the strategy spectrum — ~0:50]**
RTO — recovery time objective — is how long the business can wait for the
system to return. RPO — recovery point objective — is how much data loss is
tolerable, measured as the age of the newest restorable backup. A seconds-level
RPO demands continuous replication; a 24-hour RPO is satisfied by nightly
backups. Every DR question is answered by matching the strategy's cost and
recovery profile to these two numbers.

The four strategies form a ladder. Backup and restore is the cheapest and
slowest: infrastructure is rebuilt from backups on failure. Pilot light keeps
a minimal core running in the recovery region and scales to full capacity on
failover. Warm standby runs a scaled-down but fully functional copy, cutting
over faster. Multi-site active/active serves traffic from two or more regions
continuously: the fastest recovery and the highest bill. The exam's classic
trap is recommending active/active for a workload whose RTO tolerates hours —
buy the recovery speed the business case requires, and not a minute faster.

**[SECTION — Backups that survive the worst day — ~2:00]**
AWS Backup is the centralised control plane: one place to define backup
policies, schedules, and retention across EC2, RDS, EFS, and DynamoDB. For
ransomware resistance, Vault Lock puts backups in WORM compliance mode —
immutable for the retention period, undeletable even by a compromised admin. The 3-2-1 rule translates
cleanly: versioned S3 as the second copy, cross-region replication as the
offsite third, vault-locked backups as the immutable last resort.

RDS offers two backup shapes with different jobs. Automated backups give
point-in-time recovery within the retention window — up to 35 days — and vanish
with the instance. Manual snapshots persist until deleted, are the unit of
cross-region copy, and seed new environments. EBS snapshots work the same way:
incremental, stored in S3, copied across regions for DR. A snapshot is a
point-in-time copy of a disk; an AMI is a launchable image — snapshots plus
the boot metadata. Keep AMIs current with EC2 Image Builder pipelines, so
failover launches today's software, not last quarter's.

**[SECTION — Failover mechanics and rehearsal — ~3:10]**
Data replication sets the RPO floor. S3 Cross-Region Replication copies objects
— including, with the right configuration, existing objects and delete markers
— to a second region, underpinning static-website and data-lake DR. For
relational data with seconds-level RPO, Aurora Global Database maintains
cross-region clusters with typically sub-second replication lag and managed
failover measured in seconds, not hours.

Traffic failover is Route 53's job: health checks against real application
endpoints drive failover routing to the recovery region, or Application
Recovery Controller's routing controls flip traffic under operator command.
The runbook is the human half of the system — who decides, the exact
sequence of steps, how to verify each one, and the rollback criteria — and it
is tested, not shelved. Fail over to isolated environments, run game days
against the recovery region, and use ARC readiness checks to verify
continuously that the recovery environment could take over today.

**[COMMON MISTAKES — ~4:30]**
Three traps. One: recommending active/active for a workload whose RTO tolerates
hours — you pay double for recovery speed nobody asked for. Two: confusing a
snapshot with an AMI — a snapshot restores a disk, only an AMI launches an
instance. Three: failover health checks must monitor the application endpoint,
not the server.

**[RECAP — ~4:55]**
RTO is how long you can be down; RPO is how much data you can afford to lose.
The strategy ladder climbs from backup and restore through pilot light and warm
standby to multi-site active/active — buy the recovery speed the business case
requires. Centralise backups with AWS Backup, lock them with Vault Lock,
and remember that snapshots copy disks while AMIs launch machines. Replicate
data with S3 CRR or Aurora Global Database for seconds-level RPO, fail traffic
over with Route 53 health checks, and rehearse the runbook — an untested plan
is a hypothesis.

## On-screen visuals

- HOOK: two dials — "how long can you be down" (RTO) and "how much data can
  you lose" (RPO) — setting the requirements for the whole lesson.
- STRATEGY SECTION: the four-strategy ladder from backup-and-restore up to
  multi-site active/active, with cost rising and recovery time falling.
- BACKUPS SECTION: AWS Backup as a central console over EC2, RDS, EFS, and
  DynamoDB; Vault Lock sealing a backup as immutable; snapshot versus AMI
  side-by-side; an Image Builder pipeline refreshing golden AMIs.
- FAILOVER SECTION: S3 Cross-Region Replication copying objects between
  regions; Aurora Global Database with sub-second lag; Route 53 health checks
  flipping traffic; a runbook with verification and rollback steps.
- COMMON MISTAKES: three trap cards — "do not buy active/active for a patient
  RTO", "snapshot ≠ AMI", "check the app endpoint, not the host".
- RECAP: the cheat-sheet terms as a clean summary card.
