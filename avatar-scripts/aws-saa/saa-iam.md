# IAM: Identity and Access — Roles, Policies and Least Privilege — Avatar Tutor Script

**Lesson ID:** saa-iam
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~797 words)

## Spoken script

**[HOOK — 0:00]**
Every AWS architecture stands on identity. Before a single packet routes or a
single byte is stored, someone — a person, an application, a pipeline — must
prove who they are. IAM is that gatekeeper, and it rewards one habit above all
others: roles, not keys.

**[WHY IT MATTERS — ~0:25]**
Roughly a third of this exam tests designing secure architectures, and most of
those questions begin with an identity decision — which credential, which
policy, which trust boundary. Every cloud breach story resolves to a key that
should not have existed or a policy broader than the job required.

**[SECTION — Roles, not keys: the credential model — ~0:50]**
The single most important IAM habit is also the simplest: never use long-lived
credentials where a role will do. A role is an identity with no permanent
password or access key — the Security Token Service issues temporary
credentials that expire in minutes or hours. Why does this matter? A credential
that expires cannot be dug out of a repository six months later and reused.
There is nothing to leak, because there is nothing permanent.

For applications on EC2, the mechanism is the instance profile: a role attached
to the instance, from which the application receives rotating temporary
credentials — nothing stored on disk, nothing embedded in configuration files.
The same pattern covers the two-hour debugging session — assume a scoped-down
role via STS — and the CI/CD pipeline, where OIDC federation lets GitHub
Actions assume a role with no stored AWS key. For humans there is Identity
Center: single sign-on across accounts and applications. The root account sits
outside all of this — unconstrained by IAM policies — which is why it gets MFA
and is never used for daily work.

**[SECTION — How permissions are actually evaluated — ~2:00]**
Two kinds of policy govern access. Identity policies attach to users, groups,
and roles; resource policies attach to the resource itself — bucket policies
and KMS key policies are the classic examples. The catch the exam loves:
cross-account access needs both sides to agree, a trust policy on the role in
the target account plus a permission on the other side. One side alone is never
enough.

Evaluation follows strict rules. An explicit Deny in any applicable policy wins
over every Allow, everywhere — no override, no admin exception. A permission
boundary sets a maximum: the effective permissions are the intersection of the
boundary and the identity policies. Service control policies play the same
role one level up, as guardrails on entire accounts or organisational units —
with one subtlety: they filter what is possible but grant nothing themselves.
Conditions sharpen all of this: one condition key can restrict an action to a
source IP range, require MFA, or limit access to tagged resources. The exam
loves the VPC-endpoint variant: a bucket policy denying every principal except
requests through a named VPC endpoint, enforced with aws:sourceVpce.

**[SECTION — Least privilege as a practice, not a slogan — ~3:10]**
Least privilege fails in practice because permissions are easy to grant and
tedious to review. The exam expects you to know the machinery that makes
review feasible: when two engineers need identical, frequently changing
permissions, put both in a group and manage the policy once. Groups are the
unit of shared human access; roles are the unit of temporary and cross-account
access.

IAM Access Analyzer closes the loop by finding unused permissions: it analyses
CloudTrail history and flags granted actions that were never exercised, so
policies tighten toward what is actually used. Two permissions deserve special
attention. iam:PassRole grants nothing directly — it controls who may hand a
role to an AWS service — so a user who can pass an overpowered role to EC2 can
effectively escalate. Access keys should be rotated on a schedule — but the
better answer, the one the exam rewards, is to eliminate them in favour of
roles.

**[COMMON MISTAKES — ~4:25]**
Three traps. One: SCPs do not grant permissions — a question offering
an SCP as the thing that gives a user access is always wrong. Two: iam:PassRole
sounds harmless and is not; it is the quiet escalation path. Three: when a
scenario describes developers, applications, or pipelines needing AWS access,
the answer is almost always a role.

**[RECAP — ~4:50]**
Identity is the gatekeeper of every AWS architecture. Roles beat keys because
temporary credentials expire — instance profiles for EC2, STS for short
sessions, OIDC federation for pipelines, Identity Center for humans. Explicit
Deny always wins; identity and resource policies must both agree for
cross-account access; boundaries and SCPs set maximums without granting
anything. And least privilege is a practice: groups for shared human access,
roles for the temporary, Access Analyzer for review, keys eliminated wherever
possible.

## On-screen visuals

- HOOK: a door-and-gatekeeper diagram — a person, an application, and a
  pipeline each approaching an "IAM" gate.
- ROLES SECTION: STS issuing a short-lived token, with a visible expiry timer;
  an EC2 instance receiving credentials through an instance profile; Identity
  Center SSO spanning multiple accounts.
- EVALUATION SECTION: two-sided diagram — identity policy on the left, resource
  policy on the right, both required for cross-account; an explicit Deny
  overriding an Allow; a permission boundary drawn as a shrinking intersection.
- LEAST PRIVILEGE SECTION: a group containing two engineers with one shared
  policy attached once; Access Analyzer findings listing unused actions.
- COMMON MISTAKES: three trap cards — "SCPs grant nothing", "PassRole
  escalation", "reach for roles, not keys".
- RECAP: the cheat-sheet terms as a clean summary card.
