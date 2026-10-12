# Optimization & Security: Multi-stage Builds and Least Privilege — Avatar Tutor Script

**Lesson ID:** docker-optimization-security
**Track:** Docker & Containers
**Estimated runtime:** ~4 minutes (~622 words)

## Spoken script

**[HOOK — 0:00]**
A container image is a shipping manifest for your attack surface. Every package
in it is something to patch. Every layer is a place for secrets to hide. Every
root process is a prize for an attacker. Small, least-privilege, scanned
images are not aesthetic preferences — they are security controls.

**[WHY IT MATTERS — 0:25]**
Bloated images are slow to pull, slow to deploy and full of vulnerabilities you
didn't need. Overprivileged containers turn a single application bug into a
host compromise. This lesson is where the build craft from the Dockerfile
lesson becomes a security posture — and it's directly testable on the exam.

**[SECTION — Build small — 0:50]**
Multi-stage builds are the single biggest win. Use one stage with the full
toolchain to compile your app, then COPY only the resulting artifact into a
second, slim runtime stage. The compiler, the headers, the build cache — none
of it ships. Pair that with a minimal base like Alpine or a distroless image
and you've cut most of the CVEs before they ever existed, because fewer packages means fewer vulnerabilities to patch. Ask yourself, for every package in the final image: does my app need this at run time? If not, it belongs in the build stage.

Layer discipline compounds the gain. Order your Dockerfile from least- to
most-frequently-changing so the build cache does maximum work. Combine related
RUN commands with double-ampersand and clean up package caches in the same
layer — otherwise the deleted files still exist in an earlier layer, bloating
the image and, worse, potentially recoverable.

**[SECTION — Run least-privilege, prove integrity — 2:20]**
Then shrink the runtime blast radius. Run as a non-root USER — a one-line
instruction that limits what a compromised process can do. Consider minus minus
read-only so the app cannot write to its own filesystem, mounting a writable
volume only where it truly needs one. And treat layers as public: anything
baked into a layer, even deleted later, remains recoverable from image history.
Secrets go in at runtime, never in the build. Attackers don't care that the secret was deleted three layers ago — the bytes are still sitting in the image history, waiting to be extracted.

Finally, verify. Scan every image for known CVEs with Trivy or Docker Scout
and gate the pipeline on the results. Sign images with a tool like cosign so
clusters can verify authenticity before deploying. In a supply-chain-attack
world, "this exact image came from our CI" is a claim worth proving, not
assuming.

**[COMMON MISTAKES — 3:50]**
Three traps. First, deleting a secret in a later layer and calling it gone. It
isn't — every earlier layer survives in the image history, credentials and all.
Secrets never enter the build. Second, running as root "because it works".
Root makes an application bug a host-level event; a non-root USER line costs
you nothing. Third, treating image size as cosmetic. A smaller image is a
smaller attack surface, a faster pull and fewer CVEs to patch — optimisation
and security are the same work here.

**[RECAP — 4:25]**
So here's the skeleton. Multi-stage builds keep the toolchain out of the final
image — compile in one stage, ship only the artifact in a slim one. Alpine and
distroless bases cut packages and CVEs. Order layers from least- to
most-changing for cache efficiency, and combine RUN commands with cleanup in
the same layer. Run as a non-root USER, consider minus minus read-only, and
never put secrets in layers — they're recoverable from history. Scan with
Trivy or Docker Scout, gate the build, and sign with cosign so the cluster knows the image is genuine. Small, least-privilege and scanned — that's the whole posture in six words.

## On-screen visuals

- HOOK: an image as a shipping manifest, packages morphing into vulnerabilities,
  root processes glowing as targets.
- WHY IT MATTERS: two deployment timelines — bloated root-run image vs slim
  non-root scanned image.
- Build small: multi-stage diagram — full toolchain stage on the left, slim
  runtime stage on the right with only the artifact copied across; deleted
  files still visible in an earlier layer.
- Run least-privilege, prove integrity: blast-radius circles shrinking from
  root to non-root; a cosign signature stamp verified at the cluster gate.
- COMMON MISTAKES: three warning cards — "deleted is not gone", "root is a
  choice, not a default", "small equals secure".
- RECAP: the cheat-sheet terms as a clean summary card.
