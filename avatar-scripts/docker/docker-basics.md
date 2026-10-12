# Containers & Docker Basics: Containers vs VMs, Images and the Engine — Avatar Tutor Script

**Lesson ID:** docker-basics
**Track:** Docker & Containers
**Estimated runtime:** ~5 minutes (~637 words)

## Spoken script

**[HOOK — 0:00]**
Before containers, deploying software was mostly hope. It worked on the
developer's laptop, and everyone crossed their fingers it would behave in
production. A container ends that gamble. It bundles your app with everything it
needs — the code, the runtime, the libraries — into one portable unit that
behaves identically everywhere it runs.

**[WHY IT MATTERS — 0:25]**
This lesson sits underneath everything else in the track. You cannot reason
about images, registries or Kubernetes until you can answer three questions
cold: what is a container, how is it different from a virtual machine, and what
is the relationship between an image and a container. The exam asks those
directly, and every production conversation assumes you already know.

**[SECTION — Containers, not virtual machines — 0:50]**
Start with the comparison that confuses everyone first. A virtual machine
virtualises hardware. Every VM carries a full guest operating system — its own
kernel, its own memory footprint. They are heavy, slow to boot, and expensive
to run many of. A container virtualises the operating system instead. Containers
are isolated processes on the host machine. The isolation comes from Linux
namespaces, which keep each container's view of the system separate, and
cgroups, which cap how much CPU and memory each one may consume. And critically,
every container shares the host's kernel. There is no guest OS at all.

Here's why that matters. No guest kernel means a container starts in
milliseconds, not minutes, and sips memory where a VM gulps it. You can run
dozens of containers on a host that would struggle with a handful of VMs. And
because each container carries its own dependencies, the application that passed
testing on a laptop is byte-for-byte the same artifact that ships to production.
Works on my machine stops being a joke and becomes a guarantee.

**[SECTION — Images and containers: template and instance — 2:20]**
Now the image and the container. A Docker image is a read-only template — a
stack of filesystem layers plus metadata describing how to run them. Nothing in
an image changes at runtime. It is the recipe, frozen. A container is a runnable
instance of an image. Docker adds a thin writable layer on top and starts the
defined process inside its own isolated namespaces.

One image can spawn many independent containers — the same nginx image can run
ten web servers at once. Run docker run nginx and Docker pulls the image if it
isn't local, creates the container, and starts it. That single command is the
entire deployment story for simple cases. Two more you'll use constantly: docker
ps shows what is running, docker ps minus a also shows stopped containers, and
docker images shows the templates waiting on disk. And know the engine's two
halves: the dockerd daemon that does the work, and the CLI that talks to it over
an API.

**[COMMON MISTAKES — 3:50]**
Three traps. First, calling a container a lightweight virtual machine. It isn't
virtualising hardware at all — there is no guest OS and no guest kernel.
Second, treating an image as changeable. Images are read-only by design. A
running container writes to its own throwaway layer, and that is gone when the
container is removed. Third, running docker ps and assuming nothing else is on
the box. Stopped containers stay hidden until you add the minus a flag.

**[RECAP — 4:25]**
So here's the skeleton. Containers are isolated processes sharing the host
kernel — light and fast where virtual machines are heavy. Linux namespaces
isolate, cgroups limit. Images are read-only templates; containers are their
running instances, and one image can spawn many containers. Docker run creates
and starts, docker ps lists running, docker images lists templates. And
underneath it all, the dockerd daemon does the work while the CLI gives it
orders.

## On-screen visuals

- HOOK: developer laptop vs production server, same container box dropped onto
  both, "works on my machine" struck through.
- WHY IT MATTERS: the three exam questions — container, VM, image vs container —
  as chapter badges.
- Containers, not virtual machines: side-by-side stack diagram — VM stack with
  hypervisor plus guest OS per box vs container stack sharing one host kernel;
  namespaces and cgroups labelled.
- Images and containers: template and instance: frozen layered image, thin
  writable layer drawn on top becoming a container; one image branching into
  three containers; dockerd daemon and CLI with an arrow between them.
- COMMON MISTAKES: three warning cards — "not a VM", "images are read-only",
  "docker ps -a".
- RECAP: the cheat-sheet terms as a clean summary card.
