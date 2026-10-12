# Docker Compose: The Whole Stack in One File — Avatar Tutor Script

**Lesson ID:** docker-compose
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~626 words)

## Spoken script

**[HOOK — 0:00]**
Real applications are rarely one container. A web app needs its database, its
cache, maybe a queue — and starting them by hand, in order, with the right
flags, is toil that begs to be automated. Docker Compose replaces a folder of
shell scripts with a single declarative YAML file.

**[WHY IT MATTERS — 0:25]**
Compose is how multi-container applications actually get developed, tested and
demoed. It's the same declarative idea that Kubernetes scales up later — you
describe the whole stack, and the tool makes it real. Learn it here and the
Kubernetes manifests in the next track will feel familiar on day one.

**[SECTION — One file for the whole stack — 0:50]**
The compose.yaml file declares services — each one a container definition with
its image or build context, ports, environment and volumes — plus the networks
and volumes they share. Docker compose up reads it and brings the entire stack
to life. Add minus d to run detached. When you're done, docker compose down
stops everything and removes the containers and networks it created. A clean
teardown in one command.

Services reach each other by name over the network Compose creates for them.
The app connects to "db:5432" and never cares which host or IP the database landed on. This is service discovery without the toil — no one maintains a hosts file anymore. Dependencies are declared with depends_on — with one caveat worth
memorising. It waits for the container to start, not for the database inside
to be ready. Pair it with a healthcheck when startup order truly matters,
because a database that is running but not yet accepting connections will
crash your app just as fast as no database at all.

**[SECTION — Day-to-day Compose — 2:20]**
Configuration lives with the service, not in the image. The environment mapping
— or env_file for many variables — keeps secrets and settings out of built
artifacts, where they belong. The image stays portable; the stack file carries the secrets. Same built artifact, different settings per environment — change the compose file, never the image. When code changes, docker compose up minus minus build rebuilds
the images that have a build context before starting. And when one service needs
muscle, docker compose up minus minus scale web equals three runs three copies
— Compose handles the replicas while something upstream spreads the traffic.

Compose is deliberately single-host. It orchestrates containers on one machine
beautifully, and that covers development, CI, demos and small production
deployments. When you outgrow one host — true clustering, self-healing across
machines — that is the moment Kubernetes enters the picture. And the next
track is waiting.

**[COMMON MISTAKES — 3:50]**
Three traps. First, treating depends_on as a readiness guarantee. It only waits for the container to start, not for the service inside to be ready. Pair it with a healthcheck — because starting isn't ready, and a healthcheck is the only signal that means the service is actually accepting work. Second, baking configuration into the image. Config belongs
in the environment mapping or an env file — the image should run anywhere,
unconfigured. Third, assuming Compose scales across machines. It's single-host
by design. Multi-host clustering is Kubernetes territory.

**[RECAP — 4:25]**
So here's the skeleton. Compose.yaml declares the services, networks and
volumes of the whole stack. Docker compose up starts everything; minus d runs
it detached; docker compose down tears it down cleanly. Services reach each
other by name, like db:5432. Depends_on orders startup but not readiness — add
a healthcheck for that. Configuration goes in environment or env_file, never in
the image. Minus minus build rebuilds before starting, minus minus scale
replicates a service, and it's all single-host — Kubernetes is the next step
up.

## On-screen visuals

- HOOK: a folder of tangled shell scripts collapsing into one clean compose.yaml.
- WHY IT MATTERS: Compose stack diagram morphing into a Kubernetes manifest —
  "the same idea, bigger".
- One file for the whole stack: compose.yaml with services, networks and
  volumes highlighted in layers; app connecting to "db:5432"; depends_on as an
  arrow marked "start order only".
- Day-to-day Compose: environment mapping vs baked-in config, split-screen
  right/wrong; minus minus scale spawning three web containers behind a load
  balancer.
- COMMON MISTAKES: three warning cards — "depends_on is not readiness",
  "config out of the image", "single host only".
- RECAP: the cheat-sheet terms as a clean summary card.
