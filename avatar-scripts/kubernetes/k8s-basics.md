# Kubernetes Basics: Control Plane, Pods and Desired State — Avatar Tutor Script

**Lesson ID:** k8s-basics
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~618 words)

## Spoken script

**[HOOK — 0:00]**
Docker taught the world to package applications as containers. Kubernetes
answers the next question — who runs them when there are hundreds, across
dozens of machines, and they must never go down? It schedules containers, heals
them when they fail, scales them with demand and networks them together, all
driven by declarations of what you want rather than commands describing how.

**[WHY IT MATTERS — 0:25]**
Kubernetes is the platform most containerised production runs on, and the whole
track builds on this lesson. If you can't draw the two halves of a cluster from
memory and explain what a pod is, nothing later will stick. The exam also tests
this shape directly — the components, the vocabulary, the declarative idea.

**[SECTION — Two halves: brains and muscle — 0:50]**
Every cluster has a control plane and worker nodes. The control plane is the
brain: the API server every command talks to, the scheduler that assigns pods
to nodes, the controller-manager running the reconciliation loops, and etcd —
the key-value store holding the entire desired state of the cluster, its
single source of truth. Back it up. Lose etcd and you lose the cluster's
memory.

Worker nodes are the muscle. Each runs a kubelet — the agent that takes pod
assignments from the control plane and runs them via the container runtime —
plus the networking pieces that wire pods together. Your applications never run
on the control plane in a sane setup. They run on nodes, and the control plane's only job is deciding where and keeping it so. This split is what lets Kubernetes scale: one brain making decisions, many muscles doing the work.

**[SECTION — Declare the desired state; let controllers reconcile — 2:20]**
Kubernetes is declarative by design, and that word carries the whole
philosophy. You describe what should exist — three replicas of this app, this
config, this port — and controllers continuously compare reality to your
declaration, fixing drift forever. The declaration is the whole contract: you
state what should exist, and every controller in the cluster works, forever,
to make reality match it. A crashed pod is not an incident to triage.
It is drift, and the controller recreates it as a matter of routine. The payoff is enormous: humans declare intent, and the system does the endless, boring, perfect work of keeping it true.

Kubectl is how you speak to the API server: apply to declare, get to observe,
describe to investigate, logs to read. The pod — one or a few tightly-coupled
containers sharing network and storage — is the smallest thing you can deploy.
You will rarely create pods directly, though. Controllers like Deployments do
that for you, which is where the next lesson begins.

**[COMMON MISTAKES — 3:50]**
Three traps. First, picturing your application running on the control plane.
It doesn't — the control plane is management only; workloads belong on worker
nodes. Second, thinking imperatively. Kubectl run this, delete that is manual
driving; kubectl apply of a manifest is declaring the destination and letting the controllers steer. Declarative means you describe the destination; the controllers handle the driving. Third, treating etcd as plumbing you can ignore. It is
the cluster's memory — if you don't back it up, you don't have a cluster,
you have a hope.

**[RECAP — 4:25]**
So here's the skeleton. The control plane is the brain — API server, scheduler,
controller-manager, etcd — and worker nodes are the muscle, running pods via
the kubelet and the container runtime. Etcd holds all cluster state, so back it
up. The pod is the smallest deployable unit: one or more containers sharing
network and storage. Kubectl speaks to the API server — apply, get, describe,
logs. And the philosophy: declare the desired state, and let controllers reconcile reality to it, forever. Brains decide, muscle executes, controllers reconcile.

## On-screen visuals

- HOOK: hundreds of containers scattered across machines snapping into an
  organised, self-healing grid.
- WHY IT MATTERS: the two halves of a cluster drawn as a labelled sketch —
  "draw this from memory".
- Two halves: brains and muscle: control plane components labelled above,
  worker nodes with kubelets below; etcd drawn as the cluster's memory with a
  backup arrow.
- Declare the desired state; let controllers reconcile: desired-state manifest
  on one side, drifting reality on the other, a reconciliation loop closing
  the gap; a crashed pod auto-recreating.
- COMMON MISTAKES: three warning cards — "apps don't run on the control
  plane", "apply, don't improvise", "back up etcd".
- RECAP: the cheat-sheet terms as a clean summary card.
