# Registries & Image Lifecycle: Tags, Digests and Trust — Avatar Tutor Script

**Lesson ID:** docker-registry
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~627 words)

## Spoken script

**[HOOK — 0:00]**
An image sitting on your laptop helps no one. Registries — Docker Hub, GitHub
Container Registry, Amazon ECR — are the distribution layer. They are the place
images live so any host, CI runner or cluster can pull exactly the artifact
you built.

**[WHY IT MATTERS — 0:25]**
Everything between your build and production flows through a registry. How you
name what you push determines whether your deployments are reproducible or a
lottery. And because you'll routinely run images you didn't build, this lesson
is also about trust — how to verify that what's in the registry is what you
think it is.

**[SECTION — Tags, digests, and the lie of `latest` — 0:50]**
A tag like app:1.2.0 names a version of a repository — human-readable,
convenient, and mutable. You can push a different image under the same tag
tomorrow. Latest is the most misunderstood tag of all. It is merely the default
when you omit a tag, not a promise of newness. Nothing updates it for you. In
production, pin explicit versions, because "latest" today and "latest" next
month may be different software.

The digest — that sha256 colon string — is the antidote. Think of the tag as a name that can be reassigned, and the digest as a fingerprint that can't. It content-addresses
the exact image bytes: immutable, tamper-evident, reproducible. Pin by digest for the deployments where certainty matters. Reproducibility is the goal: if you can't say exactly which bytes are running in production, you can't debug them, roll them back or audit them. And re-tag freely with docker tag
when preparing an image for its journey — docker tag takes a local image and
names it for the registry path it needs.

**[SECTION — Push, pull, and trust — 2:20]**
The lifecycle is simple. Docker login once, docker push to upload, docker pull
to download — and docker run pulls automatically when the image is missing
locally. Organisations run private registries to keep proprietary images
internal and control exactly what flows into their clusters. Standard practice in any serious CI pipeline. A private registry also gives you control over what flows into your clusters — which images are allowed in, and which ones never leave the building.

But a registry is a shelf, not a guarantee. Base images and their dependencies
carry known vulnerabilities, and pulling blindly is how CVEs enter production.
Scan images — with Trivy, Docker Scout, or your registry's built-in scanner —
before they run, ideally as a gate in CI that fails the build. Trust the
pipeline, verify the artifact.

**[COMMON MISTAKES — 3:50]**
Three traps. First, treating latest as "the newest". It's a convention you have
to push yourself; nothing keeps it current. Pin explicit versions or digests in production. Tag your releases with explicit versions like 1.2.0, and treat latest as the convenience default it is — never as a deployment target. Second, assuming the registry vouches for what's inside. It stores
bits; it doesn't certify them. Scan before you run. Third, skipping docker
login and wondering why the push fails. Registries authenticate first — you
log in once, then push and pull freely.

**[RECAP — 4:25]**
So here's the skeleton. Registries distribute images — Docker Hub, GitHub
Container Registry, Amazon ECR. Tags are human-readable and mutable; latest is
just a default, not a freshness promise. The sha256 digest is the immutable
content address — pin it when certainty matters. Docker login authenticates,
docker push uploads, docker pull downloads, and docker run pulls automatically
when the image is missing. Run private registries for proprietary images, and
scan everything you didn't build with Trivy or Docker Scout, gated in CI. And the rule that ties it together: pin what you run, scan what you pull.

## On-screen visuals

- HOOK: an image travelling from a laptop to a registry shelf, then being
  pulled by hosts, CI runners and a cluster.
- WHY IT MATTERS: a deployment lottery wheel vs a pinned-digest lock.
- Tags, digests, and the lie of `latest`: a mutable tag label being peeled off
  and replaced; the sha256 digest as a fingerprint etched in stone.
- Push, pull, and trust: the login → push → pull → run pipeline; a scanner
  gate in CI flashing red on a vulnerable image.
- COMMON MISTAKES: three warning cards — "latest is not newest", "a shelf,
  not a guarantee", "login first".
- RECAP: the cheat-sheet terms as a clean summary card.
