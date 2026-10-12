# Monitoring and Log Analysis — Config, Athena and Closing the Loop — Avatar Tutor Script

**Lesson ID:** awss-monitor-analyze
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~5 minutes (~762 words)

## Spoken script

**[HOOK — 0:00]**
Logging collects the evidence; monitoring turns it into judgement. This is the
detective-control layer of the security program: continuously evaluating
whether resources are configured the way policy demands, analysing network and
API data at a scale no human can read raw, and surfacing the drift between
"approved" and "actual" before an attacker exploits it.

**[WHY IT MATTERS — ~0:25]**
Thirty days of VPC Flow Logs across a fleet is not a dataset you open in a
console. The exam tests whether you know the analysis patterns — S3 plus
Athena, CloudTrail Lake, Logs Insights — and the automation loop that turns a
detected drift into a notification or a fix. Monitoring that nobody acts on is
just expensive storage.

**[SECTION — Config: the compliance sensor — ~0:50]**
CloudTrail tells you who did what; AWS Config tells you what the resource
became. It records configuration history and evaluates compliance state
continuously: this S3 bucket was compliant yesterday, a policy change at 14:32
made it non-compliant, and here is the API call responsible. The timeline view
gives you attribution plus state history in one place, which is exactly what
auditors and incident responders need. Think of CloudTrail as the witness and
Config as the photograph of the scene.

Config rules are the evaluations — managed rules for common checks, custom
Lambda-backed rules for your own. A conformance pack bundles rules and
remediation actions into one deployable package, such as the CIS benchmark, so
baseline compliance lands across accounts quickly. And a Config aggregator
collects configuration and compliance data from multiple accounts and regions
into one central view, which is the only sane way to govern a hundred-account
organisation. Know how Config relates to its neighbours. Config rules evaluate
resource compliance continuously; Security Hub aggregates those evaluations
among its findings. Config is the sensor; Security Hub is one of the dashboards
that consumes it. They are complementary, not competing.

**[SECTION — Analysis at scale, and closing the loop — ~2:20]**
Thirty days of VPC Flow Logs across a fleet is not a dataset you open in a
console. The pattern is S3 plus Athena: flow logs delivered to a bucket
partitioned by date, queried with SQL for the compromised IP's conversations.
Partitioning matters — a full scan of unpartitioned data is slow and billed by
the byte scanned. CloudTrail Lake is the managed alternative when you want
immutable, queryable event storage with up to seven years of retention without
managing the S3 lifecycle yourself.

For interactive investigation of centralised logs, CloudWatch Logs Insights
runs ad-hoc queries over log groups — all 403s from one IP in the last hour —
faster than exporting when the logs are already in place. Sharing KMS-encrypted
log groups with a central security account requires both halves of the
permission: a resource-based log destination policy and KMS key policies
granting the central account decrypt rights. Monitoring closes the loop when a
detection triggers action. A Config rule flags the bucket policy that just went
non-compliant; EventBridge catches the compliance-change event and routes it to
SNS or a Lambda that remediates. That detect-notify-remediate chain — Config
rule plus EventBridge plus response — is the exam's standard answer for
near-real-time drift detection, whether the drift is an S3 policy, an
unencrypted volume, or a security group someone opened to the world. Cost
discipline belongs in the design. Data events are high-volume and billed per
event, so enable them on sensitive resources rather than everywhere.
Management events already cover the control plane for free. And when retention
is about audit rather than investigation, Glacier-class storage behind
lifecycle policies beats any queryable store on price.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: Config and CloudTrail answer different questions — "what the
resource became" versus "who did what"; the exam swaps them deliberately. Two:
an unpartitioned Athena query over flow logs is slow and billed by the byte —
partition by date. Three: sharing encrypted logs needs both the destination
policy and the KMS key policy; one half alone fails silently.

**[RECAP — ~5:05]**
Config is the compliance sensor: configuration history plus continuous rule
evaluation, bundled into conformance packs, aggregated across accounts and
regions — the sensor to Security Hub's dashboard. Analyse at scale with Athena
over partitioned S3 data or CloudTrail Lake's managed seven-year store, and
query interactively with Logs Insights. Close the loop with the
detect-notify-remediate chain — Config rule, EventBridge, SNS or Lambda — for
near-real-time drift response. Enable data events selectively, send audit
retention to Glacier tiers, and remember the KMS key policy when logs cross
account boundaries.

## On-screen visuals

- HOOK: the "approved versus actual" drift — a compliant configuration
  drifting, with monitoring surfacing the gap before an attacker arrives.
- CONFIG SECTION: the Config timeline — compliant yesterday, a policy change
  at 14:32, non-compliant now, with the responsible API call; a conformance
  pack deploying CIS rules; an aggregator collecting compliance from many
  accounts; the sensor-to-dashboard relationship with Security Hub.
- ANALYSIS SECTION: flow logs partitioned by date in S3 queried by Athena for
  one IP's conversations; the detect-notify-remediate chain — Config rule,
  EventBridge, SNS/Lambda remediation; Glacier tiers behind lifecycle policies
  for cheap audit retention.
- COMMON MISTAKES: three trap cards — "Config is what it became, CloudTrail
  is who did what", "partition before querying", "both halves of the log-share
  permission".
- RECAP: the cheat-sheet terms as a clean summary card.
