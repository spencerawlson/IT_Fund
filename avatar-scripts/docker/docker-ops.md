# Operations & Troubleshooting: Health, Limits and Debugging — Avatar Tutor Script

**Lesson ID:** docker-ops
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~620 words)

## Spoken script

**[HOOK — 0:00]**
Development ends at docker run. Production begins the moment something needs
to stay up, stay bounded, and tell you when it is sick. Operations is the
discipline of running containers as a professional — health signals, resource
limits, logs, and a calm debugging routine.

**[WHY IT MATTERS — 0:25]**
Nobody gets paged because a container started. They get paged because it
stopped responding, ate the host's memory, or died silently overnight. This
lesson is the toolkit for all three — the handful of commands and settings that
turn "restart it and hope" into actual operations.

**[SECTION — Health, limits, and staying up — 0:50]**
A HEALTHCHECK instruction tells Docker how to ask the container "are you
okay?" — and orchestrators listen to the answer, restarting or routing around
the unhealthy. It is the difference between a process that is running and a
service that is working. Pair it with resource limits: minus minus memory and
minus minus cpus bound what one container may consume, so a leak or spike
degrades one service instead of OOM-killing the host. Unbounded containers in production are a hope-based strategy. Hope is not a strategy for availability — these three settings are.

Restart policies close the loop. Minus minus restart unless-stopped is the
sensible default for long-running services. Docker brings the container back
after crashes and host reboots, but respects your explicit stop. Together —
health signal, resource bounds, restart policy — they turn a container from a
process into a service.

**[SECTION — Seeing inside and debugging — 2:20]**
When something is wrong, work the same routine every time. Start with docker
logs. What did the process say before it died? If it's still running, docker
exec minus it gets you a shell inside to inspect files, processes and
connectivity from the container's point of view. Docker stats shows live CPU,
memory, network and I/O per container — the fastest way to spot the one eating the host. When the host is gasping, stats names the culprit in seconds. And docker inspect dumps the full JSON truth: mounts, networks,
environment, everything the container believes about itself.

Prefer small, single-purpose containers and this routine stays short: one
process per container means logs tell one story and failures have one suspect.
And keep the host tidy — docker system prune reclaims the stopped containers,
dangling images and unused networks that accumulate silently, though the
aggressive flags, minus a and minus minus volumes, deserve respect and a second
look before you run them.

**[COMMON MISTAKES — 3:50]**
Three traps. First, assuming a running process is a working service. Without a
healthcheck, Docker knows the container is alive but not that it's answering
requests — the classic "it's up but broken" blind spot. Running means the process exists; healthy means the service works. Only the healthcheck knows the difference. Second, running
production containers without resource limits. One memory leak then takes down
the whole host, not just the leaky service. Third, running docker system prune
with the aggressive flags casually. Minus a and minus minus volumes will
delete things you wanted — read the flags before you pull the trigger.

**[RECAP — 4:25]**
So here's the skeleton. HEALTHCHECK tells Docker how to ask whether the
container is really working, and orchestrators act on the answer. Minus minus
memory and minus minus cpus bound resource use so one container can't take down
the host. Minus minus restart unless-stopped brings services back after crashes
and reboots. When debugging, work the routine: docker logs first, docker exec
to inspect from inside, docker stats to find the hungry one, docker inspect
for the full JSON truth. Keep containers single-purpose, and prune the host
with respect for the aggressive flags.

## On-screen visuals

- HOOK: a container sleeping at night, three monitors labelled "up",
  "bounded", "reporting" lighting up.
- WHY IT MATTERS: a pager buzzing at 3am — three causes: unresponsive, memory
  hog, silent death.
- Health, limits, and staying up: a stethoscope on a container for
  HEALTHCHECK; a fence around CPU and memory; a phoenix rising with the
  unless-stopped policy.
- Seeing inside and debugging: the debugging routine as four steps — logs,
  exec, stats, inspect; single-purpose containers as one story per log; system
  prune as a janitor sweeping, with minus a flagged in red.
- COMMON MISTAKES: three warning cards — "running is not working",
  "unbounded is hope-based", "respect the prune flags".
- RECAP: the cheat-sheet terms as a clean summary card.
