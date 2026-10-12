# Security Logging Foundations — CloudTrail, CloudWatch and the Immutable Archive — Avatar Tutor Script

**Lesson ID:** awss-logging
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~6 minutes (~796 words)

## Spoken script

**[HOOK — 0:00]**
You cannot secure what you cannot see, and in AWS, visibility is a design
decision. CloudTrail, CloudWatch Logs, and VPC Flow Logs each record a
different slice of reality — API activity, log text, network metadata — and
every slice must be collected, tamper-evident, centralised, and queryable when
an incident demands it.

**[WHY IT MATTERS — ~0:25]**
Logging is the foundation the entire specialty exam builds on. Every detection
service consumes logs, every investigation starts with logs, every audit ends
with logs. Get the architecture right and everything downstream works.

**[SECTION — CloudTrail: the control plane on record — ~0:50]**
CloudTrail records API activity — who called what, from where,
and when. Management events cover control-plane calls and are logged by default
at no extra charge. Data events cover data-plane calls — S3 object-level
access, Lambda invocations — and are billed per event, so enable them
selectively on sensitive resources.

A trail that covers one region is a trail with blind spots. The correct
architecture is an organisation trail: created in the management account,
logging all regions for every member account, delivering to one central S3
bucket. Future regions are included automatically — closing the gap an attacker
would exploit by operating where logging was never enabled. Logs must be
tamper-evident: store them in a dedicated log-archive account with restricted
write access and MFA Delete, so a compromised admin cannot erase their own
trail. Enable log file validation — digest files with hashes proving delivered
logs were not modified. For analysis across months of history, CloudTrail Lake
provides managed, immutable, SQL-queryable storage with up to seven years of
retention; Athena against the raw S3 bucket is the do-it-yourself alternative.

**[SECTION — CloudWatch: from log text to alarms — ~2:05]**
CloudWatch Logs collects the logs; the security value comes from what you
extract. A metric filter watches a log group for a pattern — "AccessDenied",
say, or console sign-in failures — and publishes a numeric metric on every
match. A CloudWatch alarm then evaluates that metric: more than five failed
console logins in ten minutes, page the security team. The exam's canonical
root-usage alarm is exactly this pattern: organisation trail, metric filter
for root API calls, alarm to SNS.

Two defaults deserve attention. CloudWatch log groups retain logs indefinitely
— "Never Expire" — unless you set a retention period. Set retention
deliberately. Alarms are not just notifications: they can invoke EC2 actions —
reboot, stop, terminate, recover — Auto Scaling policies, or EventBridge rules,
the bridge from monitoring to automated response. EventBridge is the evolved
successor to CloudWatch Events — the same event-bus concept with SaaS
integrations, a schema registry, and archives. GuardDuty findings, Config
changes, and alarm state changes all flow through EventBridge to Lambda or
Systems Manager Automation runbooks: detection becomes response in seconds.

**[SECTION — Network visibility and the immutable archive — ~3:20]**
VPC Flow Logs record network metadata — source and destination IPs, ports,
protocol, bytes, and whether traffic was accepted or rejected. They do not
contain packet payloads; they show who talked to whom, never what was said.
For long-term analysis, send them to S3 rather than CloudWatch Logs: S3 is far
cheaper for high-volume, long-retention storage and queries directly with
Athena.

Seven years of CloudTrail for audit is
cheapest as an organisation trail to S3 with lifecycle policies transitioning
older logs to Glacier and Deep Archive — compliance retention does not need hot,
queryable storage. For tamper-proofing beyond digest validation, S3 Object Lock
in compliance mode makes the log bucket WORM: not even the root user can delete
objects until retention expires. And CloudTrail Insights detects unusual API
activity — spikes in call volume, anomalous patterns — statistically rather
than by signature: the first signal that credentials are being misused.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: VPC Flow Logs contain metadata only — they cannot tell you
what payload an attacker sent. Two: data events are billed per event —
enabling them everywhere is the expensive wrong answer. Three: CloudWatch log
groups never expire by default — "Never Expire" is a cost and scoping trap.

**[RECAP — ~5:05]**
Visibility is a design decision. CloudTrail records the control plane —
management events free and default, data events billed and selective — through
an organisation trail covering all regions into a central bucket in a
tamper-evident log-archive account with MFA Delete and log file validation.
CloudWatch turns log text into alarms via metric filters — the root-usage alarm
is the canonical pattern — and bridges to automated response through
EventBridge. Flow Logs record who talked to whom, never what was said, and
belong in S3 for cheap long-term analysis. Archive seven years through Glacier
tiers, lock the bucket with Object Lock, and let CloudTrail Insights catch the
behavioural anomalies.

## On-screen visuals

- HOOK: three slices of reality converging — API activity, log text, network
  metadata — each labelled with its service.
- CLOUDTRAIL SECTION: management events versus data events with the cost tag on
  data events; an organisation trail fanning out across regions and accounts
  into one central bucket; the log-archive account sealed with MFA Delete;
  digest files proving logs unmodified.
- CLOUDWATCH SECTION: a metric filter extracting "AccessDenied" counts from
  log text; the root-usage alarm chain — trail, filter, alarm, SNS page; an
  alarm triggering an EC2 recovery action and an EventBridge rule.
- ARCHIVE SECTION: flow log records showing IPs, ports, bytes, and action —
  with the payload column marked empty; lifecycle tiers carrying logs to Deep
  Archive; Object Lock sealing the bucket as WORM.
- COMMON MISTAKES: three trap cards — "flow logs have no payloads", "data
  events are billed", "logs never expire by default".
- RECAP: the cheat-sheet terms as a clean summary card.
