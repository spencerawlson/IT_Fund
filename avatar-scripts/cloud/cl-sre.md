# Reliability & Observability: Engineering Uptime — Avatar Tutor Script

**Lesson ID:** cl-sre
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~690 words)

## Spoken script

**[HOOK — 0:00]**
Site reliability engineering treats reliability as an engineering problem
with numbers attached. Instead of "never go down," teams agree how reliable
a service must be, measure it, and spend the remaining margin on shipping
changes. Reliability becomes a budget — and budgets can be managed.

**[WHY IT MATTERS — ~0:25]**
"How reliable should this be?" is one of the most expensive questions in
engineering, and most teams answer it with vibes. SRE gives you the
vocabulary to answer with numbers — and the exam tests every term in this
lesson. Precision here saves real money and real outages.

**[SECTION — SLIs, SLOs, SLAs and error budgets — ~0:50]**
Three terms, three levels. An SLI — service level indicator — is a
measurement: the share of requests served under 300 ms. An SLO — objective —
is the internal target: 99.9% of requests under 300 ms over 30 days. An SLA —
agreement — is the contractual promise to customers, with penalties, and it
is usually looser than the SLO. Measurement, target, contract — in that
order.

The error budget is the unreliability the SLO allows. At 99.9% over a 30-day
month, that is about 43 minutes of downtime. Here is the elegant part: while
budget remains, ship features; when it is spent, prioritise reliability work.
The budget turns the eternal fight between product and operations into
arithmetic. And each extra nine cuts the budget tenfold — 99.99% means about
4.3 minutes a month — which is why the target should match what users
actually need, not what sounds impressive.

**[SECTION — Observability — ~2:00]**
The three pillars of observability: metrics (numbers over time), logs
(discrete events), and traces (one request's path across services).
OpenTelemetry is the open standard for collecting all three. Distributed
tracing finds the slow or failing hop in a request that crosses many
services — without it, you are guessing which service to blame.

Google's four golden signals are latency, traffic, errors, and saturation.
And the alerting rule that separates seniors from juniors: an actionable
alert signals real user impact and has a clear response. Alert on symptoms —
SLO burn rate — rather than on every possible cause. A page at 3 AM should
mean users are hurting and you know the first step, not that a CPU hit 80%.

**[SECTION — Culture and practice — ~3:05]**
Chaos engineering deliberately injects failures — killing instances, adding
latency — to test resilience. Start small, in staging, with a defined blast
radius. You are not trying to break production; you are proving it bends
without breaking.

A blameless postmortem reviews an incident in terms of systems and processes,
not individuals — which encourages honest reporting and real fixes. Blame the
person and the next incident goes unreported; fix the system and it does not
recur. Toil is manual, repetitive, automatable operational work — and Google
SRE aims to keep it under 50% of an engineer's time, automating the rest.
Toil never improves the system; engineering does.

In Kubernetes, the health probes you met in the containers lesson return: a
readiness probe keeps traffic away from a pod until it can serve, and a
liveness probe restarts a container that has become stuck. Same probes, now
as reliability instruments.

**[COMMON MISTAKES — ~4:10]**
Three traps. One: confusing SLIs, SLOs, and SLAs. Measurement, internal
target, customer contract — in that order. Two: alerting on causes instead
of symptoms. Page on user impact with a clear response, not on every
threshold. Three: treating 100% as the target. Every nine costs tenfold —
match the SLO to what users actually need.

**[RECAP — ~4:30]**
SLI is the measurement, SLO the internal target, SLA the contract — with the
error budget as the allowed unreliability: 99.9% is about 43 minutes a month,
and each nine cuts it tenfold. Observability rests on metrics, logs, and
traces via OpenTelemetry; watch the four golden signals — latency, traffic,
errors, saturation — and alert on symptoms with a clear response. Practise
chaos engineering with a small blast radius, run blameless postmortems that
fix systems, keep toil under 50%, and let Kubernetes readiness and liveness
probes do their jobs. Reliability with numbers attached. That is SRE.

## On-screen visuals

- HOOK: "never go down" wish vs reliability as a measured budget.
- SLIs/SLOs/SLAs: three-level ladder — measurement, target, contract;
  error budget as a depleting bar (43 minutes at 99.9%); extra-nine
  tenfold arithmetic; ship-features vs fix-reliability decision gate.
- Observability: three pillars — metrics graph, log stream, distributed
  trace across services; four golden signals dashboard; actionable alert
  (user impact + clear response) vs noisy threshold alert.
- Culture: chaos engineering blast radius diagram (staging, small);
  blameless postmortem — systems, not people; toil vs engineering time
  split with the 50% line; Kubernetes readiness/liveness probes.
- RECAP: the cheat-sheet terms as a clean summary card.
