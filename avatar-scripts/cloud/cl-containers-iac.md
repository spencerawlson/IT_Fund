# Containers, Kubernetes & IaC: Ship It the Same Way Every Time — Avatar Tutor Script

**Lesson ID:** cl-containers-iac
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
Containers package an application with everything it needs; Kubernetes runs
them at scale; infrastructure as code defines the environment they run in.
Together they make deployments repeatable — and they introduce their own
security defaults you must fix. Fast shipping with bad defaults is just fast
breaches.

**[WHY IT MATTERS — ~0:25]**
This is the modern deployment stack, and the exam tests its objects and its
gotchas: what is a Pod, what does a NetworkPolicy actually do, why is
`terraform plan` sacred? In the job, these are the tools you will touch
daily — understand the defaults before they surprise you.

**[SECTION — Containers — ~0:50]**
Containers share the host's kernel, while each virtual machine runs a full
operating system. That makes containers lighter and faster to start; VMs give
stronger isolation. Choose the tool for the trust boundary you need.

A Dockerfile is the recipe for building an image, and each instruction
creates a cached layer — which is why you copy dependencies before code: the
slow install layer stays cached when only code changes. Harden the result:
run containers as a non-root user, drop unneeded Linux capabilities, and use
read-only file systems where possible. Every one of these limits the damage
if a container is compromised. Defaults are convenient; they are not secure.

**[SECTION — Kubernetes objects — ~1:55]**
The Pod is the smallest deployable unit: one or more containers sharing
network and storage. A Deployment keeps a desired number of pod replicas
running and performs rolling updates, using ReplicaSets under the hood. A
Service gives a stable IP and DNS name that load-balances across a set of
pods — types ClusterIP, NodePort, and LoadBalancer. Pod, Deployment,
Service: the what, the how-many, the how-to-reach-it.

Two defaults surprise people — and the exam. Kubernetes Secrets are only
base64-encoded unless you configure encryption at rest for etcd or use an
external secrets manager. Base64 is encoding, not encryption; anyone who can
read etcd can read your secrets. And pods can talk to each other freely
until a NetworkPolicy restricts which pods may talk to which. The default is
open; you must explicitly close it — default-deny, then allow the paths you
need.

Health checks complete the picture: a readiness probe keeps traffic away
from a pod until it can serve; a liveness probe restarts a stuck container.
One guards the traffic, the other guards the process.

**[SECTION — Infrastructure as code and GitOps — ~3:10]**
`terraform plan` shows the changes Terraform would make without making them
— review the plan in pull requests before `terraform apply`. Applying a saved
plan guarantees you deploy exactly what was reviewed. Store Terraform state
remotely with locking to prevent concurrent corruption — and remember state
can contain secrets, so encrypt it and restrict access.

GitOps makes Git the source of truth: an agent such as Argo CD or Flux
continuously reconciles the cluster to what is in the repository. Every
change is a reviewed commit, and drift is corrected automatically. If
someone hand-edits the cluster, GitOps puts it back. The repository is not
documentation of the infrastructure — it is the infrastructure.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: treating base64 Secrets as encrypted. They are encoded —
anyone reading etcd reads your secrets; encrypt at rest or use an external
manager. Two: assuming pods are isolated by default. They can talk freely
until a NetworkPolicy says otherwise. Three: running `terraform apply`
without reviewing the plan. Plan first, review in the PR, then apply.

**[RECAP — ~4:30]**
Containers share the host kernel — lighter than VMs, weaker isolation —
built from Dockerfiles where each instruction is a cached layer; run them
non-root, drop capabilities, prefer read-only filesystems. Kubernetes:
Pods are the smallest unit, Deployments keep replicas rolling, Services give
stable endpoints — with Secrets base64-only unless encrypted, NetworkPolicies
default-open until you close them, and readiness/liveness probes guarding
traffic and processes. Terraform: plan before apply, review in PRs, remote
state with locking, encrypted. GitOps: Git is the source of truth, Argo CD
or Flux reconciles, drift corrects itself. Ship it the same way every time.
That is the stack.

## On-screen visuals

- HOOK: application packaged into a container, containers orchestrated by
  Kubernetes, environment defined as code — with a warning flag on insecure
  defaults.
- Containers: container vs VM diagram (shared kernel vs full OS);
  Dockerfile layers building up, dependency layer cached; hardening
  checklist — non-root user, dropped capabilities, read-only filesystem.
- Kubernetes: Pod → Deployment (replicas, rolling update) → Service
  (ClusterIP/NodePort/LoadBalancer); Secrets shown as base64-decodable;
  NetworkPolicy default-open vs default-deny with one allowed path;
  readiness vs liveness probe diagram.
- IaC/GitOps: the Terraform review loop — init, fmt/validate, plan in PR,
  apply saved plan; remote state with locking and encryption; GitOps
  reconciliation loop with Argo CD/Flux correcting drift.
- RECAP: the cheat-sheet terms as a clean summary card.
