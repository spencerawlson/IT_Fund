# Advanced IAM and Federation — SCPs, Cross-Account Roles and Cognito — Avatar Tutor Script

**Lesson ID:** awss-iam-advanced
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~5 minutes (~752 words)

## Spoken script

**[HOOK — 0:00]**
Foundational IAM answers "who can do what." Advanced IAM answers the harder
questions: how do you bound what an entire account may do, delegate
administration without delegating the keys to the kingdom, trust identities
from outside your organisation, and eliminate long-lived credentials from
machines that were never meant to hold them.

**[WHY IT MATTERS — ~0:25]**
This is the specialty-level IAM toolkit, and every piece maps to a real
governance problem: the ceiling over whole accounts, safe delegation to
developers, the partner who needs one bucket, the workforce across fifty
accounts, the pipeline that must never hold a key. The exam tests whether you
place each control at the right layer.

**[SECTION — Guardrails: SCPs and permission boundaries — ~0:50]**
Service Control Policies are the organisation's ceiling. Attached to
organisational units or accounts in AWS Organisations, they define the maximum
permissions available — and the critical limitation is that they never grant
anything. An SCP that allows an action means nothing without an identity policy
that also allows it; the effective permission is the intersection. SCPs also do
not apply to the management account, which is one more reason that account
stays locked down and workload-free.

Permission boundaries solve a different problem: safe delegation within a
single account. A developer who needs to create roles for their service gets an
IAM policy that caps the maximum permissions any role they create can ever
have. They are free to iterate inside the boundary and structurally unable to
exceed it — delegation without the standing risk of a runaway administrator.
The two compose naturally. SCPs cap what the entire account can do; permission
boundaries cap what delegated admins can grant inside it. Two ceilings, two
scopes, no conflict — and the exam will ask you to place each at the right
layer.

**[SECTION — Trusting outsiders: cross-account roles and federation — ~2:20]**
When a partner needs access to one of your S3 buckets, the secure pattern is a
cross-account IAM role with a trust policy limited to the partner's account,
scoped to that bucket — and an external ID. The external ID exists to defeat
the confused deputy problem: without it, a malicious party that also does
business with the partner could trick your role into acting on their behalf.
Any third-party trust policy without a unique external ID is an exam-wrong
answer.

For workforce access across many accounts, IAM Identity Center — the successor
to AWS SSO — provides centralised single sign-on with permission sets: one
identity, many accounts, no long-lived keys anywhere. For customer-facing
applications, Amazon Cognito splits the job in two: User Pools handle
authentication — sign-up, sign-in, MFA — while Identity Pools federate those
identities into temporary AWS credentials. User Pools are the directory;
Identity Pools are the broker to AWS access.

Machine identities deserve the same zero-secret treatment. CI/CD pipelines
should authenticate to AWS through OIDC federation — GitHub Actions assuming a
short-lived role, for example — so there are no static access keys to rotate,
leak, or find in a repository six months later. Two more advanced controls
round out the picture. The aws:PrincipalOrgID condition key restricts a
resource policy to callers inside your organisation — a data-perimeter guardrail
that blocks exfiltration to external accounts even when credentials leak. And
KMS is the service where key policies rule: cross-account decryption requires
the key policy to explicitly allow the external account, because KMS defaults
to key-policy authority in a way most services do not.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: SCPs never grant — the intersection of the SCP and the
identity policy is the effective permission, and an SCP allow alone grants
nothing. Two: a third-party trust policy without an external ID invites the
confused deputy — always require one. Three: for KMS, the key policy is the
primary gate — an IAM allow in the caller's account is insufficient for
cross-account decryption.

**[RECAP — ~5:05]**
Two ceilings bound everything: SCPs cap the whole account — never granting,
never applying to the management account — and permission boundaries cap what
delegated admins can grant inside it. Trust outsiders with cross-account roles
scoped to the resource, a trust policy limited to the partner account, and a
unique external ID to defeat the confused deputy. Identity Center unifies the
workforce, Cognito splits customer authentication from AWS federation, OIDC
federation keeps pipelines keyless, aws:PrincipalOrgID builds the data
perimeter, and KMS answers to its key policy first. Place each control at its
layer and the identity plane holds.

## On-screen visuals

- HOOK: the four hard questions as cards — bounding an account, delegating
  safely, trusting outsiders, eliminating keys from machines.
- GUARDRAILS SECTION: two ceilings stacked — the SCP ceiling over the account,
  the permission boundary ceiling over the delegated admin — with the
  intersection showing the effective permission; the management account
  excluded from SCPs.
- FEDERATION SECTION: the cross-account role pattern — trust policy limited to
  the partner account, external ID as the confused-deputy shield, scope on the
  bucket; Identity Center as one identity across accounts; Cognito User Pools
  as the directory and Identity Pools as the broker; OIDC federation giving a
  pipeline a short-lived role.
- COMMON MISTAKES: three trap cards — "SCPs never grant", "no external ID, no
  trust", "KMS answers to its key policy".
- RECAP: the cheat-sheet terms as a clean summary card.
