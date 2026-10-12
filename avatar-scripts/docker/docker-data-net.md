# Volumes & Networking: Persistence and Container DNS — Avatar Tutor Script

**Lesson ID:** docker-data-net
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~626 words)

## Spoken script

**[HOOK — 0:00]**
Two problems appear the moment containers get serious. First: data must outlive
the container that created it. Second: containers must talk to each other.
Docker answers the first with volumes and the second with networks — and both
have one more subtlety than beginners expect.

**[WHY IT MATTERS — 0:25]**
This is the lesson that turns containers from toys into infrastructure. The
ephemeral container model only works if you have somewhere durable to put data
and some reliable way for services to find each other. Get these two wrong and
you get the two classic production outages: data that vanished on redeploy, and services that can't reach each other. Lose data on a redeploy once, and you never forget the volume lesson again.

**[SECTION — Volumes: data that survives — 0:50]**
A volume is Docker-managed storage that lives independently of any container.
Mount a named volume with minus v myvol colon slash data, and Docker creates
it if needed. Delete every container, and the data remains, ready for the next
one. That is the correct home for databases, uploads, anything you would mourn
losing. Writing into the container's own layer instead is the classic beginner
mistake — fast, easy, and gone the moment the container is removed.

Bind mounts are the sibling. They map a specific host path into the container,
which makes them perfect for development — mount your source tree and edit live
while the container runs your code. The rule of thumb: volumes for production
data that Docker manages, bind mounts for files you edit on the host. Think of it as the difference between a safety-deposit box and a shared desk — one is managed and permanent, the other is for collaboration. And one
golden rule for both: never bake secrets into the image or the Dockerfile.
Configuration arrives at runtime — through environment variables, mounted
files, or a secrets manager.

**[SECTION — Networks: containers that talk — 2:20]**
The default bridge network gives containers a private subnet where they can
reach each other — and on a user-defined bridge, they do it by name, thanks to
Docker's built-in DNS. Your web container simply connects to "db". No IP
addresses memorised. That name resolution is the reason to prefer user-defined
networks over the default bridge for anything real.

Two special modes complete the picture. Minus minus network host shares the
host's network stack outright — no port mapping needed, slightly faster, but
the container gives up network isolation, and it behaves differently on
non-Linux hosts. Minus minus network none is the opposite: no networking at
all, for untrusted or fully offline workloads. Most of the time, though, you'll
live on a bridge network and let DNS do the work.

**[COMMON MISTAKES — 3:50]**
Three traps. First, persisting production data in the container's own layer.
It dies with the container — named volumes exist for exactly this. Second,
sticking with the default bridge and memorising IP addresses. User-defined
bridges give you DNS by container name, which is what you'll use in Compose
and beyond. Third, putting secrets in the Dockerfile or the image. Even if you
delete them in a later layer, they remain recoverable in the image history.
Secrets arrive at runtime, never at build time.

**[RECAP — 4:25]**
So here's the skeleton. Named volumes are Docker-managed storage that survives
container removal — databases and uploads live there. Bind mounts map a host
path into the container, ideal for live development editing. Never bake secrets
into images. For networking, user-defined bridge networks give containers a
private subnet with DNS by name. Host mode shares the host's stack with no
isolation; none mode gives no networking at all. Most real work lives on a
bridge, with DNS doing the remembering.

## On-screen visuals

- HOOK: two problems as two question marks — a container crumbling with data
  inside, and two containers shouting with no path between them.
- WHY IT MATTERS: the two classic outages — "data vanished on redeploy" and
  "services can't reach each other".
- Volumes: data that survives: a named volume persisting while containers are
  created and destroyed around it; bind mount shown as a live cable between
  host editor and container.
- Networks: containers that talk: bridge network diagram with containers
  labelled by name; web connecting to "db" via DNS; host and none modes as
  extreme positions on a dial.
- COMMON MISTAKES: three warning cards — "container layer is not storage",
  "default bridge has no DNS", "secrets never in images".
- RECAP: the cheat-sheet terms as a clean summary card.
