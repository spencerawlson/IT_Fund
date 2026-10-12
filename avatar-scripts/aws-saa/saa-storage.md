# Storage Selection — EBS, EFS, FSx and S3 — Avatar Tutor Script

**Lesson ID:** saa-storage
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~796 words)

## Spoken script

**[HOOK — 0:00]**
Storage questions reward a simple mental model: block, file, and object storage
solve different problems. A database wants block. A hundred web servers sharing
uploads want file. A data lake queried by Athena wants object.

**[WHY IT MATTERS — ~0:25]**
Each service has a workload it was built for and several it merely tolerates.
Learn the shapes and the selection questions answer themselves.

**[SECTION — Three shapes of storage — ~0:50]**
EBS is network-attached block storage for a single instance in a single
Availability Zone: the virtual hard drive behind EC2. Volumes persist
independently of the instance, which is why databases live on them. Within EBS,
gp3 is the general-purpose default — baseline 3,000 IOPS with throughput and
IOPS tunable independently of size — while io2 serves latency-sensitive
databases needing up to 64,000 provisioned IOPS. Instance
store is the opposite shape: physically attached, ephemeral disks that are fast
and free but lose everything on stop or termination — scratch space, caches,
nothing you cannot rebuild.

EFS is the shared file option: a POSIX file system that hundreds of instances
mount simultaneously across Availability Zones, with file locking intact — the
answer for the CMS cluster or the hundred web servers sharing uploads.
Infrequent Access lifecycle management moves cold files to a cheaper tier
automatically. Windows SMB shares mean FSx for Windows File Server; raw
throughput for a render farm or HPC scratch means FSx for Lustre; ONTAP and
OpenZFS cover the remaining enterprise file shapes. S3 is object storage: flat,
effectively unlimited, with strong read-after-write consistency — the data
lake's home, queried in place by Athena, EMR, and Redshift Spectrum. The exam's selection questions are usually decided here:
shared POSIX means EFS, SMB means FSx Windows, analytics over a lake means S3,
a single instance's disk means EBS.

**[SECTION — Sharing disks and copying them — ~2:05]**
EBS volumes attach to one instance — with one exception. Multi-Attach lets io1
and io2 volumes attach to multiple instances in the same AZ, which is how
clustered file systems share block storage. It is a specialist feature for
specialist software; reaching for it for ordinary sharing is a design smell,
and the exam will offer EFS as the correct alternative.

EBS snapshots are the copy mechanism: incremental point-in-time copies stored
in S3, so only changed blocks are billed after the first — the unit of backup,
cross-region DR, and volume migration. An AMI builds on them: snapshots plus
the launch metadata that turns a disk copy into a bootable image. S3 has its
own selection tools for getting data out selectively. S3 Select filters and retrieves a subset of an object's data
without downloading the whole thing — ideal for pulling a few columns from a
large CSV. Athena is the heavier instrument: SQL across many objects and
prefixes. The rule of thumb is scope: one object, S3 Select; a dataset, Athena.

**[SECTION — Moving data at speed and at scale — ~3:15]**
Large uploads from a single host go through multipart upload: the object is
split, parts upload in parallel, and the transfer is resumable — interrupted
uploads pick up where they stopped. For clients far from the bucket's region,
Transfer Acceleration routes uploads through the nearest CloudFront edge
location onto the AWS backbone.

Hybrid architectures bridge on-premises storage with Storage Gateway: file,
volume, and tape gateway modes that present familiar interfaces locally while
tiering to S3 behind the scenes. For the 50 TB migration over a constrained
link, the exam's answer is offline: a Snowball appliance ships the data
physically, because no clever protocol beats a truck full of disks when
bandwidth is the constraint. S3 Object Lambda adds a final twist: transform
data on retrieval — store one object and let Object Lambda derive the variants
as requested, instead of storing a redacted copy, a thumbnail copy, and a full
copy.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: instance store is ephemeral — anything irreplaceable on it
is already lost, you just do not know it yet. Two: Multi-Attach is for
clustered file systems, not ordinary sharing — a hundred web servers means EFS.
Three: match the query tool to the scope — S3 Select for one object, Athena
for a dataset.

**[RECAP — ~5:00]**
Block, file, object — match the workload to the shape. EBS is the persistent
virtual disk behind EC2, gp3 the default, io2 for provisioned IOPS; instance
store is fast, free, and forgetful. EFS shares POSIX files across instances
and zones; FSx covers SMB, Lustre, ONTAP, and OpenZFS; S3 is the effectively
unlimited object store with strong consistency. Snapshots copy disks, AMIs
launch machines. Multipart upload and Transfer Acceleration move big objects
fast, Storage Gateway bridges hybrid, Snowball ships petabytes physically, and
Object Lambda transforms data on retrieval.

## On-screen visuals

- HOOK: three shape cards — block (a hard drive), file (a shared folder), and
  object (a flat lake) — each paired with its workload: database, web farm,
  data lake.
- SHAPES SECTION: EBS volume attached to one instance in one AZ; EFS mounted
  by hundreds of instances across zones; the FSx family row — Windows for SMB,
  Lustre for HPC; S3 as an unlimited lake with Athena querying in place.
- SHARING SECTION: Multi-Attach sharing an io2 volume between two instances in
  one AZ, labelled "specialist use only"; the snapshot-to-AMI pipeline; S3
  Select pulling columns from one CSV beside Athena querying a whole dataset.
- MOVEMENT SECTION: multipart upload splitting an object into parallel parts;
  Transfer Acceleration routing through the nearest edge location; a Snowball
  appliance beside a thin network pipe; Object Lambda deriving thumbnails at
  read time.
- COMMON MISTAKES: three trap cards — "instance store forgets", "sharing a
  hundred servers means EFS", "one object is S3 Select, a dataset is Athena".
- RECAP: the cheat-sheet terms as a clean summary card.
