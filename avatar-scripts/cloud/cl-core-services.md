# Core Services Across AWS, Azure & GCP: One Map, Three Dialects — Avatar Tutor Script

**Lesson ID:** cl-core-services
**Track:** Cloud Computing & Security
**Estimated runtime:** ~5 minutes (~680 words)

## Spoken script

**[HOOK — 0:00]**
Every cloud offers the same building blocks under different names: virtual
machines, storage, databases, networks, identity, logging. Learn the
categories and one provider's names, and the other two map in an afternoon.
This lesson is that map.

**[WHY IT MATTERS — ~0:25]**
Cloud exams love the name game — which service does what, on which provider.
But the real payoff is practical: once you see that S3, Blob Storage, and
Cloud Storage are the same idea, you stop memorising products and start
thinking in architecture. Categories first, names second.

**[SECTION — Compute and storage — ~0:50]**
Virtual machines are EC2 on AWS, Virtual Machines on Azure, and Compute
Engine on GCP. Managed Kubernetes is EKS, AKS, and GKE. Same idea, three
dialects — learn the pattern once.

Storage splits three ways, and the exam tests the split. Object storage — S3,
Azure Blob Storage, Google Cloud Storage — holds files as objects in buckets,
accessed over HTTPS: cheap, durable, effectively unlimited. Block storage —
EBS on AWS — is a virtual disk attached to one instance, like a USB drive for
your VM. EFS provides shared file storage instead. And for archives you
rarely touch, S3 Glacier classes are far cheaper, with Deep Archive the
cheapest of all — but retrieval takes minutes to hours. The pricing logic is
honest: the slower you can wait, the less you pay.

**[SECTION — Databases and networking — ~1:55]**
Managed relational databases — RDS and Aurora on AWS, Azure SQL Database,
Cloud SQL on GCP — take over patching, backups, and failover. You get the
database without the database administrator's 3 AM pages. Managed NoSQL
key-value stores are DynamoDB, Cosmos DB, and Firestore or Bigtable.

Your isolated virtual network is a VPC on AWS, a VNet on Azure, and a VPC on
GCP — with one exam-worthy wrinkle: GCP VPCs are global rather than regional.
Same concept, slightly different blast radius. The name changes; the idea —
your own private slice of the provider's network — does not.

**[SECTION — Identity, audit and monitoring — ~2:55]**
Identity is IAM on AWS — with IAM Identity Center for single sign-on —
Microsoft Entra ID on Azure, and Cloud IAM on GCP. Every API call can be
recorded for auditing: CloudTrail on AWS, the Activity Log on Azure, Cloud
Audit Logs on GCP. If someone asks "who changed this?" — this is where the
answer lives. Metrics and logs flow to CloudWatch, Azure Monitor, or Cloud
Monitoring and Logging.

The architectural point that matters most: AWS Organizations centrally
manages many accounts with Service Control Policies, and separate accounts
for production, development, and security are the recommended isolation
boundary. Why? Because a problem in one account cannot directly touch
another. Account separation is the real blast-radius control — stronger than
any firewall rule inside a single account.

**[COMMON MISTAKES — ~3:55]**
Three traps. One: memorising names without categories. If you know "object
storage" as a concept, S3 versus Blob Storage is trivia. Two: treating EBS
like shared storage. A block volume attaches to one instance; shared file
storage is EFS. Three: putting everything in one account. Production,
development, and security belong in separate accounts — that is the isolation
boundary.

**[RECAP — ~4:15]**
Compute is EC2, Azure VMs, Compute Engine — plus EKS, AKS, GKE for
Kubernetes. Storage is object (S3, Blob, Cloud Storage), block (EBS, one
instance), file (EFS, shared), and Glacier for archives — Deep Archive
cheapest, slowest to retrieve. Databases are RDS/Aurora, Azure SQL, Cloud
SQL, with DynamoDB, Cosmos DB, and Firestore/Bigtable for NoSQL. Networks
are VPCs and VNets — global on GCP. Identity is IAM, Entra ID, Cloud IAM;
every API call is auditable via CloudTrail, Activity Log, or Cloud Audit
Logs; monitoring is CloudWatch, Azure Monitor, Cloud Monitoring. And AWS
Organizations with separate accounts is the real isolation boundary. One
map, three dialects. That is the core.

## On-screen visuals

- HOOK: three provider logos converging into one set of building blocks.
- Compute/storage: VM names across providers (EC2 / Azure VMs / Compute
  Engine); storage three-way split — object bucket, block volume on one
  instance, shared file system; Glacier retrieval-time vs cost slider.
- Databases/networking: managed database shield (patching, backups,
  failover handled); NoSQL key-value trio; VPC/VNet diagram with GCP's
  global VPC highlighted.
- Identity/audit: IAM / Entra ID / Cloud IAM cards; "who changed this?"
  flowing into CloudTrail / Activity Log / Cloud Audit Logs; multi-account
  diagram — production, development, security — as the isolation boundary.
- RECAP: the cheat-sheet terms as a clean summary card.
