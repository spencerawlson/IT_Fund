# Manifests, Namespaces & Config: The Shape of Every Object — Avatar Tutor Script

**Lesson ID:** k8s-config
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~617 words)

## Spoken script

**[HOOK — 0:00]**
Everything in Kubernetes is an object described in YAML — and the shape of that
YAML is the same everywhere, from a two-line namespace to a hundred-line
Deployment. Learn the shape once and you can read any manifest ever written.

**[WHY IT MATTERS — 0:25]**
Manifests are the language of Kubernetes. Every deployment, every
configuration, every secret you manage will be one of these objects. And the
config-versus-image boundary in this lesson is a security discipline as much as
a technical one — it's how the same build runs safely in dev, staging and
production.

**[SECTION — The manifest: apiVersion, kind, metadata, spec — 0:50]**
Four top-level fields, always. ApiVersion and kind say what the object is —
"this is a Deployment, v1 apps API". Metadata carries its name, namespace and
labels. And spec is the heart: the desired state you're declaring — the image,
the replica count, the ports. Controllers read spec and make it real. Status,
which you'll see in describe output, is read-only and reports what actually
exists — the cluster talking back to you, never something you edit by hand. Learn this shape once and every manifest becomes readable — you've already learned the vocabulary for objects you haven't met yet.

Apply a single file or a whole directory with kubectl apply minus f —
re-applying the same manifest converges rather than duplicates, which is why GitOps workflows can treat the repository as the source of truth. Declare the state you want in files, commit them, and the repository becomes the cluster's source of truth. Namespaces
then partition the cluster logically: dev, staging, team-a — scoping names,
quotas and access without needing more clusters.

**[SECTION — ConfigMaps, Secrets, and the config/image boundary — 2:20]**
A ConfigMap holds non-sensitive configuration as key-value pairs. A Secret
holds sensitive data, base64-encoded and access-controlled. Both reach pods the
same ways: injected as environment variables via valueFrom, or mounted as
files. The principle never changes: the same image must run in every
environment, with environment-specific config injected at deploy time. A config change should never require a rebuild. This boundary is also a security boundary: config that's separate from the image can be rotated, restricted and audited without rebuilding anything.

One warning the cards stress for good reason: a Kubernetes Secret is
base64-encoded, not encrypted, in etcd by default. Treat it accordingly —
enable encryption at rest, lock it down with RBAC, and for the truly
crown-jewel secrets, reach for an external secrets manager. Labels, meanwhile,
do the quiet organisational work. Metadata dot labels is how Services select
pods, how Deployments find theirs, how you query and group everything. In
Kubernetes, labels are the glue.

**[COMMON MISTAKES — 3:50]**
Three traps. First, believing Secrets are encrypted by default. They're
base64-encoded, which is encoding, not encryption — anyone who can read etcd
can read them. Enable encryption at rest and lock them down with RBAC. Base64 is just a way of representing bytes as text — it hides nothing from anyone who can read it. Second,
baking configuration into the image. The same image must run in every
environment; config gets injected at deploy time. Third, treating labels as
decoration. In Kubernetes they're load-bearing — selection, grouping and
queries all key off them.

**[RECAP — 4:25]**
So here's the skeleton. Every manifest has four fields: apiVersion and kind say
what it is, metadata names and labels it, spec declares the desired state.
Kubectl apply converges; namespaces partition the cluster into dev, staging,
team-a and friends. ConfigMaps hold plain configuration, Secrets hold sensitive
data — but Secrets are base64-encoded, not encrypted, so enable encryption at
rest and RBAC. Inject both as environment variables or mounted files, keep the
same image across environments, and remember: labels are the glue of
Kubernetes.

## On-screen visuals

- HOOK: one YAML shape morphing from a tiny namespace to a long Deployment —
  same four fields glowing.
- WHY IT MATTERS: the same image travelling through dev, staging and prod,
  config injected fresh in each.
- The manifest: apiVersion, kind, metadata, spec: the four fields labelled on a
  manifest; spec drawn as a blueprint, status as a read-only report card;
  namespaces as labelled partitions of a cluster.
- ConfigMaps, Secrets, and the config/image boundary: two pipelines — env
  vars and mounted files — feeding pods; a Secret shown as base64 with a
  warning flag and an encryption-at-rest lock being switched on.
- COMMON MISTAKES: three warning cards — "base64 is not encryption", "config
  out of the image", "labels are load-bearing".
- RECAP: the cheat-sheet terms as a clean summary card.
