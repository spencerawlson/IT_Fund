# Production & Security: Pipelines You Can Trust — Avatar Tutor Script

**Lesson ID:** tf-prod-security
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~6 minutes (~791 words)

## Spoken script

**[HOOK — 0:00]**
Writing Terraform is the easy half. The hard half is running it in production
— safely, repeatedly, alongside other humans — where one unreviewed apply can
take down a company. This lesson is about the discipline that makes the safe
path the easy path.

**[WHY IT MATTERS — 0:25]**
Everything you have learned so far is mechanics. This lesson is operations:
how teams isolate environments, fold hand-built infrastructure into code, put
automated guardrails in front of apply, and build pipelines that deserve
trust.

**[SECTION — Environments: workspaces and their limits — 0:50]**
Workspaces give one configuration multiple named states — terraform workspace
new staging, and the same code now manages a second environment, with
terraform.workspace exposing the current name for conditional logic.
Convenient for lightweight variants: a developer's sandbox, a short-lived
test rig. Same code, different memory.

But workspaces are not isolation. They share the configuration, the backend,
and the credentials — a mistake in one workspace is a typo away from
another's state. Think of workspaces as notebooks sharing one desk drawer. For
real separation — dev, staging, production — prefer separate configurations,
state, backends, and ideally accounts. Workspaces are a convenience for variants;
boundaries are for production. Do not confuse the two.

Whatever the layout, the past must be accounted for. Infrastructure built by
hand before Terraform arrived does not vanish when you adopt IaC. terraform
import brings it under management: you write the configuration to match
reality, import the resource ID into state, and from that moment Terraform
owns it. Modern Terraform even supports import blocks, so the import itself
lives in code and is reviewed like everything else.

**[SECTION — Guardrails before apply: policy and scanning — 2:20]**
Humans review plans; machines should too. Policy as code — Sentinel, OPA, or
your cloud's native equivalent — evaluates every plan against rules before
apply is allowed: no public storage buckets, only approved regions, mandatory
tags. A violated policy fails the run the way a failed test fails a build,
and the feedback arrives when it is cheapest — before anything is created. A
bouncer at the door of apply, checking every plan against the house rules.

Static scanners like tfsec, Checkov, and Trivy play a complementary role. They
read your configuration files and flag insecure patterns — open security
groups, unencrypted storage, missing logging — with the specificity of a
linter. Run them on every pull request, alongside fmt and validate. The
division of labour is clean: the obvious mistakes never reach a human
reviewer, which leaves reviewers free to think about the non-obvious ones.

**[SECTION — The pipeline you can trust — 3:40]**
A safe Terraform pipeline has a fixed shape. First, fmt and validate — is it
well-formed? Then plan, saved to a file — what exactly would change? Then
policy and security scans against that plan — is it allowed? Then a human
reviews the plan output in the pull request. And finally, apply runs the exact
saved plan — not a fresh plan, the reviewed one. Every stage earns the next
one.

Credentials come from short-lived injected secrets or OIDC
federation — never the repository. Hard-coding a key in a .tf file is not
a shortcut; it is a breach with a commit hash. And when something does go
wrong, remember there is no terraform rollback command. You revert the
configuration in version control and apply the previous state of the code. Git
history is the undo button — one more reason every change flows through it.

Protect the state like the crown jewels, because that is what it is: secrets,
topology, the complete map of your infrastructure. Encrypt it at rest, lock
down who can read it, and enable versioning on the storage bucket so a
corrupted state can be rewound. Run terraform plan on every pull request, even
when nothing seems Terraform-related. The plan is cheap, and the surprise it
catches never is.

**[COMMON MISTAKES — 5:05]**
Three traps. One: using workspaces as production isolation — they share
backend and credentials, so a typo can cross the boundary. Two: committing
credentials to the repository, which turns a secret into a permanent,
searchable record. Three: assuming an undo command exists. It does not — rollback is a git revert
plus an apply, so every change must flow through version control.

**[RECAP — 5:25]**
Workspaces give one configuration multiple named states — a convenience for
variants, not isolation for production. Real boundaries mean separate
configurations, separate state, separate backends, ideally separate accounts.
Fold hand-built infrastructure in with terraform import, with import blocks
so the adoption is reviewed code. Guard the door to apply with policy as code
and static scanners — tfsec, Checkov, Trivy — on every pull request. The
pipeline shape: fmt and validate, plan saved to a file, policy and security
scans, human review, then apply of the exact saved plan. Credentials come
from short-lived injected secrets or OIDC, never the repo. Roll back by
reverting in git and re-applying. And protect state like the crown jewels —
encrypted, access-controlled, versioned.

## On-screen visuals

- HOOK: a lone engineer typing an unreviewed apply, contrasted with a
  pipeline where every change passes gates before touching production.
- Environments: workspaces and their limits: workspaces as separate notebooks
  in one shared desk drawer versus true boundaries — separate configs, state,
  backends, and accounts; hand-built servers being folded into code via
  import blocks.
- Guardrails before apply: policy and scanning: a bouncer checking each plan
  against house rules (no public buckets, approved regions, mandatory tags);
  tfsec/Checkov/Trivy scanning files like a linter on every pull request.
- The pipeline you can trust: the fixed pipeline shape as a five-stage flow
  — fmt/validate, saved plan, scans, human review, apply of the saved plan;
  credentials arriving as short-lived injected secrets; state shown as crown
  jewels under encryption and versioning.
- RECAP: workspaces, import, guardrails, pipeline shape, credentials,
  rollback, state protection as a seven-card summary.
