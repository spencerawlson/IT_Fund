# Secure Compute and Workload Hardening — Inspector, Systems Manager and IMDSv2 — Avatar Tutor Script

**Lesson ID:** awss-secure-compute
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~5 minutes (~759 words)

## Spoken script

**[HOOK — 0:00]**
Compute is where vulnerabilities become breaches. An unpatched library, an
instance reachable over SSH from the internet, a metadata service that hands
out credentials too freely — each is a small misconfiguration until an attacker
assembles them into a path. The specialty exam treats workload hardening as a
discipline with specific AWS tools, not general advice.

**[WHY IT MATTERS — ~0:25]**
This lesson covers the compute security toolkit: Inspector for vulnerability
assessment, Systems Manager for patching and keyless access, IMDSv2
enforcement and the breach that made it famous, EKS and Lambda hardening, and
the golden-image pipeline that makes secure the default. In real work these
are the controls that turn a fleet from a collection of snowflakes into a
known-good baseline.

**[SECTION — Find and fix: Inspector and Systems Manager — ~0:50]**
Amazon Inspector assesses what GuardDuty does not: software vulnerabilities and
network reachability across EC2 instances, ECR container images, and Lambda
function code. GuardDuty finds active malicious behaviour; Inspector finds the
patchable CVEs an attacker would exploit next. Operationalise it at scale by
aggregating findings to Security Hub, prioritising by exploitability rather than
raw severity, and driving remediation through Systems Manager Patch Manager —
scheduled, automated patching with baselines and compliance reporting across
the fleet. Findings without a remediation pipeline are just noise.

Shift the scanning left as well: run Inspector on ECR images in the CI/CD
pipeline so builds fail on critical CVEs before vulnerable images reach
production. And produce the images themselves securely with EC2 Image Builder,
which builds hardened, tested, versioned AMIs automatically — every instance
launches from a known-good baseline instead of a snowflake server someone
configured by hand three years ago. For day-to-day access, SSM Session Manager
replaces SSH with key pairs entirely: no inbound ports, no long-lived keys,
IAM-authenticated sessions with full logging to CloudTrail and CloudWatch. It
removes the whole SSH key management problem — distribution, rotation,
offboarding — in one architectural move.

**[SECTION — Harden the runtime: IMDSv2, EKS, and Lambda — ~2:25]**
The instance metadata service deserves its reputation. The 2019 Capital One
breach taught the industry the pattern: a server-side request forgery against
IMDSv1 let an attacker steal the instance role's credentials, and an overbroad
role turned theft into a massive data breach. The fix is IMDSv2 —
session-oriented, resistant to SSRF — enforced at scale with an SCP or IAM
policy denying RunInstances unless IMDSv2 is required, plus a Config rule
watching for drift.

Make secure the default at the fleet level: Auto Scaling launch templates
should enforce IMDSv2 and encrypted EBS volumes, so every instance the fleet
launches inherits the baseline automatically. Per-instance fixes do not survive
the next scaling event. Container and serverless workloads have their own
hardening checklists. EKS cluster endpoints should be private, reachable
through authorised networks, VPN, or bastion — never a public endpoint open to
the world. EKS Pod Identity — and its predecessor IRSA — gives each pod
fine-grained IAM permissions without sharing the node role's credentials. A
Lambda function processing PII needs three things together: a least-privilege
execution role, VPC deployment with no internet path unless required, and
environment variables encrypted with KMS. Scope identity, network, and secrets
as one design, not three afterthoughts.

For the most sensitive processing, Nitro Enclaves provide isolated, attested
compute environments on EC2 — no persistent storage, no administrator access,
cryptographic attestation of the code running inside — for workloads like key
handling where even the host must not be trusted.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: GuardDuty and Inspector answer different questions — active
malicious behaviour versus patchable CVEs; the exam swaps them. Two: IMDSv2 is
not just a recommendation — the exam enforces it with an SCP on RunInstances
plus a Config rule for drift. Three: per-instance fixes do not survive scaling
— enforce the baseline in the launch template.

**[RECAP — ~5:05]**
Inspector finds the patchable CVEs across EC2, ECR images, and Lambda —
aggregate to Security Hub, prioritise by exploitability, remediate through
Patch Manager, and scan images in the pipeline so builds fail before production.
Image Builder produces the golden AMIs; Session Manager replaces SSH with
keyless, fully logged access. Harden the runtime: IMDSv2 enforced by SCP with
a Config rule watching for drift, the Capital One lesson as the reason.
Launch templates carry the secure baseline — IMDSv2 and encrypted EBS — EKS
endpoints stay private with Pod Identity for per-pod permissions, Lambda gets
a least-privilege role, VPC isolation, and KMS-encrypted environment
variables, and Nitro Enclaves serve the workloads where even the host is
untrusted.

## On-screen visuals

- HOOK: small misconfigurations — an unpatched library, an open SSH port, a
  permissive metadata service — assembling into an attacker's path.
- INSPECTOR SECTION: Inspector scanning EC2, ECR images, and Lambda code for
  CVEs while GuardDuty watches behaviour; findings flowing to Security Hub and
  remediation through Patch Manager; a pipeline build failing on a critical
  CVE; Session Manager replacing SSH keys.
- RUNTIME SECTION: the Capital One attack chain — SSRF against IMDSv1 stealing
  role credentials — then the IMDSv2 fix with the SCP and Config rule; launch
  templates enforcing the baseline; the EKS private endpoint; Lambda's three
  hardening steps as one design.
- COMMON MISTAKES: three trap cards — "Inspector finds CVEs, GuardDuty finds
  behaviour", "IMDSv2 enforced by SCP", "baseline lives in the template".
- RECAP: the cheat-sheet terms as a clean summary card.
