# Rollouts, Scaling & Probes: Deploy Without Downtime — Avatar Tutor Script

**Lesson ID:** k8s-deployments
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~618 words)

## Spoken script

**[HOOK — 0:00]**
Shipping software used to mean downtime windows and crossed fingers. Kubernetes
turns deployment into a routine: new pods roll out gradually while old ones
keep serving, health probes decide what is really ready, and a bad release
rolls back with a single command.

**[WHY IT MATTERS — 0:25]**
This is the lesson that makes Friday deploys boring — in the best way. Rolling
updates, probes, autoscaling and resource limits are the machinery of reliable
releases. The exam loves the probe distinctions, and production loves all of it. If deployments are the heart of Kubernetes, this lesson is the heartbeat — the rhythm of safe change.

**[SECTION — Rolling updates: ship without stopping — 0:50]**
A Deployment's default strategy replaces pods gradually: new ones come up, old
ones drain, and the Service keeps routing to healthy pods throughout. Users notice nothing. Compare that to the old world: maintenance windows, deploy freezes, everyone holding their breath. The rollout model replaces fear with routine. If the new version misbehaves, kubectl rollout undo rewinds to
the previous revision — Deployments keep that history precisely so a bad Friday
deploy is a one-command recovery, not an incident.

Kubectl rollout status tells you whether the rollout actually finished, which
makes it the natural gate in a CI/CD pipeline: don't declare victory until
every new pod is ready. Rolling updates are the default because they encode
the right tradeoff — progress with a safety net — but the machinery only works
if the cluster can tell healthy from unhealthy, which is what probes are for. The probes are how the cluster sees what you can't — each pod reporting its own fitness, continuously.

**[SECTION — Probes, autoscaling, and fair shares — 2:20]**
Three probes, three questions. Liveness: "is this container still alive?" — a
failure restarts it. Readiness: "should it receive traffic yet?" — a not-ready
pod is quietly removed from Service endpoints until it is. Startup: "has this
slow starter finished booting?" — it holds the liveness probe off during long
initialisations so healthy-but-slow containers aren't killed for being
deliberate.

Scaling and fairness complete the picture. The Horizontal Pod Autoscaler adjusts
replica counts from metrics like CPU — but it needs metrics-server running to
see anything. And resource requests versus limits is the fairness contract:
requests guide the scheduler's placement, limits cap what a pod may consume. Requests are the scheduler's planning data; limits are the enforcer's red line. Different masters, both needed. A
container that exceeds its memory limit is OOM-killed; CPU overuse is throttled
instead. Set both, always — unbounded pods let one workload starve the node
and everyone on it.

**[COMMON MISTAKES — 3:50]**
Three traps. First, mixing up liveness and readiness. Liveness failing
restarts the container; readiness failing removes it from traffic. Different
problems, different cures. Second, deploying the HPA without metrics-server.
The autoscaler can't scale what it can't measure — no metrics, no scaling.
Third, skipping resource requests and limits. Unbounded pods let one workload
starve the whole node, and memory overuse gets OOM-killed with no mercy. An unbounded pod is a polite way of saying one bad workload can evict everything else on the node.

**[RECAP — 4:25]**
So here's the skeleton. Rolling updates replace pods gradually while the
Service routes to healthy ones — users notice nothing. Kubectl rollout undo
rewinds a bad release; kubectl rollout status gates your CD pipeline. Three
probes: liveness restarts dead containers, readiness decides traffic, startup
protects slow starters. The Horizontal Pod Autoscaler scales on metrics but
needs metrics-server to see them. Requests guide scheduling, limits cap usage
— memory overuse is OOM-killed, CPU overuse throttled. Set both, always. Ship gradually, probe honestly, scale on data, and bound everything.

## On-screen visuals

- HOOK: old pods draining and new pods spinning up side by side, traffic never
  dropping.
- WHY IT MATTERS: a calm Friday deploy vs a downtime-window deploy, split
  screen.
- Rolling updates: ship without stopping: a wave replacing pods left to right;
  rollout undo rewinding to the previous revision; rollout status as a pipeline
  gate.
- Probes, autoscaling, and fair shares: three probe questions as three
  gauges — alive, ready, booted; the HPA as a thermostat reading CPU;
  requests and limits as a scheduler contract with an OOM-kill warning.
- COMMON MISTAKES: three warning cards — "liveness vs readiness", "HPA needs
  metrics-server", "always set requests and limits".
- RECAP: the cheat-sheet terms as a clean summary card.
