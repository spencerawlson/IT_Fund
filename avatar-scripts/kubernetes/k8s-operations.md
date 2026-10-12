# Workload Types & Operability: StatefulSets, DaemonSets and Debugging — Avatar Tutor Script

**Lesson ID:** k8s-operations
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~5 minutes (~631 words)

## Spoken script

**[HOOK — 0:00]**
Deployments cover the common case, but real clusters run stranger workloads:
databases that need stable names, agents that must run on every node, batch
jobs that should run once and stop. Operating Kubernetes well means knowing the
full workload zoo — and having a calm debugging routine for when things go
wrong, because they will.

**[WHY IT MATTERS — 0:25]**
Choosing the wrong controller is how you get databases that lose their data
and monitoring agents that miss half your nodes. And debugging is the skill
that separates someone who has read about Kubernetes from someone who has
operated it. This lesson is both.

**[SECTION — Beyond Deployments: the workload zoo — 0:50]**
Reach for a StatefulSet when pods need identity: databases, queues, anything
where "replica 3" must be the same replica 3 after a restart, each with its own
stable name — app-0, app-1 — and its own PVC. A DaemonSet solves the opposite
problem — one copy of a pod on every node, or a selected subset — which is
exactly what node agents want: log collectors, monitoring daemons, CNI plugins.
And a Job runs pods to completion for batch work, exiting when done; a CronJob
schedules Jobs the way cron schedules scripts.

Choosing correctly matters because each controller encodes different promises.
Deployments promise interchangeable replicas. StatefulSets promise stable
identity. DaemonSets promise per-node coverage. Jobs promise completion. Match the promise to the workload and the cluster does the rest. Each controller is a specialist — ask which promise your workload needs, and the answer picks the controller.

**[SECTION — Debugging like an operator — 2:20]**
When a pod misbehaves, work the routine in order. Kubectl logs first — what
did the application say before it died? Kubectl describe pod second — the
events section reveals scheduling failures, image pull errors and probe
failures that logs never show. Kubectl exec minus it gets you inside a running
pod to inspect from within, and kubectl get events gives the cluster-wide
view: evictions, failed scheduling, the weather report of the whole system.

Learn to recognise CrashLoopBackOff: a pod crashing and restarting with growing
delays between attempts — almost always an application problem, like bad config
or a missing dependency, diagnosed via logs and describe. For node maintenance,
cordon marks a node unschedulable and drain evicts its pods so they reschedule
elsewhere — the graceful way to take a machine down. Underneath it all runs
the same loop every controller follows: observe actual state, compare to desired, act to reconcile, forever. Know the zoo, work the routine, and respect the loop that never stops. That loop is Kubernetes.

**[COMMON MISTAKES — 3:50]**
Three traps. First, jumping to describe before reading the logs. Logs are step
one — they tell you what the application itself said. Second, confusing cordon
and drain. Cordon just stops new scheduling; drain actually evicts the running
pods so the node can go down. Third, treating CrashLoopBackOff as a cluster
problem. The backoff is Kubernetes being polite — the crash itself is almost always your application, and the answer is in the logs. When in doubt, trust the logs over your theories — they were there, and you weren't.

**[RECAP — 4:25]**
So here's the skeleton. StatefulSets give pods stable identity and their own
PVCs — databases and queues. DaemonSets put one pod on every node — log
collectors, monitoring, CNI. Jobs run batch work to completion; CronJobs
schedule them. Match the controller's promise to the workload. When debugging,
work the routine: logs, then describe for events, exec to inspect from inside,
get events for the cluster-wide view. CrashLoopBackOff means the app keeps
crashing — check logs and describe. Cordon and drain for graceful node
maintenance. And the controller loop underneath it all: observe, compare,
reconcile, forever.

## On-screen visuals

- HOOK: a zoo of workloads — a database with name tags, an agent on every
  node, a batch job ticking to completion.
- WHY IT MATTERS: wrong-controller consequences — a database losing identity,
  half the nodes unmonitored.
- Beyond Deployments: the workload zoo: four enclosures — StatefulSet with
  app-0 and app-1 plus per-pod PVCs, DaemonSet covering every node, Job
  finishing and exiting, CronJob on a schedule.
- Debugging like an operator: the four-step routine as a checklist — logs,
  describe, exec, events; CrashLoopBackOff as a crash-restart spiral with
  growing gaps; cordon and drain emptying a node gracefully.
- COMMON MISTAKES: three warning cards — "logs first", "cordon vs drain",
  "CrashLoopBackOff is your app".
- RECAP: the cheat-sheet terms as a clean summary card.
