# IAM Foundations — Policy Evaluation, Roles and MFA — Avatar Tutor Script

**Lesson ID:** awss-iam-foundations
**Track:** AWS Security Specialty (SCS-C02)
**Estimated runtime:** ~6 minutes (~788 words)

## Spoken script

**[HOOK — 0:00]**
Identity is the primary security boundary in AWS. There is no corporate
firewall that matters more than the question of who — or what — is allowed to
call which API on which resource. Every breach story in the cloud eventually
resolves to an identity question: a key that should not have existed, a policy
broader than the job required, a role assumed from somewhere it should never
have been.

**[WHY IT MATTERS — ~0:25]**
The specialty exam assumes you already own this mental model and builds on it:
policy evaluation order, roles versus long-lived keys, MFA discipline, and the
hygiene practices that keep the identity plane clean. It is also the cheapest
security investment in cloud computing — every one of these controls costs
nothing and stops the most common attacks.

**[SECTION — How authorization is decided — ~0:50]**
Every API call passes through IAM policy evaluation, and the order is fixed:
start with an implicit deny, then look for an explicit allow, then let any
explicit deny override everything. The sentence to memorise is that an explicit
deny always wins. It wins over allows in identity policies, resource policies,
SCPs, and permission boundaries alike, which is why deny-based guardrails are
the reliable way to draw lines nobody can cross.

Two kinds of policy attach to two kinds of thing. Identity-based policies
attach to users, groups, and roles and describe what that identity may do.
Resource-based policies attach to resources — S3 buckets, KMS keys, Lambda
functions — and describe who may act on that resource. Cross-account access
typically needs both sides to agree: the identity policy allows the action, and
the resource policy trusts the external principal. Within a policy, the
elements have distinct jobs. Action names the API calls, Resource scopes where
they apply, Condition constrains when, and Effect allows or denies. And here is
the precision the exam will catch you on: a policy that allows s3:GetObject on
the object ARN permits reading objects inside the bucket but not listing the
bucket itself — S3 ARNs distinguish bucket-level from object-level
permissions, and blurring them is a wrong answer.

**[SECTION — Roles, not keys; MFA, not hope — ~2:20]**
Applications running on EC2 — or Lambda, ECS, or anywhere else — should use IAM
roles, never embedded access keys. A role delivers temporary credentials through
the instance metadata service that rotate automatically; there is no secret to
leak, commit to a repository, or forget to rotate. An instance profile is
simply the container that passes a role to an EC2 instance. When a human needs
elevated access for two hours, the same principle applies: assume a role and
let the credentials expire, rather than widening a permanent permission.

MFA protects against credential theft: a stolen password alone no longer
suffices. Enforce it for console access and especially for privileged role
assumption — a trust policy condition on aws:MultiFactorAuthPresent makes MFA a
gate before any session begins. And the root user deserves special handling: no
IAM policy or SCP can limit it, so lock it with MFA, never use it for daily
work, and alarm on any root API activity at all. Root usage should be rare
enough that every occurrence is worth a page. Hygiene is a practice, not a
project. The IAM credential report shows password and key age, MFA status, and
last-used timestamps for every user — the fastest way to find stale keys and
MFA-less accounts. IAM Access Analyzer goes further, identifying unused
permissions and generating policies from actual CloudTrail activity so you can
rightsize toward least privilege based on observed behaviour instead of
guesses. And before deploying any policy change, run it through the IAM Policy
Simulator: it answers "would this allow or deny that action" without touching
production.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: an explicit Allow does not beat an explicit Deny — the deny
always wins, no matter where it sits. Two: deleting an access key does not kill
already-issued temporary sessions; session revocation is a separate problem.
Three: the object ARN and the bucket ARN are different permissions — read
access to objects does not grant listing the bucket.

**[RECAP — ~5:05]**
Authorization is decided in a fixed order: implicit deny, explicit allow,
explicit deny — and the explicit deny always wins. Identity policies describe
what an identity may do; resource policies describe who may touch a resource;
cross-account needs both. Roles beat keys because temporary credentials expire
— instance profiles for EC2, assumed roles for short human sessions. MFA gates
credential theft, the root user gets MFA plus alarms on any use, and hygiene is
continuous: credential reports for stale keys, Access Analyzer for unused
permissions, the Policy Simulator before every change.

## On-screen visuals

- HOOK: every cloud breach story resolving to an identity question — a leaked
  key, an overbroad policy, a role assumed from the wrong place.
- EVALUATION SECTION: the evaluation order as a three-step flow — implicit
  deny, explicit allow, explicit deny wins; identity policy versus resource
  policy side-by-side; the object ARN versus bucket ARN precision callout.
- ROLES/MFA SECTION: a role delivering rotating temporary credentials through
  the metadata service beside an embedded key with a red warning; the MFA gate
  on a trust policy; the credential report flagging stale keys and missing MFA.
- COMMON MISTAKES: three trap cards — "deny beats allow", "keys deleted ≠
  sessions killed", "object ARN ≠ bucket ARN".
- RECAP: the cheat-sheet terms as a clean summary card.
