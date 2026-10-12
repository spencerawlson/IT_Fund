# Resources & Data Sources: Addresses, References and the Dependency Graph — Avatar Tutor Script

**Lesson ID:** tf-resources
**Track:** Terraform & Infrastructure as Code
**Estimated runtime:** ~5 minutes (~761 words)

## Spoken script

**[HOOK — 0:00]**
Here is something Terraform does that still feels like magic the hundredth
time you see it. You write a subnet, mention a VPC inside it, and Terraform
simply knows to build the VPC first. You never wrote "first do this, then do
that." It figured it out from one reference. This lesson is about how.

**[WHY IT MATTERS — 0:25]**
Resources are the nouns of Terraform — the servers, buckets, and records you
actually manage. Understanding how they are addressed, how they reference each
other, and when to declare a dependency explicitly is what separates a
configuration that happens to work from one you can actually reason about. The
exam probes this constantly, and so will your first real debugging session.

**[SECTION — Blocks, addresses, and references — 0:50]**
A resource block has two labels: resource "aws_instance" "web" names the type
first, then a local name you choose. Together they form an address —
aws_instance.web — that uniquely identifies the object everywhere else in the
configuration. Types come from the provider; names are yours, so make them
descriptive. "web" beats "i1" every time, because future you will be reading
this at midnight.

Resources talk to each other through references. Writing aws_vpc.main.id
inside a subnet block does two things at once: it feeds the VPC's ID into the
subnet, and it tells Terraform the subnet depends on the VPC. Terraform builds
a graph of every reference and creates resources in the only order that works
— without you ever writing "first do this, then do that." That is the magic
from the hook.

One more distinction that will save you grief: arguments versus attributes.
Arguments are what you set — the ami, the instance_type, the tags. Attributes
are what Terraform learns after creation — the id, the public_ip, the arn. You
write arguments; you read attributes. Confusing the two is the most common
beginner error, and fortunately the error messages will teach you quickly.

**[SECTION — When the graph needs help: depends_on — 2:20]**
Implicit dependencies cover nearly everything, because nearly every ordering
relationship can be expressed as a reference. But some dependencies are real
without being referential — a resource that must exist first for operational
reasons, with no attribute flowing between them. For those cases, depends_on
declares the ordering explicitly.

Treat depends_on as a scalpel, not a habit. Sprinkling it everywhere hides the
true shape of your graph — a reviewer should be able to see why things are
ordered by following the references, like tracing wires in a circuit. Reach
for it only when Terraform genuinely cannot infer what you know.

**[SECTION — Data sources: reading what you do not manage — 3:20]**
Not everything in your world is managed by your configuration, and not
everything should be. A data source is a read-only lookup: data "aws_ami"
"latest" asks the provider to find an existing AMI and exposes its ID as
data.aws_ami.latest.id. Terraform never creates it, never updates it, never
destroys it. It only reads.

Data sources are how configurations stay decoupled. Instead of hard-coding an
AMI ID that rots, you look up "the latest Amazon Linux 2023 image" at plan
time. Instead of duplicating a VPC ID across teams, one team's configuration
exposes it and another reads it. Each configuration owns exactly what it
should and borrows the rest — the difference between owning a library book
and borrowing one.

Two housekeeping blocks round out the picture. The terraform block configures
Terraform itself — the required_version, the required_providers with their
version pins, and the backend. And here is the rule to tattoo on your forearm:
pin your provider versions with constraints like tilde-arrow 5.0. An unpinned
provider is a promise that tomorrow's release will behave like today's — and
no release keeps that promise forever.

**[COMMON MISTAKES — 4:45]**
Three traps. One: mixing up arguments and attributes — writing an argument and
trying to read it back as if Terraform had exported it. You write inputs; you
read outputs. Two: reaching for depends_on everywhere instead of letting
references build the graph. If the ordering is real, express it as a
reference. Three: leaving providers unpinned. The day a provider releases a
breaking change, your next init becomes someone else's redesign of your
infrastructure.

**[RECAP — 5:05]**
Resource blocks are addressed as type.name — descriptive local names, please.
References feed values and build implicit dependencies, so Terraform derives
the creation order itself. When a real dependency cannot be expressed as a
reference, depends_on declares it — a scalpel, not a habit. Data sources are
read-only lookups for infrastructure you consume but do not manage. The
terraform block configures Terraform itself, and required_providers pins your
versions so tomorrow's release cannot surprise you. That is the whole grammar:
nouns, references, and the graph they draw.

## On-screen visuals

- HOOK: a subnet block containing a VPC reference, with Terraform drawing the
  creation order automatically — VPC first, subnet second.
- Blocks, addresses, and references: a resource block splitting into type and
  local name, joining into the address aws_instance.web; a graph where the
  reference wire doubles as the dependency arrow; argument (input) vs
  attribute (exported output) as two labelled columns.
- When the graph needs help: depends_on: an invisible ordering revealed only
  when declared; contrast a clean reference-traced graph with one tangled by
  overused depends_on.
- Data sources: reading what you do not manage: "latest AMI" looked up at plan
  time instead of hard-coded; the terraform block card showing required_version
  and a pinned ~> 5.0 provider constraint.
- RECAP: addresses, references, depends_on, data sources, and version pins as
  a five-part grammar summary.
