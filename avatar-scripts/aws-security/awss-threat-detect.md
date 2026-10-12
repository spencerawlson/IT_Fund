# Threat Detection Services — GuardDuty, Security Hub, Macie and Detective — Avatar Tutor Script

**Lesson ID:** awss-threat-detect
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~6 minutes (~786 words)

## Spoken script

**[HOOK — 0:00]**
Threat detection in AWS is not one service but a layered system: something that
finds the threats, something that collects the findings, something that watches
the data those threats target, and something that reconstructs the story after
the fact.

**[WHY IT MATTERS — ~0:25]**
This is the detection layer end to end: the sensor that fires, the console that
consolidates, the classifier that watches the data, and the investigator that
rebuilds the timeline. Learn the four roles cold and the domain becomes a story
you can tell.

**[SECTION — GuardDuty: detection without agents — ~0:50]**
Amazon GuardDuty is a threat detection service that never installs anything on
your workloads. It analyses log sources AWS already collects — CloudTrail
management events, VPC Flow Logs, and DNS query logs — with machine learning
and threat intelligence, looking for signs of compromise: an EC2 instance
talking to a known command-and-control domain, API calls from an unusual
geography, a user exfiltrating data to an unfamiliar S3 bucket. Agentless
matters because there is nothing to deploy, and an attacker who owns the
instance cannot tamper with the sensor.

GuardDuty is regional: enabling it in us-east-1 protects nothing in eu-west-1.
The correct multi-account, multi-region answer is always to enable GuardDuty in
every region through AWS Organisations with a delegated administrator account.
Beyond the foundational sources, GuardDuty offers separately enabled protection
plans that cost extra: S3 protection for object-level data events, EBS malware
protection, RDS protection, Lambda protection, and EKS protection covering
audit logs and runtime monitoring. Findings carry a severity — high means act
now, and a high-severity IAM finding should be treated as compromised
credentials until proven otherwise.

For a compromised EC2 instance, isolate by swapping its security group
for one that denies all traffic, then take snapshots for forensics. Do not
delete it first — deletion destroys the evidence.

**[SECTION — Security Hub: one console, one format — ~2:10]**
If GuardDuty is the sensor, AWS Security Hub is the dashboard. It aggregates
findings from GuardDuty, Inspector, Macie, IAM Access Analyzer, and partner
products into the AWS Security Finding Format — ASFF — a normalised schema with
standard severity, resource, and remediation fields, so automation and SIEMs
parse every finding uniformly.

Security Hub also runs automated security checks against standards like the CIS
AWS Foundations Benchmark, so it doubles as a posture tool: not just "what
happened" but "what is misconfigured." Its insights group related findings
into patterns — every finding tied to one instance, say — which is how you
prioritise during an incident instead of drowning in fifty tabs. Know the
vocabulary distinction cold: a finding is a single detection event; an insight
is a grouped collection of findings matching a pattern. And remember: Security
Hub detects nothing itself — it aggregates, normalises, and prioritises.

**[SECTION — Macie and Detective: data and investigation — ~3:20]**
Amazon Macie answers a different question: what sensitive data do we actually
have? It uses machine learning to discover and classify PII, PHI, and other
sensitive data types in S3 buckets — national ID numbers sitting unencrypted in
a log bucket, for instance. The remediation pattern is always the same two
moves: fix the exposure — enable default encryption, restrict access with
bucket policies and Block Public Access — then protect the data class going
forward. Macie also feeds findings into Security Hub for continuous monitoring
as new objects land.

Amazon Detective is the investigation tool. Where GuardDuty says "this instance
talked to a malicious domain," Detective builds a visual entity graph — the IP
addresses, users, and roles that interacted over time — so an analyst can answer
"what else did this actor touch" without manually correlating logs. Together
the four form the detection story the exam expects: GuardDuty finds, Security
Hub consolidates, Macie watches the data, Detective reconstructs the attack.
Centralising threat detection across many accounts resolves to Organisations
plus delegated administration.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: GuardDuty is regional — enabling it in one region leaves
every other region blind. Two: Security Hub detects nothing itself; it
aggregates. A question crediting Security Hub with finding a threat is wrong.
Three: a finding is one event, an insight is a grouped pattern — the exam swaps
these terms deliberately.

**[RECAP — ~5:05]**
The detection layer has four roles. GuardDuty finds compromise agentlessly over
CloudTrail, Flow Logs, and DNS — regional, so enable it everywhere through a
delegated administrator; treat high-severity IAM findings as compromised
credentials, and contain by isolating, never deleting. Security Hub
consolidates everything into the ASFF format, runs CIS benchmark checks, and
groups findings into insights. Macie classifies sensitive data in S3 and feeds
Security Hub. Detective rebuilds the attack timeline as an entity graph.

## On-screen visuals

- HOOK: four role cards — the sensor, the console, the classifier, the
  investigator — labelled GuardDuty, Security Hub, Macie, Detective.
- GUARDDUTY SECTION: the three log sources flowing into GuardDuty with no
  agent on the instances; a region map lighting up per region through a
  delegated administrator; a high-severity IAM finding flagged "treat as
  compromised"; the isolate-then-snapshot containment sequence.
- SECURITY HUB SECTION: findings from multiple products converging into the
  ASFF normalised format; CIS benchmark checks running; findings grouping into
  an insight pattern.
- MACIE/DETECTIVE SECTION: Macie scanning S3 objects and flagging PII, then
  the two-move remediation; Detective's entity graph linking an IP to users
  and roles over a timeline.
- COMMON MISTAKES: three trap cards — "regional, not global", "Hub aggregates,
  not detects", "finding ≠ insight".
- RECAP: the cheat-sheet terms as a clean summary card.
