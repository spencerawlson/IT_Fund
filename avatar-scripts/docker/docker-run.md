# Running Containers: Flags, Logs, exec and the Ephemeral Truth — Avatar Tutor Script

**Lesson ID:** docker-run
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~609 words)

## Spoken script

**[HOOK — 0:00]**
Building the image is half the craft. Running it well is the other half. The
docker run command looks simple, but its flags are the steering wheel for
everything a container does — where it runs, how it is reached, what it can
see, and what happens when it stops.

**[WHY IT MATTERS — 0:25]**
These are the flags you will type every single day. Detached, publish, env
variables, exec, logs — this vocabulary is the difference between fumbling with
containers and driving them. And this lesson hides one truth that surprises
everyone exactly once, about what happens to your data when a container stops.

**[SECTION — The flags that matter — 0:50]**
Most containers run detached with minus d, in the background, rather than
holding your terminal. Ports are published with minus p, as in minus p
8080:80 — host port first, container port second. That's how the outside world
reaches in, and the order is the exam's favourite tripwire. Give the container a
name with minus minus name web, so you can address it by something friendlier
than a hex id. Pass configuration with minus e KEY equals value — and when you
have more than a couple of variables, minus minus env-file loads them all from
a file, which beats a command line that scrolls off the screen. And add minus
minus rm for throwaway runs, so the container cleans itself up on exit instead
of littering your system.

For interactive work, minus it combines minus i, which keeps stdin open, and
minus t, which allocates a terminal. Docker run minus it ubuntu bash drops you
into a shell inside a fresh Ubuntu container — perfect for exploring an image.
These flags compose freely. Minus d, minus p 8080:80, minus minus name web,
minus minus rm, minus e MODE equals prod is a perfectly ordinary
production-ish invocation.

**[SECTION — Inside, around, and after — 2:20]**
A running container is not a black box. Docker exec minus it starts a new shell
inside the existing container — and note the distinction. Exec runs alongside
the main process; it does not replace it. Docker logs, with minus f to follow,
shows what the main process has printed, which is where every debugging session
begins. And docker stop followed by docker rm ends the lifecycle, while docker
rm minus f does both at once.

Here is the truth that surprises everyone once. Anything written inside the
container — outside a volume — dies with it. The container's writable layer is
deleted on removal, by design. Containers are ephemeral. They are cattle, not
pets. If the data matters, it belongs in a volume — which is exactly where the
next lesson begins.

**[COMMON MISTAKES — 3:50]**
Three traps. First, reversing the port order. Minus p 8080:80 is host first,
container second — getting it backwards is one of the most common silent
failures in the lab. Second, thinking docker exec replaces the container's main
process. It doesn't. It runs alongside it, like knocking on the door instead of
kicking it down. Third, treating the container like a little server where data
lives. Write a database into a container's own layer and your data dies with
the container. That's not a bug; it's the design.

**[RECAP — 4:25]**
So here's the skeleton. Minus d runs detached, minus p publishes host to
container port, minus minus name gives a friendly name, minus e passes
configuration, minus minus rm cleans up on exit, and minus it gives you an
interactive terminal. Docker exec opens a shell inside a running container;
docker logs shows what the main process said; docker stop and docker rm end the
lifecycle. And the one truth: containers are ephemeral. Data written inside a
container dies with it — volumes are for the things that must survive.

## On-screen visuals

- HOOK: a docker run command with flags flying off like steering-wheel
  controls — port, name, env, rm.
- WHY IT MATTERS: the five daily flags as a keyboard-shortcut strip.
- The flags that matter: flag anatomy — minus p 8080:80 with host and container
  sides colour-coded; minus it expanded into minus i plus minus t.
- Inside, around, and after: container as a room — exec shown as a second door
  opened while the main process keeps running; logs as a scrolling transcript;
  the writable layer fading to dust on rm.
- COMMON MISTAKES: three warning cards — "host:container order", "exec runs
  alongside", "data dies with the container".
- RECAP: the cheat-sheet terms as a clean summary card.
