# Cloud Security Engineering: Identity Is the Perimeter — Avatar Tutor Script

**Lesson ID:** cl-security
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
In the cloud, identity and configuration are the perimeter. Most cloud
breaches come from over-permissive IAM, leaked keys, and public resources —
not exotic exploits. That is bad news for the careless and good news for you:
these breaches are preventable with the right defaults.

**[WHY IT MATTERS — ~0:25]**
Cloud security is where the jobs are and where the exam points get
concentrated: IAM evaluation, encryption, posture management. Every control
in this lesson maps to a real breach that did not have to happen. Learn the
defaults, and you prevent the headlines.

**[SECTION — How IAM decides — ~0:50]**
AWS IAM evaluation starts from an implicit deny: nothing is allowed unless a
policy explicitly allows it. Then the trump card: an explicit Deny anywhere
always wins, overriding any Allow. Implicit deny, explicit allow, explicit
deny wins — in that order.

Service Control Policies in AWS Organizations set the maximum permissions
for accounts. SCPs never grant anything; they are guardrails — "no one in
this account may disable CloudTrail." Think of them as the ceiling: identity
policies decide what you can do, SCPs decide what you can never do.

Prefer IAM roles over long-lived access keys. Roles provide short-lived,
automatically rotated credentials — use them for EC2, Lambda, and CI
pipelines through OIDC federation, so no static key exists to leak. A key
that does not exist cannot end up in a GitHub repo.

**[SECTION — Encryption and keys — ~2:00]**
Envelope encryption encrypts data with a data key, then encrypts that data
key with a master key held in KMS. Why the nesting? Bulk encryption happens
locally and fast with the data key, while the master key never leaves KMS —
and every use of it is logged. Speed where you need it, control and audit
where it matters.

**[SECTION — Posture and entitlements — ~2:40]**
The acronyms, decoded. CSPM — cloud security posture management —
continuously detects misconfigurations against benchmarks such as CIS. CIEM
manages cloud entitlements to find excessive permissions — and most cloud
identities use a tiny share of what they are granted. CNAPP — cloud-native
application protection platform — unifies CSPM, CWPP (workload protection),
CIEM, and more in one platform.

Threat detection services analyse CloudTrail, VPC Flow Logs, and DNS logs
for attacks: GuardDuty on AWS, Microsoft Defender for Cloud on Azure,
Security Command Center on GCP. The telemetry you learned to collect in the
core services lesson is exactly what these services feed on.

**[SECTION — Defaults that prevent breaches — ~3:30]**
Two settings and one account. Enforce IMDSv2 on EC2: it requires a session
token for the instance metadata service, which blocks most SSRF credential
theft — the 2019 Capital One breach involved SSRF to instance metadata.
Enable S3 Block Public Access at the account level: it overrides any public
ACL or bucket policy, a single switch against the most common cloud breach
pattern. And keep a break-glass account: a tightly controlled emergency
admin account, protected with MFA, monitored, used only when normal access
fails. Hope you never need it; be certain it works.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: thinking an explicit Allow beats an explicit Deny. Deny
always wins. Two: believing SCPs grant permissions. They only set maximums —
guardrails, never grants. Three: treating base64 or access keys casually.
Short-lived roles beat long-lived keys every time.

**[RECAP — ~4:40]**
IAM evaluates implicit deny, then explicit allow, with explicit deny always
winning; SCPs are guardrails that grant nothing; roles with OIDC federation
replace leakable access keys. Envelope encryption nests a fast data key
inside a KMS master key that never leaves and is always logged. CSPM finds
misconfigurations, CIEM finds excess entitlements, CNAPP unifies them;
GuardDuty, Defender for Cloud, and Security Command Center watch the logs.
And the defaults that prevent breaches: IMDSv2 against SSRF, S3 Block Public
Access at the account level, and a monitored break-glass account with MFA.
Identity is the perimeter. Guard it by default.

## On-screen visuals

- HOOK: crumbling network perimeter replaced by an identity badge as the
  boundary; breach causes ranked — IAM, keys, public resources.
- IAM: evaluation flowchart — implicit deny → explicit allow → explicit
  deny wins; SCP as a ceiling over identity policies; roles vs access keys
  (short-lived/rotated vs static/leakable); OIDC federation for CI.
- Encryption: envelope encryption diagram — data key encrypting data,
  KMS master key encrypting the data key, usage logged.
- Posture: CSPM / CIEM / CNAPP cards with plain definitions; threat
  detection services feeding on CloudTrail, Flow Logs, DNS logs.
- Defaults: IMDSv2 token requirement blocking SSRF (Capital One 2019
  callout); S3 Block Public Access overriding public ACLs; break-glass
  account in a vault with MFA.
- RECAP: the cheat-sheet terms as a clean summary card.
