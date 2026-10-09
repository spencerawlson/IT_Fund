// Reading content for the Docker track. Keyed by deck id; wired into LESSON_CONTENT
// by src/data/catalog/lessonContent.js. Voice: professional, narrative, precise.

export default {
  'docker-basics': {
    overview: [
      'Before containers, shipping software meant shipping hope: it worked on the developer\u2019s laptop, and everyone crossed their fingers it would work in production. A container ends that gamble by bundling the application with everything it needs \u2014 code, runtime, libraries \u2014 into a single portable unit that behaves identically everywhere it runs.',
      'This lesson covers what containers actually are, how they differ from virtual machines, and the image/container model at the heart of Docker: a read-only template, and the runnable instances created from it.',
    ],
    learn: [
      {
        heading: 'Containers, not virtual machines',
        body: [
          'A virtual machine virtualizes hardware: each one carries a full guest operating system, its own kernel, its own memory footprint \u2014 heavy, slow to boot, expensive to run many of. A container virtualizes the operating system instead. Containers are isolated processes on the host, separated by Linux namespaces and resource-limited by cgroups, all sharing the host\u2019s kernel. The result starts in milliseconds and sips memory where a VM gulps it.',
          'That lightness is the whole point. Because containers share the kernel, you can run dozens on a host that would struggle with a handful of VMs. And because each container carries its own dependencies, the application that passed tests on a laptop is byte-for-byte the same artifact that ships to production. \u201CWorks on my machine\u201D stops being a joke and starts being a guarantee.',
        ],
      },
      {
        heading: 'Images and containers: template and instance',
        body: [
          'A Docker image is a read-only template \u2014 a stack of filesystem layers plus metadata describing how to run them. Nothing in an image changes at runtime; it is the recipe, frozen. A container is a runnable instance of an image: Docker adds a thin writable layer on top and starts the defined process inside its own isolated namespaces.',
          'One image can spawn many containers, each independent. Run `docker run nginx` and Docker pulls the image if it is not local, creates the container, and starts it \u2014 that single command is the entire deployment story for simple cases. `docker ps` shows what is running; `docker images` shows the templates waiting on disk. The engine itself is two parts: the dockerd daemon that does the work, and the CLI that talks to it over an API.',
        ],
      },
    ],
    cheatSheet: [
      ['Container', 'Isolated process sharing the host kernel \u2014 lightweight, fast to start'],
      ['Virtual machine', 'Full guest OS on virtualized hardware \u2014 heavier, slower to boot'],
      ['Image', 'Read-only template of layers; a container is its runnable instance'],
      ['docker run <image>', 'Creates and starts a container (pulls the image first if missing)'],
      ['docker ps', 'Lists running containers (-a includes stopped ones)'],
      ['docker images', 'Lists local images with repository, tag, id and size'],
      ['Docker Engine', 'The dockerd daemon plus the CLI that drives it'],
      ['Namespaces / cgroups', 'The Linux machinery behind isolation and resource limits'],
    ],
  },
  'docker-images': {
    overview: [
      'Every Docker image begins life as a text file. The Dockerfile is a recipe \u2014 a short list of instructions that Docker executes top to bottom, each one adding a layer to the image. Learn to write a good Dockerfile and you control everything about how your application is built, cached, and shipped.',
      'This lesson walks through the essential instructions, how layer caching makes builds fast, and the small disciplines \u2014 ordering, .dockerignore, WORKDIR \u2014 that separate a Dockerfile that works from one that works well.',
    ],
    learn: [
      {
        heading: 'The Dockerfile: a recipe in layers',
        body: [
          'It starts, almost always, with FROM: the base image everything else builds on \u2014 a language runtime, a minimal Linux, whatever your app needs. After that, each instruction adds a layer: RUN executes a command during the build (installing packages, compiling code), COPY moves files from the build context into the image, and the pair of ENTRYPOINT and CMD defines what actually runs when a container starts \u2014 ENTRYPOINT names the executable, CMD supplies its default arguments.',
          'Two instructions deserve special attention because beginners misread them. EXPOSE documents which port the container listens on, but it is metadata only \u2014 it opens nothing and publishes nothing; you still map the port at run time with -p. And WORKDIR sets the working directory for everything after it, creating the directory if needed, so your COPY and RUN steps land somewhere sane instead of the filesystem root.',
        ],
      },
      {
        heading: 'Layer caching: build fast by building smart',
        body: [
          'Docker caches the result of every layer. Rebuild, and any instruction whose inputs have not changed is skipped \u2014 which is why instruction order matters enormously. Put the steps that change rarely first and the ones that change constantly last: COPY the dependency manifest and install before copying the source, so a one-line code change does not trigger a full dependency reinstall.',
          'Two more habits complete the picture. A .dockerignore file keeps .git, node_modules and other build-irrelevant bulk out of the build context, so less data crosses to the daemon and images stay lean. And remember that each RUN creates a layer \u2014 the cache is your friend during development, but a bloated layer history is your enemy in production, a theme the optimization lesson takes further.',
        ],
      },
    ],
    cheatSheet: [
      ['FROM', 'Sets the base image; (almost) always the first instruction'],
      ['RUN', 'Executes a command during the build; each one adds a layer'],
      ['COPY', 'Adds files from the build context into the image'],
      ['CMD / ENTRYPOINT', 'Default command / executable run when the container starts'],
      ['EXPOSE', 'Documents the listening port (metadata only \u2014 does not publish it)'],
      ['WORKDIR', 'Sets the working directory for later instructions and the container'],
      ['.dockerignore', 'Excludes files from the build context for faster, smaller builds'],
      ['Layer cache', 'Unchanged steps are skipped on rebuild \u2014 order slow-changing first'],
    ],
  },
  'docker-run': {
    overview: [
      'Building the image is half the craft; running it well is the other half. The `docker run` command looks simple, but its flags are the steering wheel for everything a container does: where it runs, how it is reached, what it can see, and what happens when it stops.',
      'This lesson covers the flags you will use daily, how to get inside a running container, read its logs, and manage its lifecycle \u2014 plus the one truth about containers that surprises everyone exactly once.',
    ],
    learn: [
      {
        heading: 'The flags that matter',
        body: [
          'Most containers run detached with -d, in the background, rather than holding your terminal. Ports are published with -p 8080:80 \u2014 host port first, container port second \u2014 which is how the outside world reaches in. Give the container a name with --name web so you can address it by something friendlier than a hex id, pass configuration with -e KEY=value, and add --rm for throwaway runs so the container cleans itself up on exit instead of littering your system.',
          'For interactive work, -it combines -i (keep stdin open) and -t (allocate a terminal): `docker run -it ubuntu bash` drops you into a shell inside a fresh Ubuntu container, perfect for exploring an image. These flags compose freely \u2014 `-d -p 8080:80 --name web --rm -e MODE=prod` is a perfectly ordinary production-ish invocation.',
        ],
      },
      {
        heading: 'Inside, around, and after',
        body: [
          'A running container is not a black box. `docker exec -it <container> sh` starts a new shell inside the existing container \u2014 exec runs alongside the main process, it does not replace it. `docker logs` (with -f to follow) shows what the main process has printed, which is where every debugging session begins. And `docker stop` followed by `docker rm` ends the lifecycle; `docker rm -f` does both at once.',
          'Here is the truth that surprises everyone once: anything written inside the container \u2014 outside a volume \u2014 dies with it. The container\u2019s writable layer is deleted on removal, by design. Containers are ephemeral; they are cattle, not pets. If the data matters, it belongs in a volume, which is exactly where the next lesson begins.',
        ],
      },
    ],
    cheatSheet: [
      ['-d', 'Detached: run the container in the background'],
      ['-p 8080:80', 'Publish: map host port 8080 to container port 80'],
      ['--rm', 'Remove the container automatically when it exits'],
      ['-e KEY=value', 'Set an environment variable (--env-file for many)'],
      ['--name web', 'Friendly name instead of a container id'],
      ['-it', 'Interactive terminal: -i keeps stdin open, -t allocates a TTY'],
      ['docker exec -it <c> sh', 'Open a shell inside a running container'],
      ['docker logs [-f]', 'Read (and follow) the container\u2019s logs'],
      ['docker stop / rm', 'Stop, then remove; docker rm -f does both'],
    ],
  },
  'docker-data-net': {
    overview: [
      'Two problems appear the moment containers get serious: data must outlive the container that created it, and containers must talk to each other. Docker answers the first with volumes and the second with networks \u2014 and both have one more subtlety than beginners expect.',
      'This lesson covers persistent storage, the volume/bind-mount distinction, container networking from bridge to none, and the golden rule of secrets.',
    ],
    learn: [
      {
        heading: 'Volumes: data that survives',
        body: [
          'A volume is Docker-managed storage that lives independently of any container. Mount a named volume with -v myvol:/data and Docker creates it if needed; delete every container and the data remains, ready for the next one. That is the correct home for databases, uploads, anything you would mourn losing. Writing into the container\u2019s own layer instead is the classic beginner mistake \u2014 fast, easy, and gone the moment the container is removed.',
          'Bind mounts are the sibling: they map a specific host path into the container, which makes them perfect for development \u2014 mount your source tree and edit live while the container runs your code. The rule of thumb: volumes for production data Docker manages, bind mounts for files you edit on the host. And never bake secrets into either the image or the Dockerfile; configuration arrives at runtime through environment variables, mounted files, or a secrets manager.',
        ],
      },
      {
        heading: 'Networks: containers that talk',
        body: [
          'The default bridge network gives containers a private subnet where they can reach each other \u2014 and on a user-defined bridge, they do it by name, thanks to Docker\u2019s built-in DNS. Your web container simply connects to \u201Cdb\u201D, no IP addresses memorized. That name resolution is the reason to prefer user-defined networks over the default bridge for anything real.',
          'Two special modes complete the picture. `--network host` shares the host\u2019s network stack outright \u2014 no port mapping needed, slightly faster, but the container gives up network isolation (and it behaves differently on non-Linux hosts). `--network none` is the opposite: no networking at all, for untrusted or fully offline workloads. Most of the time, though, you will live on a bridge network and let DNS do the work.',
        ],
      },
    ],
    cheatSheet: [
      ['Volume', 'Docker-managed persistent storage; survives container removal'],
      ['Bind mount', 'Maps a host path into the container; ideal for live dev editing'],
      ['-v myvol:/data', 'Mounts named volume myvol at /data (created if missing)'],
      ['bridge network', 'Default: private subnet; user-defined bridges add DNS by container name'],
      ['--network host', 'Shares the host network stack; no port mapping, less isolation'],
      ['--network none', 'No network access at all; maximum isolation'],
      ['Secrets rule', 'Never in images or Dockerfiles \u2014 inject at runtime via env, files, or a manager'],
      ['Built-in DNS', 'Containers on a user-defined bridge resolve each other by name'],
    ],
  },
  'docker-compose': {
    overview: [
      'Real applications are rarely one container. A web app needs its database, its cache, maybe a queue \u2014 and starting them by hand, in order, with the right flags, is toil that begs to be automated. Docker Compose replaces a folder of shell scripts with a single declarative YAML file.',
      'This lesson covers the compose file, the service/network/volume model, the daily lifecycle commands, and how services find and configure each other.',
    ],
    learn: [
      {
        heading: 'One file for the whole stack',
        body: [
          'The compose.yaml file declares services \u2014 each one a container definition with its image or build context, ports, environment, and volumes \u2014 plus the networks and volumes they share. `docker compose up` reads it and brings the entire stack to life; add -d to run detached. When you are done, `docker compose down` stops everything and removes the containers and networks it created, a clean teardown in one command.',
          'Services reach each other by name over the network Compose creates for them: the app connects to \u201Cdb:5432\u201D and never cares which host or IP the database landed on. Dependencies are declared with depends_on \u2014 with one caveat worth memorizing: it waits for the container to start, not for the database inside to be ready. Pair it with a healthcheck when startup order truly matters.',
        ],
      },
      {
        heading: 'Day-to-day Compose',
        body: [
          'Configuration lives with the service, not in the image: the environment: mapping (or env_file:) keeps secrets and settings out of built artifacts, where they belong. When code changes, `docker compose up --build` rebuilds the images that have a build context before starting. And when one service needs muscle, `docker compose up --scale web=3` runs three copies \u2014 Compose handles the replicas while something upstream spreads the traffic.',
          'Compose is deliberately single-host: it orchestrates containers on one machine beautifully, and that covers development, CI, demos, and small production deployments. When you outgrow one host \u2014 true clustering, self-healing across machines \u2014 that is the moment Kubernetes enters the picture, and the next track is waiting.',
        ],
      },
    ],
    cheatSheet: [
      ['compose.yaml', 'Declares services, networks, volumes for the whole stack'],
      ['service', 'One container definition: image/build, ports, env, volumes'],
      ['docker compose up [-d]', 'Creates and starts all services (detached with -d)'],
      ['docker compose down', 'Stops and removes the stack\u2019s containers and networks'],
      ['depends_on', 'Start-order dependency (waits for start, not readiness)'],
      ['Service discovery', 'Services reach each other by name, e.g. db:5432'],
      ['--build', 'Rebuild images before starting: up --build'],
      ['--scale web=3', 'Run three replicas of the web service'],
    ],
  },
  'docker-registry': {
    overview: [
      'An image sitting on your laptop helps no one. Registries \u2014 Docker Hub, GitHub Container Registry, Amazon ECR \u2014 are the distribution layer: the place images live so any host, CI runner, or cluster can pull exactly the artifact you built.',
      'This lesson covers tagging and the treachery of `latest`, immutable digests, pushing and pulling, private registries, and why you scan everything you did not build yourself.',
    ],
    learn: [
      {
        heading: 'Tags, digests, and the lie of `latest`',
        body: [
          'A tag like app:1.2.0 names a version of a repository \u2014 human-readable, convenient, and mutable: you can push a different image under the same tag tomorrow. `latest` is the most misunderstood tag of all; it is merely the default when you omit a tag, not a promise of newness. Nothing updates it for you. In production, pin explicit versions, because \u201Clatest\u201D today and \u201Clatest\u201D next month may be different software.',
          'The digest \u2014 that sha256:... string \u2014 is the antidote. It content-addresses the exact image bytes: immutable, tamper-evident, reproducible. Pin by digest for the deployments where certainty matters, and re-tag freely with `docker tag local:tag registry/repo:tag` when preparing an image for its journey to a registry.',
        ],
      },
      {
        heading: 'Push, pull, and trust',
        body: [
          'The lifecycle is simple: `docker login` once, `docker push` to upload, `docker pull` to download (and `docker run` pulls automatically when the image is missing locally). Organizations run private registries to keep proprietary images internal and control exactly what flows into their clusters \u2014 standard practice in any serious CI pipeline.',
          'But a registry is a shelf, not a guarantee. Base images and their dependencies carry known vulnerabilities, and pulling blindly is how CVEs enter production. Scan images \u2014 with Trivy, Docker Scout, or your registry\u2019s built-in scanner \u2014 before they run, ideally as a gate in CI that fails the build. Trust the pipeline, verify the artifact.',
        ],
      },
    ],
    cheatSheet: [
      ['Registry', 'Stores/distributes images: Docker Hub, GHCR, ECR'],
      ['docker push / pull', 'Upload to / download from a registry (login first)'],
      ['Tag (app:1.2.0)', 'Human-readable version name; mutable \u2014 latest is just a default'],
      ['Digest (sha256:\u2026)', 'Immutable content address; pin it for reproducible deploys'],
      ['docker tag', 'Re-tags a local image, e.g. for a registry path'],
      ['Private registry', 'Internal image distribution and control; standard in enterprises'],
      ['Image scanning', 'Trivy / Scout find known CVEs \u2014 gate it in CI'],
      ['docker login', 'Authenticates to a registry for push/pull'],
    ],
  },
  'docker-optimization-security': {
    overview: [
      'A container image is a shipping manifest for your attack surface: every package in it is something to patch, every layer a place for secrets to hide, every root process a prize for an attacker. Small, least-privilege, scanned images are not aesthetic preferences \u2014 they are security controls.',
      'This lesson covers building small with multi-stage builds, running least-privilege, keeping secrets out of layers, and proving your images are what they claim to be.',
    ],
    learn: [
      {
        heading: 'Build small',
        body: [
          'Multi-stage builds are the single biggest win: use one stage with the full toolchain to compile your app, then COPY only the resulting artifact into a second, slim runtime stage. The compiler, the headers, the build cache \u2014 none of it ships. Pair that with a minimal base like Alpine or a distroless image and you have cut most of the CVEs before they ever existed, because fewer packages means fewer vulnerabilities to patch.',
          'Layer discipline compounds the gain. Order your Dockerfile from least- to most-frequently-changing so the build cache does maximum work. Combine related RUN commands with && and clean up package caches in the same layer \u2014 otherwise the deleted files still exist in an earlier layer, bloating the image and, worse, potentially recoverable.',
        ],
      },
      {
        heading: 'Run least-privilege, prove integrity',
        body: [
          'Then shrink the runtime blast radius. Run as a non-root USER \u2014 a one-line instruction that limits what a compromised process can do. Consider --read-only so the app cannot write to its own filesystem, mounting a writable volume only where it truly needs one. And treat layers as public: anything baked into a layer, even deleted later, remains recoverable from image history. Secrets go in at runtime, never in the build.',
          'Finally, verify. Scan every image for known CVEs with Trivy or Docker Scout and gate the pipeline on the results. Sign images with a tool like cosign so clusters can verify authenticity before deploying \u2014 in a supply-chain-attack world, \u201Cthis exact image came from our CI\u201D is a claim worth proving, not assuming.',
        ],
      },
    ],
    cheatSheet: [
      ['Multi-stage build', 'Build in a full toolchain stage; ship only the artifact in a slim stage'],
      ['Alpine / distroless', 'Minimal bases: fewer packages, fewer CVEs, faster pulls'],
      ['USER (non-root)', 'Run as non-root; limits damage on compromise'],
      ['--read-only', 'Tamper-resistant: app cannot write to its filesystem'],
      ['Secrets rule', 'Never in layers/Dockerfile \u2014 recoverable from history; inject at runtime'],
      ['Trivy / Scout', 'Image vulnerability scanners; gate builds on them in CI'],
      ['cosign', 'Image signing: proves authenticity, defeats tampering'],
      ['Layer ordering', 'Least- to most-changing first; maximizes cache reuse'],
    ],
  },
  'docker-ops': {
    overview: [
      'Development ends at `docker run`; production begins the moment something needs to stay up, stay bounded, and tell you when it is sick. Operations is the discipline of running containers as a professional: health signals, resource limits, logs, and a calm debugging routine.',
      'This lesson covers healthchecks, CPU/memory limits, restart policies, the observability trio of logs/stats/inspect, and how to think when a container misbehaves.',
    ],
    learn: [
      {
        heading: 'Health, limits, and staying up',
        body: [
          'A HEALTHCHECK instruction tells Docker how to ask the container \u201Care you okay?\u201D \u2014 and orchestrators listen to the answer, restarting or routing around the unhealthy. It is the difference between a process that is running and a service that is working. Pair it with resource limits: --memory and --cpus bound what one container may consume, so a leak or spike degrades one service instead of OOM-killing the host. Unbounded containers in production are a hope-based strategy.',
          'Restart policies close the loop. `--restart unless-stopped` is the sensible default for long-running services: Docker brings the container back after crashes and host reboots, but respects your explicit stop. Together \u2014 health signal, resource bounds, restart policy \u2014 they turn a container from a process into a service.',
        ],
      },
      {
        heading: 'Seeing inside and debugging',
        body: [
          'When something is wrong, work the same routine every time. Start with `docker logs`: what did the process say before it died? If it is still running, `docker exec -it` gets you a shell inside to inspect files, processes, and connectivity from the container\u2019s point of view. `docker stats` shows live CPU, memory, network and I/O per container \u2014 the fastest way to spot the one eating the host. And `docker inspect` dumps the full JSON truth: mounts, networks, environment, everything the container believes about itself.',
          'Prefer small, single-purpose containers and this routine stays short: one process per container means logs tell one story and failures have one suspect. And keep the host tidy \u2014 `docker system prune` reclaims the stopped containers, dangling images and unused networks that accumulate silently, though the aggressive flags (-a, --volumes) deserve respect and a second look before you run them.',
        ],
      },
    ],
    cheatSheet: [
      ['HEALTHCHECK', 'Command Docker runs to report container health; orchestrators act on it'],
      ['--memory / --cpus', 'Bound container resource use; protects the host'],
      ['--restart unless-stopped', 'Auto-restart on crash/reboot; respects manual stops'],
      ['docker logs [-f]', 'First debugging step: what did the process say?'],
      ['docker stats', 'Live CPU/memory/network/I/O per container'],
      ['docker inspect', 'Full JSON config and state: mounts, networks, env'],
      ['docker exec -it', 'Shell inside a running container for inspection'],
      ['docker system prune', 'Reclaims stopped containers, unused networks, dangling images'],
    ],
  },
};
