# Cluster Security: RBAC, Network Policy and Pod Hardening — Avatar Tutor Script

**Lesson ID:** k8s-security
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~613 words)

## Spoken script

**[HOOK — 0:00]**
A default Kubernetes cluster is permissive: any pod can talk to any pod, the
default service account often has more rights than it needs, and Secrets are
merely encoded, not encrypted. Production security is not a feature you enable
— it is a series of deliberate choices, each closing a door the defaults left
open.

**[WHY IT MATTERS — 0:25]**
Clusters get breached through exactly these doors: an overprivileged service
account, a flat network, a root container, an unscanned image. This lesson is
the five doors and how to close them. The exam tests the vocabulary; attackers
test the gaps.

**[SECTION — RBAC: who can do what — 0:50]**
Role-Based Access Control answers the cluster's most important question:
which identities may perform which actions on which resources. Roles, which are
namespaced, and ClusterRoles, which are cluster-wide, grant verbs — get, list,
create, delete — and RoleBindings attach them to users, groups or service
accounts. Every pod gets a ServiceAccount identity for talking to the API
server, and the discipline is always least privilege: each workload gets its
own minimal service account, because a compromised pod with cluster-admin is a
compromised cluster.

The default service account deserves suspicion, not trust. It exists in every
namespace, and in many setups it carries broader rights than any single
workload needs. Replace it per-workload, scope it tightly, and audit bindings
the way you would audit firewall rules — because that is what they are.

**[SECTION — Hardening pods, networks, and the supply chain — 2:20]**
Start with the pod. Run as non-root — runAsNonRoot with a non-zero runAsUser —
never set privileged to true. Privileged grants near-host access, and the Pod
Security Standards forbid it in restricted profiles. Drop unneeded Linux
capabilities. Apply those standards per namespace through admission control so
the hardening is enforced, not suggested. The restricted profile also blocks
privilege escalation outright — even a non-root container cannot claw its way
back up to root at runtime.

Then segment the network. A NetworkPolicy can restrict which pods and
namespaces may talk to each other — but remember the default is allow-all until
a policy selects a pod. The first policy you write is the one that starts
enforcing. Finally, guard the supply chain. Scan images for CVEs, pin digests
so "the same tag" can't silently become different software, and require
admission policies that block unsigned or unscanned images. Secrets reach pods
through the Secret object — with etcd encryption at rest and RBAC guarding
access — or better, from an external secrets manager. They are never baked
into images or committed to repositories. Quotas and LimitRanges per namespace
cap what any tenant can consume, because availability is a security property
too.

**[COMMON MISTAKES — 3:50]**
Three traps. First, trusting the default service account. It's convenient and
often overprivileged — give every workload its own minimal identity. Second,
assuming a NetworkPolicy blocks everything by default. Until a policy selects
a pod, the default is allow-all — the first policy you write starts the
enforcement. Third, believing the Secret object means encryption. It's
base64-encoded by default; you have to switch on etcd encryption at rest and
guard it with RBAC — or use an external secrets manager.

**[RECAP — 4:25]**
So here's the skeleton. RBAC is the access-control answer: Roles and
ClusterRoles grant verbs, bindings attach them to identities, and every pod
should get its own least-privilege ServiceAccount. Harden pods: run as
non-root, never privileged, drop unneeded capabilities, enforce Pod Security
Standards through admission. NetworkPolicies segment traffic — but allow-all is
the default until a policy selects a pod. Guard the supply chain with image
scanning, digest pinning and admission policies. Deliver secrets via Secret
objects with etcd encryption and RBAC, or an external manager — never in
images. And cap consumption with quotas and LimitRanges.

## On-screen visuals

- HOOK: a cluster with five doors standing open — service account, network,
  pod, image, secret — closing one by one.
- WHY IT MATTERS: the same doors as attacker paths — overprivileged pod,
  flat network, root container, unscanned image.
- RBAC: who can do what: verbs attached to Roles and ClusterRoles, bindings
  connecting them to service accounts; the default service account flagged
  with a warning.
- Hardening pods, networks, and the supply chain: a pod with the non-root,
  no-privileged and dropped-capabilities shields; a NetworkPolicy fence going
  up around selected pods; the supply chain as a pipeline — scan, pin digest,
  admit.
- COMMON MISTAKES: three warning cards — "suspect the default SA",
  "allow-all until a policy selects", "base64 is not encryption".
- RECAP: the cheat-sheet terms as a clean summary card.
