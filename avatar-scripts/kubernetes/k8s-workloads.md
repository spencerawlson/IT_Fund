# Pods & Workloads: Pods, Deployments and the Label Glue — Avatar Tutor Script

**Lesson ID:** k8s-workloads
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~601 words)

## Spoken script

**[HOOK — 0:00]**
Pods are the atoms of Kubernetes, but atoms alone don't make a system. In
production you never manage pods one by one — you declare a Deployment, and it
keeps the right number of identical pods alive, updates them gracefully, and
rolls back when an update goes wrong.

**[WHY IT MATTERS — 0:25]**
This is the workload model you'll use every day. Pods, Deployments and
ReplicaSets are the answer to "how do I keep my app running?" — and labels
are the quiet mechanism underneath all of it. Get this layer right and the
networking, storage and scaling lessons all snap into place. If the last lesson was the cluster's anatomy, this one is its heartbeat — how workloads stay alive.

**[SECTION — The pod: small, shared, ephemeral — 0:50]**
A pod wraps one or more containers that belong together — containers sharing
the same network namespace, meaning one IP and localhost between them, and
optionally the same storage volumes. The classic multi-container pod is a main app plus a helper: a logging sidecar, a proxy. Tight coupling is the test: if the containers always need to live, die and move together, they belong in one pod. They are scheduled together and
they live or die together.

But pods are mortal by design. IPs change, nodes die, pods get rescheduled.
Never build anything that assumes a pod will live long. That mortality is
exactly why you don't create bare pods in production. A bare pod has no
controller watching it — if its node dies, nobody reschedules it, and your app
simply stops. Controllers exist to make promises about the future, and the
Deployment is the one you'll use most.

**[SECTION — Deployments: pods with a future — 2:20]**
A Deployment declares "I want N identical pods of this spec", and a ReplicaSet
underneath does the counting — adding pods when there are too few, removing
them when there are too many. Scale with kubectl scale deploy slash name minus
minus replicas equals five, or by editing the manifest. In practice you change
the manifest file and run kubectl apply minus f — declaring the new desired
state and letting the controller converge on it, rather than hand-editing
anything live. Either way, the ReplicaSet converges reality to the number.

The glue is labels and selectors. Pods carry labels, and the Deployment's
selector matches them. This indirection — controllers finding their pods by
label rather than by name — is how Kubernetes stays flexible, and it's also how
Services will find them in the networking lesson. Self-healing falls out for
free: a dead pod means the count is wrong, so a replacement is scheduled on a healthy node without anyone being paged. Self-healing sounds magical, but it's just the controller being stubborn: the count must match, so the count gets fixed.

**[COMMON MISTAKES — 3:50]**
Three traps. First, creating bare pods in production. No controller means no
rescheduling — one dead node and your app is gone. Always go through a
Deployment. Second, assuming pod IPs are stable. They're ephemeral by design;
Services and DNS exist precisely so nothing hardcodes them. Third,
underestimating labels. They're not decoration — they're how every controller
and Service in the cluster finds what it manages.

**[RECAP — 4:25]**
So here's the skeleton. A pod is the atomic unit: one or more containers
sharing network and storage, scheduled together, mortal by design. Never run
bare pods in production — they have no controller to reschedule them. A
Deployment declares how many identical pods you want; the ReplicaSet counts and
converges. Labels and selectors are the glue that lets controllers find their
pods. And self-healing is just arithmetic: a dead pod makes the count wrong,
so a new one is scheduled — no pager, no heroics.

## On-screen visuals

- HOOK: scattered pods snapping under a Deployment umbrella, a bad update
  rolling back cleanly.
- WHY IT MATTERS: the workload stack — pod inside ReplicaSet inside Deployment —
  as a nested diagram.
- The pod: small, shared, ephemeral: a pod box with two containers sharing one
  IP and a volume; a sidecar pattern example; a pod crumbling and respawning
  elsewhere.
- Deployments: pods with a future: the ReplicaSet as a counter converging to N;
  labels on pods matched by a selector; a dead pod replaced on a healthy node.
- COMMON MISTAKES: three warning cards — "no bare pods", "IPs are ephemeral",
  "labels are glue".
- RECAP: the cheat-sheet terms as a clean summary card.
