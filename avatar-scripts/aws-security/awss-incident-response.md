# Incident Response Playbooks — Order of Operations and Automation — Avatar Tutor Script

**Lesson ID:** awss-incident-response
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~5 minutes (~769 words)

## Spoken script

**[HOOK — 0:00]**
Incident response in AWS rewards preparation and punishes improvisation. The
platform gives you extraordinary leverage — snapshots in seconds, automation
that isolates hosts faster than any human, logs centralised by architecture —
but only if the runbooks, roles, and forensic accounts exist before the alert
fires. The exam tests whether you would reach for the right building blocks in
the right order.

**[WHY IT MATTERS — ~0:25]**
At three in the morning, with an attacker in the environment, there is no time
to design anything. The order of operations, the forensic account, the
automated containment — these are decisions you make now, calmly, so the team
executes them later, quickly. The exam rewards the prepared answer because the
prepared answer is the one that works.

**[SECTION — The order of operations — ~0:50]**
For a compromised EC2 instance, the sequence is: detect and scope, contain,
collect forensic evidence, eradicate, recover, then lessons learned. The
ordering is load-bearing: containment — isolating the instance by replacing its
security group with a deny-all — stops lateral movement and exfiltration;
forensic collection — EBS snapshots before remediation — preserves the
evidence. Eradication first destroys both.

Forensic images belong in a dedicated forensic account, not the compromised
one. Create EBS snapshots, share or copy them to the isolated account, and
restrict access — snapshots are point-in-time and immutable, and the separation
maintains chain of custody. Watch for attacker tradecraft: ransomware
playbooks include checking for encrypted volumes and unfamiliar snapshots or
AMIs shared from other accounts, because attackers plant their own images. Compromised credentials need more than a password
change. Deleting an IAM user's access keys does not invalidate already-issued
temporary session tokens — the attacker's existing session keeps working. The
reliable kill is an inline policy with an explicit deny keyed on
aws:TokenIssueTime, which invalidates every session issued before a chosen
moment, or deleting and deactivating the user and keys together. Treat
high-severity GuardDuty IAM findings as credential compromise until proven
otherwise, and rotate everything the compromised identity could reach: for a
Lambda function, that means its execution role's reachable secrets, environment
variables, and the code itself if tampered with.

**[SECTION — Automate the response, rehearse the team — ~2:30]**
Detection-to-containment should be measured in seconds, which means automation.
EventBridge rules matching GuardDuty findings can trigger Lambda functions or
Systems Manager Automation runbooks — isolate the instance, snapshot the
volumes, revoke the sessions — without waiting for a human to finish reading
the alert. During a multi-account incident, Security Hub insights group related
findings so responders work one prioritised queue instead of dozens of
consoles. Amazon Detective compresses the investigation itself: it
pre-correlates GuardDuty findings into timelines of IP, user, and role
activity across accounts, so analysts pivot from one finding to the full blast
radius in clicks. None of this matters if the team
has never run it. A game day — a simulated incident exercising detection,
runbooks, and coordination — is how you discover that the automation role lacks
a permission or that nobody knows the forensic account's break-glass procedure
at 2 AM. The exam expects preparation over improvisation, and it expects the
automation itself to follow least privilege: an over-permissive remediation role
is both an attack path and an outage waiting to happen. Scope Lambda and SSM
response roles to exactly the actions the playbook needs.

After the dust settles, AWS Artifact provides the compliance reports — SOC 2,
ISO 27001 — that regulators and customers will demand as breach-notification
evidence. Have access to them before you need them; "we are still gathering our
audit reports" is not a sentence you want to say during an incident.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: wiping or deleting the compromised instance first destroys
the forensic evidence — contain, then collect, then eradicate. Two: deleting
access keys does not kill live sessions; the aws:TokenIssueTime deny is the
reliable revocation. Three: there is no fully managed digital forensics
service — the pattern is EBS snapshots plus Inspector and Detective analysis in
an isolated forensic account, not a single button.

**[RECAP — ~5:05]**
The order of operations is detect and scope, contain, collect forensics,
eradicate, recover, lessons learned. Contain by swapping to a deny-all
security group; preserve evidence with EBS snapshots copied to a dedicated
forensic account; revoke sessions with a deny on aws:TokenIssueTime, not just
key deletion. Automate the response with EventBridge rules firing Lambda or
SSM runbooks, investigate with Detective's timelines, prioritise with Security
Hub insights — and rehearse it all in a game day with least-privilege
automation roles. Preparation is the architecture; Artifact's compliance
reports close out the aftermath.

## On-screen visuals

- HOOK: a timeline from alert to recovery with the preparation assets —
  runbooks, roles, forensic account — already in place before the alert fires.
- ORDER SECTION: the six-step sequence with "eradication first destroys
  evidence" as the warning; EBS snapshots flowing to an isolated forensic
  account; the aws:TokenIssueTime deny killing live sessions while key
  deletion alone leaves them running.
- AUTOMATION SECTION: an EventBridge rule matching a GuardDuty finding and
  triggering isolate-snapshot-revoke runbooks in seconds; Detective's timeline
  pivoting from one finding to the full blast radius; a game-day exercise
  revealing a missing permission.
- COMMON MISTAKES: three trap cards — "contain before eradicating", "keys
  deleted ≠ sessions killed", "no single-button forensics service".
- RECAP: the cheat-sheet terms as a clean summary card.
