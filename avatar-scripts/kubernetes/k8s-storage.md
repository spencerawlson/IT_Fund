# Storage & Persistence: PVs, PVCs and the Claim Model — Avatar Tutor Script

**Lesson ID:** k8s-storage
**Track:** Kubernetes Orchestration
**Estimated runtime:** ~4 minutes (~604 words)

## Spoken script

**[HOOK — 0:00]**
Containers are ephemeral and pods are mortal — a combination that is fatal to
data unless you plan for it. Kubernetes answers with a storage model built on
the same declarative philosophy as everything else: describe the storage you
want, and let the cluster provision and bind it.

**[WHY IT MATTERS — 0:25]**
Every database, every file upload, every queue in your cluster needs this
lesson. Storage is where the declarative model meets physical disks, and the
indirection — PV, PVC, StorageClass — confuses everyone exactly once. After
that, it's one of the most elegant parts of Kubernetes.

**[SECTION — PVs, PVCs, and the claim model — 0:50]**
A PersistentVolume is a piece of cluster storage — provisioned by an admin or
dynamically — sitting in the cluster waiting to be used. A
PersistentVolumeClaim is a pod's request: "I need 10Gi, read-write, SSD
class." That request names three things — size, access mode, and storage
class — and Kubernetes will not bind a volume that fails any of them, so write
the claim carefully.
Kubernetes binds a matching PV to the claim, and the pod mounts the
PVC, never the PV directly. The indirection is deliberate. Developers ask for what they need, and the platform decides how to provide it. This separation of concerns is what makes the model scale: developers think in gigabytes and performance classes, and the platform handles the plumbing.

StorageClasses make the magic dynamic. Define a class describing a storage
type — fast SSD, cheap spinning disk — and new PVCs trigger automatic PV
provisioning on demand, no admin ticket required. It's the same self-service philosophy as the rest of Kubernetes, applied to disks. Dynamic provisioning turns storage into a self-service resource — the PVC is the request form, and the StorageClass is the catalogue.

**[SECTION — Choosing the right volume — 2:20]**
Not everything needs persistence. An emptyDir volume lives exactly as long as
its pod — perfect for scratch space and caches, gone when the pod dies. EmptyDir has its place — build caches, temp files, scratch — but it's a whiteboard, not a filing cabinet.
Anything that must survive rescheduling gets a PVC: databases, file uploads,
anything you would back up.

Two more distinctions matter. Access modes describe mountability:
ReadWriteOnce means one node mounts it read-write; ReadWriteMany allows many
nodes, but only if the storage backend supports it. And workload type follows
the data: stateless apps run as Deployments with interchangeable pods, while
databases and queues — anything needing stable identity plus its own storage
— belong in a StatefulSet with per-pod PVCs. Never store database files in the
image. Images are read-only, shared, and the wrong place for anything writable
or durable.

**[COMMON MISTAKES — 3:50]**
Three traps. First, using emptyDir for data that must survive. It's scratch
space — when the pod dies, so does everything in it. Production data needs a
PVC. Second, assuming ReadWriteMany just works everywhere. It needs a backend
that supports it; most block storage only offers ReadWriteOnce. Check what your StorageClass actually offers before assuming many pods can share one volume. Third, storing
database files in the container image or the container's own filesystem. Images
are read-only and shared — databases need writable, durable PVCs, full stop.

**[RECAP — 4:25]**
So here's the skeleton. Container and pod filesystems are ephemeral — plan for
it. A PersistentVolume is cluster storage waiting to be claimed; a
PersistentVolumeClaim is the pod's request for size and class; Kubernetes binds
them, and the pod mounts the claim. StorageClasses enable dynamic provisioning
on demand. EmptyDir is pod-lifetime scratch — caches, temp files, nothing
durable. ReadWriteOnce is single-node read-write; ReadWriteMany needs backend
support. Databases and queues need stable identity plus their own storage, so
they belong in StatefulSets — and never in the image.

## On-screen visuals

- HOOK: a dying pod with data scattering, then the same data anchored to a
  PersistentVolume while pods cycle above it.
- WHY IT MATTERS: the three-step chain — PVC request, PV binding, pod mount.
- PVs, PVCs, and the claim model: a PV pool on one side, PVC request slips in
  the middle, a pod mounting the bound claim; a StorageClass as a vending
  machine dispensing PVs on demand.
- Choosing the right volume: emptyDir fading with its pod vs a PVC surviving
  rescheduling; access-mode table — ReadWriteOnce vs ReadWriteMany; Deployment
  vs StatefulSet decision flow.
- COMMON MISTAKES: three warning cards — "emptyDir is scratch", "RWM needs
  backend support", "databases never in images".
- RECAP: the cheat-sheet terms as a clean summary card.
