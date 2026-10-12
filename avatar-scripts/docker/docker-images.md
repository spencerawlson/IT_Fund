# Images & the Dockerfile: Recipes, Layers and Build Caching — Avatar Tutor Script

**Lesson ID:** docker-images
**Track:** Docker & Containers
**Estimated runtime:** ~5 minutes (~646 words)

## Spoken script

**[HOOK — 0:00]**
Every Docker image begins life as a text file. The Dockerfile is a recipe — a
short list of instructions that Docker executes top to bottom, each one adding a
layer to the image. Learn to write a good Dockerfile and you control everything
about how your application is built, cached and shipped.

**[WHY IT MATTERS — 0:25]**
Dockerfiles are where container work actually happens day to day. A bad one
builds an image that works but is slow, bloated and hard to cache. A good one
rebuilds in seconds when you change a line of code. The exam also leans on this
lesson heavily — it loves the instructions that beginners misread, which is
exactly where we're going.

**[SECTION — The Dockerfile: a recipe in layers — 0:50]**
It starts, almost always, with FROM — the base image everything else builds on. Think of FROM as choosing your starting point: pick the wrong base and you carry its weight forever.
A language runtime, a minimal Linux, whatever your app needs. After that, each
instruction adds a layer. RUN executes a command during the build — installing
packages, compiling code. COPY moves files from the build context into the
image. And the pair of ENTRYPOINT and CMD defines what actually runs when a
container starts. ENTRYPOINT names the executable; CMD supplies its default
arguments. Think of it like a job description: ENTRYPOINT says who shows up,
CMD says what they're told to do.

Two instructions deserve special attention because beginners misread them.
EXPOSE documents which port the container listens on — but it is metadata only.
It opens nothing and publishes nothing. You still map the port at run time with
minus p. And WORKDIR sets the working directory for everything after it,
creating the directory if needed, so your COPY and RUN steps land somewhere
sane instead of the filesystem root.

**[SECTION — Layer caching: build fast by building smart — 2:20]**
Docker caches the result of every layer. Rebuild, and any instruction whose
inputs haven't changed is skipped — which is why instruction order matters enormously. Every instruction depends on the layer beneath it, so the earlier you change something, the more work rebuilds. Put the steps that change rarely first and the ones that change
constantly last. The classic example: COPY the dependency manifest and install
before copying the source, so a one-line code change doesn't trigger a full
dependency reinstall. That single habit can turn a five-minute rebuild into a
five-second one.

Two more habits complete the picture. A dot-dockerignore file keeps dot-git,
node modules and other build-irrelevant bulk out of the build context, so less
data crosses to the daemon and images stay lean. And remember that each RUN
creates a layer. The cache is your friend during development, but a bloated
layer history is your enemy in production — a theme the optimisation lesson
takes further.

**[COMMON MISTAKES — 3:50]**
Three traps. First, believing EXPOSE opens a port. It is documentation, nothing
more — the port is only reachable when you publish it with minus p at run time.
Second, copying all your source before installing dependencies. That order
invalidates the cache on every code change and forces a full reinstall.
Dependencies first, source last. Third, mixing up CMD and ENTRYPOINT.
ENTRYPOINT is the executable that runs; CMD is just its default arguments.

**[RECAP — 4:25]**
So here's the skeleton. FROM sets the base; RUN executes build commands; COPY
adds files from the build context; ENTRYPOINT and CMD together define what runs.
EXPOSE is metadata only, and WORKDIR keeps your file operations somewhere
sane. Docker caches every layer, so order instructions from least- to
most-frequently-changing — dependencies before source. A dot-dockerignore keeps
the build context lean, and every RUN you write adds a layer. Master these habits now and your images will be fast, lean and predictable.

## On-screen visuals

- HOOK: a Dockerfile rendered as a recipe card, lines lighting up into image
  layers.
- WHY IT MATTERS: two build timelines — five minutes vs five seconds —
  labelled "bad order" and "good order".
- The Dockerfile: a recipe in layers: Dockerfile lines mapping one-to-one onto
  stacked layers; EXPOSE shown as a sticky label, not an open door; WORKDIR
  highlighted as a directory marker.
- Layer caching: build fast by building smart: animated rebuild skipping cached
  layers; dependency install layer staying green while source layer rebuilds;
  dot-dockerignore filtering files from the build context.
- COMMON MISTAKES: three warning cards — "EXPOSE opens nothing", "deps before
  source", "ENTRYPOINT = executable".
- RECAP: the cheat-sheet terms as a clean summary card.
